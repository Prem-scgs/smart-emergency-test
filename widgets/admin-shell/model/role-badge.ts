import type { AdminRole } from '@/shared/auth'
import type { AdminI18nKey } from '@/shared/i18n/admin'

export const adminShellRoleBadgeInfo: Record<
  AdminRole,
  { labelKey: AdminI18nKey; variant: 'default' | 'secondary' | 'outline' }
> = {
  super_admin: { labelKey: 'roleSuperAdmin', variant: 'default' },
  agency_admin: { labelKey: 'roleAgencyAdmin', variant: 'secondary' },
  viewer: { labelKey: 'roleViewer', variant: 'outline' },
}

export function getAdminShellRoleBadgeInfo(role: AdminRole) {
  return adminShellRoleBadgeInfo[role]
}
