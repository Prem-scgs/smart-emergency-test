'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, Circle, Clock, MapPin, Phone, RefreshCw, Truck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { buildIncidentTrackingSteps, getIncidentTrackingProgressPercent, type IncidentTrackingHistoryEntry, type IncidentWorkflowStatus } from '@/entities/incident'
import { buildMobileIncidentEventsUrl, buildMobileTrackingUrl, getMobileIncidentDisplayNumber, isMobileIncidentWorkflowStatus, type MobileTrackingResponse } from '@/shared/realtime/mobile-tracking'
import { getLocationDisplayName, useLocationLookupMaps } from '@/shared/location'
import { getCategoryDisplayLabel, useReferenceCategories } from '@/shared/reference'
import { getOrCreateReporterSessionId } from '@/features/mobile-incident'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { useMobileI18n } from '@/shared/i18n/mobile'
import { cn } from '@/shared/utils'
import type { EmergencyCategory } from '@/entities/incident'
import { IncidentLocationShareCard } from '@/features/location-sharing'

interface IncidentTrackingScreenProps { incidentId: string; caseNumber?: string | null; categoryId: EmergencyCategory; trackingStatus?: IncidentWorkflowStatus; trackingHistory?: IncidentTrackingHistoryEntry[]; trackingUpdatedAt?: string | Date | null; onBack: () => void; onCall: () => void }

export function IncidentTrackingScreen({ incidentId, caseNumber = null, categoryId, trackingStatus = 'reported', trackingHistory = [], trackingUpdatedAt = null, onBack, onCall }: IncidentTrackingScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [trackingData, setTrackingData] = useState<MobileTrackingResponse | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())
  const { categories } = useReferenceCategories()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const { language, locale, t } = useMobileI18n()
  const preferThai = language === 'th'
  const category = categories.find(item => item.id === categoryId)

  const loadTracking = useCallback(async () => {
    const response = await fetch(buildMobileTrackingUrl(getEmergencyApiBaseUrl(), incidentId, getOrCreateReporterSessionId()))
    if (!response.ok) throw new Error(t('trackingLoadingFailed'))
    const nextTracking = (await response.json()) as MobileTrackingResponse
    if (!isMobileIncidentWorkflowStatus(nextTracking.incident.status)) throw new Error(t('trackingInvalidStatus'))
    setTrackingData(nextTracking)
    setTrackingError(null)
    setLastRefreshedAt(new Date(nextTracking.incident.updatedAt))
  }, [incidentId, t])

  useEffect(() => { void loadTracking().catch(error => setTrackingError(error instanceof Error ? error.message : t('trackingLoadingFailed'))) }, [loadTracking, t])
  /**
   * ติดตามเคสด้วย SSE หลังโหลด snapshot ครั้งแรก. Event นี้มีไว้ refresh tracking ของผู้แจ้ง
   * เท่านั้น; ห้ามเปลี่ยนชื่อ event หรือ URL โดยไม่ทดสอบกับ backend incidents events และ polling fallback.
   */
  useEffect(() => {
    const eventSource = new EventSource(buildMobileIncidentEventsUrl(getEmergencyApiBaseUrl(), incidentId, getOrCreateReporterSessionId()))
    const refresh = () => void loadTracking().catch(error => setTrackingError(error instanceof Error ? error.message : t('trackingLoadingFailed')))
    eventSource.onopen = refresh
    eventSource.addEventListener('incident.status_updated', refresh)
    return () => { eventSource.removeEventListener('incident.status_updated', refresh); eventSource.close() }
  }, [incidentId, loadTracking, t])

  const currentStatus = isMobileIncidentWorkflowStatus(trackingData?.incident.status) ? trackingData.incident.status : trackingStatus
  const trackingSteps = buildIncidentTrackingSteps(currentStatus, trackingData?.statusHistory ?? trackingHistory)
  const activeStep = trackingSteps.find(step => step.isActive) ?? trackingSteps[0]
  const incidentDetail = trackingData?.incident ?? null
  const incidentDisplayNumber = getMobileIncidentDisplayNumber(incidentDetail ?? { id: incidentId, caseNumber })
  const updatedAt = trackingData?.incident.updatedAt ?? trackingUpdatedAt ?? activeStep?.timestamp ?? lastRefreshedAt
  const province = incidentDetail?.provinceCode ? provinceByCode[incidentDetail.provinceCode] : undefined
  const district = incidentDetail?.districtCode ? districtByCode[incidentDetail.districtCode] : undefined
  const locationLabel = [getLocationDisplayName(district, preferThai) || incidentDetail?.district || '', getLocationDisplayName(province, preferThai) || incidentDetail?.province || ''].filter(Boolean).join(', ')
  const showWaiting = ['reported', 'acknowledged', 'coordinating'].includes(currentStatus)
  const showDispatch = currentStatus === 'dispatched' || currentStatus === 'on_scene'
  const showClosed = currentStatus === 'closed'
  const time = new Date(updatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: language === 'en' })
  const refresh = () => { setIsRefreshing(true); void loadTracking().catch(error => setTrackingError(error instanceof Error ? error.message : t('trackingLoadingFailed'))).finally(() => setIsRefreshing(false)) }
  const stepLabel = (step: typeof trackingSteps[number]) => language === 'th' ? step.labelTh : step.label
  const stepDescription = (step: typeof trackingSteps[number]) => language === 'th' ? step.description : step.descriptionEn

  return <div className="flex flex-col min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b"><div className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={onBack} aria-label={t('incidentBack')}><ArrowLeft className="h-5 w-5" /></Button><div><h1 className="font-semibold text-foreground">{t('trackingTitle')}</h1><p className="text-xs text-muted-foreground">{t('trackingCase', { caseNumber: incidentDisplayNumber })}</p></div></div><Button variant="ghost" size="icon" onClick={refresh} disabled={isRefreshing} aria-label={t('trackingRefresh')}><RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} /></Button></div></div>
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <Card className="border-primary/50 bg-primary/5"><CardContent className="p-4"><div className="flex items-start justify-between mb-4"><div><Badge className={cn('mb-2', category?.bgColor, category?.color)}>{getCategoryDisplayLabel(category, preferThai)}</Badge><h2 className="text-lg font-semibold text-foreground">{stepLabel(activeStep)}</h2><p className="text-sm text-muted-foreground">{stepDescription(activeStep)}</p></div><div className="text-right"><p className="text-sm font-medium text-foreground">{t('trackingLatestStatus')}</p><p className="text-xs text-muted-foreground">{showClosed ? t('trackingClosed') : t('trackingRealtime')}</p></div></div><Progress value={getIncidentTrackingProgressPercent(currentStatus)} className="h-2 mb-2" /><p className="text-xs text-muted-foreground text-right">{t('trackingUpdated', { time })}</p>{trackingError ? <p className="mt-2 text-xs text-destructive text-right">{trackingError}</p> : null}</CardContent></Card>
      {showWaiting ? <Card><CardContent className="p-4"><div className="flex items-start gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Clock className="h-6 w-6 text-primary" /></div><div className="space-y-1"><h3 className="font-medium text-foreground">{t('trackingWaitingTitle')}</h3><p className="text-sm text-muted-foreground">{t('trackingWaitingDescription')}</p>{locationLabel ? <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground"><MapPin className="h-4 w-4" /><span>{locationLabel}</span></div> : null}</div></div></CardContent></Card> : null}
      {showDispatch ? <Card><CardContent className="p-4"><div className="flex items-center gap-3 mb-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">{currentStatus === 'on_scene' ? <Users className="h-6 w-6 text-primary" /> : <Truck className="h-6 w-6 text-primary" />}</div><div className="flex-1"><h3 className="font-medium text-foreground">{currentStatus === 'on_scene' ? t('trackingOnSceneTitle') : t('trackingDispatchTitle')}</h3><p className="text-sm text-muted-foreground">{currentStatus === 'on_scene' ? t('trackingOnSceneDescription') : t('trackingDispatchDescription')}</p></div><Badge variant="secondary" className="bg-primary/10 text-primary">{currentStatus === 'on_scene' ? t('trackingOnSceneBadge') : t('trackingDispatchBadge')}</Badge></div>{locationLabel ? <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground mb-4"><MapPin className="h-4 w-4 text-primary" /><span>{locationLabel}</span></div> : null}<Button variant="outline" className="w-full" onClick={onCall}><Phone className="h-4 w-4 mr-2" />{t('trackingCallAgency')}</Button></CardContent></Card> : null}
      {showClosed ? <Card className="border-success/50 bg-success/5"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10"><CheckCircle2 className="h-6 w-6 text-success" /></div><div><h3 className="font-medium text-foreground">{t('trackingClosedTitle')}</h3><p className="text-sm text-muted-foreground">{t('trackingClosedDescription')}</p></div></div></CardContent></Card> : null}
      {incidentDetail ? <IncidentLocationShareCard incident={incidentDetail} /> : null}
      <Card><CardContent className="p-4"><h3 className="font-medium text-foreground mb-4">{t('trackingTimeline')}</h3><div className="space-y-0">{trackingSteps.map((step, index) => <div key={step.status} className="flex gap-3"><div className="flex flex-col items-center"><div className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2', step.isCompleted ? 'bg-success border-success text-success-foreground' : step.isActive ? 'bg-primary border-primary text-primary-foreground animate-pulse' : 'bg-muted border-muted-foreground/30 text-muted-foreground')}>{step.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className={cn('h-4 w-4', step.isActive && 'fill-current')} />}</div>{index < trackingSteps.length - 1 ? <div className={cn('w-0.5 h-12', step.isCompleted ? 'bg-success' : 'bg-muted-foreground/30')} /> : null}</div><div className="flex-1 pb-4"><div className="flex items-center justify-between"><h4 className={cn('font-medium', step.isActive ? 'text-primary' : step.isCompleted ? 'text-foreground' : 'text-muted-foreground')}>{stepLabel(step)}</h4>{step.timestamp ? <span className="text-xs text-muted-foreground">{new Date(step.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: language === 'en' })}</span> : null}</div><p className="text-sm text-muted-foreground">{stepDescription(step)}</p></div></div>)}</div></CardContent></Card>
      <Card className="border-destructive/50"><CardContent className="p-4"><div className="flex items-center gap-3 mb-3"><AlertCircle className="h-5 w-5 text-destructive" /><h3 className="font-medium text-foreground">{t('trackingNeedHelp')}</h3></div><Button variant="destructive" className="w-full" onClick={onCall}><Phone className="h-4 w-4 mr-2" />{t('trackingEmergencyCall')}</Button></CardContent></Card>
    </div>
  </div>
}
