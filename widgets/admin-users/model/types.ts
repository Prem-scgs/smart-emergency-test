import type { AdminRole } from '@/shared/auth'

export interface AdminManagedUser {
  id: string
  email: string
  displayName: string
  role: AdminRole
  agencyId: string | null
  active: boolean
  agency?: { id: string; name: string; category: string } | null
  createdAt?: string
  updatedAt?: string
}

export interface AdminUserFormState {
  email: string
  displayName: string
  password: string
  role: AdminRole
  agencyId: string
  active: boolean
}

export type AdminUserDialogMode = 'create' | 'edit' | 'password' | 'deactivate' | null
