'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle, MapPin, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { IncidentStatusTimeline } from './incident-status-timeline'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { buildAdminApiHeaders, getBackendAdminScope } from '@/shared/api/admin-api'
import { useAdminI18n } from '@/shared/i18n/admin'
import { getUserFacingIncidentDescription, type IncidentWorkflowStatus } from '@/entities/incident'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { useLocationLookupMaps } from '@/shared/location'
import type { AdminUser } from '@/shared/auth'
import {
  buildIncidentDetailTrackingUrl,
  buildIncidentStatusUpdateRequest,
  getIncidentDetailDisplayNumber,
  getIncidentDetailLocationText,
  getIncidentDetailStatusChoices,
  getIncidentDetailStatusLabel,
  getIncidentStatusUpdateError,
  isIncidentDetailBackwardTransition,
  isIncidentDetailWorkflowStatus,
  shouldShowIncidentCloseWarning,
  type IncidentDetailTrackingResponse,
} from '../lib/incident-detail'

const API_BASE_URL = getEmergencyApiBaseUrl()

export interface IncidentDetailPanelProps {
  incidentId: string | null
  open: boolean
  user: AdminUser | null
  categoryLabels: Record<string, string>
  onOpenChange: (open: boolean) => void
  onStatusUpdated: () => void
}

export function IncidentDetailPanel({
  incidentId,
  open,
  user,
  categoryLabels,
  onOpenChange,
  onStatusUpdated,
}: IncidentDetailPanelProps) {
  const { language, t } = useAdminI18n()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const [tracking, setTracking] = useState<IncidentDetailTrackingResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [targetStatus, setTargetStatus] = useState<IncidentWorkflowStatus | null>(null)
  const [isCloseWarningOpen, setIsCloseWarningOpen] = useState(false)
  const activeIncidentIdRef = useRef<string | null>(null)

  const loadTracking = useCallback(async () => {
    if (!incidentId) return

    const requestedIncidentId = incidentId
    activeIncidentIdRef.current = requestedIncidentId

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(
        buildIncidentDetailTrackingUrl(API_BASE_URL, requestedIncidentId, user),
        {
          headers: buildAdminApiHeaders(user),
        }
      )

      if (!response.ok) {
        throw new Error(t('incidentDetailLoadError'))
      }

      const payload = (await response.json()) as IncidentDetailTrackingResponse
      if (activeIncidentIdRef.current !== requestedIncidentId) return

      setTracking(payload)
    } catch (loadError) {
      if (activeIncidentIdRef.current !== requestedIncidentId) return
      setError(loadError instanceof Error ? loadError.message : t('incidentDetailLoadError'))
    } finally {
      if (activeIncidentIdRef.current === requestedIncidentId) {
        setIsLoading(false)
      }
    }
  }, [incidentId, t, user])

  useEffect(() => {
    if (!open || !incidentId) return

    activeIncidentIdRef.current = incidentId
    setTracking(null)
    setError(null)
    setIsLoading(true)
    setNote('')
    setTargetStatus(null)
    setIsCloseWarningOpen(false)
    loadTracking()
  }, [incidentId, loadTracking, open])

  useEffect(() => {
    function handleStatusUpdated(event: Event) {
      const detail = (event as CustomEvent<{ id?: string }>).detail
      if (open && detail?.id === incidentId) {
        loadTracking()
      }
    }

    window.addEventListener('smart-emergency:incident-status-updated', handleStatusUpdated)
    return () => {
      window.removeEventListener('smart-emergency:incident-status-updated', handleStatusUpdated)
    }
  }, [incidentId, loadTracking, open])

  const currentStatus = tracking?.incident.status ?? null
  const adminRole = getBackendAdminScope(user)?.role ?? null
  const statusChoices = useMemo(() => {
    return getIncidentDetailStatusChoices(adminRole, currentStatus)
  }, [adminRole, currentStatus])
  const isBackwardTransition = isIncidentDetailBackwardTransition(currentStatus, targetStatus)

  useEffect(() => {
    setTargetStatus(currentTarget =>
      currentTarget && statusChoices.includes(currentTarget)
        ? currentTarget
        : statusChoices[0] ?? null
    )
  }, [statusChoices])

  async function updateStatus(status: IncidentWorkflowStatus) {
    if (!tracking || !isIncidentDetailWorkflowStatus(tracking.incident.status)) return

    try {
      setIsUpdating(true)
      setError(null)
      const request = buildIncidentStatusUpdateRequest({
        apiBaseUrl: API_BASE_URL,
        incident: tracking.incident,
        toStatus: status,
        note,
        user,
      })
      const response = await fetch(request.url, request.init)

      if (response.status === 409) {
        await loadTracking()
        setError(t('incidentStatusChangedByOther'))
        return
      }

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(getIncidentStatusUpdateError(payload, t('incidentUpdateStatusError')))
      }

      setNote('')
      await loadTracking()
      onStatusUpdated()
      toast.success(t('incidentStatusUpdatedToast'))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('incidentUpdateStatusError'))
    } finally {
      setIsUpdating(false)
    }
  }

  function requestStatusUpdate() {
    if (!targetStatus) return

    if (shouldShowIncidentCloseWarning(targetStatus, note)) {
      setIsCloseWarningOpen(true)
      return
    }

    void updateStatus(targetStatus)
  }

  const locationText = useMemo(() => {
    if (!tracking) return '-'

    return getIncidentDetailLocationText({
      incident: tracking.incident,
      provinceByCode,
      districtByCode,
      preferThai: language !== 'en',
      fallback: t('incidentNoArea'),
    })
  }, [districtByCode, language, provinceByCode, t, tracking])
  const userFacingDescription = getUserFacingIncidentDescription(tracking?.incident.description)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{t('incidentDetailTitle')}</SheetTitle>
          <SheetDescription>
            {t('incidentDetailDescription')}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4">
          {isLoading && !tracking ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" />
              {t('incidentDetailLoading')}
            </div>
          ) : error && !tracking ? (
            <div className="flex flex-col items-start gap-3 py-8">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadTracking}>
                <RefreshCw data-icon="inline-start" />
                {t('incidentDetailRetry')}
              </Button>
            </div>
          ) : tracking ? (
            <div className="flex flex-col gap-6 py-4">
              <section className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">
                      {categoryLabels[tracking.incident.category] ?? tracking.incident.category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tracking.incident.agencyName ?? t('incidentNoAgency')}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {language === 'en' ? 'Case' : 'หมายเลขเหตุ'}: {getIncidentDetailDisplayNumber(tracking.incident)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {isIncidentDetailWorkflowStatus(tracking.incident.status)
                      ? getIncidentDetailStatusLabel(tracking.incident.status, language)
                      : tracking.incident.status}
                  </Badge>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5" />
                  <span>{locationText}</span>
                </div>
                {tracking.incident.dialedPhone ? (
                  <p className="text-sm">{t('incidentDialedPhone')}{tracking.incident.dialedPhone}</p>
                ) : null}
                {userFacingDescription ? (
                  <p className="text-sm text-muted-foreground">
                    {userFacingDescription}
                  </p>
                ) : null}
              </section>

              <section className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{t('incidentUpdateStatusTitle')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('incidentUpdateVersionDescription')}
                  </p>
                </div>

                {!isIncidentDetailWorkflowStatus(tracking.incident.status) ? (
                  <p className="text-sm text-destructive">
                    {t('incidentLegacyStatus')}
                  </p>
                ) : statusChoices.length > 0 && targetStatus ? (
                  <div className="flex flex-col gap-3">
                    {adminRole === 'super_admin' ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="incident-target-status">{t('incidentChangeStatusTo')}</Label>
                        <Select
                          value={targetStatus}
                          onValueChange={value => {
                            if (value && isIncidentDetailWorkflowStatus(value)) {
                              setTargetStatus(value)
                              setError(null)
                            }
                          }}
                        >
                          <SelectTrigger id="incident-target-status" className="w-full">
                            <SelectValue placeholder={t('incidentSelectStatus')}>
                              {getIncidentDetailStatusLabel(targetStatus, language)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {statusChoices.map(status => (
                                <SelectItem key={status} value={status}>
                                  {getIncidentDetailStatusLabel(status, language)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span>{t('incidentNextStatus')}</span>
                        <span className="font-medium">
                          {getIncidentDetailStatusLabel(targetStatus, language)}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="incident-status-note">
                        {isBackwardTransition
                          ? t('incidentBackwardReason')
                          : targetStatus === 'closed'
                            ? t('incidentCloseSummary')
                            : t('incidentOptionalNote')}
                      </Label>
                      <Textarea
                        id="incident-status-note"
                        value={note}
                        onChange={event => setNote(event.target.value)}
                        placeholder={
                          isBackwardTransition
                            ? t('incidentBackwardReasonPlaceholder')
                            : targetStatus === 'closed'
                              ? t('incidentCloseSummaryPlaceholder')
                              : t('incidentNotePlaceholder')
                        }
                        aria-invalid={isBackwardTransition && note.trim().length === 0}
                      />
                      {isBackwardTransition && note.trim().length === 0 ? (
                        <p className="text-xs text-destructive">
                          {t('incidentBackwardReasonRequired')}
                        </p>
                      ) : targetStatus === 'closed' && note.trim().length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t('incidentCloseNoSummaryHint')}
                        </p>
                      ) : null}
                    </div>
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                    <Button
                      onClick={requestStatusUpdate}
                      disabled={isUpdating || (isBackwardTransition && note.trim().length === 0)}
                    >
                      {isUpdating ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
                      {t('incidentUpdateToPrefix')}{getIncidentDetailStatusLabel(targetStatus, language)}
                    </Button>
                  </div>
                ) : tracking.incident.status === 'closed' ? (
                  <p className="text-sm text-muted-foreground">{t('incidentClosed')}</p>
                ) : !adminRole ? (
                  <p className="text-sm text-muted-foreground">{t('incidentNoAdminRole')}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('incidentNoNextStatus')}</p>
                )}
              </section>

              {isIncidentDetailWorkflowStatus(tracking.incident.status) ? (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">{t('incidentStatusTimeline')}</h3>
                  <IncidentStatusTimeline
                    status={tracking.incident.status}
                    history={tracking.statusHistory}
                  />
                </section>
              ) : null}
            </div>
          ) : null}
        </ScrollArea>

        <SheetFooter className="border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('incidentCloseButton')}
          </Button>
        </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isCloseWarningOpen} onOpenChange={setIsCloseWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidentCloseWarningTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('incidentCloseWarningDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('incidentCloseWarningCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsCloseWarningOpen(false)
                void updateStatus('closed')
              }}
            >
              {t('incidentCloseWarningConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
