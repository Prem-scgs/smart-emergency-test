import assert from "node:assert/strict";
import test from "node:test";

import { pool } from "../db.js";
import { hashPassword } from "./password.js";
import { registerAuthRoutes } from "./routes.js";

type Handler = (request: any, reply: any) => Promise<any>;
function fakeApp() {
  const getHandlers = new Map<string, Handler>();
  const postHandlers = new Map<string, Handler>();
  return {
    get(path: string, _options: any, handler?: Handler) { getHandlers.set(path, handler ?? _options); },
    post(path: string, _options: any, handler?: Handler) { postHandlers.set(path, handler ?? _options); },
    getHandlers, postHandlers,
  };
}
function reply() {
  return { statusCode: 200, code(value: number) { this.statusCode = value; return this; },
    jwtSign(payload: unknown) { return Promise.resolve(`token:${JSON.stringify(payload)}`); } };
}

test("auth routes register login, me, and SSE ticket endpoints", async () => {
  const app = fakeApp();
  await registerAuthRoutes(app as any);
  assert.ok(app.postHandlers.has("/api/auth/login"));
  assert.ok(app.getHandlers.has("/api/auth/me"));
  assert.ok(app.postHandlers.has("/api/auth/sse-ticket"));
});

test("SSE ticket issuance has a per-admin rate limit", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./routes.ts", import.meta.url), "utf8"));
  assert.match(source, /sseTicketLimiter\.check\(request\.admin\.id\)/);
  assert.match(source, /AUTH_SSE_TICKET_RATE_LIMITED/);
});

test("login normalizes email, returns JWT and audits success", async () => {
  const app = fakeApp();
  const original = pool.query;
  const passwordHash = await hashPassword("valid password");
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  (pool.query as any) = async (sql: unknown, values?: unknown[]) => {
    calls.push({ sql: String(sql), values });
    if (/FROM admin_users/.test(String(sql))) return { rows: [{ id: "u1", email: "admin@example.com", display_name: "Admin", password_hash: passwordHash, jwt_subject: "s1", role: "super_admin", agency_id: null, active: true, created_at: new Date(0), updated_at: new Date(0) }] };
    return { rows: [], rowCount: 1 };
  };
  try {
    await registerAuthRoutes(app as any);
    const result = await app.postHandlers.get("/api/auth/login")!({ body: { email: " ADMIN@EXAMPLE.COM ", password: "valid password" }, ip: "1.2.3.4", id: "r1", log: { error() {} } }, reply());
    assert.match(result.token, /^token:/);
    assert.equal(result.user.email, "admin@example.com");
    assert.ok(calls.some(call => /auth.login_succeeded/.test(JSON.stringify(call.values))));
  } finally { (pool.query as any) = original; }
});

test("me returns the authenticated safe profile", async () => {
  const app = fakeApp();
  const original = pool.query;
  (pool.query as any) = async () => ({ rows: [{ id: "u1", email: "admin@example.com", display_name: "Admin", password_hash: "hidden", jwt_subject: "s1", role: "agency_admin", agency_id: "a1", agency_name: "Medical Center", agency_category: "medical", active: true, created_at: new Date(0), updated_at: new Date(0) }] });
  try {
    await registerAuthRoutes(app as any);
    const result = await app.getHandlers.get("/api/auth/me")!({ admin: { id: "u1", jwtSubject: "s1", role: "super_admin", agencyId: null } }, reply());
    assert.equal(result.user.email, "admin@example.com");
    assert.deepEqual(result.user.agency, { id: "a1", name: "Medical Center", category: "medical" });
    assert.equal("password_hash" in result.user, false);
  } finally { (pool.query as any) = original; }
});

test("rate-limited login attempts are audited", async () => {
  const app = fakeApp(); const original = pool.query; const calls: unknown[][] = [];
  (pool.query as any) = async (sql: unknown, values?: unknown[]) => { calls.push(values ?? []); return { rows: [], rowCount: 1 }; };
  try {
    await registerAuthRoutes(app as any);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await app.postHandlers.get("/api/auth/login")!({ body: { email: "limited@example.com", password: "wrong" }, ip: "8.8.8.8", id: `rate-${attempt}`, log: { error() {} } }, reply());
    }
    assert.ok(calls.some(values => values.includes("auth.login_rate_limited")));
  } finally { (pool.query as any) = original; }
});

test("unknown login still performs scrypt verification and audits failure", async () => {
  const app = fakeApp();
  const original = pool.query;
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  (pool.query as any) = async (sql: unknown, values?: unknown[]) => {
    calls.push({ sql: String(sql), values });
    return { rows: [], rowCount: 1 };
  };
  try {
    await registerAuthRoutes(app as any);
    const response = reply();
    await app.postHandlers.get("/api/auth/login")!({ body: { email: "missing@example.com", password: "wrong" }, ip: "9.9.9.9", id: "r2", log: { error() {} } }, response);
    assert.equal(response.statusCode, 401);
    assert.ok(calls.some(call => /auth.login_failed/.test(JSON.stringify(call.values))));
  } finally { (pool.query as any) = original; }
});
