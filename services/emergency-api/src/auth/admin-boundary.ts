import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { buildApiErrorPayload } from "../api-error.js";
import { pool } from "../db.js";
import { sseTickets } from "./sse-ticket.js";
import {
  authenticateActiveAdmin,
  loadActiveAdminBySubject,
  type ActiveAdmin,
  type AuthenticatedAdminRequest,
} from "./authenticate.js";

type TrustedScope = {
  role: ActiveAdmin["role"];
  category: string | null;
};

const publicRoutes = new Set([
  "GET /health",
  "POST /api/auth/login",
  "GET /api/reference/share-channels",
  "GET /api/reference/categories",
  "GET /api/reference/provinces",
  "GET /api/reference/districts",
  "GET /api/contacts",
  "GET /api/areas",
  "GET /api/areas/resolve-point",
  "GET /api/incidents/:id/events",
  "GET /api/incidents/:id/tracking",
  "GET /api/incidents/history",
  "POST /api/incidents/:id/share-attempts",
  "POST /api/incidents",
  "PUT /api/incidents/:id/call",
]);

const locallyAuthenticatedRoutes = new Set([
  "GET /api/auth/me",
  "POST /api/auth/sse-ticket",
  "GET /api/admin/users",
  "POST /api/admin/users",
  "PATCH /api/admin/users/:id",
  "DELETE /api/admin/users/:id",
]);

export function isPublicApiRoute(method: string, routeUrl: string) {
  if (method.toUpperCase() === "OPTIONS") return true;
  return publicRoutes.has(`${method.toUpperCase()} ${routeUrl}`);
}

export function stripUntrustedAdminScope(headers: Record<string, unknown>) {
  delete headers["x-admin-role"];
  delete headers["x-admin-category"];
}

export function applyTrustedAdminScope(
  headers: Record<string, unknown>,
  scope: TrustedScope
) {
  headers["x-admin-role"] = scope.role;
  if (scope.role !== "super_admin" && scope.category) {
    headers["x-admin-category"] = scope.category;
  }
}

function applyRequestAdminScope(request: FastifyRequest & { admin: ActiveAdmin }) {
  applyTrustedAdminScope(request.headers, {
    role: request.admin.role,
    category: request.admin.agencyCategory,
  });
}

/**
 * Auth boundary กลางของ admin API
 *
 * Route เดิมยังอ่าน scope shape จาก header เพื่อไม่ให้ refactor business query ทั้งก้อนพร้อมกัน
 * hook นี้จึงลบ header จาก browser ก่อน แล้วเติมค่าที่อ่านจาก admin_users/agencies หลัง verify JWT เท่านั้น
 * ส่วน EventSource ใช้ one-time ticket เพราะ browser ส่ง Authorization header ไม่ได้
 */
export async function registerAdminAuthBoundary(
  app: FastifyInstance,
  dependencies: {
    authenticate?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    loadBySubject?: (subject: string) => Promise<ActiveAdmin | null>;
    consumeTicket?: (ticket: string) => string | null;
  } = {}
) {
  const authenticate = dependencies.authenticate ?? authenticateActiveAdmin;
  const loadBySubject = dependencies.loadBySubject ?? (subject => loadActiveAdminBySubject(pool.query.bind(pool), subject));
  const consumeTicket = dependencies.consumeTicket ?? (ticket => sseTickets.consume(ticket));
  app.addHook("preHandler", async (request, reply) => {
    stripUntrustedAdminScope(request.headers);

    const routeUrl = request.routeOptions.url ?? request.url.split("?")[0];
    const routeKey = `${request.method.toUpperCase()} ${routeUrl}`;

    if (routeKey === "GET /api/events") {
      const ticket = (request.query as { ticket?: unknown } | undefined)?.ticket;
      const subject = typeof ticket === "string" ? consumeTicket(ticket) : null;
      if (!subject) {
        reply.code(401).send(
          buildApiErrorPayload(401, "AUTH_INVALID_SSE_TICKET", "SSE ticket is invalid or expired")
        );
        return;
      }

      const admin = await loadBySubject(subject);
      if (!admin) {
        reply.code(401).send(
          buildApiErrorPayload(401, "AUTH_USER_INACTIVE", "User is inactive or missing")
        );
        return;
      }

      (request as AuthenticatedAdminRequest).admin = admin;
      applyRequestAdminScope(request as AuthenticatedAdminRequest);
      return;
    }

    if (locallyAuthenticatedRoutes.has(routeKey)) {
      return;
    }

    const authorization = request.headers.authorization;
    if (isPublicApiRoute(request.method, routeUrl) && !authorization) {
      return;
    }

    await authenticate(request, reply);
    if (!reply.sent && (request as AuthenticatedAdminRequest).admin) {
      applyRequestAdminScope(request as AuthenticatedAdminRequest);
    }
  });
}
