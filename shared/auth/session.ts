export const ADMIN_ACCESS_TOKEN_STORAGE_KEY = 'smart-emergency:admin-access-token'

export interface AdminTokenStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): unknown
  removeItem(key: string): unknown
}

function getSessionStorage(): AdminTokenStorage | undefined {
  return typeof window !== 'undefined' ? window.sessionStorage : undefined
}

/**
 * JWT อยู่ใน sessionStorage เท่านั้น จึงหมดไปเมื่อปิด browser session และไม่ปะปนกับ mobile/admin settings.
 * API helpers อ่าน token ผ่านฟังก์ชันนี้เพื่อส่ง Bearer header โดยไม่เชื่อ role ที่ browser สร้างเอง.
 */
export function getStoredAdminAccessToken(storage = getSessionStorage()) {
  return storage?.getItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY) ?? null
}

export function saveAdminAccessToken(token: string, storage = getSessionStorage()) {
  storage?.setItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY, token)
}

export function clearAdminAccessToken(storage = getSessionStorage()) {
  storage?.removeItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY)
}
