export interface DashboardReferenceProvince {
  id: string
  provinceCode: string | null
  name: string
  nameTh?: string | null
  nameEn?: string | null
}

export interface DashboardReferenceDistrict {
  id: string
  provinceCode: string | null
  provinceNameTh?: string | null
  provinceNameEn?: string | null
  districtCode: string | null
  name: string
  nameTh?: string | null
  nameEn?: string | null
}

export interface DashboardLocationOption {
  key: string
  areaType: 'province' | 'district'
  label: string
  provinceCode: string | null
  province: string
  districtCode: string | null
  district: string | null
  searchable: string
}

export interface DashboardMapIncidentLike {
  id: string
  caseNumber?: string | null
  category: string
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
  areaName: string | null
}

function getDashboardLocationDisplayName(
  item:
    | { nameTh?: string | null; nameEn?: string | null; name: string }
    | null
    | undefined,
  preferThai = true
) {
  if (!item) return ''
  return preferThai
    ? item.nameTh ?? item.nameEn ?? item.name
    : item.nameEn ?? item.nameTh ?? item.name
}

export function normalizeDashboardMapText(value: string) {
  return value.trim().toLocaleLowerCase('th-TH').normalize('NFC')
}

export function buildDashboardLocationOptions(
  provinces: DashboardReferenceProvince[],
  districts: DashboardReferenceDistrict[],
  preferThai: boolean
): DashboardLocationOption[] {
  const provinceOptions = provinces.map(province => {
    const provinceName = getDashboardLocationDisplayName(province, preferThai)
    return {
      key: `province-${province.provinceCode ?? province.id}`,
      areaType: 'province' as const,
      label: provinceName,
      provinceCode: province.provinceCode ?? null,
      province: provinceName,
      districtCode: null,
      district: null,
      searchable: normalizeDashboardMapText(
        [provinceName, province.nameEn ?? '', province.provinceCode ?? ''].join(' ')
      ),
    }
  })

  const districtOptions = districts.map(district => {
    const provinceName =
      (preferThai
        ? district.provinceNameTh ?? district.provinceNameEn
        : district.provinceNameEn ?? district.provinceNameTh) ??
      district.provinceCode ??
      '-'
    const districtName = getDashboardLocationDisplayName(district, preferThai)

    return {
      key: `district-${district.districtCode ?? district.id}-${district.provinceCode ?? 'na'}`,
      areaType: 'district' as const,
      label: `${districtName} ${provinceName}`,
      provinceCode: district.provinceCode ?? null,
      province: provinceName,
      districtCode: district.districtCode ?? null,
      district: districtName,
      searchable: normalizeDashboardMapText(
        [
          districtName,
          provinceName,
          district.nameEn ?? '',
          district.provinceNameEn ?? '',
          district.districtCode ?? '',
          district.provinceCode ?? '',
        ].join(' ')
      ),
    }
  })

  return [...districtOptions, ...provinceOptions]
}

export function filterDashboardLocationOptions(
  locationOptions: DashboardLocationOption[],
  normalizedLocationQuery: string
) {
  if (normalizedLocationQuery.length === 0) return locationOptions.slice(0, 12)
  return locationOptions
    .filter(option => option.searchable.includes(normalizedLocationQuery))
    .slice(0, 20)
}

export function filterDashboardMapIncidents<T extends DashboardMapIncidentLike>(
  incidents: T[],
  categoryFilter: string | 'all',
  normalizedLocationQuery: string,
  selectedLocation: DashboardLocationOption | null
): T[] {
  return incidents.filter(incident => {
    const matchesCategory = categoryFilter === 'all' || incident.category === categoryFilter

    const provinceCode = incident.provinceCode?.trim() ?? ''
    const province = normalizeDashboardMapText(incident.province ?? '')
    const districtCode = incident.districtCode?.trim() ?? ''
    const district = normalizeDashboardMapText(incident.district ?? '')
    const areaName = normalizeDashboardMapText(incident.areaName ?? '')
    const locationHaystack = [areaName, district, province, provinceCode, districtCode]
      .join(' ')
      .trim()

    let matchesLocation = true

    if (selectedLocation) {
      if (selectedLocation.areaType === 'province') {
        matchesLocation =
          (selectedLocation.provinceCode != null &&
            selectedLocation.provinceCode.length > 0 &&
            provinceCode === selectedLocation.provinceCode) ||
          province.includes(normalizeDashboardMapText(selectedLocation.province))
      } else {
        matchesLocation =
          (((selectedLocation.provinceCode != null &&
            selectedLocation.provinceCode.length > 0 &&
            provinceCode === selectedLocation.provinceCode) ||
            province.includes(normalizeDashboardMapText(selectedLocation.province))) &&
            ((selectedLocation.districtCode != null &&
              selectedLocation.districtCode.length > 0 &&
              districtCode === selectedLocation.districtCode) ||
              [district, areaName].some(value =>
                value.includes(
                  normalizeDashboardMapText(selectedLocation.district ?? selectedLocation.label)
                )
              )))
      }
    } else if (normalizedLocationQuery.length > 0) {
      matchesLocation = locationHaystack.includes(normalizedLocationQuery)
    }

    return matchesCategory && matchesLocation
  })
}

export function localizeDashboardMapIncidents<T extends DashboardMapIncidentLike>(
  incidents: T[],
  provinceByCode: Record<string, DashboardReferenceProvince>,
  districtByCode: Record<string, DashboardReferenceDistrict>,
  preferThai: boolean,
  outsideAreaLabel: string
): Array<T & { province?: string | null; district?: string | null; areaName: string }> {
  return incidents.map(incident => {
    const provinceFromMaster = incident.provinceCode
      ? getDashboardLocationDisplayName(provinceByCode[incident.provinceCode], preferThai)
      : ''
    const districtFromMaster = incident.districtCode
      ? getDashboardLocationDisplayName(districtByCode[incident.districtCode], preferThai)
      : ''
    const province = provinceFromMaster || incident.province
    const district = districtFromMaster || incident.district
    const areaName =
      [district, province].filter(Boolean).join(' ') ||
      incident.areaName ||
      outsideAreaLabel

    return {
      ...incident,
      province,
      district,
      areaName,
    }
  })
}

export function getIncidentMapDisplayNumber(incident: { id: string; caseNumber?: string | null }) {
  return incident.caseNumber ?? incident.id.slice(0, 8)
}
