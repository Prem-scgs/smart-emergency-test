import type { MultiPolygon, Polygon } from 'geojson'

export type AreaPolygon = Polygon | MultiPolygon
export type AreaMapBounds = [[number, number], [number, number]]

export function collectLngLatPairs(value: unknown, pairs: Array<[number, number]>) {
  if (!Array.isArray(value)) return

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    pairs.push([value[0], value[1]])
    return
  }

  value.forEach(item => collectLngLatPairs(item, pairs))
}

function getBoundsFromPairs(pairs: Array<[number, number]>): AreaMapBounds | null {
  if (pairs.length === 0) return null

  const lngs = pairs.map(pair => pair[0])
  const lats = pairs.map(pair => pair[1])

  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

export function getPolygonBounds(polygon: AreaPolygon | null | undefined): AreaMapBounds | null {
  if (!polygon) return null

  const pairs: Array<[number, number]> = []
  collectLngLatPairs(polygon.coordinates, pairs)

  return getBoundsFromPairs(pairs)
}

export function getAreasBounds<T extends { polygon: AreaPolygon | null | undefined }>(
  areas: readonly T[]
): AreaMapBounds | null {
  const pairs: Array<[number, number]> = []

  areas.forEach((area) => {
    if (area.polygon) {
      collectLngLatPairs(area.polygon.coordinates, pairs)
    }
  })

  return getBoundsFromPairs(pairs)
}
