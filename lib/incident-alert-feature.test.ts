/**
 * ???? artifact/visibility ??? incident-alert feature ???????? viewer passive ??? agency category scope.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRealtimeIncidentArtifacts,
} from '../features/incident-alert/lib/artifacts.ts'
import {
  canUserSeeAlert,
  canUserSeeNotification,
  shouldCreateActionableAlert,
} from '../features/incident-alert/lib/visibility.ts'
import type {
  Alert,
  Notification,
} from '../features/incident-alert/model/types.ts'
import type { AdminUser } from '../shared/auth/index.ts'
import type { IncidentEventPayload } from '../shared/realtime/incident-events.ts'

const medicalAgency = {
  id: 'agency-medical',
  name: 'Emergency Medical Services',
  nameTh: 'แพทย์ฉุกเฉิน',
  category: 'medical' as const,
  description: 'EMS',
  icon: 'Heart',
  color: 'text-red-600',
}

const superAdminUser: AdminUser = {
  id: 'super-1',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'super_admin',
  permissions: ['dashboard.view'],
  lastLogin: new Date('2026-07-06T08:00:00.000Z'),
}

const agencyAdminUser: AdminUser = {
  ...superAdminUser,
  id: 'agency-1',
  role: 'agency_admin',
  agencyId: medicalAgency.id,
  agency: medicalAgency,
}

const viewerUser: AdminUser = {
  ...agencyAdminUser,
  id: 'viewer-1',
  role: 'viewer',
}

const payload: IncidentEventPayload = {
  id: 'b863c8a0-83c9-4761-b97e-66e8842b74b7',
  caseNumber: 'EMS-20260706-0001',
  category: 'medical',
  severity: 'high',
  status: 'reported',
  provinceCode: '65',
  province: 'Phitsanulok',
  districtCode: '6501',
  district: 'Mueang Phitsanulok',
  createdAt: '2026-07-06T08:12:00.000Z',
}

test('incident alert feature builds localized realtime artifacts with case number and detail action', () => {
  const { notification, alert } = buildRealtimeIncidentArtifacts(
    payload,
    'th',
    'เมืองพิษณุโลก พิษณุโลก'
  )

  assert.equal(notification.id, `incident-${payload.id}`)
  assert.equal(notification.title, 'มีเหตุใหม่เข้าระบบ')
  assert.equal(notification.message, 'แพทย์ - เมืองพิษณุโลก พิษณุโลก')
  assert.equal(notification.incidentId, payload.id)
  assert.equal(notification.caseNumber, 'EMS-20260706-0001')
  assert.equal(notification.actionUrl, '/admin/dashboard')

  assert.equal(alert.id, `alert-${payload.id}`)
  assert.equal(alert.severity, 'warning')
  assert.equal(alert.title, 'มีเหตุเร่งด่วนใหม่')
  assert.equal(alert.message, 'แพทย์ ในพื้นที่ เมืองพิษณุโลก พิษณุโลก')
  assert.match(alert.description ?? '', /หมายเลขเหตุ EMS-20260706-0001/)
  assert.match(alert.description ?? '', /สถานะ แจ้งเหตุแล้ว/)
  assert.equal(alert.incidentId, payload.id)
  assert.equal(alert.actionLabel, 'ดูรายละเอียด')
})

test('incident alert feature supports English copy and case number fallback', () => {
  const { alert } = buildRealtimeIncidentArtifacts(
    { ...payload, caseNumber: null, severity: 'critical', status: 'acknowledged' },
    'en',
    'Mueang Phitsanulok Phitsanulok'
  )

  assert.equal(alert.severity, 'critical')
  assert.equal(alert.title, 'New critical incident')
  assert.match(alert.description ?? '', /Case b863c8a0/)
  assert.match(alert.description ?? '', /Severity Critical Status Acknowledged/)
})

test('incident alert feature keeps viewer realtime updates passive', () => {
  assert.equal(shouldCreateActionableAlert(superAdminUser), true)
  assert.equal(shouldCreateActionableAlert(agencyAdminUser), true)
  assert.equal(shouldCreateActionableAlert(viewerUser), false)
  assert.equal(shouldCreateActionableAlert(null), true)
})

test('incident alert visibility respects category scope and hides viewer actionable items', () => {
  const notification: Notification = {
    id: 'notif-1',
    type: 'new-incident',
    title: 'New incident',
    message: 'Medical - Phitsanulok',
    agencyId: 'medical',
    category: 'medical',
    read: false,
    timestamp: new Date('2026-07-06T08:12:00.000Z'),
  }
  const fireAlert: Alert = {
    id: 'alert-fire',
    severity: 'warning',
    title: 'New urgent incident',
    message: 'Fire in Phitsanulok',
    agencyId: 'fire',
    category: 'fire',
    timestamp: new Date('2026-07-06T08:12:00.000Z'),
    dismissible: true,
  }

  assert.equal(canUserSeeNotification(superAdminUser, notification), true)
  assert.equal(canUserSeeNotification(agencyAdminUser, notification), true)
  assert.equal(canUserSeeNotification(viewerUser, notification), false)
  assert.equal(canUserSeeAlert(agencyAdminUser, fireAlert), false)
})
