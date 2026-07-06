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

export function buildMobileTrackingUrl(
  baseUrl: string,
  incidentId: string,
  sessionId: string
) {
  return buildIncidentUrl(baseUrl, incidentId, 'tracking', sessionId)
}

export function buildMobileIncidentEventsUrl(
  baseUrl: string,
  incidentId: string,
  sessionId: string
) {
  return buildIncidentUrl(baseUrl, incidentId, 'events', sessionId)
}

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
