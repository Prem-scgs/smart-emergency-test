import test from "node:test";
import assert from "node:assert/strict";

import { registerIncidentRoutes } from "./routes.js";
import { pool } from "../../db.js";

type Handler = (request?: any, reply?: any) => Promise<unknown> | unknown;

function createFakeApp() {
  const getHandlers = new Map<string, Handler>();
  const postHandlers = new Map<string, Handler>();
  const putHandlers = new Map<string, Handler>();

  return {
    get(path: string, handler: Handler) {
      getHandlers.set(path, handler);
    },
    post(path: string, handler: Handler) {
      postHandlers.set(path, handler);
    },
    put(path: string, handler: Handler) {
      putHandlers.set(path, handler);
    },
    getHandlers,
    postHandlers,
    putHandlers,
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

test("registerIncidentRoutes registers PUT /api/incidents/:id/call", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(typeof app.putHandlers.get("/api/incidents/:id/call"), "function");
});

test("GET /api/incidents scopes agency admin to their own category on the server side", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);
    return { rows: [] };
  }) as typeof queryMock;

  try {
    const result = await handler?.({
      headers: {
        "x-admin-role": "agency_admin",
        "x-admin-category": "medical",
      },
    });

    assert.equal(calls.length, 1);
    assert.match(String(calls[0]?.[0]), /WHERE i\.category = \$1/);
    assert.deepEqual(calls[0]?.[1], ["medical"]);
    assert.deepEqual(result, []);
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
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

test("GET /api/incidents/:id returns standardized validation error for invalid params", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id");
  assert.ok(handler);

  const reply = createReplyDouble();
  const result = await handler?.({ params: { id: "" } }, reply);

  assert.equal(reply.statusCode, 400);
  assert.equal((result as any).code, "VALIDATION_ERROR");
  assert.equal((result as any).statusCode, 400);
  assert.ok(Array.isArray((result as any).issues));
});

test("POST /api/incidents writes an audit log after create", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }

    if (calls.length === 2) {
      return { rowCount: 0, rows: [] };
    }

    if (calls.length === 3) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "incident-1",
            category: "fire",
            severity: "high",
            status: "open",
            description: "Smoke reported",
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
            updated_at: new Date("2026-06-13T00:00:00.000Z"),
          },
        ],
      };
    }

    if (calls.length === 4) {
      return { rowCount: 1, rows: [] };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        id: "req-incident-create",
        ip: "127.0.0.1",
        log: { error() {} },
        body: {
          category: "fire",
          severity: "high",
          status: "open",
          description: "Smoke reported",
          latitude: 13.7478,
          longitude: 100.5351,
          accuracy: 15,
          callStatus: "connected",
          reporterPhone: "0812345678",
          sessionId: "session-12345678",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 201);
    assert.equal(calls.length, 4);
    assert.match(String(calls[3]?.[0]), /INSERT INTO audit_logs/);
    assert.equal((result as any).id, "incident-1");
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("POST /api/incidents returns 400 for invalid reporter phone", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const reply = createReplyDouble();
  const result = await handler?.(
    {
      ip: "127.0.0.1",
      body: {
        category: "fire",
        severity: "high",
        status: "open",
        latitude: 13.7478,
        longitude: 100.5351,
        reporterPhone: "abc",
        sessionId: "session-12345678",
      },
    },
    reply
  );

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(result, {
    error: "Reporter phone number is invalid",
    code: "INVALID_PHONE_NUMBER",
    statusCode: 400,
  });
});

test("POST /api/incidents returns 400 for unknown district code", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }

    if (calls.length === 2) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }

    if (calls.length === 3) {
      return { rowCount: 0, rows: [] };
    }

    return { rowCount: 0, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        ip: "127.0.0.1",
        body: {
          category: "fire",
          severity: "high",
          status: "open",
          latitude: 13.7478,
          longitude: 100.5351,
          provinceCode: "10",
          districtCode: "9999",
          reporterPhone: "0812345678",
          sessionId: "session-12345678",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 400);
    assert.equal(calls.length, 3);
    assert.deepEqual(result, {
      error: "Unknown district code",
      code: "UNKNOWN_DISTRICT_CODE",
      statusCode: 400,
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/history returns standardized validation error for invalid query", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/history");
  assert.ok(handler);

  const reply = createReplyDouble();
  const result = await handler?.(
    {
      query: {
        sessionId: "short",
      },
    },
    reply
  );

  assert.equal(reply.statusCode, 400);
  assert.equal((result as any).code, "VALIDATION_ERROR");
  assert.equal((result as any).statusCode, 400);
  assert.ok(Array.isArray((result as any).issues));
});

test("PUT /api/incidents/:id/call updates call status and writes an audit log", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.putHandlers.get("/api/incidents/:id/call");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "incident-1",
            category: "medical",
            severity: "high",
            status: "open",
            description: "Reported via mobile app to EMS (connected)",
            agency_contact_id: "contact-ems-1",
            agency_name: "Emergency Medical Services",
            agency_phone: "1669",
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
    }

    if (calls.length === 2) {
      return { rowCount: 1, rows: [] };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        id: "req-incident-call-update",
        log: { error() {} },
        params: { id: "incident-1" },
        body: {
          callStatus: "connected",
          reporterPhone: "0812345678",
          description: "Reported via mobile app to EMS (connected)",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.match(String(calls[0]?.[0]), /UPDATE incidents/);
    assert.match(String(calls[1]?.[0]), /INSERT INTO audit_logs/);
    assert.deepEqual(result, {
      id: "incident-1",
      category: "medical",
      severity: "high",
      status: "open",
      description: "Reported via mobile app to EMS (connected)",
      agencyContactId: "contact-ems-1",
      agencyName: "Emergency Medical Services",
      agencyPhone: "1669",
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

test("PUT /api/incidents/:id/call returns 404 when incident is missing", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.putHandlers.get("/api/incidents/:id/call");
  assert.ok(handler);

  (pool.query as unknown as typeof queryMock) = (async () => ({ rows: [] })) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        params: { id: "missing-incident" },
        body: { callStatus: "busy" },
      },
      reply
    );

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

test("PUT /api/incidents/:id/call updates incident even when agency contact is missing", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.putHandlers.get("/api/incidents/:id/call");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "incident-no-contact",
            category: "fire",
            severity: "critical",
            status: "open",
            description: "Reported via mobile app without mapped contact",
            agency_contact_id: null,
            agency_name: null,
            agency_phone: null,
            province_code: "65",
            province: "Phitsanulok",
            district_code: "6501",
            district: "Mueang Phitsanulok",
            accuracy: 12,
            call_status: "busy",
            reporter_phone: "0899999999",
            session_id: "session-87654321",
            latitude: 16.8211,
            longitude: 100.2659,
            marker_color: "#dc2626",
            created_at: new Date("2026-06-13T00:00:00.000Z"),
            updated_at: new Date("2026-06-13T00:03:00.000Z"),
          },
        ],
      };
    }

    if (calls.length === 2) {
      return { rowCount: 1, rows: [] };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        id: "req-incident-call-update-no-contact",
        log: { error() {} },
        params: { id: "incident-no-contact" },
        body: {
          callStatus: "busy",
          reporterPhone: "0899999999",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.match(String(calls[0]?.[0]), /WITH updated_incident AS/);
    assert.deepEqual(result, {
      id: "incident-no-contact",
      category: "fire",
      severity: "critical",
      status: "open",
      description: "Reported via mobile app without mapped contact",
      agencyContactId: null,
      agencyName: null,
      agencyPhone: null,
      provinceCode: "65",
      province: "Phitsanulok",
      districtCode: "6501",
      district: "Mueang Phitsanulok",
      accuracy: 12,
      callStatus: "busy",
      reporterPhone: "0899999999",
      sessionId: "session-87654321",
      latitude: 16.8211,
      longitude: 100.2659,
      markerColor: "#dc2626",
      areaId: undefined,
      areaName: undefined,
      areaColor: undefined,
      createdAt: new Date("2026-06-13T00:00:00.000Z"),
      updatedAt: new Date("2026-06-13T00:03:00.000Z"),
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});
