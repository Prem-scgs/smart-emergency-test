/**
 * Severity color mapping ของ incident marker/area summary
 *
 * ใช้ให้ GIS map แสดงสีความรุนแรงชุดเดียวกันทุกจุด และ fallback เป็น slate
 * เมื่อ backend ส่ง severity ที่ไม่รู้จัก.
 */
const INCIDENT_SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

export function getAreaIncidentSeverityColor(severity: string) {
  return INCIDENT_SEVERITY_COLORS[severity] ?? '#64748b'
}
