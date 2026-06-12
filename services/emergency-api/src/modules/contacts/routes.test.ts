import test from "node:test";
import assert from "node:assert/strict";

import { registerContactRoutes } from "./routes.js";
import { pool } from "../../db.js";

type Handler = (request?: any, reply?: any) => Promise<unknown> | unknown;

function createFakeApp() {
  const getHandlers = new Map<string, Handler>();
  const postHandlers = new Map<string, Handler>();
  const putHandlers = new Map<string, Handler>();
  const deleteHandlers = new Map<string, Handler>();

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
    delete(path: string, handler: Handler) {
      deleteHandlers.set(path, handler);
    },
    getHandlers,
    postHandlers,
    putHandlers,
    deleteHandlers,
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

test("PUT /api/contacts/:id returns 404 when contact is missing", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerContactRoutes(app as any);

  const handler = app.putHandlers.get("/api/contacts/:id");
  assert.ok(handler);

  (pool.query as any) = async () => ({ rowCount: 0, rows: [] });

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        params: { id: "11111111-1111-4111-8111-111111111111" },
        body: {
          name: "Support Team",
          phone: "1669",
          role: "dispatcher",
          is24Hours: true,
          active: true,
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 404);
    assert.deepEqual(result, {
      error: "Contact not found",
      code: "CONTACT_NOT_FOUND",
      statusCode: 404,
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});
