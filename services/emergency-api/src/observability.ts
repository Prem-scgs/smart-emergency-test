import type { FastifyInstance } from "fastify";

/**
 * Observability hooks สำหรับ Fastify
 *
 * สร้าง log context ที่มี reqId/method/url/ip เพื่อ trace request fail path
 * โดยไม่ผูกกับ route ใด route หนึ่ง.
 */
type RequestLike = {
  id: string;
  method: string;
  url: string;
  ip?: string;
  log?: {
    info: (payload: Record<string, unknown>, message: string) => void;
    error: (payload: Record<string, unknown>, message: string) => void;
  };
};

type ReplyLike = {
  statusCode: number;
  elapsedTime?: number;
};

export function buildRequestLogContext(request: RequestLike) {
  return {
    reqId: request.id,
    method: request.method,
    url: request.url,
    ip: request.ip ?? "unknown",
  };
}

export function buildResponseLogContext(
  request: RequestLike,
  response: { statusCode: number; elapsedTimeMs: number }
) {
  return {
    reqId: request.id,
    method: request.method,
    url: request.url,
    statusCode: response.statusCode,
    elapsedTimeMs: response.elapsedTimeMs,
  };
}

export function buildErrorLogContext(
  request: RequestLike,
  error: Error,
  statusCode: number
) {
  return {
    reqId: request.id,
    method: request.method,
    url: request.url,
    statusCode,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  };
}

export function normalizeError(error: unknown) {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Unknown error");
}

export async function registerObservability(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    request.log.info(buildRequestLogContext(request), "request.start");
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      buildResponseLogContext(request, {
        statusCode: reply.statusCode,
        elapsedTimeMs: Number(reply.elapsedTime ?? 0),
      }),
      "request.complete"
    );
  });
}
