import { Badge } from "@/components/ui/badge"
import type { useAdminI18n } from "@/shared/i18n/admin"

import type { HealthStatus, SseStatus } from "../model/types"

/**
 * แสดง badge สถานะ health/SSE ของ settings page
 *
 * เป็น read-only signal สำหรับ readiness เท่านั้น ไม่ใช่การตั้งค่าระบบ ถ้าแก้ label
 * ต้องเช็กทั้ง API/DB/SSE cards ในหน้า settings.
 */
export function statusBadge(
  status: HealthStatus | SseStatus,
  t: ReturnType<typeof useAdminI18n>["t"]
) {
  if (status === "online" || status === "connected") {
    return <Badge className="bg-success text-success-foreground">{t("statusReady")}</Badge>
  }

  if (status === "checking" || status === "connecting" || status === "unknown") {
    return <Badge variant="secondary">{t("checking")}</Badge>
  }

  return <Badge variant="destructive">{t("statusUnavailable")}</Badge>
}
