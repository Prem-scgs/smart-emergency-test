/**
 * ???? contacts CRUD scope guard ?????? agency_admin/viewer ??? category ownership.
 */
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


function createRequest(overrides = {}) {
  return {
    id: "req-contacts-test",
    ip: "127.0.0.1",
    headers: {},
    query: {},
    params: {},
    body: {},
    log: { error() {} },
    ...overrides,
  };
}

test("agency admin list only queries contacts in their own category", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  await registerContactRoutes(app as any);
  const handler = app.getHandlers.get("/api/contacts");
  assert.ok(handler);

  (pool.query as any) = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    return { rowCount: 0, rows: [] };
  };

  try {
    await handler?.(
      createRequest({
        headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" },
        query: {},
      })
    );

    assert.deepEqual(calls[0]?.values, ["medical"]);
    assert.match(calls[0]?.sql ?? "", /category = \$1/);
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("viewer list only queries contacts in their own category", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  await registerContactRoutes(app as any);
  const handler = app.getHandlers.get("/api/contacts");
  assert.ok(handler);

  (pool.query as any) = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    return { rowCount: 0, rows: [] };
  };

  try {
    await handler?.(
      createRequest({
        headers: { "x-admin-role": "viewer", "x-admin-category": "medical" },
        query: {},
      })
    );

    assert.deepEqual(calls[0]?.values, ["medical"]);
    assert.match(calls[0]?.sql ?? "", /category = \$1/);
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("viewer cannot create contacts", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerContactRoutes(app as any);
  const handler = app.postHandlers.get("/api/contacts");
  assert.ok(handler);

  let queryCalled = false;
  (pool.query as any) = async () => {
    queryCalled = true;
    return { rowCount: 0, rows: [] };
  };

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      createRequest({
        headers: { "x-admin-role": "viewer", "x-admin-category": "medical" },
        body: {
          name: "Medical Team",
          phone: "1669",
          role: "responder",
          category: "medical",
          is24Hours: true,
          active: true,
        },
      }),
      reply
    );

    assert.equal(reply.statusCode, 403);
    assert.equal(queryCalled, false);
    assert.deepEqual(result, {
      error: "Contact is outside your admin scope",
      code: "CONTACT_FORBIDDEN",
      statusCode: 403,
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("agency admin cannot create contact outside their own category", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerContactRoutes(app as any);
  const handler = app.postHandlers.get("/api/contacts");
  assert.ok(handler);

  (pool.query as any) = async () => ({
    rowCount: 1,
    rows: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Fire Team",
        phone: "199",
        role: "responder",
        category: "fire",
        province_code: null,
        province: null,
        district_code: null,
        district: null,
        is_24_hours: true,
        area_id: null,
        latitude: null,
        longitude: null,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
  });

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      createRequest({
        headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" },
        body: {
          name: "Fire Team",
          phone: "199",
          role: "responder",
          category: "fire",
          is24Hours: true,
          active: true,
        },
      }),
      reply
    );

    assert.equal(reply.statusCode, 403);
    assert.deepEqual(result, {
      error: "Contact is outside your admin scope",
      code: "CONTACT_FORBIDDEN",
      statusCode: 403,
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("agency admin cannot move a contact to another category", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerContactRoutes(app as any);
  const handler = app.putHandlers.get("/api/contacts/:id");
  assert.ok(handler);

  (pool.query as any) = async () => ({
    rowCount: 1,
    rows: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Fire Team",
        phone: "199",
        role: "responder",
        category: "fire",
        province_code: null,
        province: null,
        district_code: null,
        district: null,
        is_24_hours: true,
        area_id: null,
        latitude: null,
        longitude: null,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
  });

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      createRequest({
        headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" },
        params: { id: "11111111-1111-4111-8111-111111111111" },
        body: {
          name: "Fire Team",
          phone: "199",
          role: "responder",
          category: "fire",
          is24Hours: true,
          active: true,
        },
      }),
      reply
    );

    assert.equal(reply.statusCode, 403);
    assert.deepEqual(result, {
      error: "Contact is outside your admin scope",
      code: "CONTACT_FORBIDDEN",
      statusCode: 403,
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("agency admin cannot delete contact outside their own category", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  await registerContactRoutes(app as any);
  const handler = app.deleteHandlers.get("/api/contacts/:id");
  assert.ok(handler);

  (pool.query as any) = async () => ({ rowCount: 1, rows: [] });

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      createRequest({
        headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" },
        params: { id: "11111111-1111-4111-8111-111111111111" },
      }),
      reply
    );

    assert.equal(reply.statusCode, 403);
    assert.deepEqual(result, {
      error: "Contact is outside your admin scope",
      code: "CONTACT_FORBIDDEN",
      statusCode: 403,
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});
