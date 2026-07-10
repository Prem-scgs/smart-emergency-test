import { ReportsPage } from "@/widgets/admin-reports"

/**
 * Reports route shell
 *
 * Report summary fetch, chart view-model, CSV/PDF/print อยู่ใน `widgets/admin-reports`.
 * route นี้ควรไม่มี export/print implementation เพื่อกัน behavior drift กับ widget tests.
 */
export default function Page() {
  return <ReportsPage />
}
