import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getMockAdminScopeFromRequest } from "../../admin-scope.js";
import { buildApiErrorPayload } from "../../api-error.js";
import { writeAuditLog } from "../../audit-log.js";
import { emergencyEvents, emitEmergencyEvent } from "../../events.js";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import {
  buildZodValidationErrorPayload,
  isPlausiblePhoneNumber,
  validateActiveEmergencyCategory,
  validateLocationCodes,
} from "../../input-validation.js";
import { createInMemoryRateLimiter } from "../../rate-limit.js";

const incidentBody = z.object({
  category: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["open", "acknowledged", "closed"]).default("open"),
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

function rowToIncident(row: Record<string, unknown>) {
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    status: row.status,
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

export async function registerIncidentRoutes(app: FastifyInstance) {
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
        INSERT INTO incidents
          (category, severity, status, description, agency_contact_id, latitude, longitude, province_code, province, district_code, district, accuracy, call_status, reporter_phone, session_id, location)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, ST_SetSRID(ST_MakePoint($7, $6), 4326))
        RETURNING *, ${markerColorSql()}
      
      `,
      [
        body.category,
        body.severity,
        body.status,
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
      ]
    );

    const incident = rowToIncident(result.rows[0]);
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

    reply.code(201);
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
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": config.corsOrigin,
      Vary: "Origin",
    });
    reply.raw.flushHeaders?.();

    let closed = false;

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      clearInterval(heartbeatInterval);
      emergencyEvents.off("incident.created", sendIncident);
    };

    const sendIncident = (payload: unknown) => {
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
        reply.raw.write(`event: incident.created\n`);
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        cleanup();
      }
    };

    reply.raw.write("retry: 2000\n");
    reply.raw.write(": connected\n\n");

    const heartbeatInterval = setInterval(() => {
      if (closed) {
        return;
      }

      try {
        reply.raw.write(": keepalive\n\n");
      } catch {
        cleanup();
      }
    }, 15000);

    emergencyEvents.on("incident.created", sendIncident);
    reply.raw.on("close", cleanup);
  });
}
