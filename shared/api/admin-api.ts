import type { AdminUser } from '@/lib/types'

export interface BackendAdminScope {
  role: 'super_admin' | 'agency_admin' | 'viewer'
  category: string | null
}

export function getBackendAdminScope(user: AdminUser | null | undefined): BackendAdminScope | null {
  if (!user) return null

  if (user.role === 'super_admin') {
    return { role: 'super_admin', category: null }
  }

  if ((user.role === 'agency_admin' || user.role === 'viewer') && user.agency?.category) {
    return { role: user.role, category: user.agency.category }
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

function buildApiUrl(baseUrl: string, path: string, searchParams: URLSearchParams) {
  const base = baseUrl.replace(/\/$/, '')

  if (/^https?:\/\//i.test(base)) {
    const url = new URL(path, base)
    searchParams.forEach((value, key) => url.searchParams.set(key, value))
    return url.toString()
  }

  const query = searchParams.toString()
  return `${base}${path}${query ? `?${query}` : ''}`
}

export function buildAdminEventsUrl(baseUrl: string, user: AdminUser | null | undefined) {
  const scope = getBackendAdminScope(user)
  const searchParams = new URLSearchParams()

  if (scope) {
    searchParams.set('role', scope.role)
    if (scope.category) {
      searchParams.set('category', scope.category)
    }
  }

  return buildApiUrl(baseUrl, '/api/events', searchParams)
}
