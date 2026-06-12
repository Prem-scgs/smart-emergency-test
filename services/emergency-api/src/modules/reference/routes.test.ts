import test from "node:test";
import assert from "node:assert/strict";

import { registerReferenceRoutes } from "./routes.js";
import { pool } from "../../db.js";

type Handler = (request?: any, reply?: any) => Promise<unknown> | unknown;

function createFakeApp() {
  const getHandlers = new Map<string, Handler>();
  return {
    get(path: string, handler: Handler) {
      getHandlers.set(path, handler);
    },
    getHandlers,
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

test("GET /api/users/mock-profile returns standardized 404 error when profile is missing", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerReferenceRoutes(app as any);

  const handler = app.getHandlers.get("/api/users/mock-profile");
  assert.ok(handler);

  (pool.query as any) = async () => ({ rowCount: 0, rows: [] });

  try {
    const reply = createReplyDouble();
    const result = await handler?.({}, reply);

    assert.equal(reply.statusCode, 404);
    assert.deepEqual(result, {
      error: "User profile not found",
      code: "USER_PROFILE_NOT_FOUND",
      statusCode: 404,
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});
