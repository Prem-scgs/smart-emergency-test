import { GisPage } from '@/widgets/admin-gis'

/**
 * GIS route shell
 *
 * GIS page logic และ boundary map อยู่ใน `widgets/admin-gis` ส่วน geometry helper
 * อยู่ที่ `entities/area`. ถ้าแก้ flow GIS ให้ทดสอบ boundary, marker และ popup ด้วย.
 */
export default function Page() {
  return <GisPage />
}
