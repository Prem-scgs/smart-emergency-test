import test from "node:test";
import assert from "node:assert/strict";

import {
  __resetReferenceCategoryCache,
  loadReferenceCategories,
  FALLBACK_REFERENCE_CATEGORIES,
} from "../shared/reference/categories.ts";
import {
  __resetReferenceLocationCache,
  loadReferenceDistricts,
  loadReferenceLocationLookups,
  loadReferenceProvinces,
} from "./reference-locations.ts";

test("loadReferenceCategories deduplicates concurrent fetches", async () => {
  __resetReferenceCategoryCache();

  const categories = [
    {
      id: "fire",
      name: "Fire Emergency",
      labelTh: "ไฟไหม้",
      description: "Report fire incidents or request fire rescue",
      icon: "Flame",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      recommendedAgency: "Fire Department",
      sortOrder: 3,
      active: true,
    },
  ] as const;

  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => categories,
    } as Response;
  };

  const [first, second] = await Promise.all([
    loadReferenceCategories(fetchImpl as typeof fetch),
    loadReferenceCategories(fetchImpl as typeof fetch),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  assert.equal(first[0]?.labelTh, "ไฟไหม้");
});

test("loadReferenceCategories falls back when request fails", async () => {
  __resetReferenceCategoryCache();

  const result = await loadReferenceCategories((async () => {
    throw new Error("network");
  }) as typeof fetch);

  assert.deepEqual(result, FALLBACK_REFERENCE_CATEGORIES);
});

test("reference location loaders reuse cached province and district results", async () => {
  __resetReferenceLocationCache();

  const provincePayload = [
    { id: "province-10", provinceCode: "10", name: "Bangkok", nameTh: "กรุงเทพมหานคร", nameEn: "Bangkok" },
  ];
  const districtPayload = [
    {
      id: "district-1007",
      provinceCode: "10",
      provinceNameTh: "กรุงเทพมหานคร",
      provinceNameEn: "Bangkok",
      districtCode: "1007",
      name: "Pathum Wan",
      nameTh: "ปทุมวัน",
      nameEn: "Pathum Wan",
    },
  ];

  const calls: string[] = [];
  const fetchImpl = async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url.includes("/api/reference/provinces")) {
      return { ok: true, json: async () => provincePayload } as Response;
    }

    if (url.includes("/api/reference/districts?provinceCode=10")) {
      return { ok: true, json: async () => districtPayload } as Response;
    }

    if (url.endsWith("/api/reference/districts")) {
      return { ok: true, json: async () => districtPayload } as Response;
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const firstProvinces = await loadReferenceProvinces(fetchImpl as typeof fetch);
  const secondProvinces = await loadReferenceProvinces(fetchImpl as typeof fetch);
  const firstDistricts = await loadReferenceDistricts("10", fetchImpl as typeof fetch);
  const secondDistricts = await loadReferenceDistricts("10", fetchImpl as typeof fetch);
  const lookups = await loadReferenceLocationLookups(fetchImpl as typeof fetch);

  assert.deepEqual(firstProvinces, secondProvinces);
  assert.deepEqual(firstDistricts, secondDistricts);
  assert.equal(firstProvinces[0]?.provinceCode, "10");
  assert.equal(lookups.districts[0]?.districtCode, "1007");
  assert.equal(calls.filter(url => url.includes("/api/reference/provinces")).length, 1);
  assert.equal(calls.filter(url => url.includes("/api/reference/districts?provinceCode=10")).length, 1);
  assert.equal(calls.filter(url => /\/api\/reference\/districts$/.test(url)).length, 1);
});
