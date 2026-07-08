import { Badge } from "@/components/ui/badge"
import type { useAdminI18n } from "@/shared/i18n/admin"

import type { HealthStatus, SseStatus } from "../model/types"

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

