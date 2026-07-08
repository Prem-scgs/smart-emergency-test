import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const route = readFileSync('app/admin/(dashboard)/users/page.tsx', 'utf8')
const page = readFileSync('widgets/admin-users/ui/users-page.tsx', 'utf8')
const widget = readFileSync('widgets/admin-users/index.ts', 'utf8')

test('admin users route is a thin shell for the placeholder widget', () => {
  assert.match(route, /@\/widgets\/admin-users/)
  assert.doesNotMatch(route, /fetch\(/)
  assert.doesNotMatch(route, /useState|useEffect/)

  assert.match(widget, /UsersPage/)
  assert.match(page, /รอเชื่อมระบบ Auth จริง|เธฃเธญเน€เธเธทเนเธญเธกเธฃเธฐเธเธ Auth เธเธฃเธดเธ/)
  assert.match(page, /ยังไม่ทำ CRUD ผู้ใช้|เธขเธฑเธเนเธกเนเธ—เธณ CRUD เธเธนเนเนเธเน/)
  assert.doesNotMatch(page, /\/api\/users/)
})
