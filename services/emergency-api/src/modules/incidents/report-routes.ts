import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  getMockAdminScopeFromRequest,
  isCategoryScopedAdmin,
} from "../../admin-scope.js";
import { pool } from "../../db.js";

const reportRangeIntervals = {
  week: "7 days",
  month: "30 days",
  quarter: "90 days",
  year: "365 days",
} as const;

const reportSummaryQuery = z.object({
  range: z.enum(["week", "month", "quarter", "year"]).default("month"),
});

function buildReportWhereClause(
  range: keyof typeof reportRangeIntervals,
  adminScope: ReturnType<typeof getMockAdminScopeFromRequest>
) {
  const values: string[] = [reportRangeIntervals[range]];
  const filters = ["i.created_at >= now() - $1::interval"];

  if (isCategoryScopedAdmin(adminScope)) {
    values.push(adminScope.category);
    filters.push(`i.category = $${values.length}`);
  }

  return {
    values,
    whereClause: `WHERE ${filters.join(" AND ")}`,
  };
}

function numberFromRow(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function registerIncidentReportRoutes(app: FastifyInstance) {
  app.get("/api/reports/summary", async (request) => {
    const query = reportSummaryQuery.parse(request.query ?? {});
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const { values, whereClause } = buildReportWhereClause(query.range, adminScope);

    const totalsResult = await pool.query(
      `
        SELECT
          COUNT(*)::int AS total_incidents,
          COUNT(*) FILTER (WHERE i.status <> 'closed')::int AS active_incidents,
          COUNT(*) FILTER (WHERE i.status = 'closed')::int AS closed_incidents,
          COUNT(*) FILTER (WHERE i.call_status = 'connected')::int AS connected_calls
        FROM incidents i
        ${whereClause}
      `,
      values
    );

    const statusResult = await pool.query(
      `
        SELECT i.status, COUNT(*)::int AS count
        FROM incidents i
        ${whereClause}
        GROUP BY i.status
        ORDER BY count DESC, i.status
      `,
      values
    );

    const categoryResult = await pool.query(
      `
        SELECT i.category, COUNT(*)::int AS count
        FROM incidents i
        ${whereClause}
        GROUP BY i.category
        ORDER BY count DESC, i.category
      `,
      values
    );

    const areaResult = await pool.query(
      `
        SELECT
          COALESCE(NULLIF(CONCAT_WS(' ', i.district, i.province), ''), 'ไม่ระบุพื้นที่') AS area_name,
          COUNT(*)::int AS count
        FROM incidents i
        ${whereClause}
        GROUP BY area_name
        ORDER BY count DESC, area_name
        LIMIT 10
      `,
      values
    );

    const trendResult = await pool.query(
      `
        SELECT
          to_char(date_trunc('day', i.created_at), 'YYYY-MM-DD') AS bucket,
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE i.status = 'closed')::int AS closed_count
        FROM incidents i
        ${whereClause}
        GROUP BY bucket
        ORDER BY bucket
      `,
      values
    );

    const totals = totalsResult.rows[0] ?? {};
    return {
      range: query.range,
      scope: adminScope ?? { role: "super_admin" },
      totals: {
        totalIncidents: numberFromRow(totals.total_incidents),
        activeIncidents: numberFromRow(totals.active_incidents),
        closedIncidents: numberFromRow(totals.closed_incidents),
        connectedCalls: numberFromRow(totals.connected_calls),
      },
      byStatus: statusResult.rows.map((row) => ({
        status: row.status,
        count: numberFromRow(row.count),
      })),
      byCategory: categoryResult.rows.map((row) => ({
        category: row.category,
        count: numberFromRow(row.count),
      })),
      byArea: areaResult.rows.map((row) => ({
        areaName: row.area_name,
        count: numberFromRow(row.count),
      })),
      trend: trendResult.rows.map((row) => ({
        bucket: row.bucket,
        count: numberFromRow(row.count),
        closedCount: numberFromRow(row.closed_count),
      })),
    };
  });
}
