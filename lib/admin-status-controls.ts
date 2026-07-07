import {
  INCIDENT_TRACKING_STATUS_ORDER,
  type IncidentWorkflowStatus,
} from '../entities/incident/model/tracking.ts'

export type StatusAdminRole = 'agency_admin' | 'super_admin'

export function getAdminStatusChoices(
  role: StatusAdminRole,
  currentStatus: IncidentWorkflowStatus
): IncidentWorkflowStatus[] {
  const currentIndex = INCIDENT_TRACKING_STATUS_ORDER.indexOf(currentStatus)

  if (role === 'agency_admin') {
    return INCIDENT_TRACKING_STATUS_ORDER.slice(currentIndex + 1, currentIndex + 2)
  }

  return [
    ...INCIDENT_TRACKING_STATUS_ORDER.slice(currentIndex + 1),
    ...INCIDENT_TRACKING_STATUS_ORDER.slice(0, currentIndex),
  ]
}

export function requiresStatusReason(
  fromStatus: IncidentWorkflowStatus,
  toStatus: IncidentWorkflowStatus
): boolean {
  return (
    INCIDENT_TRACKING_STATUS_ORDER.indexOf(toStatus) <
    INCIDENT_TRACKING_STATUS_ORDER.indexOf(fromStatus)
  )
}
