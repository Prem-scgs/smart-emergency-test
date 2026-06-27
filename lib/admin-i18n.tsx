"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type AdminLanguage = "th" | "en"

export const ADMIN_SETTINGS_PREFERENCES_KEY = "admin_settings_preferences"
export const ADMIN_LANGUAGE_CHANGE_EVENT = "smart-emergency:admin-language-change"

const dictionaries = {
  th: {
    admin: "แอดมิน",
    adminSystem: "ระบบแอดมิน",
    commandCenter: "ศูนย์บัญชาการกลาง",
    checkingAdminAccess: "กำลังตรวจสอบสิทธิ์แอดมิน...",
    openMenu: "เปิดเมนู",
    adminMenu: "เมนูแอดมิน",
    toggleTheme: "สลับธีม",
    adminFallbackName: "ผู้ดูแลระบบ",
    noEmail: "ไม่ได้ระบุอีเมล",
    logout: "ออกจากระบบ",
    dashboard: "แดชบอร์ด",
    contacts: "ข้อมูลการติดต่อฉุกเฉิน",
    callLogs: "บันทึกการโทร",
    gis: "จัดการ GIS",
    reports: "รายงานและสถิติ",
    settingsTitle: "ตั้งค่าระบบ",
    roleSuperAdmin: "ผู้ดูแลระบบสูงสุด",
    roleAgencyAdmin: "ผู้ดูแลหน่วยงาน",
    roleOperator: "เจ้าหน้าที่ปฏิบัติการ",
    roleViewer: "ผู้ดูข้อมูล",
    settingsDescription: "จัดการค่าที่ใช้งานจริงของแอดมินและตรวจสถานะระบบตามสิทธิ์ role",
    settingsDraftHint: "ค่าที่เปลี่ยนจะยังไม่บันทึกถาวรจนกดบันทึก",
    reset: "รีเซ็ต",
    saveSettings: "บันทึก",
    settingsSaved: "บันทึกการตั้งค่าแล้ว",
    settingsReset: "รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น",
    myView: "มุมมองของคุณ",
    scopeSuperAdmin: "สิทธิ์: ผู้ดูแลสูงสุด",
    scopeOwnAgency: "สิทธิ์: ",
    canSeeSystemSettings: "เห็นการตั้งค่าทั้งระบบ",
    canSeePersonalSettings: "เห็นเฉพาะการตั้งค่าส่วนตัว",
    alertSound: "เสียง Alert",
    enabled: "เปิดใช้งาน",
    soundOff: "ปิดเสียง",
    centerChannels: "ช่องทางศูนย์",
    channelsEnabled: "ช่องทางเปิดใช้งาน",
    channelsFromBackend: "LINE / SMS / WhatsApp จาก backend",
    systemStatus: "สถานะระบบ",
    systemReady: "ระบบพร้อมใช้งาน",
    checking: "กำลังตรวจสอบ",
    systemNeedsCheck: "ต้องตรวจสอบระบบ",
    apiDatabaseSse: "API / Database / SSE",
    personalSettingsTab: "การตั้งค่าของฉัน",
    channelsTab: "ช่องทางศูนย์",
    healthTab: "สถานะระบบ",
    myNotifications: "การแจ้งเตือนของฉัน",
    myNotificationsDescription: "ตั้งค่าเสียงและรูปแบบการทำงานเฉพาะเบราว์เซอร์ของผู้ใช้คนนี้",
    enableAlertSound: "เปิดเสียง Alert",
    enableAlertSoundDescription: "ให้ popup แจ้งเหตุบนแดชบอร์ดเล่นเสียงเมื่อมีเคสใหม่",
    alertToneLabel: "รูปแบบเสียงแจ้งเตือน",
    alertToneDescription: "เลือกเสียงที่คุณได้ยินชัดที่สุดเมื่อมีเคสใหม่เข้าระบบ",
    testSound: "ทดสอบเสียง",
    display: "การแสดงผล",
    displayDescription: "ตั้งค่าการแสดงผลเฉพาะเครื่องที่กำลังใช้งาน",
    darkMode: "โหมดมืด",
    darkModeDescription: "ระบบจำค่าธีมอัตโนมัติในเบราว์เซอร์นี้",
    reducedMotion: "ลดแอนิเมชัน",
    reducedMotionDescription: "ลดเอฟเฟกต์การเคลื่อนไหวของ UI เช่น alert, dialog, hover และ scroll",
    languageAssistiveLabel: "ภาษาเอกสารและตัวช่วยอ่านหน้าจอ",
    languageAssistiveDescription: "ใช้กำหนดภาษาเอกสารและตัวช่วยอ่านหน้าจอ ตอนนี้ยังไม่แปลข้อความทั้งระบบ",
    thai: "ไทย",
    english: "English",
    toneSoft: "เบา",
    toneClear: "ชัด",
    toneUrgent: "เร่งจังหวะ",
    channelCenterDescription: "ช่องทางที่ประชาชนใช้เปิดแอปภายนอกเพื่อแชร์จุดเกิดเหตุกลับศูนย์",
    lineEnvDescription: "เปิดผ่านค่า LINE_OA_ID ใน API environment",
    smsEnvDescription: "เปิดผ่านค่า SMS_CENTER_PHONE ใน API environment",
    whatsappEnvDescription: "เปิดผ่านค่า WHATSAPP_CENTER_PHONE ใน API environment",
    noSecretsShown: "หน้านี้แสดงสถานะเท่านั้น ไม่แสดงหรือแก้ไข credential จริงจาก .env",
    channelOn: "เปิดใช้งาน",
    channelOff: "ยังไม่เปิดใช้งาน",
    statusReady: "พร้อมใช้งาน",
    statusUnavailable: "ไม่พร้อมใช้งาน",
    healthDescription: "ข้อมูลจริงแบบอ่านอย่างเดียวสำหรับตรวจความพร้อมของระบบ",
    healthApiHint: "ตรวจจาก endpoint /health",
    healthDbPending: "รอผลจาก API health",
    healthDbCheckedPrefix: "เช็ค DB ล่าสุด: ",
    healthSseHint: "ฟังสถานะจาก SSE connection หลัก ไม่เปิด connection ซ้ำ",
    pendingSystemWork: "งานระบบที่ยังรอออกแบบ",
    pendingSystemWorkDescription: "แสดงเป็นสถานะอ่านอย่างเดียวเพื่อไม่ให้มี toggle หลอกในระบบ",
    autoDispatchPending: "อยู่ใน scope แต่ต้องออกแบบ DB/API ก่อนเปิดใช้งานจริง",
    escalationPending: "อยู่ใน scope แต่ยังไม่เพิ่ม migration ในรอบนี้",
  },
  en: {
    admin: "Admin",
    adminSystem: "Admin system",
    commandCenter: "Central Command Center",
    checkingAdminAccess: "Checking admin access...",
    openMenu: "Open menu",
    adminMenu: "Admin menu",
    toggleTheme: "Toggle theme",
    adminFallbackName: "Administrator",
    noEmail: "No email provided",
    logout: "Log out",
    dashboard: "Dashboard",
    contacts: "Emergency contacts",
    callLogs: "Call logs",
    gis: "GIS management",
    reports: "Reports and statistics",
    settingsTitle: "Settings",
    roleSuperAdmin: "Super admin",
    roleAgencyAdmin: "Agency admin",
    roleOperator: "Operator",
    roleViewer: "Viewer",
    settingsDescription: "Manage real admin preferences and inspect system status by role",
    settingsDraftHint: "Changes are not saved permanently until you click Save",
    reset: "Reset",
    saveSettings: "Save",
    settingsSaved: "Settings saved",
    settingsReset: "Settings reset to defaults",
    myView: "Your view",
    scopeSuperAdmin: "Scope: super admin",
    scopeOwnAgency: "Scope: ",
    canSeeSystemSettings: "Can view system settings",
    canSeePersonalSettings: "Can view personal settings only",
    alertSound: "Alert sound",
    enabled: "Enabled",
    soundOff: "Muted",
    centerChannels: "Center channels",
    channelsEnabled: "channels enabled",
    channelsFromBackend: "LINE / SMS / WhatsApp from backend",
    systemStatus: "System status",
    systemReady: "System ready",
    checking: "Checking",
    systemNeedsCheck: "Needs review",
    apiDatabaseSse: "API / Database / SSE",
    personalSettingsTab: "My settings",
    channelsTab: "Center channels",
    healthTab: "System status",
    myNotifications: "My notifications",
    myNotificationsDescription: "Configure alert sound and behavior for this browser",
    enableAlertSound: "Enable alert sound",
    enableAlertSoundDescription: "Play a sound on dashboard alert popups when a new case arrives",
    alertToneLabel: "Alert tone",
    alertToneDescription: "Choose the sound you can hear most clearly when a new case arrives",
    testSound: "Test sound",
    display: "Display",
    displayDescription: "Configure display preferences for this device",
    darkMode: "Dark mode",
    darkModeDescription: "The browser remembers this theme automatically",
    reducedMotion: "Reduce animation",
    reducedMotionDescription: "Reduce UI motion effects such as alerts, dialogs, hover states, and scroll",
    languageAssistiveLabel: "Document and screen reader language",
    languageAssistiveDescription: "Sets document and screen reader language. Full UI translation is being rolled out.",
    thai: "ไทย",
    english: "English",
    toneSoft: "Soft",
    toneClear: "Clear",
    toneUrgent: "Urgent pulse",
    channelCenterDescription: "Channels citizens use to open external apps and share incident location back to the center",
    lineEnvDescription: "Enabled by LINE_OA_ID in the API environment",
    smsEnvDescription: "Enabled by SMS_CENTER_PHONE in the API environment",
    whatsappEnvDescription: "Enabled by WHATSAPP_CENTER_PHONE in the API environment",
    noSecretsShown: "This page only shows status. It does not display or edit real .env credentials.",
    channelOn: "Enabled",
    channelOff: "Not enabled",
    statusReady: "Ready",
    statusUnavailable: "Unavailable",
    healthDescription: "Read-only live status for checking system readiness",
    healthApiHint: "Checked from /health endpoint",
    healthDbPending: "Waiting for API health result",
    healthDbCheckedPrefix: "Last DB check: ",
    healthSseHint: "Listens to the primary SSE connection without opening a duplicate connection",
    pendingSystemWork: "System work pending design",
    pendingSystemWorkDescription: "Shown as read-only status to avoid fake toggles",
    autoDispatchPending: "In scope, but DB/API design is required before enabling",
    escalationPending: "In scope, but no migration is added in this round",
  },
} as const

type AdminDictionary = typeof dictionaries.th
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
