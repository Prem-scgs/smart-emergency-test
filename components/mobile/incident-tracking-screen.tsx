'use client'

import { useCallback, useEffect, useState } from 'react'
import { 
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Truck,
  Users,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  buildIncidentTrackingSteps,
  getIncidentTrackingProgressPercent,
  type IncidentTrackingHistoryEntry,
  type IncidentWorkflowStatus,
} from '@/lib/incident-tracking'
import {
  buildMobileIncidentEventsUrl,
  buildMobileTrackingUrl,
  getMobileIncidentDisplayNumber,
  isMobileIncidentWorkflowStatus,
  type MobileTrackingResponse,
} from '@/lib/mobile-tracking'
import { getLocationDisplayName, useLocationLookupMaps } from '@/lib/reference-locations'
import { getCategoryDisplayLabel, useReferenceCategories } from '@/lib/reference-categories'
import { getOrCreateReporterSessionId } from '@/lib/reporter-session'
import { getEmergencyApiBaseUrl } from '@/lib/emergency-api-url'
import { cn } from '@/lib/utils'
import { EmergencyCategory } from '@/lib/types'
import { IncidentLocationShareCard } from './incident-location-share-card'

interface IncidentTrackingScreenProps {
  incidentId: string
  caseNumber?: string | null
  categoryId: EmergencyCategory
  trackingStatus?: IncidentWorkflowStatus
  trackingHistory?: IncidentTrackingHistoryEntry[]
  trackingUpdatedAt?: string | Date | null
  onBack: () => void
  onCall: () => void
}

export function IncidentTrackingScreen({ 
  incidentId, 
  caseNumber = null,
  categoryId, 
  trackingStatus = 'reported',
  trackingHistory = [],
  trackingUpdatedAt = null,
  onBack,
  onCall 
}: IncidentTrackingScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [trackingData, setTrackingData] = useState<MobileTrackingResponse | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  const { categories } = useReferenceCategories()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const category = categories.find(c => c.id === categoryId)

  const loadTracking = useCallback(async () => {
    const sessionId = getOrCreateReporterSessionId()
    const response = await fetch(buildMobileTrackingUrl(getEmergencyApiBaseUrl(), incidentId, sessionId))
    if (!response.ok) {
      throw new Error('โหลดสถานะเหตุการณ์ไม่สำเร็จ')
    }

    const nextTracking = (await response.json()) as MobileTrackingResponse
    if (!isMobileIncidentWorkflowStatus(nextTracking.incident.status)) {
      throw new Error('สถานะเหตุการณ์ไม่ถูกต้อง')
    }

    setTrackingData(nextTracking)
    setTrackingError(null)
    setLastRefreshedAt(new Date(nextTracking.incident.updatedAt))
  }, [incidentId])

  useEffect(() => {
    void loadTracking().catch(error => {
      setTrackingError(error instanceof Error ? error.message : 'โหลดสถานะเหตุการณ์ไม่สำเร็จ')
    })
  }, [loadTracking])

  useEffect(() => {
    const sessionId = getOrCreateReporterSessionId()
    const eventSource = new EventSource(
      buildMobileIncidentEventsUrl(getEmergencyApiBaseUrl(), incidentId, sessionId)
    )

    const refreshAuthoritativeTracking = () => {
      void loadTracking().catch(error => {
        setTrackingError(error instanceof Error ? error.message : 'โหลดสถานะเหตุการณ์ไม่สำเร็จ')
      })
    }

    eventSource.onopen = refreshAuthoritativeTracking
    eventSource.addEventListener('incident.status_updated', refreshAuthoritativeTracking)

    return () => {
      eventSource.removeEventListener('incident.status_updated', refreshAuthoritativeTracking)
      eventSource.close()
    }
  }, [incidentId, loadTracking])

  const authoritativeStatus = trackingData?.incident.status
  const currentStatus = isMobileIncidentWorkflowStatus(authoritativeStatus)
    ? authoritativeStatus
    : trackingStatus
  const currentHistory = trackingData?.statusHistory ?? trackingHistory
  const incidentDetail = trackingData?.incident ?? null
  const incidentDisplayNumber = getMobileIncidentDisplayNumber(
    incidentDetail ?? { id: incidentId, caseNumber }
  )

  const trackingSteps = buildIncidentTrackingSteps(currentStatus, currentHistory)
  const activeStep = trackingSteps.find(step => step.isActive) ?? trackingSteps[0]
  const progressPercent = getIncidentTrackingProgressPercent(currentStatus)

  const handleRefresh = () => {
    setIsRefreshing(true)
    void loadTracking()
      .catch(error => {
        setTrackingError(error instanceof Error ? error.message : 'โหลดสถานะเหตุการณ์ไม่สำเร็จ')
      })
      .finally(() => setIsRefreshing(false))
  }

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const province = incidentDetail?.provinceCode ? provinceByCode[incidentDetail.provinceCode] : undefined
  const district = incidentDetail?.districtCode ? districtByCode[incidentDetail.districtCode] : undefined
  const locationLabel = [
    getLocationDisplayName(district) || incidentDetail?.district || '',
    getLocationDisplayName(province) || incidentDetail?.province || '',
  ]
    .filter(Boolean)
    .join(', ')
  const updatedAt = trackingData?.incident.updatedAt ?? trackingUpdatedAt ?? activeStep?.timestamp ?? lastRefreshedAt
  const showDispatchCard = currentStatus === 'dispatched' || currentStatus === 'on_scene'
  const showWaitingCard =
    currentStatus === 'reported' ||
    currentStatus === 'acknowledged' ||
    currentStatus === 'coordinating'
  const showClosedCard = currentStatus === 'closed'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">ติดตามสถานะ</h1>
              <p className="text-xs text-muted-foreground">หมายเลขเหตุ: {incidentDisplayNumber}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Summary Card */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge className={cn("mb-2", category?.bgColor, category?.color)}>
                  {getCategoryDisplayLabel(category, false)}
                </Badge>
                <h2 className="text-lg font-semibold text-foreground">
                  {activeStep?.labelTh}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeStep?.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">สถานะล่าสุด</p>
                <p className="text-xs text-muted-foreground">
                  {showClosedCard ? 'เคสนี้เสร็จสิ้นแล้ว' : 'ติดตามจากหน่วยงานแบบเรียลไทม์'}
                </p>
              </div>
            </div>

            <Progress value={progressPercent} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground text-right">
              อัปเดตล่าสุด: {formatTime(updatedAt)}
            </p>
            {trackingError ? (
              <p className="mt-2 text-xs text-destructive text-right">{trackingError}</p>
            ) : null}
          </CardContent>
        </Card>

        {showWaitingCard && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">เคสอยู่ระหว่างการดำเนินการ</h3>
                  <p className="text-sm text-muted-foreground">
                    หน่วยงานจะอัปเดตสถานะเคสนี้เป็นรายขั้นตอนเมื่อมีความคืบหน้า
                  </p>
                  {locationLabel ? (
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{locationLabel}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showDispatchCard && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  {currentStatus === 'on_scene' ? (
                    <Users className="h-6 w-6 text-primary" />
                  ) : (
                    <Truck className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">
                    {currentStatus === 'on_scene' ? 'เจ้าหน้าที่ถึงจุดเกิดเหตุแล้ว' : 'เจ้าหน้าที่กำลังเข้าพื้นที่'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {currentStatus === 'on_scene'
                      ? 'กำลังดำเนินการช่วยเหลือและประเมินสถานการณ์'
                      : 'เมื่อมีสถานะใหม่ หน้านี้จะอัปเดตตามข้อมูลจากศูนย์'}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {currentStatus === 'on_scene' ? 'หน้างาน' : 'กำลังมา'}
                </Badge>
              </div>

              {locationLabel ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{locationLabel}</span>
                </div>
              ) : null}

              <Button variant="outline" className="w-full" onClick={onCall}>
                <Phone className="h-4 w-4 mr-2" />
                โทรกลับไปยังหน่วยงาน
              </Button>
            </CardContent>
          </Card>
        )}

        {showClosedCard && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">เหตุนี้ปิดเรียบร้อยแล้ว</h3>
                  <p className="text-sm text-muted-foreground">คุณยังสามารถย้อนกลับมาดูไทม์ไลน์ของเคสนี้ได้</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {incidentDetail ? (
          <IncidentLocationShareCard incident={incidentDetail} />
        ) : null}

        {/* Timeline */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-foreground mb-4">ไทม์ไลน์สถานะ</h3>
            <div className="space-y-0">
              {trackingSteps.map((step, index) => (
                <div key={step.status} className="flex gap-3">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2",
                      step.isCompleted 
                        ? "bg-success border-success text-success-foreground" 
                        : step.isActive 
                          ? "bg-primary border-primary text-primary-foreground animate-pulse"
                          : "bg-muted border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {step.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : step.isActive ? (
                        <Circle className="h-4 w-4 fill-current" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    {index < trackingSteps.length - 1 && (
                      <div className={cn(
                        "w-0.5 h-12",
                        step.isCompleted ? "bg-success" : "bg-muted-foreground/30"
                      )} />
                    )}
                  </div>

                  {/* Timeline content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <h4 className={cn(
                        "font-medium",
                        step.isActive ? "text-primary" : step.isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.labelTh}
                      </h4>
                      {step.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(step.timestamp)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Actions */}
        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h3 className="font-medium text-foreground">ต้องการความช่วยเหลือเพิ่มเติม?</h3>
            </div>
            <Button variant="destructive" className="w-full" onClick={onCall}>
              <Phone className="h-4 w-4 mr-2" />
              โทรฉุกเฉิน
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
