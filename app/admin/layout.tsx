import { AuthProvider } from '@/shared/auth'
import { AdminI18nProvider } from '@/shared/i18n/admin'
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
