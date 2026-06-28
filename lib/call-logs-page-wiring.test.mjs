import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync('app/admin/(dashboard)/call-logs/page.tsx', 'utf8')
const i18n = readFileSync('lib/admin-i18n.tsx', 'utf8')

test('call logs page uses admin i18n and scoped API headers', () => {
  assert.match(page, /useAdminI18n/)
  assert.match(page, /buildAdminApiHeaders\(user\)/)
  assert.match(page, /buildAdminCategoryCollections\(categories as never, preferThai\)/)
  assert.match(page, /formatDate\(incident\.createdAt, language\)/)
  assert.match(page, /formatTime\(incident\.createdAt, language\)/)
})

test('call logs page exports CSV, PDF, and print snapshots like reports', () => {
  assert.match(page, /exportCsv/)
  assert.match(page, /text\/csv;charset=utf-8/)
  assert.match(page, /smart-emergency-call-logs-\$\{dateFilter\}\.csv/)
  assert.match(page, /exportPdf/)
  assert.match(page, /html2canvas/)
  assert.match(page, /jsPDF/)
  assert.match(page, /smart-emergency-call-logs-\$\{dateFilter\}\.pdf/)
  assert.match(page, /printCallLogs/)
  assert.match(page, /window\.print\(\)/)
  assert.match(page, /print-only-call-logs/)
  assert.match(page, /<DropdownMenuTrigger\s+render=\{/)
  assert.doesNotMatch(page, /กำลังส่งออกเป็น \$\{format\.toUpperCase\(\)\}/)
  assert.doesNotMatch(page, /<DropdownMenuTrigger asChild>/)
  assert.doesNotMatch(page, /DropdownMenuLabel/)
  assert.doesNotMatch(page, /DropdownMenuSeparator/)
})

test('call logs table paginates visible rows while exports keep filtered rows', () => {
  assert.match(page, /const \[pageSize, setPageSize\] = useState\(20\)/)
  assert.match(page, /filteredLogs\.slice\(start, start \+ pageSize\)/)
  assert.match(page, /paginatedLogs\.map\(incident =>/)
  assert.match(page, /callLogsRowsPerPage/)
  assert.match(page, /callLogsPreviousPage/)
  assert.match(page, /callLogsNextPage/)
  assert.match(page, /exportRows = useMemo/)
  assert.match(page, /filteredLogs\.map\(incident =>/)
})

test('call logs export omits incident detail text', () => {
  assert.doesNotMatch(page, /callLogsTableDescription/)
  assert.doesNotMatch(page, /incident\.description \?\? "-"/)
  assert.doesNotMatch(i18n, /callLogsTableDescription/)
})

test('call logs PDF and print use safe offscreen pages instead of opening blank windows', () => {
  assert.match(page, /createPdfPageElement/)
  assert.match(page, /element\.style\.position = "fixed"/)
  assert.match(page, /element\.style\.left = "-10000px"/)
  assert.match(page, /buildPrintableHtml/)
  assert.doesNotMatch(page, /window\.open/)
  assert.doesNotMatch(page, /about:blank/)
})

test('admin i18n dictionary contains call logs translations in Thai and English', () => {
  assert.match(i18n, /callLogsPageTitle: "บันทึกการโทร"/)
  assert.match(i18n, /callLogsPageTitle: "Call logs"/)
  assert.match(i18n, /callLogsPrint: "พิมพ์รายงาน"/)
  assert.match(i18n, /callLogsPrint: "Print report"/)
  assert.match(i18n, /callLogsRowsPerPage: "แถวต่อหน้า"/)
  assert.match(i18n, /callLogsRowsPerPage: "Rows per page"/)
  assert.match(i18n, /callLogsStatusConnected: "เชื่อมต่อสำเร็จ"/)
  assert.match(i18n, /callLogsStatusConnected: "Connected"/)
})
