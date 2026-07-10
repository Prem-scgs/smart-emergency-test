import type { EmergencyContact } from '@/entities/contact'
import type { EmergencyCategory } from '@/entities/incident'
import type { Location } from '@/shared/location'

/**
 * Type ของ call result ไม่ใช่ incident workflow status
 *
 * ใช้กับ call logs/reporting เพื่อบอกผลการโทร เช่น connected/no-answer/busy
 * จึงต้องไม่ปนกับ status ของการปฏิบัติงาน incident.
 */
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
