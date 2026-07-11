export type MobileLanguage = 'th' | 'en'

export const MOBILE_LANGUAGE_PREFERENCE_KEY = 'smart-emergency:mobile-language'

interface MapLikeStorage {
  get(key: string): string | undefined
}

interface BrowserStorage {
  getItem(key: string): string | null
}

/**
 * กำหนดภาษาเริ่มต้นเฉพาะ mobile flow จากภาษาของ browser/เครื่อง
 *
 * ค่าใน localStorage จะถูกตรวจทีหลังและมีสิทธิ์เหนือค่านี้เสมอ เพื่อไม่ให้
 * ผู้แจ้งเหตุถูกบังคับให้ใช้ภาษาตาม setting ของ admin หรือ browser ทุกครั้งที่กลับเข้าแอป
 */
export function getBrowserDefaultMobileLanguage(browserLanguage: string | undefined): MobileLanguage {
  return browserLanguage?.toLowerCase().startsWith('en') ? 'en' : 'th'
}

/**
 * คืนภาษาที่ mobile UI ต้องใช้ โดยรับเฉพาะ `th` และ `en` ที่เรา support จริง
 *
 * จุดนี้เป็น compatibility guard ของ localStorage: ถ้าค่าเก่าหรือค่าที่ผู้ใช้แก้เองไม่ถูกต้อง
 * ต้อง fallback ไป browser language แทน ไม่ให้หน้า incident/tracking render ด้วย locale ที่ไม่มี dictionary.
 */
export function getStoredMobileLanguage(
  storage: MapLikeStorage | BrowserStorage | undefined,
  browserLanguage: string | undefined,
): MobileLanguage {
  const storedLanguage = storage
    ? ('getItem' in storage
        ? storage.getItem(MOBILE_LANGUAGE_PREFERENCE_KEY)
        : storage.get(MOBILE_LANGUAGE_PREFERENCE_KEY))
    : undefined
  if (storedLanguage === 'th' || storedLanguage === 'en') return storedLanguage

  return getBrowserDefaultMobileLanguage(browserLanguage)
}
