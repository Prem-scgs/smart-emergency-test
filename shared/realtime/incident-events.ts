export interface IncidentEventPayload {
  id: string
  caseNumber?: string | null
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  areaName?: string | null
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
  createdAt: string
}

export interface RecentIncidentsPayload {
  cursor: string
  created: IncidentEventPayload[]
  statusUpdated: Array<{
    id: string
    category: string
    status: string
    statusVersion: number
    updatedAt: string
  }>
}

export interface IncidentStatusUpdatedPayload {
  id: string
  category: string
  fromStatus: string
  status: string
  statusVersion: number
  note: string | null
  updatedAt: string
}

export type SseDebugStatus = 'connecting' | 'connected' | 'disconnected'

export const POLLING_FALLBACK_INTERVAL_MS = 3000

export function buildRealtimeApiUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, '')

  if (/^https?:\/\//i.test(base)) {
    return new URL(path, base).toString()
  }

  return `${base}${path}`
}

export function isIncidentEventPayload(payload: unknown): payload is IncidentEventPayload {
  if (!payload || typeof payload !== 'object') return false

  const incident = payload as Partial<IncidentEventPayload>
  return (
    typeof incident.id === 'string' &&
    typeof incident.category === 'string' &&
    typeof incident.severity === 'string' &&
    typeof incident.status === 'string' &&
    typeof incident.createdAt === 'string'
  )
}

export function isRecentIncidentsPayload(payload: unknown): payload is RecentIncidentsPayload {
  if (!payload || typeof payload !== 'object') return false

  const recent = payload as Partial<RecentIncidentsPayload>
  return (
    typeof recent.cursor === 'string' &&
    Array.isArray(recent.created) &&
    Array.isArray(recent.statusUpdated)
  )
}

export function parseIncidentStatusUpdatedPayload(data: string): IncidentStatusUpdatedPayload {
  const payload = JSON.parse(data) as Partial<IncidentStatusUpdatedPayload>

  if (
    typeof payload.id !== 'string' ||
    typeof payload.category !== 'string' ||
    typeof payload.fromStatus !== 'string' ||
    typeof payload.status !== 'string' ||
    typeof payload.statusVersion !== 'number' ||
    typeof payload.updatedAt !== 'string' ||
    (payload.note !== null && typeof payload.note !== 'string')
  ) {
    throw new Error('Invalid incident status event')
  }

  return payload as IncidentStatusUpdatedPayload
}
