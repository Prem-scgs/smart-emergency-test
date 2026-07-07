export interface Location {
  latitude: number
  longitude: number
  provinceCode?: string
  province: string
  districtCode?: string
  district: string
  subdistrict?: string
  accuracy: number
  lastUpdated: Date
}
