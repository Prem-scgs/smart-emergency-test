import "dotenv/config";
import { closeDb, pool } from "../db.js";

const SOURCE = "chingchai/OpenGISData-Thailand";
const PROVINCES_URL =
  "https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/provinces.geojson";
const DISTRICTS_URL =
  "https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/districts.geojson";

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: Record<string, unknown>;
  }>;
}

function prop(properties: Record<string, unknown>, key: string) {
  const value = properties[key];
  if (value == null) return "";
  return String(value).trim();
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function color(index: number, start: number) {
  return `hsl(${(start + index * 37) % 360} 70% 46%)`;
}

async function fetchGeoJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  return (await response.json()) as GeoJsonFeatureCollection;
}

async function importProvince(
  feature: GeoJsonFeatureCollection["features"][number],
  index: number
) {
  const p = feature.properties;
  const provinceCode = prop(p, "pro_code");
  const provinceNameTh = prop(p, "pro_th");
  const provinceNameEn = prop(p, "pro_en") || provinceNameTh;
  const sourceCode = provinceCode || slug(provinceNameEn || provinceNameTh);
  const provinceId = `th-${sourceCode}`;
  const name = provinceNameEn || provinceNameTh || sourceCode;

  const provinceResult = await pool.query(
    `
      INSERT INTO provinces (id, name)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE
      SET updated_at = now()
      RETURNING id
    `,
    [provinceId, name]
  );

  const result = await pool.query(
    `
      INSERT INTO areas
        (
          name, color, polygon, area_type, source, source_code,
          province_code, province_name_th, province_name_en
        )
      VALUES
        (
          $1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)),
          'province', $4, $5, $6, $7, $8
        )
      ON CONFLICT (source, area_type, source_code)
      WHERE source IS NOT NULL AND source_code IS NOT NULL
      DO UPDATE
      SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        polygon = EXCLUDED.polygon,
        province_code = EXCLUDED.province_code,
        province_name_th = EXCLUDED.province_name_th,
        province_name_en = EXCLUDED.province_name_en,
        updated_at = now()
      RETURNING id
    `,
    [
      name,
      color(index, 205),
      JSON.stringify(feature.geometry),
      SOURCE,
      sourceCode,
      provinceCode || null,
      provinceNameTh || null,
      provinceNameEn || null,
    ]
  );

  return {
    provinceCode,
    provinceReferenceId: provinceResult.rows[0].id as string,
    areaId: result.rows[0].id as string,
  };
}

async function importDistrict(
  feature: GeoJsonFeatureCollection["features"][number],
  provinceAreaIds: Map<string, string>,
  provinceReferenceIds: Map<string, string>,
  index: number
) {
  const p = feature.properties;
  const provinceCode = prop(p, "pro_code");
  const provinceNameTh = prop(p, "pro_th");
  const provinceNameEn = prop(p, "pro_en") || provinceNameTh;
  const districtCode = prop(p, "amp_code");
  const districtNameTh = prop(p, "amp_th");
  const districtNameEn = prop(p, "amp_en") || districtNameTh;
  const sourceCode =
    districtCode || `${provinceCode}-${slug(districtNameEn || districtNameTh)}`;
  const provinceId = provinceReferenceIds.get(provinceCode) ?? `th-${provinceCode}`;
  const districtId = `th-${sourceCode}`;
  const name = districtNameEn || districtNameTh || sourceCode;

  const existingDistrict = await pool.query(
    "SELECT id FROM districts WHERE province_id = $1 AND name = $2",
    [provinceId, name]
  );

  if (existingDistrict.rowCount === 0) {
    await pool.query(
      `
        INSERT INTO districts (id, province_id, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
        SET province_id = EXCLUDED.province_id,
            name = EXCLUDED.name,
            updated_at = now()
      `,
      [districtId, provinceId, name]
    );
  } else {
    await pool.query("UPDATE districts SET updated_at = now() WHERE id = $1", [
      existingDistrict.rows[0].id,
    ]);
  }

  await pool.query(
    `
      INSERT INTO areas
        (
          name, color, polygon, area_type, source, source_code,
          province_code, province_name_th, province_name_en,
          district_code, district_name_th, district_name_en, parent_area_id
        )
      VALUES
        (
          $1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)),
          'district', $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
      ON CONFLICT (source, area_type, source_code)
      WHERE source IS NOT NULL AND source_code IS NOT NULL
      DO UPDATE
      SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        polygon = EXCLUDED.polygon,
        province_code = EXCLUDED.province_code,
        province_name_th = EXCLUDED.province_name_th,
        province_name_en = EXCLUDED.province_name_en,
        district_code = EXCLUDED.district_code,
        district_name_th = EXCLUDED.district_name_th,
        district_name_en = EXCLUDED.district_name_en,
        parent_area_id = EXCLUDED.parent_area_id,
        updated_at = now()
    `,
    [
      name,
      color(index, 95),
      JSON.stringify(feature.geometry),
      SOURCE,
      sourceCode,
      provinceCode || null,
      provinceNameTh || null,
      provinceNameEn || null,
      districtCode || null,
      districtNameTh || null,
      districtNameEn || null,
      provinceAreaIds.get(provinceCode) ?? null,
    ]
  );
}

async function main() {
  const [provinces, districts] = await Promise.all([
    fetchGeoJson(PROVINCES_URL),
    fetchGeoJson(DISTRICTS_URL),
  ]);

  const provinceAreaIds = new Map<string, string>();
  const provinceReferenceIds = new Map<string, string>();
  for (const [index, feature] of provinces.features.entries()) {
    const imported = await importProvince(feature, index);
    provinceAreaIds.set(imported.provinceCode, imported.areaId);
    provinceReferenceIds.set(imported.provinceCode, imported.provinceReferenceId);
  }

  for (const [index, feature] of districts.features.entries()) {
    await importDistrict(feature, provinceAreaIds, provinceReferenceIds, index);
  }

  const areaSummary = await pool.query(
    `
      SELECT area_type, count(*)::int AS count
      FROM areas
      WHERE source = $1
      GROUP BY area_type
      ORDER BY area_type
    `,
    [SOURCE]
  );
  const referenceSummary = await pool.query(
    `
      SELECT
        (SELECT count(*)::int FROM provinces) AS provinces,
        (SELECT count(*)::int FROM districts) AS districts
    `
  );

  console.log(
    JSON.stringify(
      {
        source: SOURCE,
        importedAreas: areaSummary.rows,
        references: referenceSummary.rows[0],
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
