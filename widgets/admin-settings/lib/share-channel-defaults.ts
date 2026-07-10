import type {
  ShareChannelDraft,
  ShareChannelName,
  ShareChannelState,
} from "../model/types"

/**
 * Default state ของช่องทางแชร์ตำแหน่ง
 *
 * ตั้งเป็น disabled/source none เพื่อไม่ให้ settings UI สื่อว่ามี channel พร้อมใช้งาน
 * ก่อน backend/env ส่งค่าจริงกลับมา.
 */
export const DEFAULT_SHARE_CHANNELS: ShareChannelState = {
  line: { enabled: false, maskedValue: null, source: "none" },
  sms: { enabled: false, maskedValue: null, source: "none" },
  whatsapp: { enabled: false, maskedValue: null, source: "none" },
}

export const DEFAULT_SHARE_CHANNEL_DRAFTS: Record<ShareChannelName, ShareChannelDraft> = {
  line: { enabled: false, recipientValue: "" },
  sms: { enabled: false, recipientValue: "" },
  whatsapp: { enabled: false, recipientValue: "" },
}
