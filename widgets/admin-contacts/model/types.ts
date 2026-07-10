/**
 * Types เฉพาะ contacts widget
 *
 * แยก type form ออกจาก API shape เพื่อให้ dialog state คุม string/boolean fallback
 * ได้ชัดเจนก่อนส่งกลับ `/api/contacts`.
 */
export interface Contact {
  id: string
  name: string
  phone: string
  role: string | null
  category: string | null
  provinceCode: string | null
  province: string | null
  districtCode: string | null
  district: string | null
  is24Hours: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ContactFormState {
  name: string
  phone: string
  category: string
  is24Hours: boolean
  active: boolean
}
