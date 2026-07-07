import type { EmergencyCategory } from '@/entities/incident'

export type AdminRole = 'super_admin' | 'agency_admin' | 'operator' | 'viewer'

export interface Agency {
  id: string
  name: string
  nameTh: string
  category: EmergencyCategory
  description: string
  icon: string
  color: string
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  agencyId?: string
  agency?: Agency
  permissions: string[]
  lastLogin: Date
}

export interface AuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: [
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
  agency_admin: [
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
    'gis.view',
    'reports.view',
  ],
}
