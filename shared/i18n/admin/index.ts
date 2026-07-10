/**
 * Public API ของ admin i18n
 *
 * ให้ widgets/features import provider, hook, key และ constants จาก path เดียว
 * แทนการผูกกับไฟล์ dictionary/context ภายในโดยตรง.
 */
export {
  AdminI18nProvider,
  useAdminI18n,
} from './admin-i18n-context'

export {
  ADMIN_LANGUAGE_CHANGE_EVENT,
  ADMIN_SETTINGS_PREFERENCES_KEY,
} from './constants'

export type {
  AdminI18nKey,
  AdminLanguage,
} from './admin-i18n-context'
