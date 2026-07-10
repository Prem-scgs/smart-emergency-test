/**
 * Public API ของ shared realtime helpers
 *
 * เก็บเฉพาะ pure helper/type สำหรับ SSE/polling/mobile tracking ส่วน React hook ของ admin
 * อยู่ใน `features/incident-alert` เพื่อไม่ให้ shared layer ผูกกับ UI.
 */
export * from './incident-events'
export * from './mobile-tracking'
