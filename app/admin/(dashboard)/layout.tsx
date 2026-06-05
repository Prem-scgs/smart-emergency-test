import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </TooltipProvider>
  )
}
