import type { AdminUser } from '@/shared/auth'
import type { Alert, Notification } from '../model/types.ts'

function getUserScopeCategory(user: AdminUser | null) {
  return user?.agency?.category ?? null
}

/**
 * ตัดสินว่า role นี้ควรได้ alert ที่ต้อง action หรือไม่
 *
 * viewer ยังรับ realtime event ผ่าน onEvent เพื่อ refresh dashboard ได้
 * แต่ไม่ควรมี popup, sound หรือ notification ที่ชวนให้จัดการเคส
 */
export function shouldCreateActionableAlert(user: AdminUser | null) {
  return user?.role !== 'viewer'
}

/**
 * กรอง notification ตามสิทธิ์หน่วยงาน
 *
 * super_admin เห็นทุกหมวด ส่วน agency_admin เห็นเฉพาะ category/agency ของตัวเอง
 * ถ้าแก้ตรงนี้ต้องทดสอบ notification bell, notification center และ alert popup พร้อมกัน
 */
export function canUserSeeNotification(user: AdminUser | null, notification: Notification) {
  if (!user) return false
  if (user.role === 'viewer') return false
  if (user.role === 'super_admin') return true

  const scopeCategory = getUserScopeCategory(user)
  if (scopeCategory && notification.category) {
    return notification.category === scopeCategory
  }

  if (notification.agencyId && user.agencyId) {
    return notification.agencyId === user.agencyId
  }

  return false
}

export function canUserSeeAlert(user: AdminUser | null, alert: Alert) {
  if (!user) return false
  if (user.role === 'viewer') return false
  if (user.role === 'super_admin') return true

  const scopeCategory = getUserScopeCategory(user)
  if (scopeCategory && alert.category) {
    return alert.category === scopeCategory
  }

  if (alert.agencyId && user.agencyId) {
    return alert.agencyId === user.agencyId
  }

  return false
}
