import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'
import { AlertDisplay } from '@/components/admin/alert-display'

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
