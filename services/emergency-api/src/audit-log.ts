import { pool } from "./db.js";

type RequestLike = {
  id: string;
  ip?: string;
  log: {
    error: (payload: Record<string, unknown>, message?: string) => void;
  };
};

type AuditLogInput = {
  action: string;
  resourceType: string;
  resourceId: string;
  actorId?: string | null;
  actorType?: string;
  details?: Record<string, unknown>;
};

type AuditExecutor = (
  queryText: string,
  values: unknown[]
) => Promise<{ rowCount: number }>;

export async function writeAuditLog(
  request: RequestLike,
  input: AuditLogInput,
  execute: AuditExecutor = pool.query.bind(pool)
) {
  try {
    await execute(
      `
        INSERT INTO audit_logs
          (action, resource_type, resource_id, actor_id, actor_type, request_ip, request_id, details)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      `,
      [
        input.action,
        input.resourceType,
        input.resourceId,
        input.actorId ?? null,
        input.actorType ?? "system",
        request.ip ?? null,
        request.id,
        JSON.stringify(input.details ?? {}),
      ]
    );
    return true;
  } catch (error) {
    request.log.error(
      {
        code: "AUDIT_LOG_WRITE_FAILED",
        requestId: request.id,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        errorMessage: error instanceof Error ? error.message : "Unknown audit log error",
      },
      "audit.write_failed"
    );
    return false;
  }
}
