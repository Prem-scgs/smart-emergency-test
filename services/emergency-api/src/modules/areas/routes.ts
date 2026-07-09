import type { FastifyInstance } from "fastify";
import { getMockAdminScope, isViewerScope } from "../../admin-scope.js";
import { buildApiErrorPayload } from "../../api-error.js";
import { writeAuditLog } from "../../audit-log.js";
import { pool } from "../../db.js";
import {
  areaBody,
  areaQuery,
  buildAreaForbiddenPayload,
  containsPointBody,
  paramsWithId,
  resolvePointQuery,
  rowToArea,
  rowToContact,
  rowToIncident,
} from "./route-helpers.js";

export async function registerAreaRoutes(app: FastifyInstance) {
  /**
   * Boundary/response zone สำหรับหน้า GIS และ dashboard map
   *
   * ข้อมูล polygon เก็บเป็น SRID 4326 เพื่อใช้กับพิกัด browser/mobile ได้ตรงกัน
   * includeGeometry=false ใช้ตอนต้องการ metadata อย่างเดียว เพื่อลด payload ไม่ให้ frontend โหลด polygon หนักเกินจำเป็น
   */
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

  /**
   * แปลงพิกัด latitude/longitude เป็นจังหวัด/อำเภอจาก polygon
   *
   * ระวัง: ST_MakePoint รับลำดับ longitude, latitude แต่ API รับ query เป็น latitude, longitude
   * endpoint นี้กระทบ mobile location auto-select, incident create และ GIS/debug flow
   */
  app.get("/api/areas/resolve-point", async (request) => {
    const query = resolvePointQuery.parse(request.query);
    const result = await pool.query(
      `
        WITH district_match AS (
          SELECT
            id,
            name,
            province_code,
            province_name_th,
            province_name_en,
            district_code,
            district_name_th,
            district_name_en
          FROM areas
          WHERE area_type = 'district'
            AND ST_Contains(
              polygon,
              ST_SetSRID(ST_MakePoint($2, $1), 4326)
            )
          ORDER BY created_at DESC
          LIMIT 1
        ),
        province_match AS (
          SELECT
            id,
            name,
            province_code,
            province_name_th,
            province_name_en
          FROM areas
          WHERE area_type = 'province'
            AND ST_Contains(
              polygon,
              ST_SetSRID(ST_MakePoint($2, $1), 4326)
            )
          ORDER BY created_at DESC
          LIMIT 1
        )
        SELECT
          d.id AS district_area_id,
          d.name AS district_area_name,
          d.province_code,
          COALESCE(d.province_name_th, p.province_name_th) AS province_name_th,
          COALESCE(d.province_name_en, p.province_name_en) AS province_name_en,
          d.district_code,
          d.district_name_th,
          d.district_name_en,
          p.id AS province_area_id,
          p.name AS province_area_name
        FROM district_match d
        FULL JOIN province_match p ON true
      `,
      [query.latitude, query.longitude]
    );

    const row = result.rows[0];
    const matched = Boolean(
      row?.province_code ||
      row?.district_code ||
      row?.province_area_id ||
      row?.district_area_id
    );

    return {
      matched,
      provinceCode: row?.province_code ?? null,
      provinceNameTh: row?.province_name_th ?? null,
      provinceNameEn: row?.province_name_en ?? null,
      districtCode: row?.district_code ?? null,
      districtNameTh: row?.district_name_th ?? null,
      districtNameEn: row?.district_name_en ?? null,
      provinceAreaId: row?.province_area_id ?? null,
      provinceAreaName: row?.province_area_name ?? null,
      districtAreaId: row?.district_area_id ?? null,
      districtAreaName: row?.district_area_name ?? null,
    };
  });

  app.post("/api/areas", async (request, reply) => {
    const body = areaBody.parse(request.body);
    const scope = getMockAdminScope(request.headers);

    // viewer เป็นบัญชีอ่านอย่างเดียว จึงห้ามสร้าง/แก้ GIS response zones
    if (isViewerScope(scope)) {
      reply.code(403);
      return buildAreaForbiddenPayload();
    }

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
    const area = rowToArea(result.rows[0]);
    await writeAuditLog(request, {
      action: "areas.create",
      resourceType: "area",
      resourceId: String(area.id),
      details: {
        name: area.name,
        areaType: area.areaType,
      },
    });
    return area;
  });

  app.put("/api/areas/:id", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const body = areaBody.parse(request.body);
    const scope = getMockAdminScope(request.headers);

    // viewer เป็นบัญชีอ่านอย่างเดียว จึงห้ามสร้าง/แก้ GIS response zones
    if (isViewerScope(scope)) {
      reply.code(403);
      return buildAreaForbiddenPayload();
    }

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
      return buildApiErrorPayload(404, "AREA_NOT_FOUND", "Area not found");
    }

    const area = rowToArea(result.rows[0]);
    await writeAuditLog(request, {
      action: "areas.update",
      resourceType: "area",
      resourceId: String(area.id),
      details: {
        name: area.name,
        areaType: area.areaType,
      },
    });
    return area;
  });

  app.delete("/api/areas/:id", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const scope = getMockAdminScope(request.headers);

    // viewer เป็นบัญชีอ่านอย่างเดียว จึงห้ามลบ GIS response zones
    if (isViewerScope(scope)) {
      reply.code(403);
      return buildAreaForbiddenPayload();
    }

    const result = await pool.query("DELETE FROM areas WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "AREA_NOT_FOUND", "Area not found");
    }

    await writeAuditLog(request, {
      action: "areas.delete",
      resourceType: "area",
      resourceId: id,
      details: {},
    });

    return { ok: true };
  });

  /**
   * หา contacts ที่มี point อยู่ใน boundary เดียวกัน
   *
   * ใช้ ST_Contains(a.polygon, c.location) จึงต้องมี location geometry ใน contacts
   * ถ้าแก้ schema/location column ต้องทดสอบ GIS sidebar และ contacts marker พร้อมกัน
   */
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
        return buildApiErrorPayload(404, "AREA_NOT_FOUND", "Area not found");
      }
    }

    return result.rows.map(rowToContact);
  });

  /**
   * หา incidents ที่ตกอยู่ใน boundary เดียวกันสำหรับหน้า GIS
   *
   * Query นี้อ่านจาก incidents.location โดยตรง ไม่ได้คำนวณจาก latitude/longitude ซ้ำ
   * เพื่อให้ผลลัพธ์ตรงกับ geometry ที่บันทึกตอน create incident
   */
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
        return buildApiErrorPayload(404, "AREA_NOT_FOUND", "Area not found");
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
      return buildApiErrorPayload(404, "AREA_NOT_FOUND", "Area not found");
    }

    return { contains: result.rows[0].contains };
  });
}
