import pg from "pg";
import { config } from "./config.js";

/**
 * PostgreSQL pool กลางของ API
 *
 * ทุก route/module ใช้ pool นี้คุยกับ DB ถ้าแก้ connection lifecycle ต้องทดสอบ
 * migration-ready DB, health endpoint และ graceful shutdown.
 */
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
});

export async function closeDb() {
  await pool.end();
}
