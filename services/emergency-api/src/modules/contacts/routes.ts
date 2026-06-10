import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db.js";

const contactBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  role: z.string().min(1).default("responder"),
  category: z.string().min(1).nullable().optional(),
  province: z.string().min(1).nullable().optional(),
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

export async function registerContactRoutes(app: FastifyInstance) {
  app.get("/api/contacts", async () => {
    const result = await pool.query(
      `SELECT * FROM contacts ORDER BY created_at DESC`
    );
    return result.rows.map(rowToContact);
  });

  app.post("/api/contacts", async (request, reply) => {
    const body = contactBody.parse(request.body);
    const hasPoint = body.latitude != null && body.longitude != null;
    const result = await pool.query(
      `
        INSERT INTO contacts
          (name, phone, role, category, province, district, is_24_hours, area_id, latitude, longitude, location, active)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           CASE WHEN $11 THEN ST_SetSRID(ST_MakePoint($10, $9), 4326) ELSE NULL END,
           $12)
        RETURNING *
      `,
      [
        body.name,
        body.phone,
        body.role,
        body.category ?? null,
        body.province ?? null,
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
    return rowToContact(result.rows[0]);
  });

  app.put("/api/contacts/:id", async (request) => {
    const { id } = paramsWithId.parse(request.params);
    const body = contactBody.parse(request.body);
    const hasPoint = body.latitude != null && body.longitude != null;
    const result = await pool.query(
      `
        UPDATE contacts
        SET
          name = $1,
          phone = $2,
          role = $3,
          category = $4,
          province = $5,
          district = $6,
          is_24_hours = $7,
          area_id = $8,
          latitude = $9,
          longitude = $10,
          location = CASE WHEN $11 THEN ST_SetSRID(ST_MakePoint($10, $9), 4326) ELSE NULL END,
          active = $12,
          updated_at = now()
        WHERE id = $13
        RETURNING *
      `,
      [
        body.name,
        body.phone,
        body.role,
        body.category ?? null,
        body.province ?? null,
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
      return { error: "Contact not found" };
    }

    return rowToContact(result.rows[0]);
  });

  app.delete("/api/contacts/:id", async (request, reply) => {
    const { id } = paramsWithId.parse(request.params);
    const result = await pool.query("DELETE FROM contacts WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      reply.code(404);
      return { error: "Contact not found" };
    }

    return { ok: true };
  });
}
