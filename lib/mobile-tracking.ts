import type {
  IncidentTrackingHistoryEntry,
  IncidentWorkflowStatus,
} from './incident-tracking'

const WORKFLOW_STATUSES = new Set<IncidentWorkflowStatus>([
  'reported',
  'acknowledged',
  'coordinating',
  'dispatched',
  'on_scene',
  'closed',
])

export interface MobileTrackingIncident {
  id: string
  category: string
  status: string
  statusVersion: number
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
  latitude: number
  longitude: number
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
  const url = new URL(
    `/api/incidents/${encodeURIComponent(incidentId)}/${resource}`,
    baseUrl
  )
  url.searchParams.set('sessionId', sessionId)
  return url.toString()
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

export function isMobileIncidentWorkflowStatus(
  value: unknown
): value is IncidentWorkflowStatus {
  return typeof value === 'string' && WORKFLOW_STATUSES.has(value as IncidentWorkflowStatus)
}
