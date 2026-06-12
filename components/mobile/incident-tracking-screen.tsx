'use client'

import { useCallback, useEffect, useState } from 'react'
import { 
  ArrowLeft,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Truck,
  Users,
  AlertCircle,
  Navigation,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getLocationDisplayName, useLocationLookupMaps } from '@/lib/reference-locations'
import { getCategoryDisplayLabel, useReferenceCategories } from '@/lib/reference-categories'
import { cn } from '@/lib/utils'
import { EmergencyCategory } from '@/lib/types'

// Tracking status types
type TrackingStatus = 
  | 'reported'      // เหตุถูกแจ้งแล้ว
  | 'acknowledged'  // รับทราบเหตุ
  | 'dispatched'    // ส่งทีมออกไป
  | 'en-route'      // กำลังเดินทาง
  | 'on-scene'      // ถึงที่เกิดเหตุ
  | 'resolved'      // เสร็จสิ้น

interface TrackingStep {
  status: TrackingStatus
  label: string
  labelTh: string
  description: string
  timestamp?: Date
  isActive: boolean
  isCompleted: boolean
}

interface IncidentTrackingScreenProps {
  incidentId: string
  categoryId: EmergencyCategory
  onBack: () => void
  onCall: () => void
}

interface TrackingIncidentDetail {
  id: string
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
}

const API_BASE_URL = 'http://localhost:4000'

export function IncidentTrackingScreen({ 
  incidentId, 
  categoryId, 
  onBack,
  onCall 
}: IncidentTrackingScreenProps) {
  const [currentStatus, setCurrentStatus] = useState<TrackingStatus>('dispatched')
  const [eta, setEta] = useState(8) // minutes
  const [responderDistance, setResponderDistance] = useState(2.3) // km
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [incidentDetail, setIncidentDetail] = useState<TrackingIncidentDetail | null>(null)

  const { categories } = useReferenceCategories()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const category = categories.find(c => c.id === categoryId)

  const loadIncidentDetail = useCallback(async () => {
    const response = await fetch(API_BASE_URL + '/api/incidents/' + encodeURIComponent(incidentId))
    if (response.status === 404) {
      setIncidentDetail(null)
      return
    }

    if (!response.ok) return

    const detail = (await response.json()) as TrackingIncidentDetail
    setIncidentDetail(detail)
  }, [incidentId])

  useEffect(() => {
    void loadIncidentDetail()
  }, [loadIncidentDetail])

  // Simulate status progression
  useEffect(() => {
    const interval = setInterval(() => {
      setEta(prev => Math.max(0, prev - 1))
      setResponderDistance(prev => Math.max(0.1, prev - 0.3))
      
      // Progress status after certain time
      if (eta <= 3 && currentStatus === 'en-route') {
        setCurrentStatus('on-scene')
      } else if (eta <= 6 && currentStatus === 'dispatched') {
        setCurrentStatus('en-route')
      }
    }, 10000) // Update every 10 seconds for demo

    return () => clearInterval(interval)
  }, [eta, currentStatus])

  const trackingSteps: TrackingStep[] = [
    {
      status: 'reported',
      label: 'Reported',
      labelTh: 'แจ้งเหตุแล้ว',
      description: 'เหตุฉุกเฉินถูกบันทึกในระบบ',
      timestamp: new Date(Date.now() - 15 * 60000),
      isActive: currentStatus === 'reported',
      isCompleted: ['acknowledged', 'dispatched', 'en-route', 'on-scene', 'resolved'].includes(currentStatus),
    },
    {
      status: 'acknowledged',
      label: 'Acknowledged',
      labelTh: 'รับทราบเหตุ',
      description: 'ศูนย์รับแจ้งเหตุรับทราบแล้ว',
      timestamp: new Date(Date.now() - 12 * 60000),
      isActive: currentStatus === 'acknowledged',
      isCompleted: ['dispatched', 'en-route', 'on-scene', 'resolved'].includes(currentStatus),
    },
    {
      status: 'dispatched',
      label: 'Dispatched',
      labelTh: 'ส่งทีมแล้ว',
      description: 'ทีมกู้ภัยได้รับมอบหมายภารกิจ',
      timestamp: new Date(Date.now() - 8 * 60000),
      isActive: currentStatus === 'dispatched',
      isCompleted: ['en-route', 'on-scene', 'resolved'].includes(currentStatus),
    },
    {
      status: 'en-route',
      label: 'En Route',
      labelTh: 'กำลังเดินทาง',
      description: 'ทีมกู้ภัยกำลังเดินทางมายังจุดเกิดเหตุ',
      timestamp: currentStatus === 'en-route' || ['on-scene', 'resolved'].includes(currentStatus) 
        ? new Date(Date.now() - 5 * 60000) 
        : undefined,
      isActive: currentStatus === 'en-route',
      isCompleted: ['on-scene', 'resolved'].includes(currentStatus),
    },
    {
      status: 'on-scene',
      label: 'On Scene',
      labelTh: 'ถึงที่เกิดเหตุ',
      description: 'ทีมกู้ภัยถึงที่เกิดเหตุแล้ว',
      timestamp: currentStatus === 'on-scene' || currentStatus === 'resolved' 
        ? new Date() 
        : undefined,
      isActive: currentStatus === 'on-scene',
      isCompleted: currentStatus === 'resolved',
    },
    {
      status: 'resolved',
      label: 'Resolved',
      labelTh: 'เสร็จสิ้น',
      description: 'ภารกิจกู้ภัยเสร็จสิ้น',
      timestamp: currentStatus === 'resolved' ? new Date() : undefined,
      isActive: currentStatus === 'resolved',
      isCompleted: false,
    },
  ]

  const currentStepIndex = trackingSteps.findIndex(step => step.isActive)
  const progressPercent = ((currentStepIndex + 1) / trackingSteps.length) * 100

  const handleRefresh = () => {
    setIsRefreshing(true)
    setLastUpdated(new Date())
    void loadIncidentDetail().finally(() => {
      setTimeout(() => setIsRefreshing(false), 1000)
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
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
              <p className="text-xs text-muted-foreground">หมายเลขเหตุ: {incidentId}</p>
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
                  {trackingSteps.find(s => s.isActive)?.labelTh}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {trackingSteps.find(s => s.isActive)?.description}
                </p>
              </div>
              {currentStatus === 'en-route' && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{eta} นาที</p>
                  <p className="text-xs text-muted-foreground">เวลาโดยประมาณ</p>
                </div>
              )}
            </div>

            <Progress value={progressPercent} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground text-right">
              อัปเดตล่าสุด: {formatTime(lastUpdated)}
            </p>
          </CardContent>
        </Card>

        {/* Responder Info Card */}
        {(currentStatus === 'dispatched' || currentStatus === 'en-route') && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">หน่วยกู้ภัย ปทุมวัน 1</h3>
                  <p className="text-sm text-muted-foreground">รถพยาบาล ALS</p>
                </div>
                <Badge variant="secondary" className="bg-success/10 text-success">
                  กำลังมา
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>ระยะทาง {responderDistance.toFixed(1)} กม.</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>ETA {eta} นาที</span>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="relative h-40 bg-muted rounded-lg overflow-hidden mb-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">แผนที่ติดตามตำแหน่ง</p>
                  </div>
                </div>
                {/* Animated dot representing responder */}
                <div className="absolute top-1/3 left-1/4 animate-pulse">
                  <div className="h-4 w-4 bg-primary rounded-full" />
                </div>
                {/* Your location */}
                <div className="absolute bottom-1/3 right-1/3">
                  <div className="h-4 w-4 bg-destructive rounded-full border-2 border-white" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={onCall}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  โทรหาหน่วยกู้ภัย
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  ส่งข้อความ
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* On Scene Info */}
        {currentStatus === 'on-scene' && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">ทีมกู้ภัยถึงแล้ว</h3>
                  <p className="text-sm text-muted-foreground">กำลังดำเนินการช่วยเหลือ</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={onCall}>
                <Phone className="h-4 w-4 mr-2" />
                ติดต่อทีมกู้ภัย
              </Button>
            </CardContent>
          </Card>
        )}

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
