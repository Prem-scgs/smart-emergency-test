export type LocationLockStatus =
  | 'requesting'
  | 'locked'
  | 'denied'
  | 'unavailable'
  | 'timeout'

export function getLocationFailureStatus(
  code: number,
): Exclude<LocationLockStatus, 'requesting' | 'locked'> {
  if (code === 1) return 'denied'
  if (code === 3) return 'timeout'
  return 'unavailable'
}

export const locationStatusMessage: Record<LocationLockStatus, string> = {
  requesting: 'กำลังค้นหาตำแหน่งของคุณ',
  locked: 'ล็อกตำแหน่งสำเร็จ',
  denied: 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง',
  unavailable: 'อุปกรณ์ไม่สามารถระบุตำแหน่งได้',
  timeout: 'ค้นหาตำแหน่งไม่ทันเวลา กรุณาลองใหม่',
}
