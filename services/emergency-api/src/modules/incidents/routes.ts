import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { emergencyEvents, emitEmergencyEvent } from "../../events.js";
import { pool } from "../../db.js";

const incidentBody = z.object({
  category: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["open", "acknowledged", "closed"]).default("open"),
  description: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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
    province: row.province,
    district: row.district,
    accuracy: row.accuracy,
    callStatus: row.call_status,
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

export async function registerIncidentRoutes(app: FastifyInstance) {
  app.get("/api/incidents", async () => {
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
          i.province,
          i.district,
          i.accuracy,
          i.call_status,
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
        ORDER BY i.created_at DESC
      `
    );
    return result.rows.map(rowToIncident);
  });

  app.get("/api/incidents/map-points", async () => {
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
          i.province,
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
        ORDER BY i.created_at DESC
      `
    );
    return result.rows.map(rowToIncident);
  });

  app.post("/api/incidents", async (request, reply) => {
    const body = incidentBody.parse(request.body);
    const result = await pool.query(
      `
        INSERT INTO incidents
          (category, severity, status, description, latitude, longitude, location)
        VALUES
          ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326))
        RETURNING *, ${markerColorSql()}
      `,
      [
        body.category,
        body.severity,
        body.status,
        body.description ?? null,
        body.latitude,
        body.longitude,
      ]
    );

    const incident = rowToIncident(result.rows[0]);
    emitEmergencyEvent({
      type: "incident.created",
      payload: incident,
    });

    reply.code(201);
    return incident;
  });

  app.get("/api/events", async (_request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendIncident = (payload: unknown) => {
      reply.raw.write(`event: incident.created\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    emergencyEvents.on("incident.created", sendIncident);
    reply.raw.on("close", () => {
      emergencyEvents.off("incident.created", sendIncident);
    });
  });
}
