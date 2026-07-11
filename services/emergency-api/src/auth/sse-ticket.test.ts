import assert from "node:assert/strict";
import test from "node:test";

import { createSseTicketStore } from "./sse-ticket.js";

test("SSE tickets are short-lived and can be consumed only once", () => {
  let now = 1_000;
  const store = createSseTicketStore({ ttlMs: 5_000, now: () => now });
  const ticket = store.issue("user-1");

  assert.equal(store.consume(ticket), "user-1");
  assert.equal(store.consume(ticket), null);

  const expired = store.issue("user-2");
  now = 6_001;
  assert.equal(store.consume(expired), null);
});

test("expired unconsumed tickets are cleaned before issuing new tickets", () => {
  let now = 0;
  const store = createSseTicketStore({ ttlMs: 10, now: () => now, maxTickets: 2 });
  store.issue("subject-1");
  store.issue("subject-2");
  now = 20;
  const current = store.issue("subject-3");
  assert.equal(store.size(), 1);
  assert.equal(store.consume(current), "subject-3");
});
