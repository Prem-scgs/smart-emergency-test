import type {
  IncidentTrackingHistoryEntry,
  IncidentWorkflowStatus,
} from '../../entities/incident/model/tracking.ts'
import { isIncidentWorkflowStatus } from '../../entities/incident/model/tracking.ts'
import { getIncidentDisplayNumber } from '../../entities/incident/lib/display.ts'

export interface MobileTrackingIncident {
  id: string
  caseNumber?: string | null
  category: string
  status: string
  statusVersion: number
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
}

export interface MobileTrackingResponse {
  incident: MobileTrackingIncident
  statusHistory: IncidentTrackingHistoryEntry[]
  latestLocation: {
    latitude: number
    longitude: number
    accuracy?: number | null
    source: string
    createdAt: string
  } | null
  locationHistory: unknown[]
}

function buildIncidentUrl(
  baseUrl: string,
  incidentId: string,
  resource: 'tracking' | 'events',
  sessionId: string
) {
  const base = baseUrl.replace(/\/$/, '')
  const query = new URLSearchParams({ sessionId })
  return `${base}/api/incidents/${encodeURIComponent(incidentId)}/${resource}?${query.toString()}`
}

/**
 * URL สำหรับ mobile tracking ที่ต้องแนบ sessionId เสมอ
 *
 * Backend ใช้ sessionId เป็น guard ว่าเครื่องนี้เป็นผู้สร้าง/ติดตาม incident นั้นจริง
 * ถ้าเรียก endpoint โดยไม่ส่ง sessionId จะทำให้ history/tracking ข้ามเครื่องกันได้ง่ายเกินไป
 */
export function buildMobileTrackingUrl(
  baseUrl: string,
  incidentId: string,
  sessionId: string
) {
  return buildIncidentUrl(baseUrl, incidentId, 'tracking', sessionId)
}

/**
 * URL สำหรับ SSE เฉพาะ incident ของ mobile user
 *
 * ใช้ resource เดียวกับ tracking flow แต่เป็น event stream เพื่อให้หน้า tracking refresh
 * เมื่อ admin อัปเดตสถานะ โดยยังไม่ต้องเปิด WebSocket เพิ่ม
 */
export function buildMobileIncidentEventsUrl(
  baseUrl: string,
  incidentId: string,
  sessionId: string
) {
  return buildIncidentUrl(baseUrl, incidentId, 'events', sessionId)
}

/**
 * แสดงเลขเคสบน mobile ด้วย caseNumber ก่อน UUID
 *
 * ให้ user ใช้เลขเคสคุยกับเจ้าหน้าที่ได้ ส่วน UUID เก็บไว้เป็น id สำหรับ API ภายใน
 */
export function getMobileIncidentDisplayNumber(
  incident: Pick<MobileTrackingIncident, 'id'> & { caseNumber?: string | null }
) {
  return getIncidentDisplayNumber(incident)
}

export function isMobileIncidentWorkflowStatus(
  value: unknown
): value is IncidentWorkflowStatus {
  return isIncidentWorkflowStatus(value)
}
