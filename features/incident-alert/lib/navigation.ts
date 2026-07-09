export const OPEN_INCIDENT_DETAIL_EVENT = 'smart-emergency:open-incident-detail'
export const PENDING_INCIDENT_DETAIL_KEY = 'smart-emergency:pending-incident-detail'

/**
 * เปิด detail panel จาก alert popup/notification
 *
 * ถ้า user อยู่หน้า dashboard อยู่แล้วจะ dispatch custom event ให้ widget เปิด panel ทันที
 * ถ้าอยู่หน้าอื่นจะฝาก incidentId ไว้ใน sessionStorage แล้ว redirect กลับ dashboard
 */
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
