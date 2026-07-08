import { Badge } from "@/components/ui/badge"
import type { useAdminI18n } from "@/shared/i18n/admin"

import type {
  ShareChannelSource,
} from "../model/types"
export { DEFAULT_SHARE_CHANNEL_DRAFTS, DEFAULT_SHARE_CHANNELS } from "./share-channel-defaults"

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
