import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticateActiveAdmin } from "./authenticate.js";

test("authentication resolves current DB role instead of token claims", async () => {
  const request: any = { user: { sub: "s1", role: "super_admin" }, jwtVerify: async () => {} };
  await createAuthenticateActiveAdmin(async () => ({ rows: [{ id: "u1", jwt_subject: "s1", role: "viewer", agency_id: "a1", active: true }] }) as any)(request, {} as any);
  assert.equal(request.admin.role, "viewer");
});

test("authentication rejects a deactivated token", async () => {
  const request: any = { user: { sub: "s1" }, jwtVerify: async () => {} };
  const reply: any = { statusCode: 200, code(value: number) { this.statusCode = value; return this; }, send(value: unknown) { this.payload = value; } };
  await createAuthenticateActiveAdmin(async () => ({ rows: [] }) as any)(request, reply);
  assert.equal(reply.statusCode, 401);
});
