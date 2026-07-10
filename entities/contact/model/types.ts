import type { EmergencyCategory } from '@/entities/incident'

/**
 * Contact domain type ที่ mobile/admin ใช้ร่วมกัน
 *
 * `category` ผูกกับ incident category โดยตรง จึงกระทบ role scope, contact lookup
 * และ contacts CRUD ถ้าเพิ่ม/ลบหมวดต้องแก้ reference category ด้วย.
 */
export interface EmergencyContact {
  id: string
  agencyName: string
  phoneNumber: string
  category: EmergencyCategory
  provinceCode?: string
  province: string
  districtCode?: string
  district: string
  distance?: number
  status: 'active' | 'inactive'
  is24Hours: boolean
  coordinates?: {
    latitude: number
    longitude: number
  }
}
