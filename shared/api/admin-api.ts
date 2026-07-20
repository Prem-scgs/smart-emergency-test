import type { AdminUser } from '@/shared/auth'
import { getStoredAdminAccessToken } from '../auth/session.ts'

export interface BackendAdminScope {
  role: 'super_admin' | 'agency_admin' | 'viewer'
  category: string | null
}

function normalizeLegacyAgencyCategory(category: string | undefined) {
  if (!category) return null

  // Session รุ่นเก่าเคยเก็บ agencyId เป็น agency-medical แต่ backend ต้องการ category จริงคือ medical
  return category.startsWith('agency-') ? category.slice('agency-'.length) : category
}

/**
 * แปลง user ฝั่ง frontend เป็น scope ที่ backend mock auth เข้าใจ
 *
 * REST request ส่ง JWT ที่ backend ตรวจแล้วเท่านั้น ส่วน EventSource ใช้ one-time SSE ticket
 * ห้ามนำ role/category จาก profile กลับไปใส่ header/query เพราะ browser สามารถปลอมค่านั้นได้
 */
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

export function buildAdminApiHeaders(
  _user: AdminUser | null | undefined,
  accessToken = getStoredAdminAccessToken(),
): Record<string, string> {
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    'Content-Type': 'application/json',
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

export function buildAdminApiUrl(
  baseUrl: string,
  path: string,
  _user: AdminUser | null | undefined,
) {
  return buildApiUrl(baseUrl, path, new URLSearchParams())
}

export function buildAdminEventsUrl(baseUrl: string, ticket: string) {
  const searchParams = new URLSearchParams({ ticket })

  return buildApiUrl(baseUrl, '/api/events', searchParams)
}
