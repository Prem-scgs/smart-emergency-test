import type { AdminLanguage } from '@/shared/i18n/admin'
import type { IncidentEventPayload } from '@/shared/realtime/incident-events'
import type { Alert, Notification } from '../model/types.ts'

function categoryLabel(category: string, language: AdminLanguage) {
  const labels: Record<AdminLanguage, Record<string, string>> = {
    th: {
      police: 'ตำรวจ',
      medical: 'แพทย์',
      fire: 'ดับเพลิง',
      rescue: 'กู้ภัย',
      flood: 'น้ำท่วม',
      'road-accident': 'อุบัติเหตุทางถนน',
    },
    en: {
      police: 'Police',
      medical: 'Medical',
      fire: 'Fire',
      rescue: 'Rescue',
      flood: 'Flood',
      'road-accident': 'Road accident',
    },
  }

  return labels[language][category] ?? category
}

function severityLabel(severity: string, language: AdminLanguage) {
  const labels: Record<AdminLanguage, Record<string, string>> = {
    th: {
      critical: 'วิกฤต',
      high: 'สูง',
      medium: 'ปานกลาง',
      low: 'ต่ำ',
    },
    en: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
  }

  return labels[language][severity] ?? severity
}

function statusLabel(status: string, language: AdminLanguage) {
  const labels: Record<AdminLanguage, Record<string, string>> = {
    th: {
      open: 'เปิดอยู่',
      reported: 'แจ้งเหตุแล้ว',
      acknowledged: 'รับเรื่องแล้ว',
      coordinating: 'กำลังประสานงาน',
      dispatched: 'ส่งเจ้าหน้าที่แล้ว',
      on_scene: 'ถึงที่เกิดเหตุ',
      closed: 'ปิดเรื่องแล้ว',
    },
    en: {
      open: 'Open',
      reported: 'Reported',
      acknowledged: 'Acknowledged',
      coordinating: 'Coordinating',
      dispatched: 'Dispatched',
      on_scene: 'On scene',
      closed: 'Closed',
    },
  }

  return labels[language][status] ?? status
}

function buildAreaText(payload: IncidentEventPayload, language: AdminLanguage) {
  if (payload.areaName) return payload.areaName
  if (payload.district && payload.province) return `${payload.district} ${payload.province}`
  return payload.province ?? (language === 'en' ? 'Area not specified' : 'ไม่ระบุพื้นที่')
}

export function getAlertSeverityForIncident(
  severity: IncidentEventPayload['severity']
): Alert['severity'] {
  if (severity === 'critical') return 'critical'
  if (severity === 'high') return 'warning'
  return 'info'
}

export function buildRealtimeIncidentArtifacts(
  payload: IncidentEventPayload,
  language: AdminLanguage = 'th',
  areaTextOverride?: string | null
): {
  notification: Notification
  alert: Alert
} {
  const timestamp = new Date(payload.createdAt)
  const agencyId = payload.category
  const areaText = areaTextOverride || buildAreaText(payload, language)
  const categoryText = categoryLabel(payload.category, language)
  const severityText = severityLabel(payload.severity, language)
  const statusText = statusLabel(payload.status, language)
  const alertSeverity = getAlertSeverityForIncident(payload.severity)
  const caseNumber = payload.caseNumber ?? payload.id.slice(0, 8)
  const copy = {
    notificationTitle: language === 'en' ? 'New incident received' : 'มีเหตุใหม่เข้าระบบ',
    criticalTitle: language === 'en' ? 'New critical incident' : 'เหตุวิกฤตใหม่',
    warningTitle: language === 'en' ? 'New urgent incident' : 'มีเหตุเร่งด่วนใหม่',
    infoTitle: language === 'en' ? 'New incident reported' : 'มีเหตุแจ้งเข้าใหม่',
    inArea: language === 'en' ? 'in' : 'ในพื้นที่',
    severityLabel: language === 'en' ? 'Severity' : 'ระดับความรุนแรง',
    statusLabel: language === 'en' ? 'Status' : 'สถานะ',
    viewDetails: language === 'en' ? 'View details' : 'ดูรายละเอียด',
  }

  const notification: Notification = {
    id: `incident-${payload.id}`,
    type: 'new-incident',
    title: copy.notificationTitle,
    message: `${categoryText} - ${areaText}`,
    agencyId,
    category: payload.category as Notification['category'],
    incidentId: payload.id,
    caseNumber: payload.caseNumber,
    provinceCode: payload.provinceCode ?? undefined,
    districtCode: payload.districtCode ?? undefined,
    province: payload.province ?? undefined,
    district: payload.district ?? undefined,
    read: false,
    timestamp,
    actionUrl: '/admin/dashboard',
  }

  const alert: Alert = {
    id: `alert-${payload.id}`,
    severity: alertSeverity,
    title:
      alertSeverity === 'critical'
        ? copy.criticalTitle
        : alertSeverity === 'warning'
          ? copy.warningTitle
          : copy.infoTitle,
    message: `${categoryText} ${copy.inArea} ${areaText}`,
    description: `${language === 'en' ? 'Case' : 'หมายเลขเหตุ'} ${caseNumber} ${copy.severityLabel} ${severityText} ${copy.statusLabel} ${statusText}`,
    agencyId,
    category: payload.category as Alert['category'],
    incidentId: payload.id,
    caseNumber: payload.caseNumber,
    timestamp,
    dismissible: true,
    actionLabel: copy.viewDetails,
    actionUrl: '/admin/dashboard',
  }

  return { notification, alert }
}
