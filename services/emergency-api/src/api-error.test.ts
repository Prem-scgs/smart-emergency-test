/**
 * ???? error payload shape ??? frontend ????????? error ??? backend.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { buildApiErrorPayload } from "./api-error.js";

test("buildApiErrorPayload returns a consistent error shape", () => {
  const result = buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");

  assert.deepEqual(result, {
    error: "Incident not found",
    code: "INCIDENT_NOT_FOUND",
    statusCode: 404,
  });
});
