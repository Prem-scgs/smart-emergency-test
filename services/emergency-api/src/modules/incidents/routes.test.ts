import test from "node:test";
import assert from "node:assert/strict";

import { registerIncidentRoutes } from "./routes.js";
import { pool } from "../../db.js";

type Handler = (request?: any, reply?: any) => Promise<unknown> | unknown;

function createFakeApp() {
  const getHandlers = new Map<string, Handler>();
  const postHandlers = new Map<string, Handler>();

  return {
    get(path: string, handler: Handler) {
      getHandlers.set(path, handler);
    },
    post(path: string, handler: Handler) {
      postHandlers.set(path, handler);
    },
    getHandlers,
    postHandlers,
  };
}

function createReplyDouble() {
  return {
    statusCode: 200,
    code(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

test("registerIncidentRoutes registers GET /api/incidents/:id", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(typeof app.getHandlers.get("/api/incidents/:id"), "function");
});

test("GET /api/incidents/:id returns a mapped incident", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);
    return {
      rows: [
        {
          id: "incident-1",
          category: "fire",
          severity: "high",
          status: "open",
          description: "Smoke reported",
          agency_contact_id: "contact-1",
          agency_name: "Fire Department",
          agency_phone: "199",
          province_code: "10",
          province: "Bangkok",
          district_code: "1007",
          district: "Pathum Wan",
          accuracy: 15,
          call_status: "connected",
          reporter_phone: "0812345678",
          session_id: "session-12345678",
          latitude: 13.7478,
          longitude: 100.5351,
          marker_color: "#f97316",
          created_at: new Date("2026-06-13T00:00:00.000Z"),
          updated_at: new Date("2026-06-13T00:05:00.000Z"),
        },
      ],
    };
  }) as typeof queryMock;

  try {
    const result = await handler?.({ params: { id: "incident-1" } }, createReplyDouble());

    assert.equal(calls.length, 1);
    assert.match(String(calls[0]?.[0]), /WHERE i\.id = \$1/);
    assert.deepEqual(calls[0]?.[1], ["incident-1"]);
    assert.deepEqual(result, {
      id: "incident-1",
      category: "fire",
      severity: "high",
      status: "open",
      description: "Smoke reported",
      agencyContactId: "contact-1",
      agencyName: "Fire Department",
      agencyPhone: "199",
      provinceCode: "10",
      province: "Bangkok",
      districtCode: "1007",
      district: "Pathum Wan",
      accuracy: 15,
      callStatus: "connected",
      reporterPhone: "0812345678",
      sessionId: "session-12345678",
      latitude: 13.7478,
      longitude: 100.5351,
      markerColor: "#f97316",
      areaId: undefined,
      areaName: undefined,
      areaColor: undefined,
      createdAt: new Date("2026-06-13T00:00:00.000Z"),
      updatedAt: new Date("2026-06-13T00:05:00.000Z"),
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/:id returns 404 when incident is missing", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id");
  assert.ok(handler);

  (pool.query as unknown as typeof queryMock) = (async () => ({ rows: [] })) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.({ params: { id: "missing-incident" } }, reply);

    assert.equal(reply.statusCode, 404);
    assert.deepEqual(result, {
      error: "Incident not found",
      code: "INCIDENT_NOT_FOUND",
      statusCode: 404,
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});
