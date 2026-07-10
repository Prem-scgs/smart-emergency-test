/**
 * Coverage model ของ contact
 *
 * กำหนดว่าหน่วยงานรับผิดชอบระดับส่วนกลาง/จังหวัด/อำเภอ และ normalize province/district
 * ให้สอดคล้องกับ coverage เพื่อไม่ส่งพื้นที่เกิน scope ไป backend.
 */
export type ContactCoverage = 'central' | 'province' | 'district'

export interface ContactCoverageState {
  coverage: ContactCoverage
  provinceCode: string
  districtCode: string
}

export const CONTACT_COVERAGE_OPTIONS: Array<{ value: ContactCoverage; label: string; description: string }> = [
  { value: 'central', label: 'ส่วนกลาง', description: 'ให้บริการได้ทุกพื้นที่' },
  { value: 'province', label: 'ระดับจังหวัด', description: 'ให้บริการทั้งจังหวัดที่เลือก' },
  { value: 'district', label: 'ระดับอำเภอ / เขต', description: 'ให้บริการเฉพาะอำเภอหรือเขตที่เลือก' },
]

export function getContactCoverageState(
  coverage: ContactCoverage,
  provinceCode: string,
  districtCode: string
): ContactCoverageState {
  const nextProvinceCode = coverage === 'central' ? '' : provinceCode
  const nextDistrictCode = coverage === 'district' && nextProvinceCode ? districtCode : ''

  return {
    coverage,
    provinceCode: nextProvinceCode,
    districtCode: nextDistrictCode,
  }
}

export function getContactCoverageFromValues(
  provinceCode: string | null | undefined,
  provinceName: string | null | undefined,
  districtCode: string | null | undefined,
  districtName: string | null | undefined
): ContactCoverage {
  if (districtCode || districtName) return 'district'
  if (provinceCode || provinceName) return 'province'
  return 'central'
}

export function getContactCoverageKind(contact: {
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
}): ContactCoverage {
  return getContactCoverageFromValues(
    contact.provinceCode,
    contact.province,
    contact.districtCode,
    contact.district
  )
}
