import "dotenv/config";
import { z } from "zod";

/**
 * Runtime config validation ของ emergency API
 *
 * ใช้ zod บังคับ env สำคัญก่อน server start เช่น DATABASE_URL, CORS, share channels
 * ถ้าแก้ default ต้องทดสอบ Docker local, Vercel tunnel และ settings/share-channel flow.
 */
/**
 * Runtime config validation ของ emergency API
 *
 * ใช้ zod บังคับ env สำคัญก่อน server start เช่น DATABASE_URL, CORS, share channels
 * ถ้าแก้ default ต้องทดสอบ Docker local, Vercel tunnel และ settings/share-channel flow.
 */
/**
 * Runtime config validation ของ emergency API
 *
 * ใช้ zod บังคับ env สำคัญก่อน server start เช่น DATABASE_URL, CORS, share channels
 * ถ้าแก้ default ต้องทดสอบ Docker local, Vercel tunnel และ settings/share-channel flow.
 */
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
  CORS_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  ADMIN_BOOTSTRAP_EMAIL: z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email().optional()
  ),
  ADMIN_BOOTSTRAP_PASSWORD: z.preprocess(
    value => value === "" ? undefined : value,
    z.string().min(8).optional()
  ),
  ADMIN_BOOTSTRAP_NAME: z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional()
  ),
  LINE_OA_ID: z
    .string()
    .trim()
    .regex(/^@[A-Za-z0-9._-]+$/, "LINE_OA_ID must start with @")
    .optional(),
  SMS_CENTER_PHONE: z
    .string()
    .trim()
    .regex(/^0\d{8,9}$/, "SMS_CENTER_PHONE must be a Thai phone number")
    .optional(),
  WHATSAPP_CENTER_PHONE: z
    .string()
    .trim()
    .regex(/^\d{8,15}$/, "WHATSAPP_CENTER_PHONE must contain E.164 digits without +")
    .optional(),
});

export function parseConfig(
  env: Record<string, string | undefined>
) {
  const parsed = envSchema.parse(env);
  const bootstrapValues = [parsed.ADMIN_BOOTSTRAP_EMAIL, parsed.ADMIN_BOOTSTRAP_PASSWORD, parsed.ADMIN_BOOTSTRAP_NAME];
  if (bootstrapValues.some(Boolean) && !bootstrapValues.every(Boolean)) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD, and ADMIN_BOOTSTRAP_NAME must be provided together");
  }
  const corsOrigins = z
    .array(z.string().url("CORS_ORIGINS must contain valid URLs"))
    .min(1, "CORS_ORIGINS must contain at least one URL")
    .parse(
      (parsed.CORS_ORIGINS ?? parsed.CORS_ORIGIN)
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    );

  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    corsOrigin: corsOrigins[0],
    corsOrigins,
    auth: {
      jwtSecret: parsed.JWT_SECRET,
      bootstrap: parsed.ADMIN_BOOTSTRAP_EMAIL ? {
        email: parsed.ADMIN_BOOTSTRAP_EMAIL.toLowerCase(),
        password: parsed.ADMIN_BOOTSTRAP_PASSWORD!,
        displayName: parsed.ADMIN_BOOTSTRAP_NAME!,
      } : null,
    },
    shareChannels: {
      lineOaId: parsed.LINE_OA_ID ?? null,
      smsCenterPhone: parsed.SMS_CENTER_PHONE ?? null,
      whatsappCenterPhone: parsed.WHATSAPP_CENTER_PHONE ?? null,
    },
  };
}

export const config = parseConfig(process.env);

export function getAllowedCorsOrigin(origin: string | undefined) {
  return origin && config.corsOrigins.includes(origin) ? origin : config.corsOrigin;
}
