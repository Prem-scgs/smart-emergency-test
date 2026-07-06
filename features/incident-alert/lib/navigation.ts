export const OPEN_INCIDENT_DETAIL_EVENT = 'smart-emergency:open-incident-detail'
export const PENDING_INCIDENT_DETAIL_KEY = 'smart-emergency:pending-incident-detail'

export function openIncidentDetailFromAlert(incidentId: string) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(OPEN_INCIDENT_DETAIL_EVENT, {
      detail: { incidentId },
    })
  )

  if (!window.location.pathname.startsWith('/admin/dashboard')) {
    window.sessionStorage.setItem(PENDING_INCIDENT_DETAIL_KEY, incidentId)
    window.location.href = '/admin/dashboard'
  }
}
