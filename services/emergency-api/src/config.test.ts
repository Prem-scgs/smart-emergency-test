import test from "node:test";
import assert from "node:assert/strict";

import { parseConfig } from "./config.js";

test("parseConfig returns defaults when env is empty", () => {
  const result = parseConfig({});

  assert.deepEqual(result, {
    port: 4000,
    databaseUrl: "postgres://emergency:emergency_dev@localhost:5432/smart_emergency",
    corsOrigin: "http://localhost:3000",
    corsOrigins: ["http://localhost:3000"],
    shareChannels: {
      lineOaId: null,
      smsCenterPhone: null,
      whatsappCenterPhone: null,
    },
    trackingTokenSecret: "smart-emergency-local-tracking-token-secret",
  });
});

test("parseConfig accepts valid overrides", () => {
  const result = parseConfig({
    PORT: "4100",
    DATABASE_URL: "postgres://user:pass@db.example.com:5432/emergency",
    CORS_ORIGIN: "https://smart-emergency.example.com",
    LINE_OA_ID: "@smartemergency",
    SMS_CENTER_PHONE: "0812345678",
    WHATSAPP_CENTER_PHONE: "66812345678",
    TRACKING_TOKEN_SECRET: "x".repeat(32),
  });

  assert.deepEqual(result, {
    port: 4100,
    databaseUrl: "postgres://user:pass@db.example.com:5432/emergency",
    corsOrigin: "https://smart-emergency.example.com",
    corsOrigins: ["https://smart-emergency.example.com"],
    shareChannels: {
      lineOaId: "@smartemergency",
      smsCenterPhone: "0812345678",
      whatsappCenterPhone: "66812345678",
    },
    trackingTokenSecret: "x".repeat(32),
  });
});

test("parseConfig rejects invalid share channel recipients", () => {
  assert.throws(() => parseConfig({ LINE_OA_ID: "smartemergency" }), /LINE_OA_ID/);
  assert.throws(() => parseConfig({ SMS_CENTER_PHONE: "123" }), /SMS_CENTER_PHONE/);
  assert.throws(
    () => parseConfig({ WHATSAPP_CENTER_PHONE: "+66812345678" }),
    /WHATSAPP_CENTER_PHONE/
  );
});

test("parseConfig accepts a comma-separated CORS allowlist", () => {
  const result = parseConfig({
    CORS_ORIGINS: "http://localhost:3000,http://172.20.10.4:3000",
  });

  assert.deepEqual(result.corsOrigins, [
    "http://localhost:3000",
    "http://172.20.10.4:3000",
  ]);
});

test("parseConfig rejects invalid port", () => {
  assert.throws(
    () =>
      parseConfig({
        PORT: "abc",
      }),
    /PORT/
  );
});

test("parseConfig rejects invalid CORS origin", () => {
  assert.throws(
    () =>
      parseConfig({
        CORS_ORIGIN: "not-a-url",
      }),
    /CORS_ORIGIN/
  );
});
