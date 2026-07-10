/**
 * ???? formatter ??? reports widget ???? number/percent/date/CSV/chart config.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildCsvSection,
  escapeCsvCell,
  formatDateLabel,
  formatNumber,
  formatPercent,
  getChartConfig,
} from '../widgets/admin-reports/lib/format.ts'

test('formatNumber uses the selected admin locale and falls back to zero', () => {
  assert.equal(formatNumber(undefined, 'en'), '0')
  assert.equal(formatNumber(1234, 'en'), '1,234')
  assert.equal(formatNumber(1234, 'th'), '1,234')
})

test('formatPercent limits the displayed fraction and appends percent sign', () => {
  assert.equal(formatPercent(66.666, 'en'), '66.7%')
  assert.equal(formatPercent(100, 'th'), '100%')
})

test('formatDateLabel formats ISO date buckets and preserves unknown buckets', () => {
  assert.match(formatDateLabel('2026-07-09', 'en'), /Jul/)
  assert.equal(formatDateLabel('not-a-date', 'en'), 'not-a-date')
})

test('escapeCsvCell quotes commas newlines and double quotes', () => {
  assert.equal(escapeCsvCell('plain'), 'plain')
  assert.equal(escapeCsvCell('status, category'), '"status, category"')
  assert.equal(escapeCsvCell('line\nbreak'), '"line\nbreak"')
  assert.equal(escapeCsvCell('say "hello"'), '"say ""hello"""')
})

test('buildCsvSection keeps title row, data rows, and trailing blank row', () => {
  assert.deepEqual(buildCsvSection('Summary', [['Total', 3]]), [
    ['Summary'],
    ['Total', 3],
    [],
  ])
})

test('getChartConfig keeps total and closed chart color contracts', () => {
  assert.deepEqual(getChartConfig('Total', 'Closed'), {
    count: { label: 'Total', color: 'var(--chart-1)' },
    closedCount: { label: 'Closed', color: 'var(--chart-3)' },
  })
})
