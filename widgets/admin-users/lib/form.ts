import type { AdminManagedUser, AdminUserFormState } from '../model/types.ts'

export const emptyAdminUserForm: AdminUserFormState = {
  email: '',
  displayName: '',
  password: '',
  role: 'viewer',
  agencyId: '',
  active: true,
}

export type AdminUserFormError =
  | 'email-required'
  | 'email-invalid'
  | 'name-required'
  | 'password-too-short'
  | 'agency-required'
  | 'super-admin-agency-forbidden'

export function getAdminUserFormError(
  form: AdminUserFormState,
  requirePassword = false
): AdminUserFormError | null {
  if (!form.email.trim()) return 'email-required'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'email-invalid'
  if (!form.displayName.trim()) return 'name-required'
  if ((requirePassword || form.password) && form.password.length < 8) return 'password-too-short'
  if (form.role === 'super_admin' && form.agencyId) return 'super-admin-agency-forbidden'
  if (form.role !== 'super_admin' && !form.agencyId) return 'agency-required'
  return null
}

export function toAdminUserForm(user: AdminManagedUser): AdminUserFormState {
  return {
    email: user.email,
    displayName: user.displayName,
    password: '',
    role: user.role,
    agencyId: user.agencyId ?? '',
    active: user.active,
  }
}
