import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MapPin,
  Phone,
  Settings,
  Users,
} from 'lucide-react'

import { adminRouteDefinitions } from './route-permissions'

/**
 * เมนู sidebar และ route guard ต้องใช้ route definition ชุดเดียวกัน
 *
 * อย่าสร้าง permission map ซ้ำใน component เพราะจะเกิดกรณีเมนูถูกซ่อนแต่ผู้ใช้ยังเปิด URL ตรงได้
 * ไฟล์นี้เติมเฉพาะ icon ซึ่งเป็นรายละเอียดการแสดงผลของ sidebar
 */
const sidebarIcons = {
  '/admin/dashboard': LayoutDashboard,
  '/admin/contacts': Phone,
  '/admin/call-logs': FileText,
  '/admin/gis': MapPin,
  '/admin/reports': BarChart3,
  '/admin/settings': Settings,
  '/admin/users': Users,
} as const

export const adminShellSidebarItems = adminRouteDefinitions
  .filter(route => route.showInSidebar)
  .map(route => ({ ...route, icon: sidebarIcons[route.href] }))
