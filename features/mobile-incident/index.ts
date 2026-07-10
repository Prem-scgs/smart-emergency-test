/**
 * Public API ของ mobile incident feature
 *
 * รวม payload builder, location status และ reporter session helper ที่ MobileApp ใช้ตอน
 * สร้าง incident/update call state โดยไม่ให้ widget เขียน localStorage/payload shape เอง.
 */
export {
  buildIncidentCallUpdatePayload,
  buildIncidentCreatePayload,
  normalizeReporterPhone,
} from './lib/payload'
export {
  getLocationFailureStatus,
  locationStatusMessage,
  type LocationLockStatus,
} from './lib/location'
export {
  getOrCreateReporterSessionId,
  getStoredReporterPhone,
  setStoredReporterPhone,
} from './lib/reporter-session'
