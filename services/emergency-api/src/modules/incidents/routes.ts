import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getMockAdminScopeFromRequest } from "../../admin-scope.js";
import { buildApiErrorPayload } from "../../api-error.js";
import { writeAuditLog } from "../../audit-log.js";
import { emergencyEvents, emitEmergencyEvent } from "../../events.js";
import { config, getAllowedCorsOrigin } from "../../config.js";
import { pool } from "../../db.js";
import {
  buildIncidentLocationShareMessage,
  buildLocationMapsUrl,
  buildLocationShareUrl,
} from "../../location-share.js";
import {
  getResolvedShareChannelRecipient,
  resolveShareChannels,
} from "../../share-channel-settings.js";
import {
  buildZodValidationErrorPayload,
  isPlausiblePhoneNumber,
  validateActiveEmergencyCategory,
  validateLocationCodes,
} from "../../input-validation.js";
import { createInMemoryRateLimiter } from "../../rate-limit.js";
import {
  INCIDENT_STATUS_ORDER,
  validateIncidentStatusTransition,
} from "./status-workflow.js";

const incidentBody = z.object({
  clientRequestId: z.string().uuid(),
  dialedPhone: z.string().trim().min(1).max(32),
  category: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  description: z.string().nullable().optional(),
  agencyContactId: z.string().uuid().nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  provinceCode: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  districtCode: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  callStatus: z.enum(["connected", "busy", "no-answer", "wrong-number", "cancelled"]).nullable().optional(),
  reporterPhone: z.string().trim().min(1).max(32).nullable().optional(),
  sessionId: z.string().trim().min(8).max(128).nullable().optional(),
});

const incidentCallUpdateBody = z.object({
  callStatus: z.enum(["connected", "busy", "no-answer", "wrong-number", "cancelled"]),
  reporterPhone: z.string().trim().min(1).max(32).nullable().optional(),
  description: z.string().nullable().optional(),
});

const incidentStatusUpdateBody = z.object({
  fromStatus: z.enum(INCIDENT_STATUS_ORDER),
  toStatus: z.enum(INCIDENT_STATUS_ORDER),
  expectedVersion: z.number().int().min(0),
  note: z.string().nullable().optional(),
});

const incidentShareAttemptBody = z.object({
  sessionId: z.string().trim().min(8).max(128),
  channel: z.enum(["line", "sms", "whatsapp"]),
  reporterPhone: z
    .string()
    .trim()
    .regex(/^0\d{8,9}$/, "reporterPhone must be a Thai phone number")
    .nullable()
    .optional(),
});

function rowToIncident(row: Record<string, unknown>) {
  return {
    id: row.id,
    ...(Object.hasOwn(row, "case_number")
      ? { caseNumber: row.case_number }
      : {}),
    ...(Object.hasOwn(row, "client_request_id")
      ? { clientRequestId: row.client_request_id }
      : {}),
    ...(Object.hasOwn(row, "dialed_phone")
      ? { dialedPhone: row.dialed_phone }
      : {}),
    category: row.category,
    severity: row.severity,
    status: row.status,
    ...(Object.hasOwn(row, "status_version")
      ? { statusVersion: row.status_version }
      : {}),
    description: row.description,
    agencyContactId: row.agency_contact_id,
    agencyName: row.agency_name,
    agencyPhone: row.agency_phone,
    provinceCode: row.province_code,
    province: row.province,
    districtCode: row.district_code,
    district: row.district,
    accuracy: row.accuracy,
    callStatus: row.call_status,
    reporterPhone: row.reporter_phone,
    sessionId: row.session_id,
    latitude: row.latitude,
    longitude: row.longitude,
    markerColor: row.marker_color,
    areaId: row.area_id,
    areaName: row.area_name,
    areaColor: row.area_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function markerColorSql() {
  return `
    CASE severity
      WHEN 'critical' THEN '#dc2626'
      WHEN 'high' THEN '#f97316'
      WHEN 'medium' THEN '#eab308'
      ELSE '#22c55e'
    END AS marker_color
  `;
}

const incidentCreateRateLimiter = createInMemoryRateLimiter({
  maxRequests: 10,
  windowMs: 60_000,
});

const incidentShareRateLimiter = createInMemoryRateLimiter({
  maxRequests: 10,
  windowMs: 60_000,
});

const reportRangeIntervals = {
  week: "7 days",
  month: "30 days",
  quarter: "90 days",
  year: "365 days",
} as const;

const reportSummaryQuery = z.object({
  range: z.enum(["week", "month", "quarter", "year"]).default("month"),
});

const recentIncidentsQuery = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

function buildReportWhereClause(
  range: keyof typeof reportRangeIntervals,
  adminScope: ReturnType<typeof getMockAdminScopeFromRequest>
) {
  const values: string[] = [reportRangeIntervals[range]];
  const filters = ["i.created_at >= now() - $1::interval"];

  if (adminScope?.role === "agency_admin") {
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

function getMobilePlatform(headers: Record<string, unknown> | undefined) {
  const explicitPlatform = headers?.["x-mobile-platform"];
  if (explicitPlatform === "ios" || explicitPlatform === "android" || explicitPlatform === "desktop") {
    return explicitPlatform;
  }

  const userAgent = typeof headers?.["user-agent"] === "string"
    ? headers["user-agent"]
    : "";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Windows NT|Macintosh|Linux x86_64/i.test(userAgent)) return "desktop";
  return "android";
}

export async function registerIncidentRoutes(app: FastifyInstance) {
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

  app.get("/api/incidents", async (request) => {
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const values: string[] = [];
    const filters: string[] = [];

    if (adminScope?.role === "agency_admin") {
      values.push(adminScope.category);
      filters.push(`i.category = $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `
        SELECT
          i.id,
          i.case_number,
          i.category,
          i.severity,
          i.status,
          i.description,
          i.agency_contact_id,
          c.name AS agency_name,
          c.phone AS agency_phone,
          i.province_code,
          i.province,
          i.district_code,
          i.district,
          i.accuracy,
          i.call_status,
          i.reporter_phone,
          i.session_id,
          i.latitude,
          i.longitude,
          i.created_at,
          i.updated_at,
          CASE i.severity
            WHEN 'critical' THEN '#dc2626'
            WHEN 'high' THEN '#f97316'
            WHEN 'medium' THEN '#eab308'
            ELSE '#22c55e'
          END AS marker_color
        FROM incidents i
        LEFT JOIN contacts c ON c.id = i.agency_contact_id
        ${whereClause}
        ORDER BY i.created_at DESC
      `,
      values
    );
    return result.rows.map(rowToIncident);
  });

  app.get("/api/incidents/recent", async (request) => {
    const query = recentIncidentsQuery.parse(request.query ?? {});
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const since = query.since ?? new Date().toISOString();
    const limit = query.limit;
    const values: Array<string | number> = [since, limit];
    const filters = ["i.created_at > $1::timestamptz"];
    const statusFilters = [
      "i.updated_at > $1::timestamptz",
      "i.created_at <= $1::timestamptz",
    ];

    if (adminScope?.role === "agency_admin") {
      values.push(adminScope.category);
      filters.push(`i.category = $${values.length}`);
      statusFilters.push(`i.category = $${values.length}`);
    }

    const createdResult = await pool.query(
      `
        SELECT
          i.id,
          i.case_number,
          i.category,
          i.severity,
          i.status,
          i.status_version,
          i.description,
          i.agency_contact_id,
          c.name AS agency_name,
          c.phone AS agency_phone,
          i.province_code,
          i.province,
          i.district_code,
          i.district,
          i.accuracy,
          i.call_status,
          i.reporter_phone,
          i.session_id,
          i.latitude,
          i.longitude,
          i.created_at,
          i.updated_at,
          ${markerColorSql()}
        FROM incidents i
        LEFT JOIN contacts c ON c.id = i.agency_contact_id
        WHERE ${filters.join(" AND ")}
        ORDER BY i.created_at ASC, i.id ASC
        LIMIT $2
      `,
      values
    );

    const statusResult = await pool.query(
      `
        SELECT
          i.id,
          i.case_number,
          i.category,
          i.status,
          i.status_version,
          i.updated_at
        FROM incidents i
        WHERE ${statusFilters.join(" AND ")}
        ORDER BY i.updated_at ASC, i.id ASC
        LIMIT $2
      `,
      values
    );

    return {
      cursor: new Date().toISOString(),
      created: createdResult.rows.map(rowToIncident),
      statusUpdated: statusResult.rows.map((row) => ({
        id: row.id,
        category: row.category,
        status: row.status,
        statusVersion: row.status_version,
        updatedAt: row.updated_at,
      })),
    };
  });

  app.get("/api/incidents/:id", async (request, reply) => {
    const paramsResult = z
      .object({
        id: z.string().min(1),
      })
      .safeParse(request.params);

    if (!paramsResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(paramsResult.error);
    }

    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const values: string[] = [paramsResult.data.id];
    const filters = ["i.id = $1"];

    if (adminScope?.role === "agency_admin") {
      values.push(adminScope.category);
      filters.push(`i.category = $${values.length}`);
    }

    const result = await pool.query(
      `
        SELECT
          i.id,
          i.case_number,
          i.category,
          i.severity,
          i.status,
          i.description,
          i.agency_contact_id,
          c.name AS agency_name,
          c.phone AS agency_phone,
          i.province_code,
          i.province,
          i.district_code,
          i.district,
          i.accuracy,
          i.call_status,
          i.reporter_phone,
          i.session_id,
          i.latitude,
          i.longitude,
          i.created_at,
          i.updated_at,
          CASE i.severity
            WHEN 'critical' THEN '#dc2626'
            WHEN 'high' THEN '#f97316'
            WHEN 'medium' THEN '#eab308'
            ELSE '#22c55e'
          END AS marker_color
        FROM incidents i
        LEFT JOIN contacts c ON c.id = i.agency_contact_id
        WHERE ${filters.join(" AND ")}
        LIMIT 1
      `,
      values
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");
    }

    return rowToIncident(result.rows[0]);
  });

  app.get("/api/incidents/:id/tracking", async (request, reply) => {
    const paramsResult = z
      .object({
        id: z.string().min(1),
      })
      .safeParse(request.params);

    if (!paramsResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(paramsResult.error);
    }

    const queryResult = z
      .object({
        sessionId: z.string().trim().min(8).optional(),
      })
      .passthrough()
      .safeParse(request.query ?? {});

    if (!queryResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(queryResult.error);
    }

    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const sessionId = queryResult.data.sessionId;

    if (!adminScope && !sessionId) {
      reply.code(403);
      return buildApiErrorPayload(
        403,
        "INCIDENT_TRACKING_ACCESS_DENIED",
        "Reporter session or admin scope is required"
      );
    }

    const values: string[] = [paramsResult.data.id];
    const filters = ["i.id = $1"];

    if (adminScope?.role === "agency_admin") {
      values.push(adminScope.category);
      filters.push(`i.category = $${values.length}`);
    } else if (!adminScope && sessionId) {
      values.push(sessionId);
      filters.push(`i.session_id = $${values.length}`);
    }

    const result = await pool.query(
      `
        SELECT
          i.id,
          i.case_number,
          i.client_request_id,
          i.dialed_phone,
          i.category,
          i.severity,
          i.status,
          i.status_version,
          i.description,
          i.agency_contact_id,
          c.name AS agency_name,
          c.phone AS agency_phone,
          i.province_code,
          i.province,
          i.district_code,
          i.district,
          i.accuracy,
          i.call_status,
          i.reporter_phone,
          i.session_id,
          i.latitude,
          i.longitude,
          i.created_at,
          i.updated_at,
          ${markerColorSql()},
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', status_history.id,
                'fromStatus', status_history.from_status,
                'toStatus', status_history.to_status,
                'note', status_history.note,
                'changedByAdminId', status_history.changed_by_admin_id,
                'changedByRole', status_history.changed_by_role,
                'statusVersion', status_history.status_version,
                'createdAt', status_history.created_at
              )
              ORDER BY status_history.created_at ASC, status_history.id ASC
            )
            FROM incident_status_history status_history
            WHERE status_history.incident_id = i.id
          ), '[]'::jsonb) AS status_history,
          (
            SELECT jsonb_build_object(
              'id', latest_location.id,
              'latitude', latest_location.latitude,
              'longitude', latest_location.longitude,
              'accuracy', latest_location.accuracy,
              'source', latest_location.source,
              'createdAt', latest_location.created_at
            )
            FROM incident_location_history latest_location
            WHERE latest_location.incident_id = i.id
            ORDER BY latest_location.created_at DESC, latest_location.id DESC
            LIMIT 1
          ) AS latest_location,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', location_history.id,
                'latitude', location_history.latitude,
                'longitude', location_history.longitude,
                'accuracy', location_history.accuracy,
                'source', location_history.source,
                'createdAt', location_history.created_at
              )
              ORDER BY location_history.created_at ASC, location_history.id ASC
            )
            FROM incident_location_history location_history
            WHERE location_history.incident_id = i.id
          ), '[]'::jsonb) AS location_history
        FROM incidents i
        LEFT JOIN contacts c ON c.id = i.agency_contact_id
        WHERE ${filters.join(" AND ")}
        LIMIT 1
      `,
      values
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");
    }

    const row = result.rows[0];
    return {
      incident: rowToIncident(row),
      statusHistory: row.status_history ?? [],
      latestLocation: row.latest_location ?? null,
      locationHistory: row.location_history ?? [],
    };
  });

  app.post("/api/incidents/:id/share-attempts", async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = incidentShareAttemptBody.parse(request.body);
    const shareChannels = await resolveShareChannels();
    const recipient = getResolvedShareChannelRecipient(shareChannels, body.channel);

    if (!recipient) {
      reply.code(503);
      return buildApiErrorPayload(
        503,
        "SHARE_CHANNEL_NOT_CONFIGURED",
        "Share channel is not configured"
      );
    }

    const rateLimitKey = `${request.ip ?? "unknown"}:${params.id}:${body.sessionId}`;
    const rateLimitResult = incidentShareRateLimiter.check(rateLimitKey);
    if (!rateLimitResult.allowed) {
      reply.header("Retry-After", String(Math.ceil(rateLimitResult.retryAfterMs / 1000)));
      reply.code(429);
      return buildApiErrorPayload(
        429,
        "SHARE_RATE_LIMIT_EXCEEDED",
        "Too many share attempts"
      );
    }

    const incidentResult = await pool.query(
      `
        SELECT
          id,
          case_number,
          category,
          province,
          district,
          latitude,
          longitude,
          created_at
        FROM incidents
        WHERE id = $1 AND session_id = $2
        LIMIT 1
      `,
      [params.id, body.sessionId]
    );

    if (incidentResult.rows.length === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");
    }

    const incident = incidentResult.rows[0];
    const message = buildIncidentLocationShareMessage({
      id: incident.id,
      caseNumber: incident.case_number,
      category: incident.category,
      province: incident.province,
      district: incident.district,
      latitude: Number(incident.latitude),
      longitude: Number(incident.longitude),
      createdAt: incident.created_at,
      reporterPhone: body.reporterPhone ?? null,
    });
    const platform = getMobilePlatform(
      request.headers as Record<string, unknown> | undefined
    );
    const shareUrl = buildLocationShareUrl(
      body.channel,
      recipient,
      message,
      platform
    );
    const recorded = await writeAuditLog(request, {
      action: "incident.location_share_opened",
      resourceType: "incident",
      resourceId: params.id,
      actorType: "mobile_session",
      details: {
        channel: body.channel,
        reporterPhoneIncluded: Boolean(body.reporterPhone),
      },
    });

    return {
      recorded,
      channel: body.channel,
      shareUrl,
      message,
      mapsUrl: buildLocationMapsUrl({
        latitude: Number(incident.latitude),
        longitude: Number(incident.longitude),
      }),
    };
  });

  app.get("/api/incidents/:id/events", async (request, reply) => {
    const paramsResult = z
      .object({
        id: z.string().min(1),
      })
      .safeParse(request.params);

    if (!paramsResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(paramsResult.error);
    }

    const queryResult = z
      .object({
        sessionId: z.string().trim().min(8),
      })
      .safeParse(request.query ?? {});

    if (!queryResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(queryResult.error);
    }

    const incidentId = paramsResult.data.id;
    const ownershipResult = await pool.query(
      `
        SELECT id
        FROM incidents
        WHERE id = $1 AND session_id = $2
        LIMIT 1
      `,
      [incidentId, queryResult.data.sessionId]
    );

    if (ownershipResult.rows.length === 0) {
      reply.code(403);
      return buildApiErrorPayload(
        403,
        "INCIDENT_TRACKING_ACCESS_DENIED",
        "Reporter session does not own this incident"
      );
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
      "Access-Control-Allow-Origin": getAllowedCorsOrigin(request.headers?.origin),
      Vary: "Origin",
    });
    reply.raw.flushHeaders?.();

    let closed = false;

    const flushStream = () => {
      (reply.raw as { flush?: () => void }).flush?.();
    };
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      emergencyEvents.off("incident.status_updated", sendStatusUpdate);
    };

    const sendStatusUpdate = (payload: unknown) => {
      if (
        closed ||
        !payload ||
        typeof payload !== "object" ||
        (payload as { id?: unknown }).id !== incidentId
      ) {
        return;
      }

      try {
        reply.raw.write("event: incident.status_updated\n");
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        cleanup();
      }
    };

    reply.raw.write("retry: 2000\n");
    reply.raw.write(": connected\n\n");

    heartbeatInterval = setInterval(() => {
      if (closed) {
        return;
      }

      try {
        reply.raw.write(": keepalive\n\n");
      } catch {
        cleanup();
      }
    }, 15000);

    emergencyEvents.on("incident.status_updated", sendStatusUpdate);
    reply.raw.on("close", cleanup);
  });

  app.patch("/api/incidents/:id/status", async (request, reply) => {
    const paramsResult = z
      .object({
        id: z.string().min(1),
      })
      .safeParse(request.params);

    if (!paramsResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(paramsResult.error);
    }

    const bodyResult = incidentStatusUpdateBody.safeParse(request.body);
    if (!bodyResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(bodyResult.error);
    }

    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );

    if (!adminScope) {
      reply.code(403);
      return buildApiErrorPayload(
        403,
        "INCIDENT_STATUS_ACCESS_DENIED",
        "Admin scope is required"
      );
    }

    const body = bodyResult.data;
    const client = await pool.connect();
    let transactionOpen = false;
    let eventPayload: {
      id: unknown;
      category: unknown;
      fromStatus: string;
      status: unknown;
      statusVersion: unknown;
      note: string | null;
      updatedAt: unknown;
    } | null = null;

    try {
      await client.query("BEGIN");
      transactionOpen = true;

      const currentResult = await client.query(
        `
          SELECT id, category, status, status_version
          FROM incidents
          WHERE id = $1
          FOR UPDATE
        `,
        [paramsResult.data.id]
      );
      const current = currentResult.rows[0];

      if (
        !current ||
        (adminScope.role === "agency_admin" && current.category !== adminScope.category)
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(404);
        return buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");
      }

      if (
        current.status !== body.fromStatus ||
        current.status_version !== body.expectedVersion
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(409);
        return {
          ...buildApiErrorPayload(
            409,
            "INCIDENT_STATUS_CONFLICT",
            "Incident status was changed by another admin"
          ),
          currentState: {
            status: current.status,
            statusVersion: current.status_version,
          },
        };
      }

      const transitionResult = validateIncidentStatusTransition({
        role: adminScope.role,
        fromStatus: body.fromStatus,
        toStatus: body.toStatus,
        note: body.note,
      });

      if (!transitionResult.ok) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(transitionResult.statusCode);
        return buildApiErrorPayload(
          transitionResult.statusCode,
          transitionResult.code,
          transitionResult.error
        );
      }

      const updateResult = await client.query(
        `
          UPDATE incidents
          SET
            status = $1,
            status_version = status_version + 1,
            updated_at = now()
          WHERE id = $2
            AND status_version = $3
          RETURNING id, category, status, status_version, updated_at
        `,
        [body.toStatus, paramsResult.data.id, body.expectedVersion]
      );
      const updated = updateResult.rows[0];

      if (!updated) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(409);
        return buildApiErrorPayload(
          409,
          "INCIDENT_STATUS_CONFLICT",
          "Incident status was changed by another admin"
        );
      }

      await client.query(
        `
          INSERT INTO incident_status_history
            (incident_id, from_status, to_status, note, changed_by_role, status_version)
          VALUES
            ($1, $2, $3, $4, $5, $6)
        `,
        [
          paramsResult.data.id,
          body.fromStatus,
          body.toStatus,
          transitionResult.transition.note,
          adminScope.role,
          updated.status_version,
        ]
      );

      await client.query("COMMIT");
      transactionOpen = false;
      eventPayload = {
        id: updated.id,
        category: updated.category,
        fromStatus: body.fromStatus,
        status: updated.status,
        statusVersion: updated.status_version,
        note: transitionResult.transition.note,
        updatedAt: updated.updated_at,
      };
    } catch (error) {
      if (transactionOpen) {
        await client.query("ROLLBACK");
      }
      throw error;
    } finally {
      client.release();
    }

    emitEmergencyEvent({
      type: "incident.status_updated",
      payload: eventPayload,
    });
    return eventPayload;
  });

  app.get("/api/incidents/map-points", async (request) => {
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const values: string[] = [];
    const filters: string[] = [];

    if (adminScope?.role === "agency_admin") {
      values.push(adminScope.category);
      filters.push(`i.category = $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `
        SELECT
          i.id,
          i.case_number,
          i.category,
          i.severity,
          i.status,
          i.description,
          i.agency_contact_id,
          c.name AS agency_name,
          c.phone AS agency_phone,
          i.province_code,
          i.province,
          i.district_code,
          i.district,
          i.accuracy,
          i.call_status,
          i.latitude,
          i.longitude,
          i.created_at,
          a.id AS area_id,
          a.name AS area_name,
          a.color AS area_color,
          CASE i.severity
            WHEN 'critical' THEN '#dc2626'
            WHEN 'high' THEN '#f97316'
            WHEN 'medium' THEN '#eab308'
            ELSE '#22c55e'
          END AS marker_color
        FROM incidents i
        LEFT JOIN contacts c ON c.id = i.agency_contact_id
        LEFT JOIN LATERAL (
          SELECT id, name, color
          FROM areas
          WHERE ST_Contains(polygon, i.location)
          ORDER BY created_at DESC
          LIMIT 1
        ) a ON true
        ${whereClause}
        ORDER BY i.created_at DESC
      `,
      values
    );
    return result.rows.map(rowToIncident);
  });

  app.get("/api/incidents/history", async (request, reply) => {
    const queryResult = z.object({
      sessionId: z.string().trim().min(8),
    }).safeParse(request.query);

    if (!queryResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(queryResult.error);
    }

    const result = await pool.query(
      `
        SELECT
          i.id,
          i.case_number,
          i.category,
          i.severity,
          i.status,
          i.description,
          i.agency_contact_id,
          c.name AS agency_name,
          c.phone AS agency_phone,
          i.province_code,
          i.province,
          i.district_code,
          i.district,
          i.accuracy,
          i.call_status,
          i.reporter_phone,
          i.session_id,
          i.latitude,
          i.longitude,
          i.created_at,
          i.updated_at,
          CASE i.severity
            WHEN 'critical' THEN '#dc2626'
            WHEN 'high' THEN '#f97316'
            WHEN 'medium' THEN '#eab308'
            ELSE '#22c55e'
          END AS marker_color
        FROM incidents i
        LEFT JOIN contacts c ON c.id = i.agency_contact_id
        WHERE i.session_id = $1
        ORDER BY i.created_at DESC
      `,
      [queryResult.data.sessionId]
    );

    return result.rows.map(rowToIncident);
  });

  app.post("/api/incidents", async (request, reply) => {
    const rateLimit = incidentCreateRateLimiter.check(request.ip);
    if (!rateLimit.allowed) {
      reply.code(429);
      reply.header("Retry-After", Math.ceil(rateLimit.retryAfterMs / 1000));
      return buildApiErrorPayload(
        429,
        "INCIDENT_RATE_LIMITED",
        "Too many incident reports from this client"
      );
    }

    const bodyResult = incidentBody.safeParse(request.body);
    if (!bodyResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(bodyResult.error);
    }

    const body = bodyResult.data;

    if (body.reporterPhone && !isPlausiblePhoneNumber(body.reporterPhone)) {
      reply.code(400);
      return buildApiErrorPayload(400, "INVALID_PHONE_NUMBER", "Reporter phone number is invalid");
    }

    const categoryError = await validateActiveEmergencyCategory(body.category);
    if (categoryError) {
      reply.code(400);
      return categoryError;
    }

    const locationError = await validateLocationCodes({
      provinceCode: body.provinceCode,
      districtCode: body.districtCode,
    });
    if (locationError) {
      reply.code(400);
      return locationError;
    }

    const areaResult = await pool.query(
      `
        SELECT
          province_code,
          province_name_th,
          province_name_en,
          district_code,
          district_name_th,
          district_name_en
        FROM areas
        WHERE area_type IN ('district', 'province')
          AND ST_Contains(
            polygon,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)
          )
        ORDER BY CASE WHEN area_type = 'district' THEN 0 ELSE 1 END, created_at DESC
        LIMIT 1
      `,
      [body.latitude, body.longitude]
    );

    const matchedArea = areaResult.rows[0];
    const resolvedProvinceCode = matchedArea?.province_code ?? body.provinceCode ?? null;
    const resolvedDistrictCode = matchedArea?.district_code ?? body.districtCode ?? null;
    const resolvedProvince =
      matchedArea?.province_name_en ??
      matchedArea?.province_name_th ??
      body.province ??
      null;
    const resolvedDistrict =
      matchedArea?.district_name_en ??
      matchedArea?.district_name_th ??
      body.district ??
      null;

    const result = await pool.query(
      `
        WITH existing_incident AS (
          SELECT *
          FROM incidents
          WHERE client_request_id = $15
          LIMIT 1
        ),
        next_case AS (
          INSERT INTO incident_case_counters (category, case_date, last_sequence)
          SELECT $1, (now() AT TIME ZONE 'Asia/Bangkok')::date, 1
          WHERE NOT EXISTS (SELECT 1 FROM existing_incident)
          ON CONFLICT (category, case_date)
          DO UPDATE SET
            last_sequence = incident_case_counters.last_sequence + 1,
            updated_at = now()
          RETURNING category, case_date, last_sequence AS case_sequence
        ),
        case_identity AS (
          SELECT
            category,
            case_date,
            case_sequence,
            (
              CASE category
                WHEN 'police' THEN 'POL'
                WHEN 'medical' THEN 'EMS'
                WHEN 'fire' THEN 'FIR'
                WHEN 'rescue' THEN 'RES'
                WHEN 'flood' THEN 'FLD'
                WHEN 'road-accident' THEN 'RTA'
                ELSE left(regexp_replace(upper(category), '[^A-Z0-9]', '', 'g') || 'XXX', 3)
              END
              || '-' || to_char(case_date, 'YYYYMMDD')
              || '-' || lpad(case_sequence::text, 4, '0')
            ) AS case_number
          FROM next_case
        ),
        inserted_incident AS (
          INSERT INTO incidents
            (category, severity, status, description, agency_contact_id, latitude, longitude, province_code, province, district_code, district, accuracy, call_status, reporter_phone, session_id, client_request_id, dialed_phone, status_version, location, case_number, case_date, case_sequence)
          SELECT
            $1, $2, 'reported', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 0, ST_SetSRID(ST_MakePoint($6, $5), 4326),
            case_number, case_date, case_sequence
          FROM case_identity
          ON CONFLICT (client_request_id) WHERE client_request_id IS NOT NULL
          DO NOTHING
          RETURNING *
        ),
        inserted_status_history AS (
          INSERT INTO incident_status_history
            (incident_id, from_status, to_status, note, changed_by_role, status_version)
          SELECT id, NULL, 'reported', NULL, 'mobile', status_version
          FROM inserted_incident
          RETURNING incident_id
        ),
        inserted_location_history AS (
          INSERT INTO incident_location_history
            (incident_id, latitude, longitude, location, accuracy, source)
          SELECT id, latitude, longitude, location, accuracy, 'initial'
          FROM inserted_incident
          RETURNING incident_id
        ),
        selected_incident AS (
          SELECT inserted_incident.*, true AS was_created
          FROM inserted_incident
          UNION ALL
          SELECT existing_incident.*, false AS was_created
          FROM existing_incident
          WHERE NOT EXISTS (SELECT 1 FROM inserted_incident)
          LIMIT 1
        )
        SELECT selected_incident.*, ${markerColorSql()}
        FROM selected_incident
      `,
      [
        body.category,
        body.severity,
        body.description ?? null,
        body.agencyContactId ?? null,
        body.latitude,
        body.longitude,
        resolvedProvinceCode,
        resolvedProvince,
        resolvedDistrictCode,
        resolvedDistrict,
        body.accuracy ?? null,
        body.callStatus ?? null,
        body.reporterPhone ?? null,
        body.sessionId ?? null,
        body.clientRequestId,
        body.dialedPhone,
      ]
    );

    const row = result.rows[0];
    const incident = rowToIncident(row);
    const wasCreated = row?.was_created === true;

    if (wasCreated) {
      await writeAuditLog(request, {
        action: "incidents.create",
        resourceType: "incident",
        resourceId: String(incident.id),
        details: {
          category: incident.category,
          severity: incident.severity,
          status: incident.status,
          provinceCode: incident.provinceCode,
          districtCode: incident.districtCode,
        },
      });
      emitEmergencyEvent({
        type: "incident.created",
        payload: incident,
      });
    }

    reply.code(wasCreated ? 201 : 200);
    return incident;
  });

  app.put("/api/incidents/:id/call", async (request, reply) => {
    const paramsResult = z
      .object({
        id: z.string().min(1),
      })
      .safeParse(request.params);

    if (!paramsResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(paramsResult.error);
    }

    const bodyResult = incidentCallUpdateBody.safeParse(request.body);
    if (!bodyResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(bodyResult.error);
    }

    const body = bodyResult.data;

    if (body.reporterPhone && !isPlausiblePhoneNumber(body.reporterPhone)) {
      reply.code(400);
      return buildApiErrorPayload(400, "INVALID_PHONE_NUMBER", "Reporter phone number is invalid");
    }

    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const values: Array<string | null> = [
      paramsResult.data.id,
      body.callStatus,
      body.reporterPhone ?? null,
      body.description ?? null,
    ];

    const updateScopeCondition =
      adminScope?.role === "agency_admin"
        ? ` AND category = $${values.push(adminScope.category)}`
        : "";

    const result = await pool.query(
      `
        WITH updated_incident AS (
          UPDATE incidents
          SET
            call_status = $2,
            reporter_phone = COALESCE($3, reporter_phone),
            description = COALESCE($4, description),
            updated_at = now()
          WHERE id = $1
          ${updateScopeCondition}
          RETURNING *
        )
        SELECT
          i.id,
          i.case_number,
          i.category,
          i.severity,
          i.status,
          i.description,
          i.agency_contact_id,
          c.name AS agency_name,
          c.phone AS agency_phone,
          i.province_code,
          i.province,
          i.district_code,
          i.district,
          i.accuracy,
          i.call_status,
          i.reporter_phone,
          i.session_id,
          i.latitude,
          i.longitude,
          i.created_at,
          i.updated_at,
          ${markerColorSql()}
        FROM updated_incident i
        LEFT JOIN contacts c ON c.id = i.agency_contact_id
      `,
      values
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");
    }

    const incident = rowToIncident(result.rows[0]);
    await writeAuditLog(request, {
      action: "incidents.update-call",
      resourceType: "incident",
      resourceId: String(incident.id),
      details: {
        callStatus: incident.callStatus,
        reporterPhone: incident.reporterPhone,
      },
    });

    return incident;
  });

  app.get("/api/events", async (request, reply) => {
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
      "Access-Control-Allow-Origin": getAllowedCorsOrigin(request.headers?.origin),
      Vary: "Origin",
    });
    reply.raw.flushHeaders?.();

    let closed = false;

    const flushStream = () => {
      (reply.raw as { flush?: () => void }).flush?.();
    };

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      clearInterval(heartbeatInterval);
      emergencyEvents.off("incident.created", sendIncident);
      emergencyEvents.off("incident.status_updated", sendStatusUpdate);
    };

    const sendEvent = (eventName: string, payload: unknown) => {
      if (closed) {
        return;
      }

      if (
        adminScope?.role === "agency_admin" &&
        (!payload || typeof payload !== "object" || (payload as { category?: unknown }).category !== adminScope.category)
      ) {
        return;
      }

      try {
        reply.raw.write(`event: ${eventName}\n`);
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
        flushStream();
      } catch {
        cleanup();
      }
    };

    const sendIncident = (payload: unknown) => {
      sendEvent("incident.created", payload);
    };

    const sendStatusUpdate = (payload: unknown) => {
      sendEvent("incident.status_updated", payload);
    };

    reply.raw.write(`:${" ".repeat(2048)}\n\n`);
    reply.raw.write("retry: 2000\n");
    reply.raw.write(": connected\n\n");
    flushStream();

    const heartbeatInterval = setInterval(() => {
      if (closed) {
        return;
      }

      try {
        reply.raw.write(": keepalive\n\n");
        flushStream();
      } catch {
        cleanup();
      }
    }, 15000);

    emergencyEvents.on("incident.created", sendIncident);
    emergencyEvents.on("incident.status_updated", sendStatusUpdate);
    reply.raw.on("close", cleanup);
  });
}
