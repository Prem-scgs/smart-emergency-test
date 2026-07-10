/**
 * Storage key และ browser event ของ admin preferences
 *
 * Settings page, i18n provider และส่วนอื่นที่ preview language ต้องใช้ key/event เดียวกัน
 * เพื่อไม่ให้ภาษาใน UI กับค่าที่บันทึกไว้หลุด sync.
 */
export const ADMIN_SETTINGS_PREFERENCES_KEY = "admin_settings_preferences"
export const ADMIN_LANGUAGE_CHANGE_EVENT = "smart-emergency:admin-language-change"
