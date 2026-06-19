import test from "node:test";
import assert from "node:assert/strict";

import { corsMethods } from "./cors-options.js";

test("CORS allows every HTTP method used by the frontend", () => {
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.ok(corsMethods.includes(method), `Expected CORS to allow ${method}`);
  }
});
