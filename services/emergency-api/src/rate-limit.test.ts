import test from "node:test";
import assert from "node:assert/strict";

import { createInMemoryRateLimiter } from "./rate-limit.js";

test("rate limiter allows requests within the limit", () => {
  const limiter = createInMemoryRateLimiter({
    maxRequests: 2,
    windowMs: 60_000,
    now: () => 1_000,
  });

  assert.equal(limiter.check("127.0.0.1").allowed, true);
  assert.equal(limiter.check("127.0.0.1").allowed, true);
});

test("rate limiter blocks requests after the limit", () => {
  const limiter = createInMemoryRateLimiter({
    maxRequests: 2,
    windowMs: 60_000,
    now: () => 1_000,
  });

  limiter.check("127.0.0.1");
  limiter.check("127.0.0.1");
  const result = limiter.check("127.0.0.1");

  assert.equal(result.allowed, false);
  assert.equal(result.retryAfterMs, 60_000);
});

test("rate limiter resets after the time window", () => {
  let now = 1_000;
  const limiter = createInMemoryRateLimiter({
    maxRequests: 1,
    windowMs: 10_000,
    now: () => now,
  });

  assert.equal(limiter.check("127.0.0.1").allowed, true);
  assert.equal(limiter.check("127.0.0.1").allowed, false);

  now = 12_000;

  assert.equal(limiter.check("127.0.0.1").allowed, true);
});
