import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('mobile incident location stores Thai names before English fallback', async () => {
  const source = await readFile(new URL('../components/mobile/mobile-app.tsx', import.meta.url), 'utf8')

  assert.match(source, /province: resolved\.provinceNameTh \?\? resolved\.provinceNameEn \?\? ''/)
  assert.match(source, /district: resolved\.districtNameTh \?\? resolved\.districtNameEn \?\? ''/)
})
