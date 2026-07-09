'use client'

const SESSION_KEY = 'smart-emergency:reporter-session-id'
const PHONE_KEY = 'smart-emergency:reporter-phone'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * คืน session id ของผู้แจ้งบนเครื่องนี้
 *
 * ระบบ mobile ยังไม่มี user login จริง จึงใช้ localStorage session นี้ผูก incident create,
 * tracking, history และ SSE events เข้ากับเครื่องเดียวกันแทน identity ของบัญชีผู้ใช้
 */
export function getOrCreateReporterSessionId(): string {
  if (!canUseStorage()) return 'session-server'

  const existing = window.localStorage.getItem(SESSION_KEY)
  if (existing) return existing

  const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'session-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

  window.localStorage.setItem(SESSION_KEY, next)
  return next
}

export function getStoredReporterPhone(): string {
  if (!canUseStorage()) return ''
  return window.localStorage.getItem(PHONE_KEY) ?? ''
}

export function setStoredReporterPhone(phone: string): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(PHONE_KEY, phone)
}
