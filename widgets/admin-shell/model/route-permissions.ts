export const adminRouteDefinitions = [
  { href: '/admin/dashboard', labelKey: 'dashboard', permission: 'dashboard.view', showInSidebar: true },
  { href: '/admin/contacts', labelKey: 'contacts', permission: 'contacts.view', showInSidebar: true },
  { href: '/admin/call-logs', labelKey: 'callLogs', permission: 'call-logs.view', showInSidebar: true },
  { href: '/admin/gis', labelKey: 'gis', permission: 'gis.view', showInSidebar: true },
  { href: '/admin/reports', labelKey: 'reports', permission: 'reports.view', showInSidebar: true },
  { href: '/admin/settings', labelKey: 'settingsTitle', permission: 'settings.view', showInSidebar: true },
  { href: '/admin/users', labelKey: 'users', permission: 'users.view', showInSidebar: true },
] as const

export type AdminRouteDefinition = (typeof adminRouteDefinitions)[number]

/**
 * หา owner permission ของหน้า admin จาก path ปัจจุบัน
 *
 * เราเลือก prefix ที่ยาวที่สุดเพื่อให้ nested route เช่น `/admin/users/:id` รับสิทธิ์จาก
 * `/admin/users` อย่างถูกต้อง หากเพิ่ม nested route ที่มีขอบเขตต่างจาก parent ต้องเพิ่ม owner
 * ใน map นี้ ไม่อย่างนั้น route ที่เฉพาะกว่าจะใช้ permission ของ parent โดยตั้งใจ
 */
export function findAdminRouteDefinition(pathname: string): AdminRouteDefinition | null {
  return adminRouteDefinitions.reduce<AdminRouteDefinition | null>((longestMatch, route) => {
    const matches = pathname === route.href || pathname.startsWith(`${route.href}/`)
    if (!matches || (longestMatch && longestMatch.href.length >= route.href.length)) {
      return longestMatch
    }
    return route
  }, null)
}
