import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getMockAdminScopeFromRequest,
  isCategoryScopedAdmin,
  isViewerScope,
} from "../../admin-scope.js";
import { buildApiErrorPayload } from "../../api-error.js";
import { writeAuditLog } from "../../audit-log.js";
import { emitEmergencyEvent } from "../../events.js";
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
import { registerIncidentEventRoutes } from "./event-routes.js";
import { registerIncidentReportRoutes } from "./report-routes.js";
import { registerIncidentStatusRoutes } from "./status-routes.js";

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

const recentIncidentsQuery = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

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
  await registerIncidentReportRoutes(app);
  await registerIncidentEventRoutes(app);
  await registerIncidentStatusRoutes(app);

  app.get("/api/incidents", async (request) => {
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const values: string[] = [];
    const filters: string[] = [];

    if (isCategoryScopedAdmin(adminScope)) {
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

    if (isCategoryScopedAdmin(adminScope)) {
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

    if (isCategoryScopedAdmin(adminScope)) {
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

    if (isCategoryScopedAdmin(adminScope)) {
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

  app.get("/api/incidents/map-points", async (request) => {
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );
    const values: string[] = [];
    const filters: string[] = [];

    if (isCategoryScopedAdmin(adminScope)) {
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

    // endpoint นี้บันทึกผลการโทรจาก admin; viewer จึงห้ามเขียนสถานะการโทร
    if (isViewerScope(adminScope)) {
      reply.code(403);
      return buildApiErrorPayload(
        403,
        "INCIDENT_CALL_UPDATE_FORBIDDEN",
        "Viewer role cannot update incident call status"
      );
    }

    const values: Array<string | null> = [
      paramsResult.data.id,
      body.callStatus,
      body.reporterPhone ?? null,
      body.description ?? null,
    ];

    const updateScopeCondition =
      isCategoryScopedAdmin(adminScope)
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

}
