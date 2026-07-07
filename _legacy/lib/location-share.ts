export interface LocationShareLocation {
  latitude: number
  longitude: number
  district?: string
  province?: string
}

export function formatLocationCoordinates(location: LocationShareLocation) {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
}

export function buildGoogleMapsLocationUrl(location: LocationShareLocation) {
  return `https://maps.google.com/?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`
}

export function buildSmsLocationShareUrl(location: LocationShareLocation) {
  const area = [location.district, location.province].filter(Boolean).join(', ')
  const body = [
    'ตำแหน่งฉุกเฉิน',
    area ? `พื้นที่: ${area}` : null,
    `พิกัด: ${formatLocationCoordinates(location)}`,
    buildGoogleMapsLocationUrl(location),
  ].filter((line): line is string => Boolean(line)).join('\n')

  return `sms:?${new URLSearchParams({ body }).toString()}`
}
