import test from "node:test";
import assert from "node:assert/strict";

import { writeAuditLog } from "./audit-log.js";

test("writeAuditLog writes structured audit entries", async () => {
  const calls: unknown[][] = [];
  const execute = async (...args: unknown[]) => {
    calls.push(args);
    return { rowCount: 1 };
  };

  await writeAuditLog(
    {
      id: "req-1",
      ip: "127.0.0.1",
      log: {
        error() {},
      },
    },
    {
      action: "contacts.create",
      resourceType: "contact",
      resourceId: "contact-1",
      details: { phone: "191" },
    },
    execute as any
  );

  assert.equal(calls.length, 1);
  assert.match(String(calls[0]?.[0]), /INSERT INTO audit_logs/);
  assert.deepEqual(calls[0]?.[1], [
    "contacts.create",
    "contact",
    "contact-1",
    null,
    "system",
    "127.0.0.1",
    "req-1",
    JSON.stringify({ phone: "191" }),
  ]);
});

test("writeAuditLog swallows audit write failures and logs them", async () => {
  const logged: unknown[] = [];
  const execute = async () => {
    throw new Error("db down");
  };

  await writeAuditLog(
    {
      id: "req-2",
      ip: "127.0.0.1",
      log: {
        error(payload: unknown) {
          logged.push(payload);
        },
      },
    },
    {
      action: "incidents.create",
      resourceType: "incident",
      resourceId: "incident-1",
      details: { severity: "high" },
    },
    execute as any
  );

  assert.equal(logged.length, 1);
  assert.match(JSON.stringify(logged[0]), /AUDIT_LOG_WRITE_FAILED/);
});
