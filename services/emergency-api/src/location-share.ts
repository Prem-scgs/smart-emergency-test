export type LocationShareChannel = "line" | "sms" | "whatsapp";
export type MobilePlatform = "ios" | "android" | "desktop";

export type ShareChannelRecipients = {
  lineOaId: string | null;
  smsCenterPhone: string | null;
  whatsappCenterPhone: string | null;
};

type IncidentLocationShareInput = {
  id: string;
  caseNumber?: string | null;
  category: string;
  province?: string | null;
  district?: string | null;
  latitude: number;
  longitude: number;
  createdAt: string | Date;
  reporterPhone?: string | null;
};

const categoryLabels: Record<string, string> = {
  police: "ตำรวจ",
  medical: "แพทย์",
  fire: "ดับเพลิง",
  rescue: "กู้ภัย",
  flood: "น้ำท่วม",
  "road-accident": "อุบัติเหตุทางถนน",
};

export function buildLocationMapsUrl(
  location: Pick<IncidentLocationShareInput, "latitude" | "longitude">
) {
  return `https://maps.google.com/?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
}

function formatIncidentCreatedAt(value: string | Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

/**
 * สร้างข้อความแชร์ตำแหน่งเหตุจากข้อมูล incident snapshot
 *
 * จุดสำคัญ:
 * - ใช้ caseNumber ก่อน UUID เพื่อให้ปลายทางอ่านง่าย
 * - ใช้พิกัดจาก incident ที่ backend ยืนยันแล้ว ไม่รับข้อความสำเร็จรูปจาก client
 * - reporterPhone เป็น optional และต้องผ่าน validation จาก endpoint ก่อนเข้าถึง helper นี้
 */
export function buildIncidentLocationShareMessage(input: IncidentLocationShareInput) {
  const area = [input.district, input.province].filter(Boolean).join(", ");
  const displayCaseNumber = input.caseNumber ?? input.id.slice(0, 8);
  const lines = [
    "ตำแหน่งเหตุฉุกเฉิน",
    `หมายเลขเหตุ: ${displayCaseNumber}`,
    `ประเภทเหตุ: ${categoryLabels[input.category] ?? input.category}`,
    `เวลาแจ้ง: ${formatIncidentCreatedAt(input.createdAt)}`,
    area ? `พื้นที่: ${area}` : null,
    `พิกัด: ${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`,
    input.reporterPhone ? `เบอร์ผู้แจ้ง: ${input.reporterPhone}` : null,
    buildLocationMapsUrl(input),
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

/**
 * สร้าง deep link ของแต่ละช่องทางแชร์
 *
 * LINE/SMS/WhatsApp มี URL format ไม่เหมือนกัน โดยเฉพาะ SMS บน iOS ที่ใช้ separator ต่างจาก Android
 * ถ้าแก้ตรงนี้ต้องทดสอบทั้ง mobile browser และ desktop fallback
 */
export function buildLocationShareUrl(
  channel: LocationShareChannel,
  recipient: string,
  message: string,
  platform: MobilePlatform
) {
  if (channel === "line") {
    if (platform === "desktop") {
      return `line://oaMessage/${recipient}/`;
    }
    return `https://line.me/R/oaMessage/${encodeURIComponent(recipient)}/?${encodeURIComponent(message)}`;
  }

  if (channel === "whatsapp") {
    return `https://wa.me/${recipient}?${new URLSearchParams({ text: message }).toString()}`;
  }

  const separator = platform === "ios" ? "&" : "?";
  return `sms:${recipient}${separator}${new URLSearchParams({ body: message }).toString()}`;
}

export function getShareChannelRecipient(
  recipients: ShareChannelRecipients,
  channel: LocationShareChannel
) {
  if (channel === "line") return recipients.lineOaId;
  if (channel === "sms") return recipients.smsCenterPhone;
  return recipients.whatsappCenterPhone;
}

export function getShareChannelAvailability(recipients: ShareChannelRecipients) {
  return {
    line: { enabled: Boolean(recipients.lineOaId) },
    sms: { enabled: Boolean(recipients.smsCenterPhone) },
    whatsapp: { enabled: Boolean(recipients.whatsappCenterPhone) },
  };
}
