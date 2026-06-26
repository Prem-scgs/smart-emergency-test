import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync('app/admin/(dashboard)/reports/page.tsx', 'utf8')

test('reports page uses API data instead of mock report constants', () => {
  assert.match(page, /useAuth/)
  assert.match(page, /buildAdminApiHeaders/)
  assert.match(page, /\/api\/reports\/summary/)
  assert.match(page, /reportSummary/)

  assert.doesNotMatch(page, /Mock data for charts/)
  assert.doesNotMatch(page, /monthlyCallData/)
  assert.doesNotMatch(page, /operatorPerformance/)
  assert.doesNotMatch(page, /ผู้ปฏิบัติงาน/)
  assert.doesNotMatch(page, /ประสิทธิภาพเจ้าหน้าที่/)
  assert.doesNotMatch(page, /9,110/)
  assert.doesNotMatch(page, /1,234/)
})

test('reports page keeps the existing reports shell and core report tabs', () => {
  assert.match(page, /รายงานและสถิติ/)
  assert.match(page, /<Tabs/)
  assert.match(page, /สถิติการแจ้งเหตุ/)
  assert.match(page, /หมวดเหตุ/)
  assert.match(page, /พื้นที่/)
})
