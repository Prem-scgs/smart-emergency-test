import {
  ADMIN_LANGUAGE_CHANGE_EVENT,
  ADMIN_SETTINGS_PREFERENCES_KEY,
} from "../../../shared/i18n/admin/constants.ts"

import type { AdminSettingsPreferences, LanguagePreference } from "../model/types"

export const DEFAULT_SETTINGS_PREFERENCES: AdminSettingsPreferences = {
  language: "th",
  reducedMotion: false,
}

export function getStoredSettingsPreferences(): AdminSettingsPreferences {
  if (typeof window === "undefined") return DEFAULT_SETTINGS_PREFERENCES

  const raw = window.localStorage.getItem(ADMIN_SETTINGS_PREFERENCES_KEY)
  if (!raw) return DEFAULT_SETTINGS_PREFERENCES

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSettingsPreferences>
    return {
      language: parsed.language === "en" ? "en" : "th",
      reducedMotion:
        typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : DEFAULT_SETTINGS_PREFERENCES.reducedMotion,
    }
  } catch {
    return DEFAULT_SETTINGS_PREFERENCES
  }
}

export function saveSettingsPreferences(preferences: AdminSettingsPreferences) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    ADMIN_SETTINGS_PREFERENCES_KEY,
    JSON.stringify(preferences)
  )
  document.documentElement.lang = preferences.language
  document.documentElement.classList.toggle("reduce-motion", preferences.reducedMotion)
  window.dispatchEvent(
    new CustomEvent(ADMIN_LANGUAGE_CHANGE_EVENT, {
      detail: { language: preferences.language },
    })
  )
}

export function previewSettingsLanguage(language: LanguagePreference) {
  if (typeof window === "undefined") return

  document.documentElement.lang = language
  window.dispatchEvent(
    new CustomEvent(ADMIN_LANGUAGE_CHANGE_EVENT, {
      detail: { language },
    })
  )
}
