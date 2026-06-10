import type { FastifyInstance } from "fastify";
import { pool } from "../../db.js";

function rowToCategory(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    bgColor: row.bg_color,
    recommendedAgency: row.recommended_agency,
  };
}

function rowToProvince(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
  };
}

function rowToDistrict(row: Record<string, unknown>) {
  return {
    id: row.id,
    provinceId: row.province_id,
    name: row.name,
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
  app.get("/api/reference/categories", async () => {
    const result = await pool.query(
      "SELECT * FROM emergency_categories ORDER BY id"
    );
    return result.rows.map(rowToCategory);
  });

  app.get("/api/reference/provinces", async () => {
    const result = await pool.query("SELECT * FROM provinces ORDER BY name");
    return result.rows.map(rowToProvince);
  });

  app.get("/api/reference/districts", async () => {
    const result = await pool.query(
      "SELECT * FROM districts ORDER BY province_id, name"
    );
    return result.rows.map(rowToDistrict);
  });

  app.get("/api/dashboard/snapshot", async (_request, reply) => {
    const result = await pool.query(
      "SELECT * FROM dashboard_snapshots WHERE id = 'mock-dashboard'"
    );

    if (result.rowCount === 0) {
      reply.code(404);
      return { error: "Dashboard snapshot not found" };
    }

    return rowToDashboardStats(result.rows[0]);
  });

  app.get("/api/users/mock-profile", async (_request, reply) => {
    const userResult = await pool.query(
      "SELECT * FROM app_users WHERE id = '66666666-6666-4666-8666-666666666666'"
    );

    if (userResult.rowCount === 0) {
      reply.code(404);
      return { error: "User profile not found" };
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
