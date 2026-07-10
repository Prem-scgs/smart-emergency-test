import { Badge } from "@/components/ui/badge"
import type { useAdminI18n } from "@/shared/i18n/admin"

import type {
  ShareChannelSource,
} from "../model/types"
export { DEFAULT_SHARE_CHANNEL_DRAFTS, DEFAULT_SHARE_CHANNELS } from "./share-channel-defaults"

/**
 * Helper แสดงสถานะ share channel ใน settings
 *
 * ใช้แยกค่าที่มาจาก DB/env/none ให้ admin เข้าใจว่าการแก้ใน UI จะ override
 * หรือพึ่ง fallback จาก environment อยู่.
 */
export function channelBadge(enabled: boolean, t: ReturnType<typeof useAdminI18n>["t"]) {
  return enabled ? (
    <Badge className="bg-success text-success-foreground">{t("channelOn")}</Badge>
  ) : (
    <Badge variant="secondary">{t("channelOff")}</Badge>
  )
}

export function sourceLabel(
  source: ShareChannelSource,
  t: ReturnType<typeof useAdminI18n>["t"]
) {
  if (source === "db") return t("channelSourceDb")
  if (source === "env") return t("channelSourceEnv")
  return t("channelSourceNone")
}
