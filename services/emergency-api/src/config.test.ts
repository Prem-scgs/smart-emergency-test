import test from "node:test";
import assert from "node:assert/strict";

import { parseConfig } from "./config.js";

test("parseConfig returns defaults when env is empty", () => {
  const result = parseConfig({});

  assert.deepEqual(result, {
    port: 4000,
    databaseUrl: "postgres://emergency:emergency_dev@localhost:5432/smart_emergency",
    corsOrigin: "http://localhost:3000",
  });
});

test("parseConfig accepts valid overrides", () => {
  const result = parseConfig({
    PORT: "4100",
    DATABASE_URL: "postgres://user:pass@db.example.com:5432/emergency",
    CORS_ORIGIN: "https://smart-emergency.example.com",
  });

  assert.deepEqual(result, {
    port: 4100,
    databaseUrl: "postgres://user:pass@db.example.com:5432/emergency",
    corsOrigin: "https://smart-emergency.example.com",
  });
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
