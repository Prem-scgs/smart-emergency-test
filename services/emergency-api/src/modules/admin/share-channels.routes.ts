import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildApiErrorPayload } from "../../api-error.js";
import { getMockAdminScope } from "../../admin-scope.js";
import { writeAuditLog } from "../../audit-log.js";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import type { LocationShareChannel } from "../../location-share.js";
import {
  resolveShareChannels,
  type ResolvedShareChannels,
} from "../../share-channel-settings.js";

const channelUpdate = z.object({
  enabled: z.boolean(),
  recipientValue: z.string().trim().min(1).nullable().optional(),
});

const shareChannelsBody = z.object({
  channels: z.object({
    line: channelUpdate.optional(),
    sms: channelUpdate.optional(),
    whatsapp: channelUpdate.optional(),
  }),
});

const channelNames: LocationShareChannel[] = ["line", "sms", "whatsapp"];

function buildForbiddenPayload() {
  return buildApiErrorPayload(
    403,
    "ADMIN_SHARE_CHANNEL_FORBIDDEN",
    "Only super admin can manage share channels"
  );
}

function requireSuperAdmin(headers: Record<string, unknown> | undefined) {
  const scope = getMockAdminScope(headers);
  return scope?.role === "super_admin";
}

function envRecipient(channel: LocationShareChannel) {
  if (channel === "line") return config.shareChannels.lineOaId;
  if (channel === "sms") return config.shareChannels.smsCenterPhone;
  return config.shareChannels.whatsappCenterPhone;
}

function validateRecipient(channel: LocationShareChannel, value: string) {
  if (channel === "line") {
    return /^@[A-Za-z0-9._-]+$/.test(value);
  }

  if (channel === "sms") {
    return /^0\d{8,9}$/.test(value);
  }

  return /^\d{8,15}$/.test(value);
}

function buildValidationError(channel: LocationShareChannel) {
  return buildApiErrorPayload(
    400,
    "INVALID_SHARE_CHANNEL_RECIPIENT",
    `Invalid ${channel} share channel recipient`
  );
}

function toAdminResponse(channels: ResolvedShareChannels) {
  return {
    channels: {
      line: {
        enabled: channels.line.enabled,
        maskedValue: channels.line.maskedValue,
        source: channels.line.source,
      },
      sms: {
        enabled: channels.sms.enabled,
        maskedValue: channels.sms.maskedValue,
        source: channels.sms.source,
      },
      whatsapp: {
        enabled: channels.whatsapp.enabled,
        maskedValue: channels.whatsapp.maskedValue,
        source: channels.whatsapp.source,
      },
    },
  };
}

export async function registerAdminShareChannelRoutes(app: FastifyInstance) {
  app.get("/api/admin/share-channels", async (request, reply) => {
    if (!requireSuperAdmin(request.headers)) {
      reply.code(403);
      return buildForbiddenPayload();
    }

    return toAdminResponse(await resolveShareChannels());
  });

  app.put("/api/admin/share-channels", async (request, reply) => {
    if (!requireSuperAdmin(request.headers)) {
      reply.code(403);
      return buildForbiddenPayload();
    }

    const body = shareChannelsBody.parse(request.body);
    const current = await resolveShareChannels();
    const updates = channelNames
      .map(channel => {
        const input = body.channels[channel];
        if (!input) return null;

        const nextRecipient =
          input.recipientValue !== undefined
            ? input.recipientValue
            : current[channel].source === "db"
              ? current[channel].recipientValue
              : null;
        const hasEnvFallback = Boolean(envRecipient(channel));

        if (nextRecipient && !validateRecipient(channel, nextRecipient)) {
          return { channel, error: buildValidationError(channel) };
        }

        if (input.enabled && !nextRecipient && !hasEnvFallback) {
          return { channel, error: buildValidationError(channel) };
        }

        return {
          channel,
          enabled: input.enabled,
          recipientValue: nextRecipient,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const invalid = updates.find(update => "error" in update);
    if (invalid && "error" in invalid) {
      reply.code(400);
      return invalid.error;
    }

    for (const update of updates) {
      if ("error" in update) continue;

      await pool.query(
        `
          INSERT INTO center_share_channels
            (channel, enabled, recipient_value, updated_by, updated_at)
          VALUES
            ($1, $2, $3, $4, now())
          ON CONFLICT (channel) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            recipient_value = EXCLUDED.recipient_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
        `,
        [
          update.channel,
          update.enabled,
          update.recipientValue,
          "super_admin",
        ]
      );
    }

    await writeAuditLog(request, {
      action: "settings.share_channel_updated",
      resourceType: "settings",
      resourceId: "center_share_channels",
      actorType: "admin",
      details: {
        channels: updates
          .filter(update => !("error" in update))
          .map(update => ({
            channel: update.channel,
            enabled: update.enabled,
            recipientChanged: body.channels[update.channel]?.recipientValue !== undefined,
          })),
      },
    });

    return {
      saved: true,
      ...(toAdminResponse(await resolveShareChannels())),
    };
  });
}

