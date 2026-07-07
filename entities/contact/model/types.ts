import type { EmergencyCategory } from '@/entities/incident'

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
