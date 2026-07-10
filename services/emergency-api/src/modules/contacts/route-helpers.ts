import { z } from "zod";

import {
  getMockAdminScope,
  isCategoryScopedAdmin,
} from "../../admin-scope.js";
import { buildApiErrorPayload } from "../../api-error.js";

/**
 * Helper contract ของ contacts routes
 *
 * รวม schema, query builder และ scope guard เพื่อให้ CRUD ทุก endpoint ใช้กติกาเดียวกัน:
 * super_admin เห็น/จัดการทุกหมวด ส่วน agency_admin/viewer ถูกจำกัดตาม category.
 */
export const contactBody = z.object({
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

export const paramsWithId = z.object({
  id: z.string().uuid(),
});

export const contactQuery = z.object({
  category: z.string().min(1).optional(),
  provinceCode: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  districtCode: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  active: z.coerce.boolean().optional(),
});

export function buildContactForbiddenPayload() {
  return buildApiErrorPayload(403, "CONTACT_FORBIDDEN", "Contact is outside your admin scope");
}

export function isAgencyContactScopeMismatch(
  scope: ReturnType<typeof getMockAdminScope>,
  category: string | null | undefined
) {
  return isCategoryScopedAdmin(scope) && category !== scope.category;
}

export function rowToContact(row: Record<string, unknown>) {
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
