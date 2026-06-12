import test from "node:test";
import assert from "node:assert/strict";

import { registerAreaRoutes } from "./routes.js";
import { pool } from "../../db.js";

type Handler = (request?: any, reply?: any) => Promise<unknown> | unknown;

function createFakeApp() {
  const postHandlers = new Map<string, Handler>();
  const putHandlers = new Map<string, Handler>();
  return {
    get() {},
    post(path: string, handler: Handler) {
      postHandlers.set(path, handler);
    },
    put(path: string, handler: Handler) {
      putHandlers.set(path, handler);
    },
    delete() {},
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

test("PUT /api/areas/:id returns standardized 404 error when area is missing", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerAreaRoutes(app as any);

  const handler = app.putHandlers.get("/api/areas/:id");
  assert.ok(handler);

  (pool.query as any) = async () => ({ rowCount: 0, rows: [] });

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        params: { id: "11111111-1111-4111-8111-111111111111" },
        body: {
          name: "Zone A",
          color: "#ef4444",
          areaType: "response-zone",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [100.5, 13.7],
                [100.6, 13.7],
                [100.6, 13.8],
                [100.5, 13.8],
                [100.5, 13.7],
              ],
            ],
          },
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 404);
    assert.deepEqual(result, {
      error: "Area not found",
      code: "AREA_NOT_FOUND",
      statusCode: 404,
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("POST /api/areas writes an audit log after create", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerAreaRoutes(app as any);

  const handler = app.postHandlers.get("/api/areas");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as any) = async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "area-1",
            name: "Zone A",
            color: "#ef4444",
            area_type: "response-zone",
            polygon: { type: "Polygon", coordinates: [] },
            created_at: new Date("2026-06-13T00:00:00.000Z"),
            updated_at: new Date("2026-06-13T00:00:00.000Z"),
          },
        ],
      };
    }

    return { rowCount: 1, rows: [] };
  };

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        id: "req-area-1",
        ip: "127.0.0.1",
        log: { error() {} },
        body: {
          name: "Zone A",
          color: "#ef4444",
          areaType: "response-zone",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [100.5, 13.7],
                [100.6, 13.7],
                [100.6, 13.8],
                [100.5, 13.8],
                [100.5, 13.7],
              ],
            ],
          },
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 201);
    assert.equal(calls.length, 2);
    assert.match(String(calls[1]?.[0]), /INSERT INTO audit_logs/);
    assert.equal((result as any).id, "area-1");
  } finally {
    (pool.query as any) = originalQuery;
  }
});
