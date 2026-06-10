import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://emergency:emergency_dev@localhost:5432/smart_emergency",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};
