/**
 * ???? error payload shape ??? frontend ????????? error ??? backend.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { buildApiErrorPayload, getHttpErrorStatus } from "./api-error.js";

test("buildApiErrorPayload returns a consistent error shape", () => {
  const result = buildApiErrorPayload(404, "INCIDENT_NOT_FOUND", "Incident not found");

  assert.deepEqual(result, {
    error: "Incident not found",
    code: "INCIDENT_NOT_FOUND",
    statusCode: 404,
  });
});

test("getHttpErrorStatus preserves authentication errors from Fastify plugins", () => {
  assert.equal(getHttpErrorStatus({ statusCode: 401 }, 200), 401);
  assert.equal(getHttpErrorStatus({ statusCode: 429 }, 200), 429);
  assert.equal(getHttpErrorStatus(new Error("boom"), 200), 500);
});
