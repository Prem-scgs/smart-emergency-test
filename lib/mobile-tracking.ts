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
  caseNumber: string
  trackingToken: string
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
  caseNumber: string,
  resource: 'tracking' | 'events',
  trackingToken: string
) {
  const base = baseUrl.replace(/\/$/, '')
  const query = new URLSearchParams({ token: trackingToken })
  return `${base}/api/incidents/${encodeURIComponent(caseNumber)}/${resource}?${query.toString()}`
}

export function buildMobileTrackingUrl(
  baseUrl: string,
  caseNumber: string,
  trackingToken: string
) {
  return buildIncidentUrl(baseUrl, caseNumber, 'tracking', trackingToken)
}

export function buildMobileIncidentEventsUrl(
  baseUrl: string,
  caseNumber: string,
  trackingToken: string
) {
  return buildIncidentUrl(baseUrl, caseNumber, 'events', trackingToken)
}

export function isMobileIncidentWorkflowStatus(
  value: unknown
): value is IncidentWorkflowStatus {
  return typeof value === 'string' && WORKFLOW_STATUSES.has(value as IncidentWorkflowStatus)
}
