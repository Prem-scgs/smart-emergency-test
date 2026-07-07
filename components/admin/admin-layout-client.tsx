'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  BarChart3,
  Building2,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Phone,
  Settings,
  Shield,
  Sun,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { buildAdminApiHeaders } from '@/lib/admin-api'
import { useAdminI18n, type AdminI18nKey } from '@/lib/admin-i18n'
import { useAuth } from '@/lib/auth-context'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { cn } from '@/lib/utils'

import { NotificationBell } from './notification-bell'

const sidebarItems = [
  { href: '/admin/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/admin/contacts', labelKey: 'contacts', icon: Phone, permission: 'contacts.view' },
  { href: '/admin/call-logs', labelKey: 'callLogs', icon: FileText, permission: 'call-logs.view' },
  { href: '/admin/gis', labelKey: 'gis', icon: MapPin, permission: 'gis.view' },
  { href: '/admin/reports', labelKey: 'reports', icon: BarChart3, permission: 'reports.view' },
  { href: '/admin/settings', labelKey: 'settingsTitle', icon: Settings, permission: 'settings.view' },
] as const

const API_BASE_URL = getEmergencyApiBaseUrl()
const ORGANIZATION_SETTINGS_UPDATED_EVENT = 'smart-emergency:organization-settings-updated'

interface OrganizationSettings {
  systemName: string
  organizationName: string
  timezone: string
}

const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  systemName: 'Smart Emergency',
  organizationName: 'ศูนย์บัญชาการเหตุฉุกเฉิน',
  timezone: 'Asia/Bangkok',
}

interface AdminLayoutClientProps {
  children: React.ReactNode
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { t } = useAdminI18n()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [organizationSettings, setOrganizationSettings] = useState(DEFAULT_ORGANIZATION_SETTINGS)

  const { user, isAuthenticated, isLoading, hasPermission, logout, canViewAllAgencies } = useAuth()

  const visibleMenuItems = useMemo(() => {
    return sidebarItems.filter(item => hasPermission(item.permission))
  }, [hasPermission])

  const handleLogout = () => {
    logout()
    router.push('/admin')
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isAuthenticated || !user) return

    let cancelled = false

    async function loadOrganizationSettings() {
      try {
        const response = await fetch(API_BASE_URL + '/api/admin/organization-settings', {
          headers: buildAdminApiHeaders(user),
        })
        if (!response.ok) throw new Error('organization settings unavailable')
        const data = (await response.json()) as { settings: OrganizationSettings }
        if (!cancelled) {
          setOrganizationSettings(data.settings)
        }
      } catch {
        if (!cancelled) {
          setOrganizationSettings(DEFAULT_ORGANIZATION_SETTINGS)
        }
      }
    }

    void loadOrganizationSettings()
    window.addEventListener(ORGANIZATION_SETTINGS_UPDATED_EVENT, loadOrganizationSettings)

    return () => {
      cancelled = true
      window.removeEventListener(ORGANIZATION_SETTINGS_UPDATED_EVENT, loadOrganizationSettings)
    }
  }, [isAuthenticated, user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t('checkingAdminAccess')}
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const getRoleBadge = () => {
    if (!user) return null

    const roleLabels: Record<string, { labelKey: AdminI18nKey; variant: 'default' | 'secondary' | 'outline' }> = {
      super_admin: { labelKey: 'roleSuperAdmin', variant: 'default' },
      agency_admin: { labelKey: 'roleAgencyAdmin', variant: 'secondary' },
      operator: { labelKey: 'roleOperator', variant: 'outline' },
      viewer: { labelKey: 'roleViewer', variant: 'outline' },
    }

    const roleInfo = roleLabels[user.role]
    if (!roleInfo) return null

    return (
      <Badge variant={roleInfo.variant} className="text-xs">
        {t(roleInfo.labelKey)}
      </Badge>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex items-center gap-3 border-b p-4',
          sidebarCollapsed && !mobile && 'justify-center'
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        {(!sidebarCollapsed || mobile) && (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{organizationSettings.systemName}</span>
            <span className="text-xs text-muted-foreground">
              {canViewAllAgencies()
                ? organizationSettings.organizationName
                : user?.agency?.nameTh || t('adminSystem')}
            </span>
          </div>
        )}
      </div>

      {user?.agency && (!sidebarCollapsed || mobile) && (
        <div className="border-b px-3 py-3">
          <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.agency.nameTh}</p>
              <p className="text-xs text-muted-foreground">{user.agency.description}</p>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {visibleMenuItems.map(item => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  sidebarCollapsed && !mobile && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(!sidebarCollapsed || mobile) && <span>{t(item.labelKey)}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {!mobile && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'hidden border-r bg-card transition-all duration-300 lg:flex lg:flex-col',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
          <Sheet>
            <SheetTrigger
              className="lg:hidden"
              render={<Button variant="ghost" size="icon" type="button" />}
            >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t('openMenu')}</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">{t('adminMenu')}</SheetTitle>
              <SidebarContent mobile />
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                {t(visibleMenuItems.find(item => item.href === pathname)?.labelKey ?? 'admin')}
              </h1>
              {!canViewAllAgencies() && user?.agency && (
                <Badge variant="outline" className="text-xs">
                  {user.agency.nameTh}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              type="button"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">{t('toggleTheme')}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" type="button" />
                }
              >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/avatars/admin.png" alt={user?.name || t('admin')} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                <div className="flex flex-col space-y-2 px-1.5 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{user?.name || t('adminFallbackName')}</p>
                    {getRoleBadge()}
                  </div>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || t('noEmail')}
                  </p>
                  {user?.agency && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {user.agency.nameTh}
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    router.push('/admin/settings')
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {t('settingsTitle')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
