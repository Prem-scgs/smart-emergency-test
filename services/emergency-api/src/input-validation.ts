import type { ZodError } from "zod";
import { buildApiErrorPayload } from "./api-error.js";
import { pool } from "./db.js";

const phonePattern = /^\+?[0-9][0-9()\-\s]{7,31}$/;
const emergencyShortCodePattern = /^[0-9]{3,5}$/;

type QueryExecutor = (
  queryText: string,
  values?: unknown[]
) => Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }>;

export function buildZodValidationErrorPayload(error: ZodError) {
  return {
    ...buildApiErrorPayload(400, "VALIDATION_ERROR", "Validation error"),
    issues: error.issues,
  };
}

export function isPlausiblePhoneNumber(value: string) {
  return phonePattern.test(value.trim());
}

export function isPlausibleEmergencyContactNumber(value: string) {
  const normalized = value.trim();
  return emergencyShortCodePattern.test(normalized) || phonePattern.test(normalized);
}

export async function validateActiveEmergencyCategory(
  category: string | null | undefined,
  execute: QueryExecutor = pool.query.bind(pool)
) {
  if (!category) {
    return null;
  }

  const categoryResult = await execute(
    "SELECT 1 FROM emergency_categories WHERE id = $1 AND active = true LIMIT 1",
    [category]
  );

  if (categoryResult.rowCount === 0) {
    return buildApiErrorPayload(400, "UNKNOWN_EMERGENCY_CATEGORY", "Unknown emergency category");
  }

  return null;
}

export async function validateLocationCodes(
  input: {
    provinceCode?: string | null;
    districtCode?: string | null;
  },
  execute: QueryExecutor = pool.query.bind(pool)
) {
  if (input.provinceCode) {
    const provinceResult = await execute(
      "SELECT 1 FROM areas WHERE area_type = 'province' AND province_code = $1 LIMIT 1",
      [input.provinceCode]
    );

    if (provinceResult.rowCount === 0) {
      return buildApiErrorPayload(400, "UNKNOWN_PROVINCE_CODE", "Unknown province code");
    }
  }

  let districtProvinceCode: string | null = null;

  if (input.districtCode) {
    const districtResult = await execute(
      "SELECT province_code FROM areas WHERE area_type = 'district' AND district_code = $1 LIMIT 1",
      [input.districtCode]
    );

    if (districtResult.rowCount === 0) {
      return buildApiErrorPayload(400, "UNKNOWN_DISTRICT_CODE", "Unknown district code");
    }

    districtProvinceCode = String(districtResult.rows[0]?.province_code ?? "");
  }

  if (
    input.provinceCode &&
    input.districtCode &&
    districtProvinceCode &&
    input.provinceCode !== districtProvinceCode
  ) {
    return buildApiErrorPayload(
      400,
      "DISTRICT_PROVINCE_MISMATCH",
      "District code does not belong to province code"
    );
  }

  return null;
}
