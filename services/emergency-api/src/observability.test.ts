/**
 * ???? request/response/error log context ???????? trace production issue ???.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildErrorLogContext,
  buildRequestLogContext,
  buildResponseLogContext,
  normalizeError,
} from "./observability.js";

test("buildRequestLogContext returns structured request metadata", () => {
  const result = buildRequestLogContext({
    id: "req-1",
    method: "POST",
    url: "/api/incidents",
    ip: "127.0.0.1",
  });

  assert.deepEqual(result, {
    reqId: "req-1",
    method: "POST",
    url: "/api/incidents",
    ip: "127.0.0.1",
  });
});

test("buildResponseLogContext returns structured response metadata", () => {
  const result = buildResponseLogContext({
    id: "req-2",
    method: "GET",
    url: "/health",
  }, {
    statusCode: 200,
    elapsedTimeMs: 18,
  });

  assert.deepEqual(result, {
    reqId: "req-2",
    method: "GET",
    url: "/health",
    statusCode: 200,
    elapsedTimeMs: 18,
  });
});

test("buildErrorLogContext includes request and error details", () => {
  const error = new Error("boom");
  const result = buildErrorLogContext({
    id: "req-3",
    method: "PUT",
    url: "/api/contacts/1",
  }, error, 500);

  assert.equal(result.reqId, "req-3");
  assert.equal(result.method, "PUT");
  assert.equal(result.url, "/api/contacts/1");
  assert.equal(result.statusCode, 500);
  assert.equal(result.errorName, "Error");
  assert.equal(result.errorMessage, "boom");
  assert.match(String(result.stack), /boom/);
});

test("normalizeError converts unknown values to Error", () => {
  const result = normalizeError("bad");

  assert.equal(result.name, "Error");
  assert.equal(result.message, "bad");
});
