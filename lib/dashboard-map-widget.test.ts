import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDashboardLocationOptions,
  filterDashboardLocationOptions,
  filterDashboardMapIncidents,
  getIncidentMapDisplayNumber,
  localizeDashboardMapIncidents,
  normalizeDashboardMapText,
  type DashboardLocationOption,
} from '../widgets/dashboard-map/index.ts'
import type { ReferenceDistrict, ReferenceProvince } from './reference-locations.ts'

const provinces: ReferenceProvince[] = [
  {
    id: 'province-65',
    provinceCode: '65',
    name: 'Phitsanulok',
    nameTh: 'พิษณุโลก',
    nameEn: 'Phitsanulok',
  },
]

const districts: ReferenceDistrict[] = [
  {
    id: 'district-6501',
    provinceCode: '65',
    provinceNameTh: 'พิษณุโลก',
    provinceNameEn: 'Phitsanulok',
    districtCode: '6501',
    name: 'Mueang Phitsanulok',
    nameTh: 'เมืองพิษณุโลก',
    nameEn: 'Mueang Phitsanulok',
  },
]

const incidents = [
  {
    id: 'b863c8a0-83c9-4761-b97e-66e8842b74b7',
    caseNumber: 'POL-20260706-0002',
    category: 'police',
    severity: 'medium' as const,
    status: 'reported',
    latitude: 16.8211,
    longitude: 100.2659,
    markerColor: '#2563eb',
    areaName: 'Mueang Phitsanulok Phitsanulok',
    areaColor: null,
    provinceCode: '65',
    province: 'Phitsanulok',
    districtCode: '6501',
    district: 'Mueang Phitsanulok',
    createdAt: '2026-07-06T08:12:00.000Z',
  },
  {
    id: 'fire-1',
    caseNumber: null,
    category: 'fire',
    severity: 'high' as const,
    status: 'reported',
    latitude: 18.7883,
    longitude: 98.9853,
    markerColor: '#dc2626',
    areaName: 'Chiang Mai',
    areaColor: null,
    provinceCode: '50',
    province: 'Chiang Mai',
    districtCode: '5001',
    district: 'Mueang Chiang Mai',
    createdAt: '2026-07-06T08:14:00.000Z',
  },
]

test('dashboard map location helpers build district-first localized options with searchable text', () => {
  const options = buildDashboardLocationOptions(provinces, districts, true)

  assert.equal(options.length, 2)
  assert.equal(options[0].areaType, 'district')
  assert.equal(options[0].label, 'เมืองพิษณุโลก พิษณุโลก')
  assert.equal(options[1].areaType, 'province')
  assert.equal(options[1].label, 'พิษณุโลก')
  assert.equal(normalizeDashboardMapText('  พิษณุโลก  '), 'พิษณุโลก')
  assert.equal(filterDashboardLocationOptions(options, '').length, 2)
  assert.equal(filterDashboardLocationOptions(options, normalizeDashboardMapText('6501'))[0].districtCode, '6501')
})

test('dashboard map incident filter preserves category, province, district, and free-text behavior', () => {
  const provinceOption: DashboardLocationOption = {
    key: 'province-65',
    areaType: 'province',
    label: 'พิษณุโลก',
    provinceCode: '65',
    province: 'พิษณุโลก',
    districtCode: null,
    district: null,
    searchable: 'พิษณุโลก phitsanulok 65',
  }
  const districtOption: DashboardLocationOption = {
    key: 'district-6501-65',
    areaType: 'district',
    label: 'เมืองพิษณุโลก พิษณุโลก',
    provinceCode: '65',
    province: 'พิษณุโลก',
    districtCode: '6501',
    district: 'เมืองพิษณุโลก',
    searchable: 'เมืองพิษณุโลก พิษณุโลก mueang phitsanulok 6501 65',
  }

  assert.deepEqual(
    filterDashboardMapIncidents(incidents, 'police', '', null).map(incident => incident.id),
    [incidents[0].id]
  )
  assert.deepEqual(
    filterDashboardMapIncidents(incidents, 'all', '', provinceOption).map(incident => incident.id),
    [incidents[0].id]
  )
  assert.deepEqual(
    filterDashboardMapIncidents(incidents, 'all', '', districtOption).map(incident => incident.id),
    [incidents[0].id]
  )
  assert.deepEqual(
    filterDashboardMapIncidents(incidents, 'all', normalizeDashboardMapText('chiang'), null).map(incident => incident.id),
    ['fire-1']
  )
})

test('dashboard map localization uses master locations and falls back to outside-area label', () => {
  const localized = localizeDashboardMapIncidents(
    [
      incidents[0],
      {
        ...incidents[0],
        id: 'unknown-area',
        areaName: null,
        provinceCode: null,
        province: null,
        districtCode: null,
        district: null,
      },
    ],
    { '65': provinces[0] },
    { '6501': districts[0] },
    true,
    'นอกพื้นที่รับผิดชอบ'
  )

  assert.equal(localized[0].province, 'พิษณุโลก')
  assert.equal(localized[0].district, 'เมืองพิษณุโลก')
  assert.equal(localized[0].areaName, 'เมืองพิษณุโลก พิษณุโลก')
  assert.equal(localized[1].areaName, 'นอกพื้นที่รับผิดชอบ')
})

test('dashboard map display number uses case number with short id fallback', () => {
  assert.equal(getIncidentMapDisplayNumber(incidents[0]), 'POL-20260706-0002')
  assert.equal(getIncidentMapDisplayNumber({ id: 'b863c8a0-83c9', caseNumber: null }), 'b863c8a0')
})
