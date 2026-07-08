import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminLayoutClient } from '@/widgets/admin-shell'
import { AlertDisplay } from '@/features/incident-alert'

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
