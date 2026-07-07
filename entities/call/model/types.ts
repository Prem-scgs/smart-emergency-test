import type { EmergencyContact } from '@/entities/contact'
import type { EmergencyCategory } from '@/entities/incident'
import type { Location } from '@/shared/location'

export type CallStatus = 'connected' | 'busy' | 'no-answer' | 'wrong-number' | 'cancelled'

export interface CallLog {
  id: string
  date: Date
  incidentType: EmergencyCategory
  agency: EmergencyContact
  location: Location
  status: CallStatus
  notes?: string
}
