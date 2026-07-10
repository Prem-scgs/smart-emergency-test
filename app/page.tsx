import { MobileApp } from '@/widgets/mobile-emergency'

/**
 * Mobile citizen entry route
 *
 * ตัว route นี้ตั้งใจเป็น shell บาง ๆ เท่านั้น ส่วน state/flow จริงของ mobile
 * อยู่ใน `widgets/mobile-emergency` เพื่อกันไม่ให้หน้าแรกกลับมาแบก business logic.
 */
export default function Home() {
  return <MobileApp />
}
