import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildApiErrorPayload } from "../../api-error.js";
import {
  getMockAdminScope,
  isCategoryScopedAdmin,
  isViewerScope,
} from "../../admin-scope.js";
import { writeAuditLog } from "../../audit-log.js";
import { pool } from "../../db.js";

const contactBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  role: z.string().min(1).default("responder"),
  category: z.string().min(1).nullable().optional(),
  provinceCode: z.string().min(1).nullable().optional(),
  province: z.string().min(1).nullable().optional(),
  districtCode: z.string().min(1).nullable().optional(),
  district: z.string().min(1).nullable().optional(),
  is24Hours: z.boolean().default(true),
  areaId: z.string().uuid().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  active: z.boolean().default(true),
});

const paramsWithId = z.object({
  id: z.string().uuid(),
});

const contactQuery = z.object({
  category: z.string().min(1).optional(),
  provinceCode: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  districtCode: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  active: z.coerce.boolean().optional(),
});

function buildContactForbiddenPayload() {
  return buildApiErrorPayload(403, "CONTACT_FORBIDDEN", "Contact is outside your admin scope");
}

function isAgencyContactScopeMismatch(
  scope: ReturnType<typeof getMockAdminScope>,
  category: string | null | undefined
) {
  return isCategoryScopedAdmin(scope) && category !== scope.category;
}

function rowToContact(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    category: row.category,
    provinceCode: row.province_code,
    province: row.province,
    districtCode: row.district_code,
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

export async function registerContactRoutes(app: FastifyInstance) {
  app.get("/api/contacts", async (request) => {
    const query = contactQuery.parse(request.query);
    const scope = getMockAdminScope(request.headers);
    const filters: string[] = [];
    const values: Array<string | boolean> = [];
    const effectiveCategory = isCategoryScopedAdmin(scope) ? scope.category : query.category;

    if (effectiveCategory) {
      values.push(effectiveCategory);
      filters.push(`category = $${values.length}`);
    }

    if (query.districtCode && query.provinceCode) {
      values.push(query.districtCode, query.provinceCode);
      const districtCodeIndex = values.length - 1;
      const provinceCodeIndex = values.length;
      filters.push(
        `(
          district_code = $${districtCodeIndex}
          OR (district_code IS NULL AND province_code = $${provinceCodeIndex})
          OR (district_code IS NULL AND province_code IS NULL)
        )`
      );
    } else if (query.district && query.province) {
      values.push(query.district, query.province);
      const districtIndex = values.length - 1;
      const provinceIndex = values.length;
      filters.push(
        `(
          district = $${districtIndex}
          OR (district IS NULL AND province = $${provinceIndex})
          OR (district IS NULL AND province IS NULL)
        )`
      );
    } else if (query.provinceCode) {
      values.push(query.provinceCode);
      filters.push(`(province_code = $${values.length} OR province_code IS NULL)`);
    } else if (query.province) {
      values.push(query.province);
      filters.push(`(province = $${values.length} OR province IS NULL)`);
    } else if (query.districtCode) {
      values.push(query.districtCode);
      filters.push(`(district_code = $${values.length} OR district_code IS NULL)`);
    } else if (query.district) {
      values.push(query.district);
      filters.push(`(district = $${values.length} OR district IS NULL)`);
    }

    if (query.active !== undefined) {
      values.push(query.active);
      filters.push(`active = $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await pool.query(
      `
        SELECT *
        FROM contacts
        ${whereClause}
        ORDER BY
          CASE
            WHEN district_code IS NOT NULL OR district IS NOT NULL THEN 0
            WHEN province_code IS NOT NULL OR province IS NOT NULL THEN 1
            ELSE 2
          END,
          created_at DESC
      `,
      values
    );

    return result.rows.map(rowToContact);
  });

  app.post("/api/contacts", async (request, reply) => {
    const body = contactBody.parse(request.body);
    const scope = getMockAdminScope(request.headers);

    // viewer เป็นบัญชีอ่านอย่างเดียว จึงห้ามแก้ข้อมูล contacts แม้จะอยู่ในหมวดเดียวกัน
    if (isViewerScope(scope)) {
      reply.code(403);
      return buildContactForbiddenPayload();
    }

    if (isAgencyContactScopeMismatch(scope, body.category ?? null)) {
      reply.code(403);
      return buildContactForbiddenPayload();
    }

    const hasPoint = body.latitude != null && body.longitude != null;
    const result = await pool.query(
      `
        INSERT INTO contacts
          (name, phone, role, category, province_code, province, district_code, district, is_24_hours, area_id, latitude, longitude, location, active)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           CASE WHEN $13 THEN ST_SetSRID(ST_MakePoint($12, $11), 4326) ELSE NULL END,
           $14)
        RETURNING *
      `,
      [
        body.name,
        body.phone,
        body.role,
        body.category ?? null,
        body.provinceCode ?? null,
        body.province ?? null,
        body.districtCode ?? null,
        body.district ?? null,
        body.is24Hours,
        body.areaId ?? null,
        body.latitude ?? null,
        body.longitude ?? null,
        hasPoint,
        body.active,
      ]
    );

    reply.code(201);
    const contact = rowToContact(result.rows[0]);
    await writeAuditLog(request, {
      action: "contacts.create",
      resourceType: "contact",
      resourceId: String(contact.id),
      details: {
        name: contact.name,
        role: contact.role,
        category: contact.category,
      },
    });
    return contact;
  });

  app.put("/api/contacts/:id", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const body = contactBody.parse(request.body);
    const scope = getMockAdminScope(request.headers);

    // viewer เป็นบัญชีอ่านอย่างเดียว จึงห้ามแก้ข้อมูล contacts แม้จะอยู่ในหมวดเดียวกัน
    if (isViewerScope(scope)) {
      reply.code(403);
      return buildContactForbiddenPayload();
    }

    if (isAgencyContactScopeMismatch(scope, body.category ?? null)) {
      reply.code(403);
      return buildContactForbiddenPayload();
    }

    if (isCategoryScopedAdmin(scope)) {
      const existing = await pool.query("SELECT category FROM contacts WHERE id = $1", [id]);

      if (existing.rowCount === 0) {
        reply.code(404);
        return buildApiErrorPayload(404, "CONTACT_NOT_FOUND", "Contact not found");
      }

      if (existing.rows[0]?.category !== scope.category) {
        reply.code(403);
        return buildContactForbiddenPayload();
      }
    }

    const hasPoint = body.latitude != null && body.longitude != null;
    const result = await pool.query(
      `
        UPDATE contacts
        SET
          name = $1,
          phone = $2,
          role = $3,
          category = $4,
          province_code = $5,
          province = $6,
          district_code = $7,
          district = $8,
          is_24_hours = $9,
          area_id = $10,
          latitude = $11,
          longitude = $12,
          location = CASE WHEN $13 THEN ST_SetSRID(ST_MakePoint($12, $11), 4326) ELSE NULL END,
          active = $14,
          updated_at = now()
        WHERE id = $15
        RETURNING *
      `,
      [
        body.name,
        body.phone,
        body.role,
        body.category ?? null,
        body.provinceCode ?? null,
        body.province ?? null,
        body.districtCode ?? null,
        body.district ?? null,
        body.is24Hours,
        body.areaId ?? null,
        body.latitude ?? null,
        body.longitude ?? null,
        hasPoint,
        body.active,
        id,
      ]
    );

    if (result.rowCount === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "CONTACT_NOT_FOUND", "Contact not found");
    }

    const contact = rowToContact(result.rows[0]);
    await writeAuditLog(request, {
      action: "contacts.update",
      resourceType: "contact",
      resourceId: String(contact.id),
      details: {
        name: contact.name,
        role: contact.role,
        category: contact.category,
        active: contact.active,
      },
    });
    return contact;
  });

  app.delete("/api/contacts/:id", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const scope = getMockAdminScope(request.headers);

    // viewer เป็นบัญชีอ่านอย่างเดียว จึงห้ามลบข้อมูล contacts แม้จะอยู่ในหมวดเดียวกัน
    if (isViewerScope(scope)) {
      reply.code(403);
      return buildContactForbiddenPayload();
    }

    if (isCategoryScopedAdmin(scope)) {
      const existing = await pool.query("SELECT category FROM contacts WHERE id = $1", [id]);

      if (existing.rowCount === 0) {
        reply.code(404);
        return buildApiErrorPayload(404, "CONTACT_NOT_FOUND", "Contact not found");
      }

      if (existing.rows[0]?.category !== scope.category) {
        reply.code(403);
        return buildContactForbiddenPayload();
      }
    }

    const result = await pool.query("DELETE FROM contacts WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      reply.code(404);
      return buildApiErrorPayload(404, "CONTACT_NOT_FOUND", "Contact not found");
    }

    await writeAuditLog(request, {
      action: "contacts.delete",
      resourceType: "contact",
      resourceId: id,
      details: {},
    });

    return { ok: true };
  });
}
