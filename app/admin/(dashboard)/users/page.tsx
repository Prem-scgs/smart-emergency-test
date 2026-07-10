import { UsersPage } from '@/widgets/admin-users'

/**
 * Users route shell
 *
 * หน้านี้แยกไว้ที่ `widgets/admin-users` เพื่อให้อนาคตเพิ่ม user management จริง
 * ได้โดยไม่ปนกับ routing layer ของ Next.
 */
export default function Page() {
  return <UsersPage />
}
