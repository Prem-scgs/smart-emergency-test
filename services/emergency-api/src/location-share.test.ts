import test from "node:test";
import assert from "node:assert/strict";

import {
  buildIncidentLocationShareMessage,
  buildLocationMapsUrl,
  buildLocationShareUrl,
  getShareChannelAvailability,
} from "./location-share.js";

const incident = {
  caseNumber: "SE-260704-0007",
  category: "medical",
  province: "กรุงเทพมหานคร",
  district: "ปทุมวัน",
  latitude: 13.7478,
  longitude: 100.5351,
  createdAt: "2026-06-21T03:42:00.000Z",
};

test("builds one authoritative Thai location message without reporter phone by default", () => {
  const message = buildIncidentLocationShareMessage(incident);

  assert.match(message, /หมายเลขเหตุ: SE-260704-0007/);
  assert.match(message, /ประเภทเหตุ: แพทย์/);
  assert.match(message, /พื้นที่: ปทุมวัน, กรุงเทพมหานคร/);
  assert.match(message, /พิกัด: 13\.747800, 100\.535100/);
  assert.match(message, /https:\/\/maps\.google\.com\/\?q=13\.747800,100\.535100/);
  assert.doesNotMatch(message, /เบอร์ผู้แจ้ง/);
});

test("includes a validated reporter phone only when supplied", () => {
  const message = buildIncidentLocationShareMessage({
    ...incident,
    reporterPhone: "0812345678",
  });

  assert.match(message, /เบอร์ผู้แจ้ง: 0812345678/);
});

test("builds fixed-recipient URLs for LINE, SMS on both platforms, and WhatsApp", () => {
  const message = "ตำแหน่งฉุกเฉิน";

  assert.equal(
    buildLocationShareUrl("line", "@smartemergency", message, "desktop" as never),
    "line://oaMessage/@smartemergency/"
  );
  assert.match(
    buildLocationShareUrl("line", "@smartemergency", message, "android"),
    /^https:\/\/line\.me\/R\/oaMessage\/%40smartemergency\//
  );
  assert.match(
    buildLocationShareUrl("sms", "0812345678", message, "ios"),
    /^sms:0812345678&body=/
  );
  assert.match(
    buildLocationShareUrl("sms", "0812345678", message, "android"),
    /^sms:0812345678\?body=/
  );
  assert.match(
    buildLocationShareUrl("whatsapp", "66812345678", message, "android"),
    /^https:\/\/wa\.me\/66812345678\?text=/
  );
});

test("reports channel availability without exposing recipients", () => {
  assert.deepEqual(
    getShareChannelAvailability({
      lineOaId: "@smartemergency",
      smsCenterPhone: null,
      whatsappCenterPhone: "66812345678",
    }),
    {
      line: { enabled: true },
      sms: { enabled: false },
      whatsapp: { enabled: true },
    }
  );
});

test("builds a stable Google Maps pin from the incident snapshot", () => {
  assert.equal(
    buildLocationMapsUrl(incident),
    "https://maps.google.com/?q=13.747800,100.535100"
  );
});
