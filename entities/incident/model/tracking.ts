/**
 * Workflow status ของ incident tracking
 *
 * Order นี้เป็น contract ร่วมของ mobile tracking, admin detail panel, status controls
 * และ backend status history ถ้าแก้ต้องทดสอบ next status, backward transition และ SSE.
 */
export type IncidentWorkflowStatus =
  | 'reported'
  | 'acknowledged'
  | 'coordinating'
  | 'dispatched'
  | 'on_scene'
  | 'closed'

export interface IncidentTrackingHistoryEntry {
  toStatus: IncidentWorkflowStatus
  createdAt: string | Date
  note?: string | null
}

export interface IncidentTrackingStatusMeta {
  label: string
  labelTh: string
  description: string
  descriptionEn: string
}

export interface IncidentTrackingStep extends IncidentTrackingStatusMeta {
  status: IncidentWorkflowStatus
  timestamp?: Date
  isActive: boolean
  isCompleted: boolean
}

export const INCIDENT_TRACKING_STATUS_ORDER: IncidentWorkflowStatus[] = [
  'reported',
  'acknowledged',
  'coordinating',
  'dispatched',
  'on_scene',
  'closed',
]

const STATUS_META: Record<IncidentWorkflowStatus, IncidentTrackingStatusMeta> = {
  reported: {
    label: 'Reported',
    labelTh: 'แจ้งเหตุแล้ว',
    description: 'ระบบบันทึกเหตุและกำลังรอหน่วยงานรับเรื่อง',
    descriptionEn: 'The incident has been recorded and is waiting for an agency response',
  },
  acknowledged: {
    label: 'Acknowledged',
    labelTh: 'รับเรื่องแล้ว',
    description: 'หน่วยงานรับทราบเหตุและกำลังตรวจสอบข้อมูล',
    descriptionEn: 'The agency has acknowledged the incident and is reviewing the details',
  },
  coordinating: {
    label: 'Coordinating',
    labelTh: 'กำลังประสานงาน',
    description: 'ศูนย์กำลังประสานทีมและเตรียมการช่วยเหลือ',
    descriptionEn: 'The center is coordinating teams and preparing assistance',
  },
  dispatched: {
    label: 'Dispatched',
    labelTh: 'ส่งเจ้าหน้าที่แล้ว',
    description: 'เจ้าหน้าที่ถูกส่งออกจากศูนย์และกำลังเข้าพื้นที่',
    descriptionEn: 'Responders have been dispatched and are heading to the area',
  },
  on_scene: {
    label: 'On Scene',
    labelTh: 'ถึงที่เกิดเหตุ',
    description: 'เจ้าหน้าที่อยู่หน้างานและกำลังดำเนินการ',
    descriptionEn: 'Responders are on scene and handling the incident',
  },
  closed: {
    label: 'Closed',
    labelTh: 'ปิดเหตุ',
    description: 'เคสนี้ปิดเรียบร้อยแล้ว',
    descriptionEn: 'This case has been closed',
  },
}

const WORKFLOW_STATUSES = new Set<IncidentWorkflowStatus>(INCIDENT_TRACKING_STATUS_ORDER)

export function isIncidentWorkflowStatus(value: unknown): value is IncidentWorkflowStatus {
  return typeof value === 'string' && WORKFLOW_STATUSES.has(value as IncidentWorkflowStatus)
}

export function getIncidentTrackingStatusMeta(
  status: IncidentWorkflowStatus
): IncidentTrackingStatusMeta {
  return STATUS_META[status]
}

export function buildIncidentTrackingSteps(
  currentStatus: IncidentWorkflowStatus,
  history: IncidentTrackingHistoryEntry[] = []
): IncidentTrackingStep[] {
  const activeIndex = INCIDENT_TRACKING_STATUS_ORDER.indexOf(currentStatus)
  const historyTimestampByStatus = new Map<IncidentWorkflowStatus, Date>()

  for (const item of history) {
    if (!historyTimestampByStatus.has(item.toStatus)) {
      historyTimestampByStatus.set(item.toStatus, new Date(item.createdAt))
    }
  }

  return INCIDENT_TRACKING_STATUS_ORDER.map((status, index) => ({
    status,
    ...STATUS_META[status],
    timestamp: historyTimestampByStatus.get(status),
    isActive: index === activeIndex,
    isCompleted: index < activeIndex,
  }))
}

export function getIncidentTrackingProgressPercent(
  currentStatus: IncidentWorkflowStatus
): number {
  const index = INCIDENT_TRACKING_STATUS_ORDER.indexOf(currentStatus)
  if (index === -1) return 0

  return Math.round(((index + 1) / INCIDENT_TRACKING_STATUS_ORDER.length) * 100)
}

export function getNextIncidentTrackingStatus(
  currentStatus: IncidentWorkflowStatus
): IncidentWorkflowStatus | null {
  const currentIndex = INCIDENT_TRACKING_STATUS_ORDER.indexOf(currentStatus)
  return INCIDENT_TRACKING_STATUS_ORDER[currentIndex + 1] ?? null
}
