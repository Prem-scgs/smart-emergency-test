export type LanguagePreference = "th" | "en"
export type HealthStatus = "checking" | "online" | "offline"
export type SseStatus = "connecting" | "connected" | "disconnected" | "unknown"
export type ShareChannelName = "line" | "sms" | "whatsapp"
export type ShareChannelSource = "db" | "env" | "none"

export interface AdminSettingsPreferences {
  language: LanguagePreference
  reducedMotion: boolean
}

export interface OrganizationSettings {
  systemName: string
  organizationName: string
  timezone: "Asia/Bangkok" | "UTC"
}

export interface ShareChannelState {
  line: { enabled: boolean; maskedValue: string | null; source: ShareChannelSource }
  sms: { enabled: boolean; maskedValue: string | null; source: ShareChannelSource }
  whatsapp: { enabled: boolean; maskedValue: string | null; source: ShareChannelSource }
}

export interface ShareChannelDraft {
  enabled: boolean
  recipientValue: string
}

