import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db.js";

const areaBody = z.object({
  name: z.string().min(1),
  color: z.string().min(1).default("#2563eb"),
  areaType: z
    .enum(["province", "district", "subdistrict", "response-zone"])
    .default("response-zone"),
  polygon: z.union([
    z.object({
      type: z.literal("Polygon"),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    }),
    z.object({
      type: z.literal("MultiPolygon"),
      coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))),
    }),
  ]),
});

const containsPointBody = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const areaQuery = z.object({
  areaType: z
    .enum(["province", "district", "subdistrict", "response-zone"])
    .optional(),
  provinceCode: z.string().min(1).optional(),
  districtCode: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  includeGeometry: z.enum(["true", "false"]).default("true"),
});

const paramsWithId = z.object({
  id: z.string().uuid(),
});

function rowToArea(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    areaType: row.area_type,
    source: row.source,
    sourceCode: row.source_code,
    provinceCode: row.province_code,
    provinceNameTh: row.province_name_th,
    provinceNameEn: row.province_name_en,
    districtCode: row.district_code,
    districtNameTh: row.district_name_th,
    districtNameEn: row.district_name_en,
    parentAreaId: row.parent_area_id,
    polygon: row.polygon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToContact(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    category: row.category,
    province: row.province,
    district: row.district,
    is24Hours: row.is_24_hours,
    areaId: row.area_id,
    latitude: row.latitude,
    longitude: row.longitude,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToIncident(row: Record<string, unknown>) {
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    status: row.status,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function registerAreaRoutes(app: FastifyInstance) {
  app.get("/api/areas", async (request) => {
    const query = areaQuery.parse(request.query);
    const values: unknown[] = [];
    const filters: string[] = [];

    if (query.areaType) {
      values.push(query.areaType);
      filters.push(`area_type = $${values.length}`);
    }

    if (query.provinceCode) {
      values.push(query.provinceCode);
      filters.push(`province_code = $${values.length}`);
    }

    if (query.districtCode) {
      values.push(query.districtCode);
      filters.push(`district_code = $${values.length}`);
    }

    if (query.source) {
      values.push(query.source);
      filters.push(`source = $${values.length}`);
    }

    const geometrySelect =
      query.includeGeometry === "false"
        ? "NULL::json AS polygon"
        : "ST_AsGeoJSON(polygon)::json AS polygon";
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await pool.query(
      `
        SELECT id, name, color, ${geometrySelect}, created_at, updated_at
          , area_type, source, source_code, province_code, province_name_th, province_name_en
          , district_code, district_name_th, district_name_en, parent_area_id
        FROM areas
        ${whereClause}
        ORDER BY area_type ASC, name ASC
      `,
      values
    );
    return result.rows.map(rowToArea);
  });

  app.post("/api/areas", async (request, reply) => {
    const body = areaBody.parse(request.body);
    const result = await pool.query(
      `
        INSERT INTO areas (name, color, area_type, polygon)
        VALUES ($1, $2, $3, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)))
        RETURNING id, name, color, area_type, source, source_code, province_code,
          province_name_th, province_name_en, district_code, district_name_th,
          district_name_en, parent_area_id, ST_AsGeoJSON(polygon)::json AS polygon,
          created_at, updated_at
      `,
      [body.name, body.color, body.areaType, JSON.stringify(body.polygon)]
    );

    reply.code(201);
    return rowToArea(result.rows[0]);
  });

  app.put("/api/areas/:id", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const body = areaBody.parse(request.body);
    const result = await pool.query(
      `
        UPDATE areas
        SET
          name = $1,
          color = $2,
          area_type = $3,
          polygon = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)),
          updated_at = now()
        WHERE id = $5
        RETURNING id, name, color, area_type, source, source_code, province_code,
          province_name_th, province_name_en, district_code, district_name_th,
          district_name_en, parent_area_id, ST_AsGeoJSON(polygon)::json AS polygon,
          created_at, updated_at
      `,
      [body.name, body.color, body.areaType, JSON.stringify(body.polygon), id]
    );

    if (result.rowCount === 0) {
      reply.code(404);
      return { error: "Area not found" };
    }

    return rowToArea(result.rows[0]);
  });

  app.delete("/api/areas/:id", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const result = await pool.query("DELETE FROM areas WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      reply.code(404);
      return { error: "Area not found" };
    }

    return { ok: true };
  });

  app.get("/api/areas/:id/contacts", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const result = await pool.query(
      `
        SELECT c.*
        FROM contacts c
        JOIN areas a ON a.id = $1
        WHERE c.location IS NOT NULL
          AND ST_Contains(a.polygon, c.location)
        ORDER BY c.name ASC
      `,
      [id]
    );

    if (result.rows.length === 0) {
      const area = await pool.query("SELECT id FROM areas WHERE id = $1", [id]);
      if (area.rowCount === 0) {
        reply.code(404);
        return { error: "Area not found" };
      }
    }

    return result.rows.map(rowToContact);
  });

  app.get("/api/areas/:id/incidents", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const result = await pool.query(
      `
        SELECT i.*
        FROM incidents i
        JOIN areas a ON a.id = $1
        WHERE ST_Contains(a.polygon, i.location)
        ORDER BY i.created_at DESC
      `,
      [id]
    );

    if (result.rows.length === 0) {
      const area = await pool.query("SELECT id FROM areas WHERE id = $1", [id]);
      if (area.rowCount === 0) {
        reply.code(404);
        return { error: "Area not found" };
      }
    }

    return result.rows.map(rowToIncident);
  });

  app.post("/api/areas/:id/contains-point", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const body = containsPointBody.parse(request.body);
    const result = await pool.query(
      `
        SELECT ST_Contains(
          polygon,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)
        ) AS contains
        FROM areas
        WHERE id = $3
      `,
      [body.latitude, body.longitude, id]
    );

    if (result.rowCount === 0) {
      reply.code(404);
      return { error: "Area not found" };
    }

    return { contains: result.rows[0].contains };
  });
}
