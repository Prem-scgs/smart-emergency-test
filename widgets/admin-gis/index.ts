/**
 * Public API ของ admin GIS widget
 *
 * GIS page และ boundary map อยู่ใต้ widget นี้ ส่วน geometry/display helper
 * อยู่ที่ `entities/area`.
 */
export type { GisBoundary } from './ui/gis-boundary-map'
export { GisBoundaryMap } from './ui/gis-boundary-map'
export { default as GisPage } from './ui/gis-page'
