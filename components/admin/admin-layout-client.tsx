'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Shield,
  LayoutDashboard,
  Phone,
  FileText,
  MapPin,
  Settings,
  LogOut,
  ChevronLeft,
  Moon,
  Sun,
  Menu,
  Users,
  Bell,
  BarChart3,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { NotificationBell } from './notification-bell'

// Menu items with required permissions
const sidebarItems = [
  { href: '/admin/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/admin/contacts', label: 'ข้อมูลการติดต่อฉุกเฉิน', icon: Phone, permission: 'contacts.view' },
  { href: '/admin/call-logs', label: 'บันทึกการโทร', icon: FileText, permission: 'call-logs.view' },
  { href: '/admin/gis', label: 'จัดการ GIS', icon: MapPin, permission: 'gis.view' },
  { href: '/admin/users', label: 'จัดการผู้ใช้', icon: Users, permission: 'users.view' },
  { href: '/admin/reports', label: 'รายงานและสถิติ', icon: BarChart3, permission: 'reports.view' },
  { href: '/admin/settings', label: 'ตั้งค่าระบบ', icon: Settings, permission: 'settings.view' },
]

interface AdminLayoutClientProps {
  children: React.ReactNode
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const { user, isAuthenticated, hasPermission, logout, canViewAllAgencies } = useAuth()

  // Filter menu items based on user permissions
  const visibleMenuItems = useMemo(() => {
    return sidebarItems.filter(item => hasPermission(item.permission))
  }, [hasPermission])

  const handleLogout = () => {
    logout()
    router.push('/admin')
  }

  const getRoleBadge = () => {
    if (!user) return null
    
    const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      superadmin: { label: 'Superadmin', variant: 'default' },
      'agency-admin': { label: 'Agency Admin', variant: 'secondary' },
      operator: { label: 'Operator', variant: 'outline' },
      viewer: { label: 'Viewer', variant: 'outline' },
    }
    
    const roleInfo = roleLabels[user.role]
    return (
      <Badge variant={roleInfo.variant} className="text-xs">
        {roleInfo.label}
      </Badge>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 p-4 border-b',
        sidebarCollapsed && !mobile && 'justify-center'
      )}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        {(!sidebarCollapsed || mobile) && (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Smart Emergency</span>
            <span className="text-xs text-muted-foreground">
              {canViewAllAgencies() ? 'ศูนย์บัญชาการใหญ่' : user?.agency?.nameTh || 'Admin Portal'}
            </span>
          </div>
        )}
      </div>

      {/* Agency Info (for non-superadmin) */}
      {user?.agency && (!sidebarCollapsed || mobile) && (
        <div className="px-3 py-3 border-b">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.agency.nameTh}</p>
              <p className="text-xs text-muted-foreground">{user.agency.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {visibleMenuItems.map((item) => {
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
                {(!sidebarCollapsed || mobile) && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Collapse Button (desktop only) */}
      {!mobile && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={cn(
              'h-4 w-4 transition-transform',
              sidebarCollapsed && 'rotate-180'
            )} />
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r bg-card transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent mobile />
            </SheetContent>
          </Sheet>

          {/* Page Title & Breadcrumb */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                {visibleMenuItems.find(item => item.href === pathname)?.label || 'Admin'}
              </h1>
              {!canViewAllAgencies() && user?.agency && (
                <Badge variant="outline" className="text-xs">
                  {user.agency.nameTh}
                </Badge>
              )}
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationBell />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/avatars/admin.png" alt={user?.name || 'Admin'} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{user?.name || 'Admin User'}</p>
                      {getRoleBadge()}
                    </div>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'admin@smartemergency.gov'}
                    </p>
                    {user?.agency && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {user.agency.nameTh}
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  โปรไฟล์
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  ตั้งค่า
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
