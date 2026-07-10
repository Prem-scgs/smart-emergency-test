import type { AdminRole } from '@/shared/auth'
import type { AdminI18nKey } from '@/shared/i18n/admin'

/**
 * Role badge metadata ของ admin shell
 *
 * ตั้งใจรองรับเฉพาะ super_admin, agency_admin และ viewer แล้ว ไม่มี operator
 * ถ้าเพิ่ม role ใหม่ต้องแก้ shared auth และ i18n พร้อมกัน.
 */
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
