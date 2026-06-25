'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle, MapPin, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { IncidentStatusTimeline } from '@/components/admin/incident-status-timeline'
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
import { buildAdminApiHeaders, getBackendAdminScope } from '@/lib/admin-api'
import { getAdminStatusChoices, requiresStatusReason } from '@/lib/admin-status-controls'
import { getEmergencyApiBaseUrl } from '@/lib/emergency-api-url'
import {
  getIncidentTrackingStatusMeta,
  type IncidentTrackingHistoryEntry,
  type IncidentWorkflowStatus,
} from '@/lib/incident-tracking'
import type { AdminUser } from '@/lib/types'

const API_BASE_URL = getEmergencyApiBaseUrl()
const WORKFLOW_STATUSES = new Set<IncidentWorkflowStatus>([
  'reported',
  'acknowledged',
  'coordinating',
  'dispatched',
  'on_scene',
  'closed',
])

interface TrackingIncident {
  id: string
  category: string
  status: string
  statusVersion: number
  description?: string | null
  dialedPhone?: string | null
  agencyName?: string | null
  province?: string | null
  district?: string | null
  latitude: number
  longitude: number
  updatedAt: string
}

interface TrackingResponse {
  incident: TrackingIncident
  statusHistory: IncidentTrackingHistoryEntry[]
  latestLocation: {
    latitude: number
    longitude: number
    accuracy?: number | null
    source: string
    createdAt: string
  } | null
  locationHistory: unknown[]
}

interface IncidentDetailPanelProps {
  incidentId: string | null
  open: boolean
  user: AdminUser | null
  categoryLabels: Record<string, string>
  onOpenChange: (open: boolean) => void
  onStatusUpdated: () => void
}

function isWorkflowStatus(status: string): status is IncidentWorkflowStatus {
  return WORKFLOW_STATUSES.has(status as IncidentWorkflowStatus)
}

export function IncidentDetailPanel({
  incidentId,
  open,
  user,
  categoryLabels,
  onOpenChange,
  onStatusUpdated,
}: IncidentDetailPanelProps) {
  const [tracking, setTracking] = useState<TrackingResponse | null>(null)
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
      const response = await fetch(`${API_BASE_URL}/api/incidents/${requestedIncidentId}/tracking`, {
        headers: buildAdminApiHeaders(user),
      })

      if (!response.ok) {
        throw new Error('โหลดรายละเอียดเหตุการณ์ไม่สำเร็จ')
      }

      const payload = (await response.json()) as TrackingResponse
      if (activeIncidentIdRef.current !== requestedIncidentId) return

      setTracking(payload)
    } catch (loadError) {
      if (activeIncidentIdRef.current !== requestedIncidentId) return
      setError(loadError instanceof Error ? loadError.message : 'โหลดรายละเอียดเหตุการณ์ไม่สำเร็จ')
    } finally {
      if (activeIncidentIdRef.current === requestedIncidentId) {
        setIsLoading(false)
      }
    }
  }, [incidentId, user])

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
    if (!adminRole || !currentStatus || !isWorkflowStatus(currentStatus)) return []
    return getAdminStatusChoices(adminRole, currentStatus)
  }, [adminRole, currentStatus])
  const isBackwardTransition =
    currentStatus != null &&
    isWorkflowStatus(currentStatus) &&
    targetStatus != null &&
    requiresStatusReason(currentStatus, targetStatus)

  useEffect(() => {
    setTargetStatus(currentTarget =>
      currentTarget && statusChoices.includes(currentTarget)
        ? currentTarget
        : statusChoices[0] ?? null
    )
  }, [statusChoices])

  async function updateStatus(status: IncidentWorkflowStatus) {
    if (!tracking || !isWorkflowStatus(tracking.incident.status)) return

    try {
      setIsUpdating(true)
      setError(null)
      const response = await fetch(
        `${API_BASE_URL}/api/incidents/${tracking.incident.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...buildAdminApiHeaders(user),
          },
          body: JSON.stringify({
            fromStatus: tracking.incident.status,
            toStatus: status,
            expectedVersion: tracking.incident.statusVersion,
            note: note.trim() || null,
          }),
        }
      )

      if (response.status === 409) {
        await loadTracking()
        setError('สถานะถูกเปลี่ยนโดยผู้ดูแลคนอื่น ระบบโหลดข้อมูลล่าสุดให้แล้ว')
        return
      }

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'อัปเดตสถานะไม่สำเร็จ')
      }

      setNote('')
      await loadTracking()
      onStatusUpdated()
      toast.success('อัปเดตสถานะเหตุการณ์แล้ว')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'อัปเดตสถานะไม่สำเร็จ')
    } finally {
      setIsUpdating(false)
    }
  }

  function requestStatusUpdate() {
    if (!targetStatus) return

    if (targetStatus === 'closed' && note.trim().length === 0) {
      setIsCloseWarningOpen(true)
      return
    }

    void updateStatus(targetStatus)
  }

  const locationText = tracking
    ? [tracking.incident.district, tracking.incident.province].filter(Boolean).join(' ') ||
      'ไม่ระบุพื้นที่'
    : '-'

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>รายละเอียดเหตุการณ์</SheetTitle>
          <SheetDescription>
            ตรวจสอบข้อมูลและอัปเดตสถานะตามลำดับการทำงาน
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4">
          {isLoading && !tracking ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" />
              กำลังโหลดรายละเอียด...
            </div>
          ) : error && !tracking ? (
            <div className="flex flex-col items-start gap-3 py-8">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadTracking}>
                <RefreshCw data-icon="inline-start" />
                ลองใหม่
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
                      {tracking.incident.agencyName ?? 'ไม่ระบุหน่วยงาน'}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {isWorkflowStatus(tracking.incident.status)
                      ? getIncidentTrackingStatusMeta(tracking.incident.status).labelTh
                      : tracking.incident.status}
                  </Badge>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5" />
                  <span>{locationText}</span>
                </div>
                {tracking.incident.dialedPhone ? (
                  <p className="text-sm">เบอร์ที่กด: {tracking.incident.dialedPhone}</p>
                ) : null}
                {tracking.incident.description ? (
                  <p className="text-sm text-muted-foreground">
                    {tracking.incident.description}
                  </p>
                ) : null}
              </section>

              <section className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold">อัปเดตสถานะ</h3>
                  <p className="text-xs text-muted-foreground">
                    ระบบตรวจ version ก่อนบันทึกเพื่อป้องกันข้อมูลทับกัน
                  </p>
                </div>

                {!isWorkflowStatus(tracking.incident.status) ? (
                  <p className="text-sm text-destructive">
                    เคสเดิมนี้ใช้สถานะ legacy และยังอัปเดตด้วย workflow ใหม่ไม่ได้
                  </p>
                ) : statusChoices.length > 0 && targetStatus ? (
                  <div className="flex flex-col gap-3">
                    {adminRole === 'super_admin' ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="incident-target-status">เปลี่ยนสถานะเป็น</Label>
                        <Select
                          value={targetStatus}
                          onValueChange={value => {
                            if (value && isWorkflowStatus(value)) {
                              setTargetStatus(value)
                              setError(null)
                            }
                          }}
                        >
                          <SelectTrigger id="incident-target-status" className="w-full">
                            <SelectValue placeholder="เลือกสถานะ">
                              {getIncidentTrackingStatusMeta(targetStatus).labelTh}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {statusChoices.map(status => (
                                <SelectItem key={status} value={status}>
                                  {getIncidentTrackingStatusMeta(status).labelTh}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span>สถานะถัดไป</span>
                        <span className="font-medium">
                          {getIncidentTrackingStatusMeta(targetStatus).labelTh}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="incident-status-note">
                        {isBackwardTransition
                          ? 'เหตุผลที่ย้อนสถานะ'
                          : targetStatus === 'closed'
                            ? 'สรุปการปิดเหตุ (ไม่บังคับ)'
                            : 'หมายเหตุ (ไม่บังคับ)'}
                      </Label>
                      <Textarea
                        id="incident-status-note"
                        value={note}
                        onChange={event => setNote(event.target.value)}
                        placeholder={
                          isBackwardTransition
                            ? 'ระบุเหตุผลเพื่อบันทึกในประวัติการเปลี่ยนสถานะ'
                            : targetStatus === 'closed'
                              ? 'ระบุผลการดำเนินงาน หรือเว้นว่างเพื่อปิดต่อ'
                              : 'เพิ่มรายละเอียดการดำเนินงาน'
                        }
                        aria-invalid={isBackwardTransition && note.trim().length === 0}
                      />
                      {isBackwardTransition && note.trim().length === 0 ? (
                        <p className="text-xs text-destructive">
                          ต้องระบุเหตุผลก่อนย้อนสถานะ
                        </p>
                      ) : targetStatus === 'closed' && note.trim().length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          หากไม่กรอกสรุป ระบบจะแสดงข้อความยืนยันก่อนปิดเหตุ
                        </p>
                      ) : null}
                    </div>
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                    <Button
                      onClick={requestStatusUpdate}
                      disabled={isUpdating || (isBackwardTransition && note.trim().length === 0)}
                    >
                      {isUpdating ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
                      อัปเดตเป็น {getIncidentTrackingStatusMeta(targetStatus).labelTh}
                    </Button>
                  </div>
                ) : tracking.incident.status === 'closed' ? (
                  <p className="text-sm text-muted-foreground">เคสนี้ปิดเรียบร้อยแล้ว</p>
                ) : !adminRole ? (
                  <p className="text-sm text-muted-foreground">ไม่พบสิทธิ์ผู้ดูแลสำหรับอัปเดตสถานะ</p>
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีสถานะถัดไปที่อัปเดตได้</p>
                )}
              </section>

              {isWorkflowStatus(tracking.incident.status) ? (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">ลำดับสถานะ</h3>
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
            ปิด
          </Button>
        </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isCloseWarningOpen} onOpenChange={setIsCloseWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยังไม่ได้ระบุสรุปการปิดเหตุ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณสามารถปิดเหตุได้โดยไม่กรอกสรุป ต้องการดำเนินการต่อหรือไม่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>กลับไปกรอกสรุป</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsCloseWarningOpen(false)
                void updateStatus('closed')
              }}
            >
              ยืนยันปิดเหตุ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
