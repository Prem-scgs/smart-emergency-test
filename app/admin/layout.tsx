import { AuthProvider } from '@/shared/auth'
import { AdminI18nProvider } from '@/lib/admin-i18n'
import { NotificationProvider } from '@/features/incident-alert/model/notification-context'

export const dynamic = 'force-dynamic'

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
