import { AuthProvider } from '@/lib/auth-context'
import { NotificationProvider } from '@/lib/notification-context'

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </AuthProvider>
  )
}
