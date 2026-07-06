import type { AdminUser, Alert, Notification } from '@/lib/types'

function getUserScopeCategory(user: AdminUser | null) {
  return user?.agency?.category ?? null
}

export function shouldCreateActionableAlert(user: AdminUser | null) {
  return user?.role !== 'viewer'
}

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
