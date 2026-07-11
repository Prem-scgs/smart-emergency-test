import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { buildApiErrorPayload } from "../../api-error.js";
import { type AdminRole, type AdminUserRow, mapAdminUserProfile, normalizeEmail, validateRoleAgency } from "../../auth/admin-user.js";
import { authenticateActiveAdmin, type AuthenticatedAdminRequest } from "../../auth/authenticate.js";
import { hashPassword } from "../../auth/password.js";
import { writeAuditLog } from "../../audit-log.js";
import { pool } from "../../db.js";

const role = z.enum(["super_admin", "agency_admin", "viewer"]);
const createBody = z.object({ email: z.string().email(), displayName: z.string().trim().min(1), password: z.string().min(8), role, agencyId: z.string().uuid().nullable().optional() });
const patchBody = z.object({ email: z.string().email().optional(), displayName: z.string().trim().min(1).optional(), password: z.string().min(8).optional(), role: role.optional(), agencyId: z.string().uuid().nullable().optional(), active: z.boolean().optional() }).refine(value => Object.keys(value).length > 0);

function forbid(reply: FastifyReply) { reply.code(403); return buildApiErrorPayload(403, "ADMIN_USERS_FORBIDDEN", "Only super admin can manage users"); }
function selfProtected(reply: FastifyReply) { reply.code(400); return buildApiErrorPayload(400, "ADMIN_USER_SELF_PROTECTION", "You cannot change your own role, password, active status, or delete your account"); }
function isSuper(request: AuthenticatedAdminRequest) { return request.admin.role === "super_admin"; }

function validateRoleAgencyRequest(role: AdminRole, agencyId: string | null, reply: FastifyReply) {
  try {
    validateRoleAgency(role, agencyId);
    return null;
  } catch {
    reply.code(400);
    return buildApiErrorPayload(400, "ADMIN_USER_INVALID_ROLE_SCOPE", "Role and agency are incompatible");
  }
}

export function getAdminUserWriteError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error
    ? (error as { code?: unknown }).code
    : null;
  if (code === "23505") return { statusCode: 409, code: "ADMIN_USER_EMAIL_EXISTS", message: "Email is already in use" };
  if (code === "23503") return { statusCode: 400, code: "ADMIN_USER_INVALID_AGENCY", message: "Agency does not exist" };
  if (code === "23514") return { statusCode: 400, code: "ADMIN_USER_INVALID_ROLE_SCOPE", message: "Role and agency are incompatible" };
  return null;
}

function sendWriteError(error: unknown, reply: FastifyReply) {
  const mapped = getAdminUserWriteError(error);
  if (!mapped) throw error;
  reply.code(mapped.statusCode);
  return buildApiErrorPayload(mapped.statusCode, mapped.code, mapped.message);
}

export async function registerAdminUserRoutes(app: FastifyInstance) {
  app.get("/api/admin/users", { preHandler: authenticateActiveAdmin }, async (request: AuthenticatedAdminRequest, reply) => {
    if (!isSuper(request)) return forbid(reply);
    const [result, agenciesResult] = await Promise.all([
      pool.query<AdminUserRow>(`SELECT u.*, a.name AS agency_name, a.category_id AS agency_category FROM admin_users u LEFT JOIN agencies a ON a.id=u.agency_id ORDER BY u.created_at DESC`),
      pool.query<{ id: string; name: string; category: string }>(`SELECT id, name, category_id AS category FROM agencies WHERE active=true ORDER BY name ASC`),
    ]);
    return { users: result.rows.map(mapAdminUserProfile), agencies: agenciesResult.rows };
  });

  app.post("/api/admin/users", { preHandler: authenticateActiveAdmin }, async (request: AuthenticatedAdminRequest, reply) => {
    if (!isSuper(request)) return forbid(reply);
    const body = createBody.parse(request.body);
    const agencyId = body.agencyId ?? null;
    const roleAgencyError = validateRoleAgencyRequest(body.role, agencyId, reply);
    if (roleAgencyError) return roleAgencyError;
    let result;
    try {
      result = await pool.query<AdminUserRow>(`WITH changed AS (
        INSERT INTO admin_users (email, display_name, password_hash, jwt_subject, role, agency_id)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      ) SELECT changed.*, a.name AS agency_name, a.category_id AS agency_category
        FROM changed LEFT JOIN agencies a ON a.id=changed.agency_id`,
      [normalizeEmail(body.email), body.displayName, await hashPassword(body.password), randomUUID(), body.role, agencyId]);
    } catch (error) {
      return sendWriteError(error, reply);
    }
    await writeAuditLog(request, { action: "admin_user.created", resourceType: "admin_user", resourceId: result.rows[0].id, actorId: request.admin.id, actorType: "admin" });
    reply.code(201);
    return { user: mapAdminUserProfile(result.rows[0]) };
  });

  app.patch<{ Params: { id: string } }>("/api/admin/users/:id", { preHandler: authenticateActiveAdmin }, async (request, reply) => {
    const adminRequest = request as AuthenticatedAdminRequest;
    if (!isSuper(adminRequest)) return forbid(reply);
    const body = patchBody.parse(request.body);
    const id = request.params.id;
    if (id === adminRequest.admin.id && (body.role !== undefined || body.password !== undefined || body.active !== undefined)) return selfProtected(reply);
    if (body.role !== undefined || body.agencyId !== undefined) {
      const current = await pool.query<AdminUserRow>("SELECT * FROM admin_users WHERE id=$1", [id]);
      if (!current.rows[0]) { reply.code(404); return buildApiErrorPayload(404, "ADMIN_USER_NOT_FOUND", "Admin user not found"); }
      const roleAgencyError = validateRoleAgencyRequest(
        body.role ?? current.rows[0].role,
        body.agencyId === undefined ? current.rows[0].agency_id : body.agencyId,
        reply
      );
      if (roleAgencyError) return roleAgencyError;
    }
    let result;
    try {
      result = await pool.query<AdminUserRow>(`WITH changed AS (
        UPDATE admin_users SET email=COALESCE($2,email), display_name=COALESCE($3,display_name), password_hash=COALESCE($4,password_hash), jwt_subject=CASE WHEN $4 IS NOT NULL OR $8=false THEN gen_random_uuid()::text ELSE jwt_subject END, role=COALESCE($5,role), agency_id=CASE WHEN $6::boolean THEN $7 ELSE agency_id END, active=COALESCE($8,active), updated_at=now() WHERE id=$1 RETURNING *
      ) SELECT changed.*, a.name AS agency_name, a.category_id AS agency_category FROM changed LEFT JOIN agencies a ON a.id=changed.agency_id`,
      [id, body.email ? normalizeEmail(body.email) : null, body.displayName ?? null, body.password ? await hashPassword(body.password) : null, body.role ?? null, body.agencyId !== undefined, body.agencyId ?? null, body.active ?? null]);
    } catch (error) {
      return sendWriteError(error, reply);
    }
    if (!result.rows[0]) { reply.code(404); return buildApiErrorPayload(404, "ADMIN_USER_NOT_FOUND", "Admin user not found"); }
    const action = body.active === false ? "admin_user.deactivated" : body.password !== undefined ? "admin_user.password_reset" : "admin_user.updated";
    await writeAuditLog(request, { action, resourceType: "admin_user", resourceId: id, actorId: adminRequest.admin.id, actorType: "admin" });
    return { user: mapAdminUserProfile(result.rows[0]) };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/users/:id", { preHandler: authenticateActiveAdmin }, async (request, reply) => {
    const adminRequest = request as AuthenticatedAdminRequest;
    if (!isSuper(adminRequest)) return forbid(reply);
    if (request.params.id === adminRequest.admin.id) return selfProtected(reply);
    const result = await pool.query<AdminUserRow>(`WITH changed AS (UPDATE admin_users SET active=false, jwt_subject=gen_random_uuid()::text, updated_at=now() WHERE id=$1 RETURNING *)
      SELECT changed.*, a.name AS agency_name, a.category_id AS agency_category FROM changed LEFT JOIN agencies a ON a.id=changed.agency_id`, [request.params.id]);
    if (!result.rows[0]) { reply.code(404); return buildApiErrorPayload(404, "ADMIN_USER_NOT_FOUND", "Admin user not found"); }
    await writeAuditLog(request, { action: "admin_user.deactivated", resourceType: "admin_user", resourceId: request.params.id, actorId: adminRequest.admin.id, actorType: "admin" });
    return { user: mapAdminUserProfile(result.rows[0]) };
  });
}
