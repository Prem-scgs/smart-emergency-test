import type { AdminUser } from './types'

export interface BackendAdminScope {
  role: 'super_admin' | 'agency_admin'
  category: string | null
}

export function getBackendAdminScope(user: AdminUser | null | undefined): BackendAdminScope | null {
  if (!user) return null

  if (user.role === 'super_admin') {
    return { role: 'super_admin', category: null }
  }

  if (user.role === 'agency_admin' && user.agency?.category) {
    return { role: 'agency_admin', category: user.agency.category }
  }

  return null
}

export function buildAdminApiHeaders(user: AdminUser | null | undefined): HeadersInit {
  const scope = getBackendAdminScope(user)

  if (!scope) return {}

  return {
    'x-admin-role': scope.role,
    ...(scope.category ? { 'x-admin-category': scope.category } : {}),
  }
}

export function buildAdminEventsUrl(baseUrl: string, user: AdminUser | null | undefined) {
  const scope = getBackendAdminScope(user)
  const url = new URL('/api/events', baseUrl)

  if (!scope) return url.toString()

  url.searchParams.set('role', scope.role)
  if (scope.category) {
    url.searchParams.set('category', scope.category)
  }

  return url.toString()
}
