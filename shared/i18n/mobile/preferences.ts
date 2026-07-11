export type MobileLanguage = 'th' | 'en'

export const MOBILE_LANGUAGE_PREFERENCE_KEY = 'smart-emergency:mobile-language'

interface MapLikeStorage {
  get(key: string): string | undefined
}

interface BrowserStorage {
  getItem(key: string): string | null
}

export function getBrowserDefaultMobileLanguage(browserLanguage: string | undefined): MobileLanguage {
  return browserLanguage?.toLowerCase().startsWith('en') ? 'en' : 'th'
}

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
