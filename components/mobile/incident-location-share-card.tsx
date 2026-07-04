'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, MapPin, MessageCircle, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getEmergencyApiBaseUrl } from '@/lib/emergency-api-url'
import {
  buildIncidentShareAttemptUrl,
  buildIncidentShareCopyMessage,
  buildIncidentShareMapsUrl,
  buildShareChannelsUrl,
  detectMobilePlatform,
  isValidThaiReporterPhone,
  shouldCopyMessageBeforeOpeningChannel,
  type IncidentShareAttemptResponse,
  type IncidentShareChannel,
  type ShareChannelAvailability,
} from '@/lib/incident-location-share'
import type { MobileTrackingIncident } from '@/lib/mobile-tracking'

interface IncidentLocationShareCardProps {
  incident: MobileTrackingIncident
}

const EMPTY_AVAILABILITY: ShareChannelAvailability = {
  line: { enabled: false },
  sms: { enabled: false },
  whatsapp: { enabled: false },
}

const CHANNELS = [
  { id: 'line' as const, label: 'LINE', icon: MessageCircle },
  { id: 'sms' as const, label: 'SMS', icon: MessageSquare },
  { id: 'whatsapp' as const, label: 'WhatsApp', icon: Send },
]

export function IncidentLocationShareCard({ incident }: IncidentLocationShareCardProps) {
  const [availability, setAvailability] = useState(EMPTY_AVAILABILITY)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingChannel, setPendingChannel] = useState<IncidentShareChannel | null>(null)
  const [includeReporterPhone, setIncludeReporterPhone] = useState(false)
  const [reporterPhone, setReporterPhone] = useState('')
  const [deferredShare, setDeferredShare] = useState<IncidentShareAttemptResponse | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void fetch(buildShareChannelsUrl(getEmergencyApiBaseUrl()), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('โหลดช่องทางแชร์ไม่สำเร็จ')
        setAvailability((await response.json()) as ShareChannelAvailability)
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        toast.error('โหลดช่องทางแชร์ไม่สำเร็จ')
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [])

  const phoneIsValid = !includeReporterPhone || isValidThaiReporterPhone(reporterPhone)
  const mapsUrl = buildIncidentShareMapsUrl(incident.latitude, incident.longitude)
  const copyMessage = useMemo(
    () => buildIncidentShareCopyMessage(incident, includeReporterPhone ? reporterPhone : null),
    [incident, includeReporterPhone, reporterPhone]
  )

  const openShareUrl = async (shareUrl: string, messageToCopy?: string) => {
    if (messageToCopy) {
      try {
        await navigator.clipboard.writeText(messageToCopy)
        toast.info('คัดลอกข้อความแล้ว วางใน LINE เพื่อส่งให้ศูนย์')
      } catch {
        toast.warning('เปิด LINE แล้ว กรุณาคัดลอกข้อความจากปุ่มด้านล่าง')
      }
    } else {
      toast.info('เปิดช่องทางแชร์แล้ว')
    }
    window.location.assign(shareUrl)
  }

  const handleShare = async (channel: IncidentShareChannel) => {
    if (!phoneIsValid) {
      toast.error('กรุณากรอกเบอร์โทรไทย 9–10 หลัก')
      return
    }

    setPendingChannel(channel)
    try {
      const platform = detectMobilePlatform(window.navigator.userAgent)
      const response = await fetch(
        buildIncidentShareAttemptUrl(getEmergencyApiBaseUrl(), incident.caseNumber),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-mobile-platform': platform,
          },
          body: JSON.stringify({
            trackingToken: incident.trackingToken,
            channel,
            reporterPhone: includeReporterPhone ? reporterPhone : null,
          }),
        }
      )
      const payload = await response.json().catch(() => null) as IncidentShareAttemptResponse | { message?: string } | null
      if (!response.ok) {
        throw new Error(payload && 'message' in payload ? payload.message : 'เปิดช่องทางแชร์ไม่สำเร็จ')
      }

      const share = payload as IncidentShareAttemptResponse
      if (share.recorded) {
        await openShareUrl(
          share.shareUrl,
          shouldCopyMessageBeforeOpeningChannel(share.channel, platform) ? share.message : undefined,
        )
      }
      else setDeferredShare(share)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เปิดช่องทางแชร์ไม่สำเร็จ')
    } finally {
      setPendingChannel(null)
    }
  }

  const handleCopy = async () => {
    if (!phoneIsValid) {
      toast.error('กรุณากรอกเบอร์โทรไทย 9–10 หลัก')
      return
    }
    try {
      await navigator.clipboard.writeText(copyMessage)
      toast.success('คัดลอกข้อความและลิงก์แผนที่แล้ว')
    } catch {
      toast.error('ไม่สามารถคัดลอกข้อความได้')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin data-icon="inline-start" />
            ส่งจุดเกิดเหตุให้ศูนย์
          </CardTitle>
          <CardDescription>แชร์ตำแหน่งที่บันทึกไว้ตอนแจ้งเหตุ ไม่ใช่ตำแหน่งปัจจุบัน</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map(({ id, label, icon: Icon }) => {
              const enabled = availability[id].enabled
              return (
                <div key={id} className="flex min-w-0 flex-col gap-1.5">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || !enabled || pendingChannel !== null}
                    onClick={() => void handleShare(id)}
                  >
                    <Icon data-icon="inline-start" />
                    {label}
                  </Button>
                  {!isLoading && !enabled ? (
                    <span className="text-center text-[11px] text-muted-foreground">ยังไม่เปิดใช้งาน</span>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-3">
            <div>
              <label htmlFor="include-reporter-phone" className="text-sm font-medium">แนบเบอร์ผู้แจ้ง</label>
              <p className="text-xs text-muted-foreground">ปิดไว้เป็นค่าเริ่มต้นเพื่อความเป็นส่วนตัว</p>
            </div>
            <Switch
              id="include-reporter-phone"
              checked={includeReporterPhone}
              onCheckedChange={setIncludeReporterPhone}
            />
          </div>

          {includeReporterPhone ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reporter-phone" className="text-sm font-medium">เบอร์ผู้แจ้ง</label>
              <Input
                id="reporter-phone"
                inputMode="tel"
                maxLength={10}
                placeholder="0812345678"
                value={reporterPhone}
                aria-invalid={reporterPhone.length > 0 && !phoneIsValid}
                onChange={event => setReporterPhone(event.target.value.replace(/\D/g, ''))}
              />
              {!phoneIsValid && reporterPhone.length > 0 ? (
                <p className="text-xs text-destructive">กรุณากรอกเบอร์โทรไทย 9–10 หลัก</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void handleCopy()}>
              <Copy data-icon="inline-start" />
              คัดลอกข้อความ
            </Button>
            <Button variant="outline" onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink data-icon="inline-start" />
              เปิดแผนที่
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deferredShare !== null} onOpenChange={open => !open && setDeferredShare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>บันทึกประวัติการแชร์ไม่สำเร็จ</AlertDialogTitle>
            <AlertDialogDescription>
              ระบบยังบันทึกกิจกรรมไม่ได้ แต่คุณสามารถเปิดช่องทางแชร์ต่อได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deferredShare) {
                  const platform = detectMobilePlatform(window.navigator.userAgent)
                  void openShareUrl(
                    deferredShare.shareUrl,
                    shouldCopyMessageBeforeOpeningChannel(deferredShare.channel, platform)
                      ? deferredShare.message
                      : undefined,
                  )
                }
                setDeferredShare(null)
              }}
            >
              เปิดต่อ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
