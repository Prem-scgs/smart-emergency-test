import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminLayoutClient } from '@/widgets/admin-shell'
import { AlertDisplay } from '@/features/incident-alert'

/**
 * Shell ของหน้า dashboard หลัง login
 *
 * AdminLayoutClient ดูแล sidebar/header/auth guard ส่วน AlertDisplay ถูก mount
 * ข้าง shell เพื่อให้ popup incident ใหม่แสดงได้แม้ผู้ใช้อยู่หน้า contacts/reports/GIS.
 */
export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
      <AlertDisplay />
    </TooltipProvider>
  )
}
