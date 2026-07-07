import test from 'node:test'
import assert from 'node:assert/strict'

import type { AdminUser } from './types'
import {
  canUserSeeAlert,
  canUserSeeNotification,
  type Alert,
  type Notification,
} from '../features/incident-alert/index.ts'

const agencyAdminUser: AdminUser = {
  id: 'user-1',
  email: 'prem@example.com',
  name: 'เปรม',
  role: 'agency_admin',
  agencyId: 'agency-medical',
  agency: {
    id: 'agency-medical',
    name: 'Emergency Medical Services',
    nameTh: 'แพทย์ฉุกเฉิน',
    category: 'medical',
    description: 'EMS',
    icon: 'Heart',
    color: 'text-red-600',
  },
  permissions: ['dashboard.view'],
  lastLogin: new Date('2026-06-17T09:00:00.000Z'),
}

const viewerUser: AdminUser = {
  ...agencyAdminUser,
  id: 'viewer-1',
  role: 'viewer',
}

test('canUserSeeNotification allows agency users to see same-category notifications even when agencyId differs', () => {
  const notification: Notification = {
    id: 'notif-1',
    type: 'new-incident',
    title: 'มีเหตุใหม่เข้าระบบ',
    message: 'แพทย์ - เมืองพิษณุโลก พิษณุโลก',
    agencyId: 'medical',
    category: 'medical',
    read: false,
    timestamp: new Date('2026-06-17T09:00:00.000Z'),
  }

  assert.equal(canUserSeeNotification(agencyAdminUser, notification), true)
})

test('canUserSeeAlert hides alerts from other categories for agency users', () => {
  const alert: Alert = {
    id: 'alert-1',
    severity: 'warning',
    title: 'มีเหตุเร่งด่วนใหม่',
    message: 'อัคคีภัย ในพื้นที่ เมืองพิษณุโลก พิษณุโลก',
    agencyId: 'fire',
    category: 'fire',
    timestamp: new Date('2026-06-17T09:00:00.000Z'),
    dismissible: true,
  }

  assert.equal(canUserSeeAlert(agencyAdminUser, alert), false)
})

test('viewer does not see actionable notifications or popup alerts', () => {
  const notification: Notification = {
    id: 'notif-viewer',
    type: 'new-incident',
    title: 'New incident',
    message: 'Medical - Chiang Mai',
    agencyId: 'medical',
    category: 'medical',
    read: false,
    timestamp: new Date('2026-06-17T09:00:00.000Z'),
  }
  const alert: Alert = {
    id: 'alert-viewer',
    severity: 'warning',
    title: 'New incident',
    message: 'Medical in Chiang Mai',
    agencyId: 'medical',
    category: 'medical',
    timestamp: new Date('2026-06-17T09:00:00.000Z'),
    dismissible: true,
  }

  assert.equal(canUserSeeNotification(viewerUser, notification), false)
  assert.equal(canUserSeeAlert(viewerUser, alert), false)
})
