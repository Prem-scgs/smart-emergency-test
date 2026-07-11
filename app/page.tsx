import { MobileApp } from '@/widgets/mobile-emergency'
import { MobileI18nProvider } from '@/shared/i18n/mobile'

/**
 * Mobile citizen entry route
 *
 * ตัว route นี้ตั้งใจเป็น shell บาง ๆ เท่านั้น ส่วน state/flow จริงของ mobile
 * อยู่ใน `widgets/mobile-emergency` เพื่อกันไม่ให้หน้าแรกกลับมาแบก business logic.
 */
export default function Home() {
  return (
    <MobileI18nProvider>
      <MobileApp />
    </MobileI18nProvider>
  )
}
