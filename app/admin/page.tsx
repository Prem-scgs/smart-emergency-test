import { AdminLoginPage } from '@/widgets/admin-login'

/**
 * Admin login entry route
 *
 * Login UI, role options และการ restore session อยู่ใน widget/shared auth แล้ว
 * route นี้จึงควรเหลือแค่ shell เพื่อให้เปลี่ยนหน้า login โดยไม่กระทบ dashboard.
 */
export default function Page() {
  return <AdminLoginPage />
}
