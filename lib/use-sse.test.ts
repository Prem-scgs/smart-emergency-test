import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRealtimeIncidentArtifacts,
  parseIncidentStatusUpdatedPayload,
} from "./use-sse.ts";

test("buildRealtimeIncidentArtifacts maps incident payload to notification and alert", () => {
  const payload = {
    id: "incident-1",
    category: "medical",
    severity: "high" as const,
    status: "open",
    areaName: "Bangkok Central",
    provinceCode: "10",
    province: "Bangkok",
    districtCode: "1001",
    district: "Phra Nakhon",
    createdAt: "2026-06-17T12:00:00.000Z",
  };

  const { notification, alert } = buildRealtimeIncidentArtifacts(payload);

  assert.equal(notification.id, "incident-incident-1");
  assert.equal(notification.type, "new-incident");
  assert.equal(notification.category, "medical");
  assert.equal(notification.areaId, undefined);
  assert.equal(notification.provinceCode, "10");
  assert.equal(notification.districtCode, "1001");
  assert.equal(alert.id, "alert-incident-1");
  assert.equal(alert.severity, "warning");
  assert.equal(alert.category, "medical");
  assert.equal(alert.actionUrl, "/admin/dashboard");
});

test("parseIncidentStatusUpdatedPayload validates the realtime status contract", () => {
  assert.deepEqual(
    parseIncidentStatusUpdatedPayload(JSON.stringify({
      id: "incident-1",
      category: "medical",
      fromStatus: "reported",
      status: "acknowledged",
      statusVersion: 1,
      note: null,
      updatedAt: "2026-06-19T05:00:00.000Z",
    })),
    {
      id: "incident-1",
      category: "medical",
      fromStatus: "reported",
      status: "acknowledged",
      statusVersion: 1,
      note: null,
      updatedAt: "2026-06-19T05:00:00.000Z",
    }
  );

  assert.throws(
    () => parseIncidentStatusUpdatedPayload('{"id":"incident-1"}'),
    /Invalid incident status event/
  );
});
