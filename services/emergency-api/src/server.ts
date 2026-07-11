import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { ZodError } from "zod";
import { buildApiErrorPayload, getHttpErrorStatus } from "./api-error.js";
import { bootstrapInitialAdmin } from "./auth/bootstrap.js";
import { registerAdminAuthBoundary } from "./auth/admin-boundary.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { config } from "./config.js";
import { corsMethods } from "./cors-options.js";
import { closeDb, pool } from "./db.js";
import { registerAdminOrganizationSettingsRoutes } from "./modules/admin/organization-settings.routes.js";
import { registerAdminShareChannelRoutes } from "./modules/admin/share-channels.routes.js";
import { registerAdminUserRoutes } from "./modules/admin/users.routes.js";
import { registerAreaRoutes } from "./modules/areas/routes.js";
import { registerContactRoutes } from "./modules/contacts/routes.js";
import { registerIncidentRoutes } from "./modules/incidents/routes.js";
import { registerReferenceRoutes } from "./modules/reference/routes.js";
import {
  buildErrorLogContext,
  normalizeError,
  registerObservability,
} from "./observability.js";

/**
 * Fastify composition root ของ emergency API
 *
 * จุดนี้ register CORS, observability, error handler และทุก route module
 * ถ้าแก้ต้องทดสอบ health, incidents, contacts, areas, reference และ admin settings.
 */
const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: (origin, callback) => {
    callback(null, !origin || config.corsOrigins.includes(origin));
  },
  methods: corsMethods,
});
await app.register(jwt, { secret: config.auth.jwtSecret, sign: { expiresIn: "8h" } });

await registerObservability(app);
await registerAdminAuthBoundary(app);

app.setErrorHandler((error, request, reply) => {
  const normalizedError = normalizeError(error);
  const statusCode = error instanceof ZodError ? 400 : getHttpErrorStatus(error, reply.statusCode);

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
      statusCode >= 500 ? "Internal server error" : normalizedError.message
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
await registerAdminOrganizationSettingsRoutes(app);
await registerAdminShareChannelRoutes(app);
await registerAuthRoutes(app);
await registerAdminUserRoutes(app);

await bootstrapInitialAdmin(config.auth.bootstrap);

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
