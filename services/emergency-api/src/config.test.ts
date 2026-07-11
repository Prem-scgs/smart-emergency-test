/**
 * ???? env parsing/default/validation ??? emergency API runtime.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { parseConfig as parseConfigRaw } from "./config.js";

const testJwtSecret = "test-jwt-secret-that-is-at-least-32-characters";
const parseConfig = (env: Record<string, string | undefined>) => parseConfigRaw({ JWT_SECRET: testJwtSecret, ...env });

test("parseConfig returns defaults when required JWT secret is supplied", () => {
  const result = parseConfig({ JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters" });

  assert.deepEqual(result, {
    port: 4000,
    databaseUrl: "postgres://emergency:emergency_dev@localhost:5432/smart_emergency",
    corsOrigin: "http://localhost:3000",
    corsOrigins: ["http://localhost:3000"],
    auth: { jwtSecret: "test-jwt-secret-that-is-at-least-32-characters", bootstrap: null },
    shareChannels: {
      lineOaId: null,
      smsCenterPhone: null,
      whatsappCenterPhone: null,
    },
  });
});

test("parseConfig accepts valid overrides", () => {
  const result = parseConfig({
    JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters",
    PORT: "4100",
    DATABASE_URL: "postgres://user:pass@db.example.com:5432/emergency",
    CORS_ORIGIN: "https://smart-emergency.example.com",
    LINE_OA_ID: "@smartemergency",
    SMS_CENTER_PHONE: "0812345678",
    WHATSAPP_CENTER_PHONE: "66812345678",
  });

  assert.deepEqual(result, {
    port: 4100,
    databaseUrl: "postgres://user:pass@db.example.com:5432/emergency",
    corsOrigin: "https://smart-emergency.example.com",
    corsOrigins: ["https://smart-emergency.example.com"],
    auth: { jwtSecret: "test-jwt-secret-that-is-at-least-32-characters", bootstrap: null },
    shareChannels: {
      lineOaId: "@smartemergency",
      smsCenterPhone: "0812345678",
      whatsappCenterPhone: "66812345678",
    },
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

test("parseConfig requires a strong JWT secret", () => {
  assert.throws(() => parseConfigRaw({}), /JWT_SECRET/);
  assert.throws(() => parseConfigRaw({ JWT_SECRET: "short" }), /JWT_SECRET/);
});

test("parseConfig accepts complete admin bootstrap credentials", () => {
  const result = parseConfig({
    JWT_SECRET: "a-secure-jwt-secret-that-is-at-least-32-characters",
    ADMIN_BOOTSTRAP_EMAIL: " Admin@Example.com ",
    ADMIN_BOOTSTRAP_PASSWORD: "correct horse battery staple",
    ADMIN_BOOTSTRAP_NAME: "Initial Admin",
  });

  assert.deepEqual(result.auth, {
    jwtSecret: "a-secure-jwt-secret-that-is-at-least-32-characters",
    bootstrap: {
      email: "admin@example.com",
      password: "correct horse battery staple",
      displayName: "Initial Admin",
    },
  });
});

test("parseConfig treats blank optional bootstrap values from Docker Compose as absent", () => {
  const parsed = parseConfig({
    JWT_SECRET: "12345678901234567890123456789012",
    ADMIN_BOOTSTRAP_EMAIL: "",
    ADMIN_BOOTSTRAP_PASSWORD: "",
    ADMIN_BOOTSTRAP_NAME: "",
  });
  assert.equal(parsed.auth.bootstrap, null);
});

test("parseConfig rejects partial admin bootstrap credentials", () => {
  assert.throws(
    () => parseConfig({
      JWT_SECRET: "a-secure-jwt-secret-that-is-at-least-32-characters",
      ADMIN_BOOTSTRAP_EMAIL: "admin@example.com",
    }),
    /ADMIN_BOOTSTRAP/
  );
});
