import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { config } from "./config.js";
import { closeDb, pool } from "./db.js";
import { registerAreaRoutes } from "./modules/areas/routes.js";
import { registerContactRoutes } from "./modules/contacts/routes.js";
import { registerIncidentRoutes } from "./modules/incidents/routes.js";
import { registerReferenceRoutes } from "./modules/reference/routes.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: config.corsOrigin,
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    reply.code(400).send({
      error: "Validation error",
      issues: error.issues,
    });
    return;
  }

  reply.send(error);
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
