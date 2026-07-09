import { z } from "zod";

import { buildApiErrorPayload } from "../../api-error.js";

export const areaBody = z.object({
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

export const containsPointBody = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const areaQuery = z.object({
  areaType: z
    .enum(["province", "district", "subdistrict", "response-zone"])
    .optional(),
  provinceCode: z.string().min(1).optional(),
  districtCode: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  includeGeometry: z.enum(["true", "false"]).default("true"),
});

export const resolvePointQuery = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const paramsWithId = z.object({
  id: z.string().uuid(),
});

export function buildAreaForbiddenPayload() {
  return buildApiErrorPayload(403, "AREA_FORBIDDEN", "Area access denied");
}

/**
 * แปลง area row จาก PostGIS query ให้ frontend ใช้กับ map ได้
 *
 * routes.ts จะเลือกส่ง polygon เป็น GeoJSON หรือ NULL ตาม includeGeometry
 * เพื่อให้หน้า list/filter โหลดเร็ว แต่หน้า map ยังขอ geometry เต็มสำหรับ fit bounds ได้
 */
export function rowToArea(row: Record<string, unknown>) {
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

export function rowToContact(row: Record<string, unknown>) {
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

export function rowToIncident(row: Record<string, unknown>) {
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
