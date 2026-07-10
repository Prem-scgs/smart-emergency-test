/**
 * Public API ของ contact entity
 *
 * รวม coverage, display, phone และ scope helpers ที่ contacts page/backend-facing UI
 * ใช้ร่วมกัน เพื่อกัน permission/category logic ซ้ำหลายที่.
 */
export * from './model/coverage.ts'
export type { EmergencyContact } from './model/types.ts'
export * from './lib/display.ts'
export * from './lib/phone.ts'
export * from './lib/scope.ts'
