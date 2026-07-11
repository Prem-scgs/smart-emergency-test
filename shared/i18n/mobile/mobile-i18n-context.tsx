'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { en } from './dictionaries/en'
import { th } from './dictionaries/th'
import {
  getStoredMobileLanguage,
  MOBILE_LANGUAGE_PREFERENCE_KEY,
  type MobileLanguage,
} from './preferences'

export const MOBILE_LANGUAGE_CHANGE_EVENT = 'smart-emergency:mobile-language-change'

const dictionaries = { th, en } as const

export type MobileI18nKey = keyof typeof th

interface MobileI18nContextValue {
  language: MobileLanguage
  locale: 'th-TH' | 'en-US'
  setLanguage: (language: MobileLanguage) => void
  t: (key: MobileI18nKey, values?: Record<string, string | number>) => string
}

const MobileI18nContext = createContext<MobileI18nContextValue | null>(null)

function formatTemplate(value: string, values?: Record<string, string | number>) {
  if (!values) return value
  return value.replace(/\{(\w+)\}/g, (placeholder, key) => String(values[key] ?? placeholder))
}

function readLanguage() {
  if (typeof window === 'undefined') return 'th' as const
  return getStoredMobileLanguage(window.localStorage, window.navigator.language)
}

/**
 * Provider ภาษาเฉพาะ mobile emergency flow
 *
 * ถูก mount ที่ `app/page.tsx` จึงไม่แชร์ preference กับ admin i18n. การเปลี่ยนภาษาจะ
 * บันทึกลงอุปกรณ์นี้, อัปเดต `html[lang]` เพื่อ accessibility และยิง custom event สำหรับ
 * integration ที่ต้องฟังการเปลี่ยนภาษา โดยไม่ส่งข้อมูลหรือแก้ contract ของ API.
 */
export function MobileI18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<MobileLanguage>('th')

  useEffect(() => {
    setLanguageState(readLanguage())
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<MobileI18nContextValue>(() => ({
    language,
    locale: language === 'en' ? 'en-US' : 'th-TH',
    setLanguage: nextLanguage => {
      window.localStorage.setItem(MOBILE_LANGUAGE_PREFERENCE_KEY, nextLanguage)
      setLanguageState(nextLanguage)
      window.dispatchEvent(new CustomEvent(MOBILE_LANGUAGE_CHANGE_EVENT, { detail: { language: nextLanguage } }))
    },
    // Thai เป็น fallback สุดท้าย เพื่อป้องกัน key อังกฤษที่เพิ่งเพิ่มทำให้ flow แจ้งเหตุแสดงค่าว่าง.
    t: (key, values) => formatTemplate(dictionaries[language][key] ?? dictionaries.th[key], values),
  }), [language])

  return <MobileI18nContext.Provider value={value}>{children}</MobileI18nContext.Provider>
}

/** ใช้ใน mobile route/widget เท่านั้น; ถ้า provider หายให้ fail เร็วแทนการแสดงข้อความผิดภาษา. */
export function useMobileI18n() {
  const context = useContext(MobileI18nContext)
  if (!context) throw new Error('useMobileI18n must be used within MobileI18nProvider')
  return context
}
