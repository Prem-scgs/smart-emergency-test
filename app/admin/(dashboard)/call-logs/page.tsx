import { CallLogsPage } from "@/widgets/admin-call-logs"

/**
 * Call logs route shell
 *
 * Filtering, pagination และ CSV/PDF/print snapshot อยู่ใน `widgets/admin-call-logs`.
 * ถ้าแก้ export behavior ให้ทดสอบว่าใช้ filtered rows ทั้งหมด ไม่ใช่เฉพาะหน้าปัจจุบัน.
 */
export default function Page() {
  return <CallLogsPage />
}
