import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'

export default function AdminLayout({
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
