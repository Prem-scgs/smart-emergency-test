'use client'

export type AlertTonePreset = 'soft-chime' | 'alert-beep' | 'siren-pulse'

export interface AdminAlertPreferences {
  enabled: boolean
  tone: AlertTonePreset
}

export const ADMIN_ALERT_PREFERENCES_KEY = 'admin_alert_preferences'
export const ADMIN_ALERT_PREFERENCES_EVENT = 'smart-emergency:alert-preferences-changed'

export const DEFAULT_ADMIN_ALERT_PREFERENCES: AdminAlertPreferences = {
  enabled: true,
  tone: 'alert-beep',
}

/**
 * อ่าน preference เสียง alert จาก localStorage
 *
 * key นี้ผูกกับหน้า Settings และ AlertDisplay ถ้าเปลี่ยนชื่อ key จะทำให้ setting เดิมของผู้ใช้หาย
 */
export function getStoredAdminAlertPreferences(): AdminAlertPreferences {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_ALERT_PREFERENCES

  const raw = window.localStorage.getItem(ADMIN_ALERT_PREFERENCES_KEY)
  if (!raw) return DEFAULT_ADMIN_ALERT_PREFERENCES

  try {
    const parsed = JSON.parse(raw) as Partial<AdminAlertPreferences>

    return {
      enabled:
        typeof parsed.enabled === 'boolean'
          ? parsed.enabled
          : DEFAULT_ADMIN_ALERT_PREFERENCES.enabled,
      tone:
        parsed.tone === 'soft-chime' ||
        parsed.tone === 'alert-beep' ||
        parsed.tone === 'siren-pulse'
          ? parsed.tone
          : DEFAULT_ADMIN_ALERT_PREFERENCES.tone,
    }
  } catch {
    return DEFAULT_ADMIN_ALERT_PREFERENCES
  }
}

export function saveAdminAlertPreferences(preferences: AdminAlertPreferences) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(ADMIN_ALERT_PREFERENCES_KEY, JSON.stringify(preferences))
  window.dispatchEvent(
    new CustomEvent(ADMIN_ALERT_PREFERENCES_EVENT, {
      detail: preferences,
    })
  )
}
