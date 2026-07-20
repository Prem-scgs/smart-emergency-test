import type { CallStatus } from '@/entities/call'
import type { EmergencyContact } from '@/entities/contact'
import type { EmergencyCategory } from '@/entities/incident'

interface MobileIncidentLocation {
  latitude: number
  longitude: number
  accuracy: number
  provinceCode?: string
  province: string
  districtCode?: string
  district: string
}

interface IncidentCreatePayloadInput {
  category: EmergencyCategory
  contact: EmergencyContact
  location: MobileIncidentLocation
  sessionId: string
  clientRequestId: string
}

interface IncidentCallUpdatePayloadInput {
  status: CallStatus
  contact: EmergencyContact
}

export function normalizeReporterPhone(value: string) {
  const digits = value.replace(/[^0-9]/g, '')
  return digits.length > 0 ? digits : null
}

/**
 * สร้าง payload สำหรับ `POST /api/incidents` จาก mobile flow
 *
 * จุดนี้คือ contract ระหว่าง mobile UI กับ backend incidents module:
 * - `clientRequestId` ใช้กัน create ซ้ำจากการกด/รีโหลด
 * - `sessionId` ใช้ให้ผู้แจ้งกลับมาติดตาม/history ได้โดยไม่ต้อง login
 * - location fields ต้องส่งทั้ง code และ label เพื่อให้ GIS/admin fallback ได้
 */
export function buildIncidentCreatePayload({
  category,
  contact,
  location,
  sessionId,
  clientRequestId,
}: IncidentCreatePayloadInput) {
  return {
    clientRequestId,
    dialedPhone: contact.phoneNumber,
    category,
    severity: category === 'police' ? 'medium' : 'high',
    status: 'reported' as const,
    description: `Call initiated via mobile app to ${contact.agencyName}`,
    agencyContactId: contact.id,
    latitude: location.latitude,
    longitude: location.longitude,
    provinceCode: location.provinceCode ?? null,
    province: location.province,
    districtCode: location.districtCode ?? null,
    district: location.district,
    accuracy: location.accuracy,
    callStatus: null,
    reporterPhone: null,
    sessionId,
  }
}

/**
 * สร้าง payload สำหรับบันทึกผลการโทรหลังสร้าง incident แล้ว
 *
 * callStatus ถูกใช้ต่อใน mobile history, admin call logs และ reports
 * ถ้าแก้ description/callStatus ต้องเช็ก export และ filter ของฝั่ง admin ด้วย
 */
export function buildIncidentCallUpdatePayload({
  status,
  contact,
}: IncidentCallUpdatePayloadInput) {
  return {
    callStatus: status,
    reporterPhone: null,
    description: `Call completed via mobile app to ${contact.agencyName} (${status})`,
  }
}
