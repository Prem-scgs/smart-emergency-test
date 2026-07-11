import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import { normalizeEmail } from "./admin-user.js";
import { hashPassword } from "./password.js";

type Bootstrap = { email: string; password: string; displayName: string };
type Execute = (sql: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
export async function bootstrapInitialAdmin(input: Bootstrap | null, execute?: Execute) {
  if (!input) return false;
  if (!execute) {
    const client = await pool.connect();
    try { return await bootstrapInitialAdmin(input, client.query.bind(client) as Execute); }
    finally { client.release(); }
  }
  await execute("BEGIN");
  try {
    await execute("SELECT pg_advisory_xact_lock(hashtext('admin_users.bootstrap'))");
    const existing = await execute("SELECT EXISTS (SELECT 1 FROM admin_users WHERE role='super_admin' AND active=true) AS exists");
    if (existing.rows[0]?.exists) { await execute("COMMIT"); return false; }
    const inserted = await execute(`INSERT INTO admin_users (email, display_name, password_hash, role, agency_id, jwt_subject)
      VALUES ($1, $2, $3, $4, NULL, $5) ON CONFLICT DO NOTHING`,
      [normalizeEmail(input.email), input.displayName.trim(), await hashPassword(input.password), "super_admin", randomUUID()]);
    if (inserted.rowCount === 1) {
      await execute("COMMIT");
      return true;
    }
    const concurrent = await execute("SELECT EXISTS (SELECT 1 FROM admin_users WHERE role='super_admin' AND active=true) AS exists");
    if (!concurrent.rows[0]?.exists) {
      throw new Error("Admin bootstrap failed: no active super admin exists after insert conflict");
    }
    await execute("COMMIT");
    return false;
  } catch (error) { await execute("ROLLBACK"); throw error; }
}
