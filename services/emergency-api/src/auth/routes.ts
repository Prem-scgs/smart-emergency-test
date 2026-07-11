import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildApiErrorPayload } from "../api-error.js";
import { writeAuditLog } from "../audit-log.js";
import { pool } from "../db.js";
import { createInMemoryRateLimiter } from "../rate-limit.js";
import { type AdminUserRow, mapAdminUserProfile, normalizeEmail } from "./admin-user.js";
import { verifyPassword } from "./password.js";
import { sseTickets } from "./sse-ticket.js";
import { authenticateActiveAdmin, type AuthenticatedAdminRequest } from "./authenticate.js";

const loginBody = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const limiter = createInMemoryRateLimiter({ maxRequests: 5, windowMs: 60_000 });
const sseTicketLimiter = createInMemoryRateLimiter({ maxRequests: 30, windowMs: 60_000 });
const dummyPasswordHash = "scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request, reply) => {
    const body = loginBody.parse(request.body); const email = normalizeEmail(body.email);
    const limit = limiter.check(`${request.ip}:${email}`);
    if (!limit.allowed) {
      await writeAuditLog(request as any, { action: "auth.login_rate_limited", resourceType: "admin_user", resourceId: email, actorType: "admin", details: { email } });
      reply.code(429); return buildApiErrorPayload(429, "AUTH_RATE_LIMITED", "Too many login attempts");
    }
    const result = await pool.query<AdminUserRow>(`SELECT u.*, a.name AS agency_name, a.category_id AS agency_category
      FROM admin_users u LEFT JOIN agencies a ON a.id=u.agency_id WHERE lower(u.email)=$1 AND u.active=true LIMIT 1`, [email]);
    const user = result.rows[0];
    const validPassword = await verifyPassword(body.password, user?.password_hash ?? dummyPasswordHash);
    const valid = Boolean(user) && validPassword;
    await writeAuditLog(request as any, { action: valid ? "auth.login_succeeded" : "auth.login_failed", resourceType: "admin_user", resourceId: user?.id ?? email, actorId: user?.id, actorType: "admin", details: { email } });
    if (!valid) { reply.code(401); return buildApiErrorPayload(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password"); }
    const profile = mapAdminUserProfile(user); const token = await (reply as any).jwtSign({ sub: user.jwt_subject, id: user.id, role: user.role, agencyId: user.agency_id });
    return { token, user: profile };
  });
  app.get("/api/auth/me", { preHandler: authenticateActiveAdmin }, async (request: AuthenticatedAdminRequest, reply) => {
    const result = await pool.query<AdminUserRow>(`SELECT u.*, a.name AS agency_name, a.category_id AS agency_category
      FROM admin_users u LEFT JOIN agencies a ON a.id=u.agency_id WHERE u.id=$1 AND u.active=true LIMIT 1`, [request.admin.id]);
    if (!result.rows[0]) { reply.code(401); return buildApiErrorPayload(401, "AUTH_USER_INACTIVE", "User is inactive or missing"); }
    return { user: mapAdminUserProfile(result.rows[0]) };
  });
  app.post("/api/auth/sse-ticket", { preHandler: authenticateActiveAdmin }, async (request: AuthenticatedAdminRequest, reply) => {
    const limit = sseTicketLimiter.check(request.admin.id);
    if (!limit.allowed) {
      reply.code(429);
      return buildApiErrorPayload(429, "AUTH_SSE_TICKET_RATE_LIMITED", "Too many SSE ticket requests");
    }
    return { ticket: sseTickets.issue(request.admin.jwtSubject), expiresInSeconds: 60 };
  });
}
