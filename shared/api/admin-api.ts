import type { AdminUser } from '@/shared/auth'

export interface BackendAdminScope {
  role: 'super_admin' | 'agency_admin' | 'viewer'
  category: string | null
}

function normalizeLegacyAgencyCategory(category: string | undefined) {
  if (!category) return null

  // Session รุ่นเก่าเคยเก็บ agencyId เป็น agency-medical แต่ backend ต้องการ category จริงคือ medical
  return category.startsWith('agency-') ? category.slice('agency-'.length) : category
}

export function getBackendAdminScope(user: AdminUser | null | undefined): BackendAdminScope | null {
  if (!user) return null

  if (user.role === 'super_admin') {
    return { role: 'super_admin', category: null }
  }

  if (user.role === 'agency_admin' || user.role === 'viewer') {
    // Session เก่าบางเครื่องเก็บไว้แค่ agencyId; fallback นี้ทำให้ viewer ยังส่ง scope เพื่ออ่าน detail ได้
    const category = normalizeLegacyAgencyCategory(user.agency?.category ?? user.agencyId)
    if (category) return { role: user.role, category }
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

function appendAdminScope(searchParams: URLSearchParams, user: AdminUser | null | undefined) {
  const scope = getBackendAdminScope(user)

  if (!scope) return

  searchParams.set('role', scope.role)
  if (scope.category) {
    searchParams.set('category', scope.category)
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

export function buildAdminApiUrl(baseUrl: string, path: string, user: AdminUser | null | undefined) {
  const searchParams = new URLSearchParams()
  appendAdminScope(searchParams, user)

  return buildApiUrl(baseUrl, path, searchParams)
}

export function buildAdminEventsUrl(baseUrl: string, user: AdminUser | null | undefined) {
  const searchParams = new URLSearchParams()
  appendAdminScope(searchParams, user)

  return buildApiUrl(baseUrl, '/api/events', searchParams)
}
