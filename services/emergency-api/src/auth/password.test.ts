import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "./password.js";

test("scrypt password hashes verify only the original password", async () => {
  const hash = await hashPassword("correct horse battery staple");

  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.equal(await verifyPassword("wrong password", "malformed"), false);
});
