import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  getMockAdminScopeFromRequest,
  isCategoryScopedAdmin,
  isViewerScope,
} from "../../admin-scope.js";
import { buildApiErrorPayload } from "../../api-error.js";
import { pool } from "../../db.js";
import { emitEmergencyEvent } from "../../events.js";
import { buildZodValidationErrorPayload } from "../../input-validation.js";
import {
  INCIDENT_STATUS_ORDER,
  validateIncidentStatusTransition,
} from "./status-workflow.js";

const incidentStatusUpdateBody = z.object({
  fromStatus: z.enum(INCIDENT_STATUS_ORDER),
  toStatus: z.enum(INCIDENT_STATUS_ORDER),
  expectedVersion: z.number().int().min(0),
  note: z.string().nullable().optional(),
});

export async function registerIncidentStatusRoutes(app: FastifyInstance) {
  /**
   * อัปเดตสถานะ incident จากฝั่ง Admin
   *
   * Flow สำคัญ:
   * - viewer อ่าน detail ได้ แต่ห้ามเปลี่ยน workflow
   * - ใช้ FOR UPDATE + expectedVersion กัน Admin หลายคนแก้เคสเดียวกันพร้อมกัน
   * - บันทึกประวัติลง incident_status_history ก่อน COMMIT
   * - emit incident.status_updated หลัง transaction ปิดแล้ว เพื่อไม่ให้ frontend เห็น event ก่อน DB พร้อม
   *
   * ถ้าแก้ตรงนี้ ต้องทดสอบ status dropdown, backward note, 409 conflict และ SSE status refresh
   */
  app.patch("/api/incidents/:id/status", async (request, reply) => {
    const paramsResult = z
      .object({
        id: z.string().min(1),
      })
      .safeParse(request.params);

    if (!paramsResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(paramsResult.error);
    }

    const bodyResult = incidentStatusUpdateBody.safeParse(request.body);
    if (!bodyResult.success) {
      reply.code(400);
      return buildZodValidationErrorPayload(bodyResult.error);
    }

    const adminScope = getMockAdminScopeFromRequest(
      request.headers as Record<string, unknown> | undefined,
      request.query as Record<string, unknown> | undefined
    );

    if (!adminScope) {
      reply.code(403);
      return buildApiErrorPayload(
        403,
        "INCIDENT_STATUS_ACCESS_DENIED",
        "Admin scope is required"
      );
    }

    // viewer ดูเคสได้ แต่ห้ามขยับ workflow/status เพราะเป็นบัญชีอ่านอย่างเดียว
    if (isViewerScope(adminScope)) {
      reply.code(403);
      return buildApiErrorPayload(
        403,
        "INCIDENT_STATUS_ACCESS_DENIED",
        "Viewer role cannot update incident status"
      );
    }

    const body = bodyResult.data;
    const client = await pool.connect();
    let transactionOpen = false;
    let eventPayload: {
      id: unknown;
      category: unknown;
      fromStatus: string;
      status: unknown;
      statusVersion: unknown;
      note: string | null;
      updatedAt: unknown;
    } | null = null;

    try {
      await client.query("BEGIN");
      transactionOpen = true;

      const currentResult = await client.query(
        `
          SELECT id, category, status, status_version
          FROM incidents
          WHERE id = $1
          FOR UPDATE
        `,
        [paramsResult.data.id]
      );
      const current = currentResult.rows[0];

      if (
        !current ||
        (isCategoryScopedAdmin(adminScope) && current.category !== adminScope.category)
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(404);
        return buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");
      }

      if (
        current.status !== body.fromStatus ||
        current.status_version !== body.expectedVersion
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(409);
        return {
          ...buildApiErrorPayload(
            409,
            "INCIDENT_STATUS_CONFLICT",
            "Incident status was changed by another admin"
          ),
          currentState: {
            status: current.status,
            statusVersion: current.status_version,
          },
        };
      }

      const transitionResult = validateIncidentStatusTransition({
        role: adminScope.role,
        fromStatus: body.fromStatus,
        toStatus: body.toStatus,
        note: body.note,
      });

      if (!transitionResult.ok) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(transitionResult.statusCode);
        return buildApiErrorPayload(
          transitionResult.statusCode,
          transitionResult.code,
          transitionResult.error
        );
      }

      const updateResult = await client.query(
        `
          UPDATE incidents
          SET
            status = $1,
            status_version = status_version + 1,
            updated_at = now()
          WHERE id = $2
            AND status_version = $3
          RETURNING id, category, status, status_version, updated_at
        `,
        [body.toStatus, paramsResult.data.id, body.expectedVersion]
      );
      const updated = updateResult.rows[0];

      if (!updated) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        reply.code(409);
        return buildApiErrorPayload(
          409,
          "INCIDENT_STATUS_CONFLICT",
          "Incident status was changed by another admin"
        );
      }

      await client.query(
        `
          INSERT INTO incident_status_history
            (incident_id, from_status, to_status, note, changed_by_role, status_version)
          VALUES
            ($1, $2, $3, $4, $5, $6)
        `,
        [
          paramsResult.data.id,
          body.fromStatus,
          body.toStatus,
          transitionResult.transition.note,
          adminScope.role,
          updated.status_version,
        ]
      );

      await client.query("COMMIT");
      transactionOpen = false;
      eventPayload = {
        id: updated.id,
        category: updated.category,
        fromStatus: body.fromStatus,
        status: updated.status,
        statusVersion: updated.status_version,
        note: transitionResult.transition.note,
        updatedAt: updated.updated_at,
      };
    } catch (error) {
      if (transactionOpen) {
        await client.query("ROLLBACK");
      }
      throw error;
    } finally {
      client.release();
    }

    emitEmergencyEvent({
      type: "incident.status_updated",
      payload: eventPayload,
    });
    return eventPayload;
  });
}
