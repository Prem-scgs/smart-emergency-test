import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("migration 021 preserves legacy references but disables accounts without credentials", async () => {
  const sql = await readFile(
    new URL("../../db/migrations/021_admin_user_auth.sql", import.meta.url),
    "utf8"
  );

  assert.match(sql, /UPDATE admin_users[\s\S]*active = false/i);
  assert.match(sql, /^--[^\n]*\nBEGIN;/i);
  assert.match(sql, /COMMIT;\s*$/i);
  assert.match(sql, /legacy-[\s\S]*@invalid\.local/i);
  assert.match(sql, /ALTER COLUMN email SET NOT NULL/i);
  assert.match(sql, /ALTER COLUMN password_hash SET NOT NULL/i);
});
