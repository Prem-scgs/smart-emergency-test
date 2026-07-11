/**
 * ???? admin SSE hook contract ???? polling fallback, duplicate guard, status events ??? viewer passive.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readUseSseSource() {
  return readFile(new URL("../features/incident-alert/model/use-sse.ts", import.meta.url), "utf8");
}

async function readIncidentEventsSource() {
  return readFile(new URL("../shared/realtime/incident-events.ts", import.meta.url), "utf8");
}

async function readIncidentAlertFeatureSource() {
  return readFile(new URL("../features/incident-alert/lib/artifacts.ts", import.meta.url), "utf8");
}

test("useSse keeps the realtime alert and notification contract", async () => {
  const [source, alertFeature] = await Promise.all([
    readUseSseSource(),
    readIncidentAlertFeatureSource(),
  ]);

  assert.match(source, /export \{ buildRealtimeIncidentArtifacts \} from ['"]\.\.\/lib\/artifacts\.ts['"]/);
  assert.match(source, /language = 'th'/);
  assert.match(source, /buildRealtimeIncidentArtifacts\(payload, language, areaText\)/);
  assert.match(alertFeature, /actionLabel:\s*copy\.viewDetails/);
  assert.match(alertFeature, /actionUrl:\s*'\/admin\/dashboard'/);
  assert.match(source, /new CustomEvent\('smart-emergency:incident-created'/);
});

test("useSse localizes realtime alert copy and never renders raw workflow status", async () => {
  const source = await readUseSseSource();

  assert.match(source, /buildRealtimeIncidentArtifacts\(payload, language, areaText\)/);
  assert.match(source, /from ['"]\.\.\/lib\/artifacts\.ts['"]/);
  assert.doesNotMatch(source, /description: `[\s\S]*\$\{payload\.status\}/);
});

test("useSse lets admin providers override incident area text from localized lookups", async () => {
  const source = await readUseSseSource();

  assert.match(source, /formatAreaText\?: \(payload: IncidentEventPayload, language: AdminLanguage\)/);
  assert.match(source, /const areaText = formatAreaText\?\.\(payload, language\)/);
  assert.match(source, /buildRealtimeIncidentArtifacts\(payload, language, areaText\)/);
});

test("useSse keeps viewer updates passive without popup alerts or notifications", async () => {
  const source = await readUseSseSource();

  assert.match(source, /shouldCreateActionableAlert\(user\)/);
  assert.match(source, /if \(shouldCreateActionableAlert\(user\)\) \{[\s\S]*onNotification\?\.\(notification\)[\s\S]*onAlert\?\.\(alert\)[\s\S]*\}/);
  assert.match(source, /onEvent\?\.\(\{[\s\S]*type: 'new-incident'/);
  assert.match(source, /new CustomEvent\('smart-emergency:incident-created'/);
});

test("useSse validates and dispatches status update events", async () => {
  const source = await readUseSseSource();
  const incidentEventsSource = await readIncidentEventsSource();

  assert.match(source, /parseIncidentStatusUpdatedPayload\(event\.data\)/);
  assert.match(incidentEventsSource, /export function parseIncidentStatusUpdatedPayload/);
  assert.match(incidentEventsSource, /throw new Error\('Invalid incident status event'\)/);
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

test("useSse exchanges the bearer session for a one-time SSE ticket", async () => {
  const source = await readUseSseSource();

  assert.match(source, /\/api\/auth\/sse-ticket/);
  assert.match(source, /headers: buildAdminApiHeaders\(user\)/);
  assert.match(source, /buildAdminEventsUrl\(getEmergencyApiEventsBaseUrl\(\), ticket\)/);
  assert.match(source, /scheduleReconnect/);
});
