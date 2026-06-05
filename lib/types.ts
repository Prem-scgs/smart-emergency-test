// Emergency Category Types
export type EmergencyCategory = 
  | 'police'
  | 'medical'
  | 'fire'
  | 'rescue'
  | 'flood'
  | 'road-accident'
  | 'child'
  | 'elderly'
  | 'animal'
  | 'tourist'

export interface EmergencyCategoryInfo {
  id: EmergencyCategory
  name: string
  description: string
  icon: string
  color: string
  bgColor: string
  recommendedAgency: string
}

// Location Types
export interface Location {
  latitude: number
  longitude: number
  province: string
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
  province: string
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
  duration?: number
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
  callsByCategory: Record<EmergencyCategory, number>
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

// Admin User Roles
export type AdminRole = 'superadmin' | 'agency-admin' | 'operator' | 'viewer'

// Agency (based on Emergency Category)
export interface Agency {
  id: string
  name: string
  nameTh: string
  category: EmergencyCategory
  description: string
  icon: string
  color: string
}

// Admin User
export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  agencyId?: string // Required for agency-admin, operator, viewer
  agency?: Agency
  permissions: string[]
  lastLogin: Date
}

// Auth Context Types
export interface AuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Permission definitions per role
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  superadmin: [
    'dashboard.view',
    'dashboard.all-agencies',
    'contacts.view',
    'contacts.create',
    'contacts.edit',
    'contacts.delete',
    'call-logs.view',
    'call-logs.all-agencies',
    'gis.view',
    'gis.edit',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'reports.view',
    'reports.export',
    'settings.view',
    'settings.edit',
  ],
  'agency-admin': [
    'dashboard.view',
    'contacts.view',
    'call-logs.view',
    'gis.view',
    'reports.view',
    'reports.export',
  ],
  operator: [
    'dashboard.view',
    'call-logs.view',
    'gis.view',
  ],
  viewer: [
    'dashboard.view',
    'call-logs.view',
  ],
}
