import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .transform((value) => value ?? "4000")
    .pipe(
      z
        .string()
        .regex(/^\d+$/, "PORT must be a number")
        .transform((value) => Number(value))
        .pipe(z.number().int().min(1).max(65535))
    ),
  DATABASE_URL: z
    .string()
    .optional()
    .transform(
      (value) =>
        value ?? "postgres://emergency:emergency_dev@localhost:5432/smart_emergency"
    )
    .pipe(z.string().url("DATABASE_URL must be a valid URL")),
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((value) => value ?? "http://localhost:3000")
    .pipe(z.string().url("CORS_ORIGIN must be a valid URL")),
});

export function parseConfig(
  env: Record<string, string | undefined>
) {
  const parsed = envSchema.parse(env);
  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    corsOrigin: parsed.CORS_ORIGIN,
  };
}

export const config = parseConfig(process.env);
