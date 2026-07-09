import { config } from "./config.js";
import { pool } from "./db.js";
import type {
  LocationShareChannel,
  ShareChannelRecipients,
} from "./location-share.js";

export type ShareChannelSource = "db" | "env" | "none";

export type ResolvedShareChannel = {
  enabled: boolean;
  recipientValue: string | null;
  maskedValue: string | null;
  source: ShareChannelSource;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export type ResolvedShareChannels = Record<LocationShareChannel, ResolvedShareChannel>;

const channels: LocationShareChannel[] = ["line", "sms", "whatsapp"];

type DbShareChannelRow = {
  channel: unknown;
  enabled: unknown;
  recipient_value: unknown;
  updated_by?: unknown;
  updated_at?: unknown;
};

function fallbackRecipient(
  recipients: ShareChannelRecipients,
  channel: LocationShareChannel
) {
  if (channel === "line") return recipients.lineOaId;
  if (channel === "sms") return recipients.smsCenterPhone;
  return recipients.whatsappCenterPhone;
}

function normalizeRecipient(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

function toDbRowMap(rows: DbShareChannelRow[]) {
  const map = new Map<LocationShareChannel, DbShareChannelRow>();

  for (const row of rows) {
    if (row.channel === "line" || row.channel === "sms" || row.channel === "whatsapp") {
      map.set(row.channel, row);
    }
  }

  return map;
}

export function maskShareChannelRecipient(
  channel: LocationShareChannel,
  value: string | null
) {
  if (!value) return null;

  if (channel === "line") {
    return value.length <= 5 ? `${value.slice(0, 2)}****` : `${value.slice(0, 4)}****`;
  }

  if (value.length <= 7) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  return `${value.slice(0, 3)}***${value.slice(-4)}`;
}

export async function readDbShareChannelRows() {
  try {
    const result = await pool.query(
      `
        SELECT channel, enabled, recipient_value, updated_by, updated_at
        FROM center_share_channels
      `
    );
    return result.rows as DbShareChannelRow[];
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("center_share_channels") ||
        error.message.includes("does not exist"))
    ) {
      return [];
    }

    throw error;
  }
}

/**
 * รวม setting ช่องทางแชร์จาก DB กับ fallback จาก env
 *
 * ลำดับความสำคัญ:
 * - DB มาก่อน เพราะหน้า Settings ให้ super_admin เปิด/ปิดและแก้ recipient ได้
 * - env เป็น fallback สำหรับระบบที่ยังไม่ตั้งค่าใน DB หรือ migration ยังไม่พร้อม
 * - public API ต้องใช้ maskedValue/availability เท่านั้น ห้ามส่ง recipientValue ออก frontend โดยไม่จำเป็น
 */
export async function resolveShareChannels(
  fallback: ShareChannelRecipients = config.shareChannels
): Promise<ResolvedShareChannels> {
  const rows = toDbRowMap(await readDbShareChannelRows());

  return channels.reduce((resolved, channel) => {
    const dbRow = rows.get(channel);
    const dbRecipient = normalizeRecipient(dbRow?.recipient_value);
    const envRecipient = normalizeRecipient(fallbackRecipient(fallback, channel));
    const updatedAt =
      dbRow?.updated_at instanceof Date
        ? dbRow.updated_at.toISOString()
        : typeof dbRow?.updated_at === "string"
          ? dbRow.updated_at
          : null;

    if (dbRow && normalizeBoolean(dbRow.enabled) === false) {
      resolved[channel] = {
        enabled: false,
        recipientValue: dbRecipient,
        maskedValue: maskShareChannelRecipient(channel, dbRecipient),
        source: "db",
        updatedBy: normalizeRecipient(dbRow.updated_by),
        updatedAt,
      };
      return resolved;
    }

    if (dbRecipient) {
      resolved[channel] = {
        enabled: normalizeBoolean(dbRow?.enabled),
        recipientValue: dbRecipient,
        maskedValue: maskShareChannelRecipient(channel, dbRecipient),
        source: "db",
        updatedBy: normalizeRecipient(dbRow?.updated_by),
        updatedAt,
      };
      return resolved;
    }

    resolved[channel] = {
      enabled: Boolean(envRecipient),
      recipientValue: envRecipient,
      maskedValue: maskShareChannelRecipient(channel, envRecipient),
      source: envRecipient ? "env" : "none",
      updatedBy: null,
      updatedAt: null,
    };
    return resolved;
  }, {} as ResolvedShareChannels);
}

export function toPublicShareChannelAvailability(channelsByName: ResolvedShareChannels) {
  return {
    line: { enabled: channelsByName.line.enabled },
    sms: { enabled: channelsByName.sms.enabled },
    whatsapp: { enabled: channelsByName.whatsapp.enabled },
  };
}

export function getResolvedShareChannelRecipient(
  channelsByName: ResolvedShareChannels,
  channel: LocationShareChannel
) {
  const resolved = channelsByName[channel];
  return resolved.enabled ? resolved.recipientValue : null;
}
