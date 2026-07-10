import type { CallStatus } from "@/entities/call"
import type { ApiIncident } from "../model/types"

/**
 * Formatting helper ของ call logs
 *
 * แปลง incident จาก API เป็นค่าแสดงผล/CSV โดยไม่เปลี่ยน raw data ถ้าแก้ fallback
 * ต้องทดสอบ call status, location label และ export CSV/PDF.
 */
export function getCallStatus(incident: ApiIncident): CallStatus {
  if (incident.callStatus) return incident.callStatus
  if (incident.status === "closed") return "connected"
  if (incident.status === "acknowledged") return "connected"
  return "no-answer"
}

export function getLocation(incident: ApiIncident) {
  const parts = [incident.district, incident.province].filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  return `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
}

export function formatDate(date: string, language: "th" | "en") {
  return new Date(date).toLocaleDateString(language === "en" ? "en-US" : "th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatTime(date: string, language: "th" | "en") {
  return new Date(date).toLocaleTimeString(language === "en" ? "en-US" : "th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function escapeCsvCell(value: string | number) {
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return '"' + text.replaceAll('"', '""') + '"'
}
