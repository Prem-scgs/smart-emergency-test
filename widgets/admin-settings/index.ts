/**
 * Public API ของ admin settings widget
 *
 * SettingsPage ถือ personal preferences, organization settings, share channels
 * และ health snapshot UI ทั้งหมด เพื่อให้ route shell ไม่แตะ browser/API state.
 */
export { default as SettingsPage } from "./ui/settings-page"
export type {
  AdminSettingsPreferences,
  HealthStatus,
  LanguagePreference,
  OrganizationSettings,
  ShareChannelDraft,
  ShareChannelName,
  ShareChannelSource,
  ShareChannelState,
  SseStatus,
} from "./model/types"
