import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('mobile history hides auto-generated mobile call descriptions', async () => {
  const source = await readFile(new URL('../components/mobile/incident-history-screen.tsx', import.meta.url), 'utf8')

  assert.match(source, /getUserFacingIncidentDescription\(log\.description\)/)
  assert.match(source, /userFacingDescription \?/)
  assert.doesNotMatch(source, /\{log\.description\}/)
})

test('admin incident detail hides auto-generated mobile call descriptions', async () => {
  const source = await readFile(new URL('../widgets/dashboard-map/ui/incident-detail-panel.tsx', import.meta.url), 'utf8')

  assert.match(source, /getUserFacingIncidentDescription\(tracking\?\.incident\.description\)/)
  assert.match(source, /userFacingDescription \?/)
  assert.doesNotMatch(source, /\{tracking\.incident\.description\}/)
})

test('gis incident list hides auto-generated mobile call descriptions', async () => {
  const source = await readFile(new URL('../app/admin/(dashboard)/gis/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /getUserFacingIncidentDescription\(incident\.description\)/)
  assert.match(source, /userFacingDescription \?\? t\('gisNoIncidentDescription'\)/)
  assert.doesNotMatch(source, /incident\.description \?\? t\('gisNoIncidentDescription'\)/)
})
