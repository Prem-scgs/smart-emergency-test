import type { EmergencyCategory, EmergencyCategoryInfo } from '../entities/incident/model/category'

export type { EmergencyCategory, EmergencyCategoryInfo } from '../entities/incident/model/category'

// Location Types
export interface Location {
  latitude: number
  longitude: number
  provinceCode?: string
  province: string
  districtCode?: string
  district: string
  subdistrict?: string
  accuracy: number
  lastUpdated: Date
}

// Emergency Contact Types
export interface EmergencyContact {
  id: string
  agencyName: string
  phoneNumber: string
  category: EmergencyCategory
  provinceCode?: string
  province: string
  districtCode?: string
  district: string
  distance?: number
  status: 'active' | 'inactive'
  is24Hours: boolean
  coordinates?: {
    latitude: number
    longitude: number
  }
}

// Call Log Types
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

// User Types
export interface UserProfile {
  id: string
  name: string
  phone: string
  emergencyContacts: PersonalEmergencyContact[]
  settings: UserSettings
}

export interface PersonalEmergencyContact {
  id: string
  name: string
  phone: string
  relationship: string
}

export interface UserSettings {
  language: 'en' | 'th'
  notifications: boolean
  offlineMode: boolean
  darkMode: boolean
}

// Incident Types
export interface Incident {
  id: string
  category: EmergencyCategory
  location: Location
  timestamp: Date
  status: 'active' | 'resolved' | 'pending'
  callLogs: CallLog[]
}

// Admin Dashboard Types
export interface DashboardStats {
  totalCallsToday: number
  activeIncidents: number
  totalAgencies: number
  avgResponseTime: number
  callsByCategory: Partial<Record<EmergencyCategory, number>>
  callsByProvince: Record<string, number>
  successRate: number
}

// GIS Types
export interface GISPolygon {
  id: string
  name: string
  type: 'province' | 'district' | 'subdistrict'
  coordinates: [number, number][]
  parentId?: string
}

// System Settings
export interface SystemSettings {
  incidentTypes: EmergencyCategoryInfo[]
  languages: { code: string; name: string }[]
  notificationSettings: {
    smsEnabled: boolean
    pushEnabled: boolean
    emailEnabled: boolean
  }
  offlineSyncInterval: number
  apiKeys: Record<string, string>
}

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
