import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildApiErrorPayload } from "../../api-error.js";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import { getShareChannelAvailability } from "../../location-share.js";

function rowToCategory(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    labelTh: row.label_th,
    description: row.description,
    icon: row.icon,
    color: row.color,
    bgColor: row.bg_color,
    recommendedAgency: row.recommended_agency,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

const districtQuery = z.object({
  provinceCode: z.string().min(1).optional(),
});

function rowToProvince(row: Record<string, unknown>) {
  return {
    id: row.id,
    provinceCode: row.province_code,
    nameTh: row.province_name_th,
    nameEn: row.province_name_en,
    name: row.province_name_en ?? row.province_name_th ?? row.name,
  };
}

function rowToDistrict(row: Record<string, unknown>) {
  return {
    id: row.id,
    provinceCode: row.province_code,
    provinceNameTh: row.province_name_th,
    provinceNameEn: row.province_name_en,
    districtCode: row.district_code,
    nameTh: row.district_name_th,
    nameEn: row.district_name_en,
    name: row.district_name_en ?? row.district_name_th ?? row.name,
  };
}

function rowToDashboardStats(row: Record<string, unknown>) {
  return {
    id: row.id,
    totalCallsToday: row.total_calls_today,
    activeIncidents: row.active_incidents,
    totalAgencies: row.total_agencies,
    avgResponseTime: Number(row.avg_response_time),
    callsByCategory: row.calls_by_category,
    callsByProvince: row.calls_by_province,
    successRate: Number(row.success_rate),
    updatedAt: row.updated_at,
  };
}

export async function registerReferenceRoutes(app: FastifyInstance) {
  app.get("/api/reference/share-channels", async () => {
    return getShareChannelAvailability(config.shareChannels);
  });

  app.get("/api/reference/categories", async () => {
    const result = await pool.query(
      "SELECT * FROM emergency_categories WHERE active = true ORDER BY sort_order, id"
    );
    return result.rows.map(rowToCategory);
  });

  app.get("/api/reference/provinces", async () => {
    const result = await pool.query(`
      SELECT DISTINCT ON (province_code)
        id,
        name,
        province_code,
        province_name_th,
        province_name_en
      FROM areas
      WHERE area_type = 'province'
        AND province_code IS NOT NULL
      ORDER BY province_code, province_name_en NULLS LAST, province_name_th NULLS LAST, name
    `);
    return result.rows.map(rowToProvince);
  });

  app.get("/api/reference/districts", async (request) => {
    const query = districtQuery.parse(request.query);
    const values: string[] = [];
    const filters = [
      "area_type = 'district'",
      "district_code IS NOT NULL",
    ];

    if (query.provinceCode) {
      values.push(query.provinceCode);
      filters.push(`province_code = $${values.length}`);
    }

    const result = await pool.query(
      `
        SELECT DISTINCT ON (district_code)
          id,
          name,
          province_code,
          province_name_th,
          province_name_en,
          district_code,
          district_name_th,
          district_name_en
        FROM areas
        WHERE ${filters.join(" AND ")}
        ORDER BY
          district_code,
          province_name_en NULLS LAST,
          district_name_en NULLS LAST,
          district_name_th NULLS LAST,
          name
      `,
      values
    );
    return result.rows.map(rowToDistrict);
  });

  app.get("/api/dashboard/snapshot", async (_request, reply) => {
    const result = await pool.query(
      "SELECT * FROM dashboard_snapshots WHERE id = 'mock-dashboard'"
    );

    if (result.rowCount === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "DASHBOARD_SNAPSHOT_NOT_FOUND", "Dashboard snapshot not found");
    }

    return rowToDashboardStats(result.rows[0]);
  });

  app.get("/api/users/mock-profile", async (_request, reply) => {
    const userResult = await pool.query(
      "SELECT * FROM app_users WHERE id = '66666666-6666-4666-8666-666666666666'"
    );

    if (userResult.rowCount === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "USER_PROFILE_NOT_FOUND", "User profile not found");
    }

    const contactResult = await pool.query(
      `
        SELECT *
        FROM user_emergency_contacts
        WHERE user_id = $1
        ORDER BY created_at
      `,
      [userResult.rows[0].id]
    );

    const user = userResult.rows[0];
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      emergencyContacts: contactResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        relationship: row.relationship,
      })),
      settings: {
        language: user.language,
        notifications: user.notifications,
        offlineMode: user.offline_mode,
        darkMode: user.dark_mode,
      },
    };
  });
}
