import { buildAdminApiHeaders, buildAdminApiUrl } from '../../../shared/api/admin-api.ts'
import { getAdminStatusChoices, requiresStatusReason } from '../../../lib/admin-status-controls.ts'
import type { AdminLanguage } from '../../../lib/admin-i18n.tsx'
import {
  getIncidentTrackingStatusMeta,
  type IncidentTrackingHistoryEntry,
  type IncidentWorkflowStatus,
} from '../../../lib/incident-tracking.ts'
import type { AdminUser } from '../../../lib/types.ts'

const INCIDENT_DETAIL_WORKFLOW_STATUSES = new Set<IncidentWorkflowStatus>([
  'reported',
  'acknowledged',
  'coordinating',
  'dispatched',
  'on_scene',
  'closed',
])

export interface IncidentDetailTrackingIncident {
  id: string
  caseNumber?: string | null
  category: string
  status: string
  statusVersion: number
  description?: string | null
  dialedPhone?: string | null
  agencyName?: string | null
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
  latitude: number
  longitude: number
  updatedAt: string
}

export interface IncidentDetailTrackingResponse {
  incident: IncidentDetailTrackingIncident
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

interface LocationDisplayItem {
  name: string
  nameTh?: string | null
  nameEn?: string | null
}

function getIncidentDetailLocationDisplayName(
  item: LocationDisplayItem | null | undefined,
  preferThai: boolean
) {
  if (!item) return ''
  return preferThai
    ? item.nameTh ?? item.nameEn ?? item.name
    : item.nameEn ?? item.nameTh ?? item.name
}

export function isIncidentDetailWorkflowStatus(status: string): status is IncidentWorkflowStatus {
  return INCIDENT_DETAIL_WORKFLOW_STATUSES.has(status as IncidentWorkflowStatus)
}

export function getIncidentDetailStatusLabel(status: IncidentWorkflowStatus, language: AdminLanguage) {
  const meta = getIncidentTrackingStatusMeta(status)
  return language === 'en' ? meta.label : meta.labelTh
}

export function getIncidentDetailDisplayNumber(incident: Pick<IncidentDetailTrackingIncident, 'id' | 'caseNumber'>) {
  return incident.caseNumber ?? incident.id.slice(0, 8)
}

export function getIncidentDetailLocationText({
  incident,
  provinceByCode,
  districtByCode,
  preferThai,
  fallback,
}: {
  incident: Pick<
    IncidentDetailTrackingIncident,
    'provinceCode' | 'province' | 'districtCode' | 'district'
  >
  provinceByCode: Record<string, LocationDisplayItem | undefined>
  districtByCode: Record<string, LocationDisplayItem | undefined>
  preferThai: boolean
  fallback: string
}) {
  const provinceFromMaster = incident.provinceCode
    ? getIncidentDetailLocationDisplayName(provinceByCode[incident.provinceCode], preferThai)
    : ''
  const districtFromMaster = incident.districtCode
    ? getIncidentDetailLocationDisplayName(districtByCode[incident.districtCode], preferThai)
    : ''
  const province = provinceFromMaster || incident.province
  const district = districtFromMaster || incident.district

  return [district, province].filter(Boolean).join(' ') || fallback
}

export function getIncidentDetailStatusChoices(
  role: 'super_admin' | 'agency_admin' | 'viewer' | null | undefined,
  currentStatus: string | null | undefined
) {
  if (!role || !currentStatus || !isIncidentDetailWorkflowStatus(currentStatus)) return []
  // viewer เปิดดูรายละเอียดได้ แต่ไม่มีสิทธิ์เปลี่ยน workflow/status
  if (role === 'viewer') return []
  return getAdminStatusChoices(role, currentStatus)
}

export function isIncidentDetailBackwardTransition(
  currentStatus: string | null | undefined,
  targetStatus: IncidentWorkflowStatus | null | undefined
) {
  return (
    currentStatus != null &&
    isIncidentDetailWorkflowStatus(currentStatus) &&
    targetStatus != null &&
    requiresStatusReason(currentStatus, targetStatus)
  )
}

export function shouldShowIncidentCloseWarning(
  targetStatus: IncidentWorkflowStatus | null | undefined,
  note: string
) {
  return targetStatus === 'closed' && note.trim().length === 0
}

export function buildIncidentDetailTrackingUrl(
  apiBaseUrl: string,
  incidentId: string,
  user: AdminUser | null
) {
  return buildAdminApiUrl(apiBaseUrl, `/api/incidents/${incidentId}/tracking`, user)
}

export function buildIncidentStatusUpdateBody(
  incident: Pick<IncidentDetailTrackingIncident, 'status' | 'statusVersion'>,
  toStatus: IncidentWorkflowStatus,
  note: string
) {
  return {
    fromStatus: incident.status,
    toStatus,
    expectedVersion: incident.statusVersion,
    note: note.trim() || null,
  }
}

export function buildIncidentStatusUpdateRequest({
  apiBaseUrl,
  incident,
  toStatus,
  note,
  user,
}: {
  apiBaseUrl: string
  incident: Pick<IncidentDetailTrackingIncident, 'id' | 'status' | 'statusVersion'>
  toStatus: IncidentWorkflowStatus
  note: string
  user: AdminUser | null
}) {
  return {
    url: `${apiBaseUrl}/api/incidents/${incident.id}/status`,
    init: {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...buildAdminApiHeaders(user),
      },
      body: JSON.stringify(buildIncidentStatusUpdateBody(incident, toStatus, note)),
    } satisfies RequestInit,
  }
}

export function getIncidentStatusUpdateError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof (payload as { error?: unknown }).error === 'string'
  ) {
    return (payload as { error: string }).error
  }

  return fallback
}
