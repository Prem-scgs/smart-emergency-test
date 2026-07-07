import type { EmergencyCategory } from '@/entities/incident'

export type NotificationType =
  | 'new-incident'
  | 'incident-update'
  | 'agency-status'
  | 'call-log'
  | 'alert'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  agencyId?: string
  category?: EmergencyCategory
  incidentId?: string
  caseNumber?: string | null
  provinceCode?: string
  districtCode?: string
  province?: string
  district?: string
  read: boolean
  timestamp: Date
  actionUrl?: string
}

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  description?: string
  agencyId?: string
  category?: EmergencyCategory
  incidentId?: string
  caseNumber?: string | null
  timestamp: Date
  dismissible: boolean
  actionLabel?: string
  actionUrl?: string
}

export interface SseEvent {
  type: NotificationType
  data: any
  timestamp: Date
  agencyId?: string
}
