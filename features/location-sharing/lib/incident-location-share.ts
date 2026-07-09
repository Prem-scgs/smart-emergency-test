export type IncidentShareChannel = 'line' | 'sms' | 'whatsapp'
export type MobileSharePlatform = 'ios' | 'android' | 'desktop'

export interface ShareChannelAvailability {
  line: { enabled: boolean }
  sms: { enabled: boolean }
  whatsapp: { enabled: boolean }
}

export interface IncidentShareSnapshot {
  id: string
  caseNumber?: string | null
  category: string
  province?: string | null
  district?: string | null
  latitude: number
  longitude: number
  createdAt: string
  reporterPhone?: string | null
}

export interface IncidentShareAttemptResponse {
  recorded: boolean
  channel: IncidentShareChannel
  shareUrl: string
  message: string
  mapsUrl: string
}

export function buildShareChannelsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/reference/share-channels`
}

export function buildIncidentShareAttemptUrl(baseUrl: string, incidentId: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/incidents/${encodeURIComponent(incidentId)}/share-attempts`
}

/**
 * validate เบอร์ผู้แจ้งก่อนแนบลงข้อความแชร์
 *
 * เบอร์นี้เป็น optional privacy field และไม่ใช่ auth identity
 * ถ้าแก้ rule ต้องเช็กทั้ง card UI และ backend share-attempt logging
 */
export function isValidThaiReporterPhone(value: string) {
  return /^0\d{8,9}$/.test(value)
}

export function detectMobilePlatform(userAgent: string): MobileSharePlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Windows NT|Macintosh|Linux x86_64/i.test(userAgent)) return 'desktop'
  return 'android'
}

/**
 * บาง channel ต้อง copy ข้อความก่อนเปิดแอปภายนอก
 *
 * LINE desktop ไม่รับ prefilled text ผ่าน URL ได้เสถียรเหมือน mobile จึง copy message ให้ user paste เอง
 */
export function shouldCopyMessageBeforeOpeningChannel(
  channel: IncidentShareChannel,
  platform: MobileSharePlatform,
) {
  return channel === 'line' && platform === 'desktop'
}

export function buildIncidentShareMapsUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`
}

/**
 * สร้างข้อความแชร์ตำแหน่ง incident ที่ส่งต่อให้ศูนย์/หน่วยงาน
 *
 * ข้อความนี้เป็น user-facing contract ของ location sharing: ต้องมีเลขเคส, เวลา, พิกัด,
 * maps URL และ optional reporter phone โดยใช้ caseNumber ก่อน UUID เสมอ
 */
export function buildIncidentShareCopyMessage(
  incident: IncidentShareSnapshot,
  reporterPhone = incident.reporterPhone
) {
  const area = [incident.district, incident.province].filter(Boolean).join(' ')
  const occurredAt = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(incident.createdAt))
  const mapsUrl = buildIncidentShareMapsUrl(incident.latitude, incident.longitude)
  const displayCaseNumber = incident.caseNumber ?? incident.id.slice(0, 8)

  return [
    `หมายเลขเหตุ: ${displayCaseNumber}`,
    `ประเภทเหตุ: ${CATEGORY_LABELS[incident.category] ?? incident.category}`,
    `เวลาแจ้ง: ${occurredAt}`,
    area ? `พื้นที่: ${area}` : null,
    `พิกัด: ${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}`,
    `แผนที่: ${mapsUrl}`,
    reporterPhone ? `เบอร์ผู้แจ้ง: ${reporterPhone}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

const CATEGORY_LABELS: Record<string, string> = {
  fire: 'ดับเพลิง',
  flood: 'น้ำท่วม',
  medical: 'แพทย์',
  police: 'ตำรวจ',
  rescue: 'กู้ภัย',
  'road-accident': 'อุบัติเหตุทางถนน',
  road_accident: 'อุบัติเหตุทางถนน',
}
