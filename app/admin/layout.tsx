import { AuthProvider } from '@/shared/auth'
import { AdminI18nProvider } from '@/shared/i18n/admin'
import { NotificationProvider } from '@/features/incident-alert/model/notification-context'

export const dynamic = 'force-dynamic'

/**
 * Provider stack สำหรับ admin ทั้งหมด
 *
 * ลำดับนี้สำคัญ:
 * - AuthProvider ให้ user/role scope
 * - AdminI18nProvider ใช้ preference ภาษาใน admin
 * - NotificationProvider เปิด SSE หลัง auth พร้อม และ filter alert ตาม role
 *
 * ถ้าแก้ลำดับ provider ต้องทดสอบ viewer passive alert, notification center
 * และหน้า settings ที่เปลี่ยนภาษา/เสียง alert.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AdminI18nProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AdminI18nProvider>
    </AuthProvider>
  )
}
