import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readUseSseSource() {
  return readFile(new URL("./use-sse.ts", import.meta.url), "utf8");
}

test("useSse keeps the realtime alert and notification contract", async () => {
  const source = await readUseSseSource();

  assert.match(source, /export function buildRealtimeIncidentArtifacts/);
  assert.match(source, /language: AdminLanguage = 'th'/);
  assert.match(source, /notificationTitle: language === 'en' \? 'New incident received' : 'มีเหตุใหม่เข้าระบบ'/);
  assert.match(source, /actionLabel:\s*copy\.viewDetails/);
  assert.match(source, /actionUrl:\s*'\/admin\/dashboard'/);
  assert.match(source, /new CustomEvent\('smart-emergency:incident-created'/);
});

test("useSse localizes realtime alert copy and never renders raw workflow status", async () => {
  const source = await readUseSseSource();

  assert.match(source, /reported: 'แจ้งเหตุแล้ว'/);
  assert.match(source, /reported: 'Reported'/);
  assert.match(source, /const statusText = statusLabel\(payload\.status, language\)/);
  assert.match(source, /description: `\$\{copy\.severityLabel\} \$\{severityText\} \$\{copy\.statusLabel\} \$\{statusText\}`/);
  assert.doesNotMatch(source, /description: `[\s\S]*\$\{payload\.status\}/);
});

test("useSse validates and dispatches status update events", async () => {
  const source = await readUseSseSource();

  assert.match(source, /export function parseIncidentStatusUpdatedPayload/);
  assert.match(source, /throw new Error\('Invalid incident status event'\)/);
  assert.match(source, /new CustomEvent\('smart-emergency:incident-status-updated'/);
  assert.match(source, /const versionKey = `\$\{payload\.id\}:\$\{payload\.statusVersion\}`/);
  assert.match(source, /seenStatusVersionsRef\.current\.has\(versionKey\)/);
});

test("useSse polling fallback uses cursor-based recent endpoint and in-flight guard", async () => {
  const source = await readUseSseSource();

  assert.match(source, /\/api\/incidents\/recent/);
  assert.match(source, /since: pollingCursorRef\.current/);
  assert.match(source, /isPollingRef\.current/);
  assert.match(source, /incident\.status_updated\.poll/);
});
