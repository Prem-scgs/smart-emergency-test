import type { FastifyReply, FastifyRequest } from "fastify";
import { buildApiErrorPayload } from "../api-error.js";
import { pool } from "../db.js";
import type { AdminRole } from "./admin-user.js";

export type ActiveAdmin = {
  id: string;
  jwtSubject: string;
  role: AdminRole;
  agencyId: string | null;
  agencyCategory: string | null;
};
export type AuthenticatedAdminRequest = FastifyRequest & { admin: ActiveAdmin };
declare module "fastify" {
  interface FastifyRequest { admin: ActiveAdmin }
}
type ActiveAdminRow = {
  id: string;
  jwt_subject: string;
  role: AdminRole;
  agency_id: string | null;
  agency_category: string | null;
};
type Execute = (sql: string, values: unknown[]) => Promise<{ rows: ActiveAdminRow[] }>;

export async function loadActiveAdminBySubject(execute: Execute, subject: string) {
  const result = await execute(
    `SELECT u.id, u.jwt_subject, u.role, u.agency_id,
      a.category_id AS agency_category
     FROM admin_users u
     LEFT JOIN agencies a ON a.id = u.agency_id
     WHERE u.jwt_subject=$1 AND u.active=true
     LIMIT 1`,
    [subject]
  );
  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        jwtSubject: row.jwt_subject,
        role: row.role,
        agencyId: row.agency_id,
        agencyCategory: row.agency_category,
      }
    : null;
}

export function createAuthenticateActiveAdmin(execute: Execute) {
  return async (request: FastifyRequest & { admin?: ActiveAdmin }, reply: FastifyReply) => {
    await request.jwtVerify();
    const subject = (request.user as { sub?: string }).sub;
    const admin = subject ? await loadActiveAdminBySubject(execute, subject) : null;
    if (!admin) {
      reply.code(401).send(buildApiErrorPayload(401, "AUTH_USER_INACTIVE", "User is inactive or missing"));
      return;
    }
    request.admin = admin;
  };
}

export const authenticateActiveAdmin = createAuthenticateActiveAdmin(pool.query.bind(pool));
