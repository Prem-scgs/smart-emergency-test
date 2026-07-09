import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  getMockAdminScopeFromRequest,
  isCategoryScopedAdmin,
} from "../../admin-scope.js";
import { buildApiErrorPayload } from "../../api-error.js";
import { getAllowedCorsOrigin } from "../../config.js";
import { pool } from "../../db.js";
import { emergencyEvents } from "../../events.js";
import { buildZodValidationErrorPayload } from "../../input-validation.js";

export async function registerIncidentEventRoutes(app: FastifyInstance) {
  /**
   * SSE stream สำหรับ mobile tracking ของ incident เดียว
   *
   * ใช้ sessionId ตรวจ ownership ก่อนเปิด stream เพื่อไม่ให้มือถือเครื่องอื่นฟังเคสนี้ได้
   * stream นี้ส่งเฉพาะ incident.status_updated ของ id เดียว และ mobile UI ใช้คู่กับ tracking fetch
   */
  app.get("/api/incidents/:id/events", async (request, reply) => {
    const paramsResult = z
      .object({
        id: z.string().min(1),
      })
      .safeParse(request.params);

    if (!paramsResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(paramsResult.error);
    }

    const queryResult = z
      .object({
        sessionId: z.string().trim().min(8),
      })
      .safeParse(request.query ?? {});

    if (!queryResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(queryResult.error);
    }

    const incidentId = paramsResult.data.id;
    const ownershipResult = await pool.query(
      `
        SELECT id
        FROM incidents
        WHERE id = $1 AND session_id = $2
        LIMIT 1
      `,
      [incidentId, queryResult.data.sessionId]
    );

    if (ownershipResult.rows.length === 0) {
      reply.code(403);
      return buildApiErrorPayload(
        403,
        "INCIDENT_TRACKING_ACCESS_DENIED",
        "Reporter session does not own this incident"
      );
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
      "Access-Control-Allow-Origin": getAllowedCorsOrigin(request.headers?.origin),
      Vary: "Origin",
    });
    reply.raw.flushHeaders?.();

    let closed = false;

    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      emergencyEvents.off("incident.status_updated", sendStatusUpdate);
    };

    const sendStatusUpdate = (payload: unknown) => {
      if (
        closed ||
        !payload ||
        typeof payload !== "object" ||
        (payload as { id?: unknown }).id !== incidentId
      ) {
        return;
      }

      try {
        reply.raw.write("event: incident.status_updated\n");
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        cleanup();
      }
    };

    // Heartbeat ช่วยให้ proxy/browser รู้ว่า connection ยังมีชีวิต และลดโอกาสโดน buffer ปิดเงียบ
    reply.raw.write("retry: 2000\n");
    reply.raw.write(": connected\n\n");

    heartbeatInterval = setInterval(() => {
      if (closed) {
        return;
      }

      try {
        reply.raw.write(": keepalive\n\n");
      } catch {
        cleanup();
      }
    }, 15000);

    emergencyEvents.on("incident.status_updated", sendStatusUpdate);
    reply.raw.on("close", cleanup);
  });

  /**
   * SSE stream รวมสำหรับ Admin Dashboard
   *
   * Frontend เปิดผ่าน EventSource ซึ่งส่ง custom headers ไม่ได้ในบาง browser/proxy
   * จึงรองรับ admin scope จาก query string ด้วย และยัง filter category ก่อนส่ง event ออกไป
   */
  app.get("/api/events", async (request, reply) => {
    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
      "Access-Control-Allow-Origin": getAllowedCorsOrigin(request.headers?.origin),
      Vary: "Origin",
    });
    reply.raw.flushHeaders?.();

    let closed = false;

    const flushStream = () => {
      (reply.raw as { flush?: () => void }).flush?.();
    };

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      clearInterval(heartbeatInterval);
      emergencyEvents.off("incident.created", sendIncident);
      emergencyEvents.off("incident.status_updated", sendStatusUpdate);
    };

    const sendEvent = (eventName: string, payload: unknown) => {
      if (closed) {
        return;
      }

      if (
        isCategoryScopedAdmin(adminScope) &&
        (!payload || typeof payload !== "object" || (payload as { category?: unknown }).category !== adminScope.category)
      ) {
        return;
      }

      try {
        reply.raw.write(`event: ${eventName}\n`);
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
        flushStream();
      } catch {
        cleanup();
      }
    };

    const sendIncident = (payload: unknown) => {
      sendEvent("incident.created", payload);
    };

    const sendStatusUpdate = (payload: unknown) => {
      sendEvent("incident.status_updated", payload);
    };

    // Padding ช่วยให้บาง proxy/browser flush SSE ก้อนแรกทันที ไม่รอ buffer เต็ม
    reply.raw.write(`:${" ".repeat(2048)}\n\n`);
    reply.raw.write("retry: 2000\n");
    reply.raw.write(": connected\n\n");
    flushStream();

    const heartbeatInterval = setInterval(() => {
      if (closed) {
        return;
      }

      try {
        reply.raw.write(": keepalive\n\n");
        flushStream();
      } catch {
        cleanup();
      }
    }, 15000);

    emergencyEvents.on("incident.created", sendIncident);
    emergencyEvents.on("incident.status_updated", sendStatusUpdate);
    reply.raw.on("close", cleanup);
  });
}
