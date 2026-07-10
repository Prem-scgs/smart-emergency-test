import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildApiErrorPayload } from "../../api-error.js";
import { getMockAdminScope } from "../../admin-scope.js";
import { writeAuditLog } from "../../audit-log.js";
import { pool } from "../../db.js";

/**
 * Admin organization settings routes
 *
 * กระทบตาราง `system_settings` และ frontend admin shell จะ refresh หลัง save
 * เฉพาะ super_admin เท่านั้นที่อ่าน/บันทึกค่าชุดนี้ได้.
 */
const defaultOrganizationSettings = {
  systemName: "Smart Emergency Platform",
  organizationName: "ศูนย์บัญชาการเหตุฉุกเฉิน",
  timezone: "Asia/Bangkok",
};

const settingKeys = {
  systemName: "system_name",
  organizationName: "organization_name",
  timezone: "timezone",
} as const;

const organizationSettingsBody = z.object({
  settings: z.object({
    systemName: z.string().trim().min(1).max(120),
    organizationName: z.string().trim().min(1).max(160),
    timezone: z.enum(["Asia/Bangkok", "UTC"]),
  }),
});

function buildForbiddenPayload() {
  return buildApiErrorPayload(
    403,
    "ADMIN_ORGANIZATION_SETTINGS_FORBIDDEN",
    "Only super admin can manage organization settings"
  );
}

function requireSuperAdmin(headers: Record<string, unknown> | undefined) {
  const scope = getMockAdminScope(headers);
  return scope?.role === "super_admin";
}

function requireAdmin(headers: Record<string, unknown> | undefined) {
  return Boolean(getMockAdminScope(headers));
}

async function readOrganizationSettings() {
  const result = await pool.query<{
    setting_key: string;
    setting_value: string;
  }>(
    `
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key IN ('system_name', 'organization_name', 'timezone')
    `
  );

  const rows = new Map(
    result.rows.map(row => [row.setting_key, row.setting_value])
  );

  return {
    systemName: rows.get(settingKeys.systemName) ?? defaultOrganizationSettings.systemName,
    organizationName:
      rows.get(settingKeys.organizationName) ?? defaultOrganizationSettings.organizationName,
    timezone: rows.get(settingKeys.timezone) ?? defaultOrganizationSettings.timezone,
  };
}

export async function registerAdminOrganizationSettingsRoutes(app: FastifyInstance) {
  app.get("/api/admin/organization-settings", async (request, reply) => {
    if (!requireAdmin(request.headers)) {
      reply.code(403);
      return buildForbiddenPayload();
    }

    return {
      settings: await readOrganizationSettings(),
    };
  });

  app.put("/api/admin/organization-settings", async (request, reply) => {
    if (!requireSuperAdmin(request.headers)) {
      reply.code(403);
      return buildForbiddenPayload();
    }

    const body = organizationSettingsBody.parse(request.body);
    const updates = [
      [settingKeys.systemName, body.settings.systemName],
      [settingKeys.organizationName, body.settings.organizationName],
      [settingKeys.timezone, body.settings.timezone],
    ] as const;

    for (const [key, value] of updates) {
      await pool.query(
        `
          INSERT INTO system_settings
            (setting_key, setting_value, updated_by, updated_at)
          VALUES
            ($1, $2, $3, now())
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
        `,
        [key, value, "super_admin"]
      );
    }

    await writeAuditLog(request, {
      action: "settings.organization_updated",
      resourceType: "settings",
      resourceId: "system_settings",
      actorType: "admin",
      details: {
        changedKeys: updates.map(([key]) => key),
      },
    });

    return {
      saved: true,
      settings: await readOrganizationSettings(),
    };
  });
}
