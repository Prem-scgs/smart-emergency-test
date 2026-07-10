/**
 * Category domain ของเหตุฉุกเฉิน
 *
 * Union นี้ถูกใช้ทั้ง frontend, API payload และ role/category scope ถ้าเพิ่มหมวดใหม่
 * ต้องอัปเดต reference category, label, icon, permission และ smoke mobile/admin flow.
 */
export type EmergencyCategory =
  | 'police'
  | 'medical'
  | 'fire'
  | 'rescue'
  | 'flood'
  | 'road-accident'
  | 'child'
  | 'elderly'
  | 'animal'
  | 'tourist'

export interface EmergencyCategoryInfo {
  id: EmergencyCategory
  name: string
  description: string
  icon: string
  color: string
  bgColor: string
  recommendedAgency: string
}
