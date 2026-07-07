export type { EmergencyCategory, EmergencyCategoryInfo } from '../entities/incident/model/category'
export type { EmergencyContact } from '../entities/contact'
export type { CallLog, CallStatus } from '../entities/call'
export type { Location } from '../shared/location'

export { ROLE_PERMISSIONS } from '../shared/auth'

export type {
  AdminRole,
  AdminUser,
  Agency,
  AuthState,
} from '../shared/auth'

export type {
  Alert,
  AlertSeverity,
  Notification,
  NotificationType,
  SseEvent,
} from '../features/incident-alert/model/types'
