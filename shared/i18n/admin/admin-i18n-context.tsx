"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { en } from './dictionaries/en'
import { th } from './dictionaries/th'
import {
  ADMIN_LANGUAGE_CHANGE_EVENT,
  ADMIN_SETTINGS_PREFERENCES_KEY,
} from './constants'

export type AdminLanguage = "th" | "en"

const dictionaries = { th, en } as const

type AdminDictionary = typeof th
export type AdminI18nKey = keyof AdminDictionary

interface AdminI18nContextValue {
  language: AdminLanguage
  t: (key: AdminI18nKey) => string
}

const AdminI18nContext = createContext<AdminI18nContextValue | null>(null)

function readStoredLanguage(): AdminLanguage {
  if (typeof window === "undefined") return "th"

  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_PREFERENCES_KEY)
    if (!raw) return "th"
    const parsed = JSON.parse(raw) as { language?: string }
    return parsed.language === "en" ? "en" : "th"
  } catch {
    return "th"
  }
}

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AdminLanguage>("th")

  useEffect(() => {
    const storedLanguage = readStoredLanguage()
    setLanguage(storedLanguage)
    document.documentElement.lang = storedLanguage

    const handleLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: AdminLanguage }>).detail
      const nextLanguage = detail?.language === "en" ? "en" : "th"
      setLanguage(nextLanguage)
      document.documentElement.lang = nextLanguage
    }

    window.addEventListener(ADMIN_LANGUAGE_CHANGE_EVENT, handleLanguageChange)
    return () => window.removeEventListener(ADMIN_LANGUAGE_CHANGE_EVENT, handleLanguageChange)
  }, [])

  const value = useMemo<AdminI18nContextValue>(() => {
    const dictionary = dictionaries[language]
    return {
      language,
      t: (key) => dictionary[key] ?? dictionaries.th[key],
    }
  }, [language])

  return (
    <AdminI18nContext.Provider value={value}>
      {children}
    </AdminI18nContext.Provider>
  )
}

export function useAdminI18n() {
  const context = useContext(AdminI18nContext)
  if (!context) {
    throw new Error("useAdminI18n must be used within AdminI18nProvider")
  }
  return context
}
