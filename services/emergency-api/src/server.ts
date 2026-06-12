import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { buildApiErrorPayload } from "./api-error.js";
import { config } from "./config.js";
import { closeDb, pool } from "./db.js";
import { registerAreaRoutes } from "./modules/areas/routes.js";
import { registerContactRoutes } from "./modules/contacts/routes.js";
import { registerIncidentRoutes } from "./modules/incidents/routes.js";
import { registerReferenceRoutes } from "./modules/reference/routes.js";
import {
  buildErrorLogContext,
  normalizeError,
  registerObservability,
} from "./observability.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: config.corsOrigin,
});

await registerObservability(app);

app.setErrorHandler((error, request, reply) => {
  const normalizedError = normalizeError(error);
  const statusCode = error instanceof ZodError ? 400 : reply.statusCode >= 400 ? reply.statusCode : 500;

  request.log.error(
    buildErrorLogContext(request, normalizedError, statusCode),
    "request.error"
  );

  if (error instanceof ZodError) {
    reply.code(400).send({
      ...buildApiErrorPayload(400, "VALIDATION_ERROR", "Validation error"),
      issues: error.issues,
    });
    return;
  }

  reply.code(statusCode).send(
    buildApiErrorPayload(
      statusCode,
      statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",
      normalizedError.message
    )
  );
});

app.get("/health", async () => {
  const result = await pool.query("SELECT now() AS now");
  return {
    ok: true,
    service: "emergency-api",
    dbTime: result.rows[0].now,
  };
});

await registerContactRoutes(app);
await registerAreaRoutes(app);
await registerIncidentRoutes(app);
await registerReferenceRoutes(app);

const shutdown = async () => {
  await app.close();
  await closeDb();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({
  port: config.port,
  host: "0.0.0.0",
});
