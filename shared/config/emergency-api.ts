export interface ApiLocation {
  origin: string
}

export function getEmergencyApiBaseUrl(
  location: ApiLocation | undefined = typeof window === 'undefined' ? undefined : window.location,
  configuredUrl =
    process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL ??
    process.env.NEXT_PUBLIC_EMERGENCY_API_URL,
) {
  // บน Vercel ให้ REST/polling วิ่งผ่าน same-origin rewrite เพื่อตัดปัญหา CORS ของ Cloudflare tunnel
  if (configuredUrl && location?.origin) {
    try {
      const origin = new URL(location.origin)
      if (origin.hostname !== 'localhost' && origin.hostname !== '127.0.0.1') {
        return '/emergency-api'
      }
    } catch {
      return configuredUrl.replace(/\/$/, '')
    }
  }

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  return '/emergency-api'
}

export function getEmergencyApiEventsBaseUrl(
  location: ApiLocation | undefined = typeof window === 'undefined' ? undefined : window.location,
  configuredUrl =
    process.env.NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL ??
    process.env.NEXT_PUBLIC_EMERGENCY_SSE_URL ??
    process.env.NEXT_PUBLIC_EMERGENCY_API_EVENTS_URL ??
    process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL ??
    process.env.NEXT_PUBLIC_EMERGENCY_API_URL,
) {
  // SSE ใช้ base URL แยกได้ เพราะ EventSource เปิด connection ยาวและบาง tunnel/proxy ต้อง config ต่างจาก REST
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  if (location?.origin) {
    try {
      const origin = new URL(location.origin)
      if (origin.hostname === 'localhost' || origin.hostname === '127.0.0.1') {
        origin.port = '4000'
        return origin.toString().replace(/\/$/, '')
      }
    } catch {
      return getEmergencyApiBaseUrl(location)
    }
  }

  return getEmergencyApiBaseUrl(location)
}
