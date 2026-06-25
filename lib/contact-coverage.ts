'use client'

export type ContactCoverage = 'central' | 'province' | 'district'

export const CONTACT_COVERAGE_OPTIONS: Array<{ value: ContactCoverage; label: string; description: string }> = [
  { value: 'central', label: 'ส่วนกลาง', description: 'ให้บริการได้ทุกพื้นที่' },
  { value: 'province', label: 'ระดับจังหวัด', description: 'ให้บริการทั้งจังหวัดที่เลือก' },
  { value: 'district', label: 'ระดับอำเภอ / เขต', description: 'ให้บริการเฉพาะอำเภอหรือเขตที่เลือก' },
]

export function getContactCoverageState(
  coverage: ContactCoverage,
  provinceCode: string,
  districtCode: string
) {
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


export function getSelectOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
  fallback: string
) {
  return options.find(option => option.value === value)?.label ?? fallback
}


export function normalizeContactPhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export function isValidContactPhone(phone: string) {
  const normalizedPhone = normalizeContactPhone(phone)
  return /^(?:\d{3,4}|0\d{8,9})$/.test(normalizedPhone)
}

export function getContactRole(role?: string | null) {
  return role?.trim() || 'responder'
}
