import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MapPin,
  Phone,
  Settings,
} from 'lucide-react'

export const adminShellSidebarItems = [
  { href: '/admin/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/admin/contacts', labelKey: 'contacts', icon: Phone, permission: 'contacts.view' },
  { href: '/admin/call-logs', labelKey: 'callLogs', icon: FileText, permission: 'call-logs.view' },
  { href: '/admin/gis', labelKey: 'gis', icon: MapPin, permission: 'gis.view' },
  { href: '/admin/reports', labelKey: 'reports', icon: BarChart3, permission: 'reports.view' },
  { href: '/admin/settings', labelKey: 'settingsTitle', icon: Settings, permission: 'settings.view' },
] as const
