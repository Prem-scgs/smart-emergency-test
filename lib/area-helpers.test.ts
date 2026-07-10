/**
 * ???? helper geometry/display ??? area entity ??? GIS ??? dashboard map ??????????.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { MultiPolygon, Polygon } from 'geojson'

import {
  buildAreaFeatureCollection,
  collectLngLatPairs,
  getAreaDisplayName,
  getAreaIncidentSeverityColor,
  getAreasBounds,
  getDistrictDisplayName,
  getPolygonBounds,
  getProvinceDisplayName,
} from '../entities/area/index.ts'

const polygon: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [100, 13],
      [101, 13],
      [101, 14],
      [100, 13],
    ],
  ],
}

const multiPolygon: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [99, 12],
        [100, 12],
        [100, 13],
        [99, 12],
      ],
    ],
    [
      [
        [101, 14],
        [102, 14],
        [102, 15],
        [101, 14],
      ],
    ],
  ],
}

const districtArea = {
  id: 'area-1',
  name: 'Fallback Area',
  areaType: 'district',
  color: '#2563eb',
  provinceNameTh: 'พิษณุโลก',
  provinceNameEn: 'Phitsanulok',
  districtNameTh: 'เมืองพิษณุโลก',
  districtNameEn: 'Mueang Phitsanulok',
  polygon,
}

test('area polygon helpers collect nested coordinates and calculate bounds', () => {
  const pairs: Array<[number, number]> = []

  collectLngLatPairs(multiPolygon.coordinates, pairs)

  assert.equal(pairs.length, 8)
  assert.deepEqual(getPolygonBounds(polygon), [[100, 13], [101, 14]])
  assert.deepEqual(getPolygonBounds(multiPolygon), [[99, 12], [102, 15]])
  assert.equal(getPolygonBounds(null), null)
})

test('area bounds combine multiple area polygons and ignore missing geometry', () => {
  assert.deepEqual(
    getAreasBounds([
      { polygon },
      { polygon: null },
      { polygon: multiPolygon },
    ]),
    [[99, 12], [102, 15]]
  )
  assert.equal(getAreasBounds([{ polygon: null }]), null)
})

test('area display helpers prefer the active locale with safe fallbacks', () => {
  assert.equal(getProvinceDisplayName(districtArea, true), 'พิษณุโลก')
  assert.equal(getProvinceDisplayName(districtArea, false), 'Phitsanulok')
  assert.equal(getDistrictDisplayName(districtArea, true), 'เมืองพิษณุโลก')
  assert.equal(getDistrictDisplayName(districtArea, false), 'Mueang Phitsanulok')
  assert.equal(getAreaDisplayName(districtArea, true), 'เมืองพิษณุโลก, พิษณุโลก')
  assert.equal(getAreaDisplayName({ ...districtArea, areaType: 'province' }, false), 'Phitsanulok')
  assert.equal(
    getAreaDisplayName({
      ...districtArea,
      provinceNameTh: null,
      provinceNameEn: null,
      districtNameTh: null,
      districtNameEn: null,
    }, true),
    'Fallback Area, -'
  )
})

test('area map style helper returns severity colors with neutral fallback', () => {
  assert.equal(getAreaIncidentSeverityColor('critical'), '#dc2626')
  assert.equal(getAreaIncidentSeverityColor('high'), '#f97316')
  assert.equal(getAreaIncidentSeverityColor('medium'), '#eab308')
  assert.equal(getAreaIncidentSeverityColor('low'), '#22c55e')
  assert.equal(getAreaIncidentSeverityColor('unknown'), '#64748b')
})

test('area feature helper builds localized GeoJSON from areas with polygons only', () => {
  const collection = buildAreaFeatureCollection([
    districtArea,
    { ...districtArea, id: 'area-2', polygon: null },
  ], false)

  assert.equal(collection.type, 'FeatureCollection')
  assert.equal(collection.features.length, 1)
  assert.equal(collection.features[0].id, 'area-1')
  assert.equal(collection.features[0].properties.name, 'Mueang Phitsanulok, Phitsanulok')
  assert.equal(collection.features[0].properties.color, '#2563eb')
  assert.deepEqual(collection.features[0].geometry, polygon)
})
