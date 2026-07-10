import { ContactsPage } from '@/widgets/admin-contacts'

/**
 * Contacts route shell
 *
 * CRUD, role guard และ location selector อยู่ใน `widgets/admin-contacts`.
 * อย่าเพิ่ม fetch/form state กลับเข้ามาที่ route นี้ เพื่อรักษา FSD-lite boundary.
 */
export default function Page() {
  return <ContactsPage />
}
