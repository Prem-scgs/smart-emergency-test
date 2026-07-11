'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, MapPin, MessageCircle, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { useMobileI18n } from '@/shared/i18n/mobile'
import { buildIncidentShareAttemptUrl, buildIncidentShareCopyMessage, buildIncidentShareMapsUrl, buildShareChannelsUrl, detectMobilePlatform, isValidThaiReporterPhone, shouldCopyMessageBeforeOpeningChannel, type IncidentShareAttemptResponse, type IncidentShareChannel, type ShareChannelAvailability } from '@/features/location-sharing'
import type { MobileTrackingIncident } from '@/shared/realtime/mobile-tracking'
import { getOrCreateReporterSessionId } from '@/features/mobile-incident'

interface IncidentLocationShareCardProps { incident: MobileTrackingIncident }
const EMPTY_AVAILABILITY: ShareChannelAvailability = { line: { enabled: false }, sms: { enabled: false }, whatsapp: { enabled: false } }
const CHANNELS = [{ id: 'line' as const, label: 'LINE', icon: MessageCircle }, { id: 'sms' as const, label: 'SMS', icon: MessageSquare }, { id: 'whatsapp' as const, label: 'WhatsApp', icon: Send }]

/**
 * การแชร์ตำแหน่งของเคสที่กำลังติดตาม
 *
 * Card นี้อ่าน channel availability และบันทึก share attempt ผ่าน API ก่อนเปิด LINE/SMS/WhatsApp
 * เพื่อให้ระบบมี audit trail. ข้อความที่ API ส่งกลับเป็นข้อมูลของเคส จึงไม่แปลข้อความที่ผู้ใช้
 * หรือ backend บันทึกเอง; แปลเฉพาะ UI ของ card ผ่าน mobile i18n เช่น “ยังไม่เปิดใช้งาน”,
 * dialog “บันทึกประวัติการแชร์ไม่สำเร็จ” และปุ่ม “เปิดต่อ”.
 */

export function IncidentLocationShareCard({ incident }: IncidentLocationShareCardProps) {
  const { t } = useMobileI18n()
  const [availability, setAvailability] = useState(EMPTY_AVAILABILITY)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingChannel, setPendingChannel] = useState<IncidentShareChannel | null>(null)
  const [includeReporterPhone, setIncludeReporterPhone] = useState(false)
  const [reporterPhone, setReporterPhone] = useState('')
  const [deferredShare, setDeferredShare] = useState<IncidentShareAttemptResponse | null>(null)

  // ยกเลิก request เมื่อออกจากหน้าติดตาม เพื่อไม่ให้ response เก่าอัปเดต state ของ card ที่ unmount แล้ว.
  useEffect(() => {
    const controller = new AbortController()
    void fetch(buildShareChannelsUrl(getEmergencyApiBaseUrl()), { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); setAvailability((await response.json()) as ShareChannelAvailability) })
      .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error(t('shareChannelsLoadFailed')) })
      .finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [t])

  const phoneIsValid = !includeReporterPhone || isValidThaiReporterPhone(reporterPhone)
  const mapsUrl = buildIncidentShareMapsUrl(incident.latitude, incident.longitude)
  const copyMessage = useMemo(() => buildIncidentShareCopyMessage(incident, includeReporterPhone ? reporterPhone : null), [incident, includeReporterPhone, reporterPhone])
  const openShareUrl = async (shareUrl: string, messageToCopy?: string) => {
    if (messageToCopy) {
      try { await navigator.clipboard.writeText(messageToCopy); toast.info(t('shareCopiedForLine')) } catch { toast.warning(t('shareOpenAndCopy')) }
    } else toast.info(t('shareChannelOpened'))
    window.location.assign(shareUrl)
  }
  const validatePhone = () => { if (phoneIsValid) return true; toast.error(t('sharePhoneInvalid')); return false }
  /**
   * ต้องบันทึก attempt ให้สำเร็จก่อนจึงเปิด app ภายนอก. ถ้า backend ตอบ deferred จะให้ผู้ใช้ยืนยัน
   * เปิดต่อเอง เพื่อไม่ให้ความล้มเหลวของ audit ถูกซ่อนไปโดยเงียบ ๆ.
   */
  const handleShare = async (channel: IncidentShareChannel) => {
    if (!validatePhone()) return
    setPendingChannel(channel)
    try {
      const platform = detectMobilePlatform(window.navigator.userAgent)
      const response = await fetch(buildIncidentShareAttemptUrl(getEmergencyApiBaseUrl(), incident.id), { method: 'POST', headers: { 'content-type': 'application/json', 'x-mobile-platform': platform }, body: JSON.stringify({ sessionId: getOrCreateReporterSessionId(), channel, reporterPhone: includeReporterPhone ? reporterPhone : null }) })
      const payload = await response.json().catch(() => null) as IncidentShareAttemptResponse | null
      if (!response.ok || !payload) throw new Error()
      if (payload.recorded) await openShareUrl(payload.shareUrl, shouldCopyMessageBeforeOpeningChannel(payload.channel, platform) ? payload.message : undefined)
      else setDeferredShare(payload)
    } catch { toast.error(t('shareOpenFailed')) } finally { setPendingChannel(null) }
  }
  const handleCopy = async () => { if (!validatePhone()) return; try { await navigator.clipboard.writeText(copyMessage); toast.success(t('shareCopied')) } catch { toast.error(t('shareCopyFailed')) } }

  return <><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin data-icon="inline-start" />{t('shareTitle')}</CardTitle><CardDescription>{t('shareDescription')}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid grid-cols-3 gap-2">{CHANNELS.map(({ id, label, icon: Icon }) => <div key={id} className="flex min-w-0 flex-col gap-1.5"><Button variant="outline" className="w-full" disabled={isLoading || !availability[id].enabled || pendingChannel !== null} onClick={() => void handleShare(id)}><Icon data-icon="inline-start" />{label}</Button>{!isLoading && !availability[id].enabled ? <span className="text-center text-[11px] text-muted-foreground">{t('shareUnavailable')}</span> : null}</div>)}</div><div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-3"><div><label htmlFor="include-reporter-phone" className="text-sm font-medium">{t('shareIncludePhone')}</label><p className="text-xs text-muted-foreground">{t('shareIncludePhoneDescription')}</p></div><Switch id="include-reporter-phone" checked={includeReporterPhone} onCheckedChange={setIncludeReporterPhone} /></div>{includeReporterPhone ? <div className="flex flex-col gap-1.5"><label htmlFor="reporter-phone" className="text-sm font-medium">{t('shareReporterPhone')}</label><Input id="reporter-phone" inputMode="tel" maxLength={10} placeholder="0812345678" value={reporterPhone} aria-invalid={reporterPhone.length > 0 && !phoneIsValid} onChange={event => setReporterPhone(event.target.value.replace(/\D/g, ''))} />{!phoneIsValid && reporterPhone.length > 0 ? <p className="text-xs text-destructive">{t('sharePhoneInvalid')}</p> : null}</div> : null}<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => void handleCopy()}><Copy data-icon="inline-start" />{t('shareCopy')}</Button><Button variant="outline" onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}><ExternalLink data-icon="inline-start" />{t('shareOpenMap')}</Button></div></CardContent></Card><AlertDialog open={deferredShare !== null} onOpenChange={open => !open && setDeferredShare(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('shareRecordFailedTitle')}</AlertDialogTitle><AlertDialogDescription>{t('shareRecordFailedDescription')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => { if (deferredShare) { const platform = detectMobilePlatform(window.navigator.userAgent); void openShareUrl(deferredShare.shareUrl, shouldCopyMessageBeforeOpeningChannel(deferredShare.channel, platform) ? deferredShare.message : undefined) } setDeferredShare(null) }}>{t('continue')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>
}
