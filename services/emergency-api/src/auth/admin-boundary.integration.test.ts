import assert from "node:assert/strict";
import test from "node:test";
import jwt from "@fastify/jwt";
import Fastify from "fastify";

import { registerAdminAuthBoundary } from "./admin-boundary.js";
import { sseTickets } from "./sse-ticket.js";

test("admin boundary rejects spoofed scope and injects current DB scope from JWT", async () => {
  const app = Fastify();

  try {
    await app.register(jwt, { secret: "12345678901234567890123456789012" });
    await registerAdminAuthBoundary(app, {
      authenticate: async (request) => {
        await request.jwtVerify();
        (request as any).admin = {
          id: "user-1", jwtSubject: "subject-1", role: "agency_admin",
          agencyId: "agency-1", agencyCategory: "medical",
        };
      },
    });
    app.get("/api/protected", async request => ({
      role: request.headers["x-admin-role"],
      category: request.headers["x-admin-category"],
    }));

    const denied = await app.inject({
      method: "GET", url: "/api/protected", headers: { "x-admin-role": "super_admin" },
    });
    assert.equal(denied.statusCode, 401);

    const token = app.jwt.sign({ sub: "subject-1", role: "super_admin" });
    const allowed = await app.inject({
      method: "GET", url: "/api/protected",
      headers: { authorization: `Bearer ${token}`, "x-admin-role": "super_admin" },
    });
    assert.equal(allowed.statusCode, 200, allowed.body);
    assert.deepEqual(allowed.json(), { role: "agency_admin", category: "medical" });
  } finally {
    await app.close();
  }
});

test("admin SSE boundary consumes a one-time ticket and rejects replay", async () => {
  const app = Fastify();

  try {
    await app.register(jwt, { secret: "12345678901234567890123456789012" });
    await registerAdminAuthBoundary(app, {
      loadBySubject: async () => ({
        id: "user-1", jwtSubject: "subject-1", role: "viewer",
        agencyId: "agency-1", agencyCategory: "medical",
      }),
    });
    app.get("/api/events", async request => ({ role: request.headers["x-admin-role"] }));
    const ticket = sseTickets.issue("subject-1");

    const first = await app.inject({ method: "GET", url: `/api/events?ticket=${ticket}` });
    assert.equal(first.statusCode, 200);
    assert.deepEqual(first.json(), { role: "viewer" });

    const replay = await app.inject({ method: "GET", url: `/api/events?ticket=${ticket}` });
    assert.equal(replay.statusCode, 401);
  } finally {
    await app.close();
  }
});
