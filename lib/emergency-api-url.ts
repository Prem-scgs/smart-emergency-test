export interface ApiLocation {
  origin: string
}

export function getEmergencyApiBaseUrl(
  location: ApiLocation | undefined = typeof window === 'undefined' ? undefined : window.location,
  configuredUrl = process.env.NEXT_PUBLIC_EMERGENCY_API_URL,
) {
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  return '/emergency-api'
}
