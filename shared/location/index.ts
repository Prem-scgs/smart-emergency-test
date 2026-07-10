/**
 * Public API ของ shared location layer
 *
 * รวม value type ของ location และ reference province/district loaders ที่ใช้ร่วมกัน
 * ใน mobile, dashboard, contacts, GIS และ notification formatting.
 */
export type { Location } from './model/types.ts'
export * from './reference-locations.ts'
