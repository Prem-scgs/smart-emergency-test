/**
 * ???? reference routes ???????? share channel availability ????????????????? recipient.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { registerReferenceRoutes } from "./routes.js";
import { pool } from "../../db.js";
import { config } from "../../config.js";

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

test("GET /api/reference/share-channels exposes availability without recipients", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  config.shareChannels.lineOaId = "@smartemergency";
  config.shareChannels.smsCenterPhone = null;
  config.shareChannels.whatsappCenterPhone = "66812345678";
  (pool.query as any) = async () => ({ rows: [] });

  try {
    await registerReferenceRoutes(app as any);
    const handler = app.getHandlers.get("/api/reference/share-channels");
    assert.ok(handler);

    assert.deepEqual(await handler(), {
      line: { enabled: true },
      sms: { enabled: false },
      whatsapp: { enabled: true },
    });
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("GET /api/reference/share-channels uses DB settings before env fallback", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  config.shareChannels.lineOaId = null;
  config.shareChannels.smsCenterPhone = "0811111111";
  config.shareChannels.whatsappCenterPhone = "66811111111";

  (pool.query as any) = async () => ({
    rows: [
      { channel: "line", enabled: true, recipient_value: "@dbcenter" },
      { channel: "sms", enabled: false, recipient_value: "0822222222" },
    ],
  });

  try {
    await registerReferenceRoutes(app as any);
    const handler = app.getHandlers.get("/api/reference/share-channels");
    assert.ok(handler);

    const result = await handler();

    assert.deepEqual(result, {
      line: { enabled: true },
      sms: { enabled: false },
      whatsapp: { enabled: true },
    });
    assert.doesNotMatch(JSON.stringify(result), /@dbcenter|0822222222|66811111111/);
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});
