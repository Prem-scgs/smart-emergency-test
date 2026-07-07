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

export function isValidThaiReporterPhone(value: string) {
  return /^0\d{8,9}$/.test(value)
}

export function detectMobilePlatform(userAgent: string): MobileSharePlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Windows NT|Macintosh|Linux x86_64/i.test(userAgent)) return 'desktop'
  return 'android'
}

export function shouldCopyMessageBeforeOpeningChannel(
  channel: IncidentShareChannel,
  platform: MobileSharePlatform,
) {
  return channel === 'line' && platform === 'desktop'
}

export function buildIncidentShareMapsUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`
}

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
