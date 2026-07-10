/**
 * Location value type ของผู้ใช้/เหตุการณ์
 *
 * ใช้ข้าม mobile create incident, tracking, contact lookup และ history UI
 * ถ้าเปลี่ยน field ต้องตรวจ payload builder และ backend validation คู่กัน.
 */
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
