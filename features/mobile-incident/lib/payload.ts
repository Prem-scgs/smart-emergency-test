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
