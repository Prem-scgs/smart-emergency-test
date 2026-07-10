import type { FeatureCollection } from 'geojson'

import { getAreaDisplayName, type AreaDisplaySource } from './display.ts'
import type { AreaPolygon } from '../model/geometry.ts'

/**
 * แปลง area boundary เป็น GeoJSON ที่ MapLibre ใช้ render ได้
 *
 * Properties ใน feature ถูกอ่านต่อโดย popup/sidebar ถ้าเปลี่ยน shape ตรงนี้
 * ต้องทดสอบ GIS page ทั้ง marker, popup และ boundary click.
 */
export interface AreaFeatureSource extends AreaDisplaySource {
  id: string
  color: string
  polygon: AreaPolygon | null
}

export type AreaFeatureProperties = {
  id: string
  name: string
  color: string
}

export type AreaFeatureCollection = FeatureCollection<AreaPolygon, AreaFeatureProperties>

export function buildAreaFeatureCollection<T extends AreaFeatureSource>(
  areas: readonly T[],
  preferThai: boolean
): AreaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas
      .filter((area): area is T & { polygon: AreaPolygon } => Boolean(area.polygon))
      .map(area => ({
        type: 'Feature',
        id: area.id,
        properties: {
          id: area.id,
          name: getAreaDisplayName(area, preferThai),
          color: area.color,
        },
        geometry: area.polygon,
      })),
  }
}
