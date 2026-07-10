/**
 * Display helper ของพื้นที่/จังหวัด/อำเภอ
 *
 * เลือกชื่อไทย/อังกฤษจากข้อมูล master location ก่อน fallback เป็นชื่อพื้นที่
 * เพื่อให้ GIS และ dashboard แสดง label ตรงกับภาษา admin.
 */
export interface AreaDisplaySource {
  name: string
  areaType?: string | null
  provinceNameTh?: string | null
  provinceNameEn?: string | null
  districtNameTh?: string | null
  districtNameEn?: string | null
}

function getLocalizedName(
  preferThai: boolean,
  thaiName?: string | null,
  englishName?: string | null
) {
  return preferThai
    ? thaiName ?? englishName
    : englishName ?? thaiName
}

export function getProvinceDisplayName(area: AreaDisplaySource, preferThai: boolean) {
  return getLocalizedName(preferThai, area.provinceNameTh, area.provinceNameEn) ?? area.name
}

export function getDistrictDisplayName(area: AreaDisplaySource, preferThai: boolean) {
  return getLocalizedName(preferThai, area.districtNameTh, area.districtNameEn) ?? area.name
}

export function getAreaDisplayName(area: AreaDisplaySource, preferThai: boolean) {
  const provinceName = getLocalizedName(preferThai, area.provinceNameTh, area.provinceNameEn)
  const districtName = getLocalizedName(preferThai, area.districtNameTh, area.districtNameEn)

  return area.areaType === 'district'
    ? `${districtName ?? area.name}, ${provinceName ?? '-'}`
    : provinceName ?? area.name
}
