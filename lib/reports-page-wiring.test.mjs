/**
 * ???? reports route shell, API summary fetch ??? export/print snapshot ??????? widget.
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const route = readFileSync('app/admin/(dashboard)/reports/page.tsx', 'utf8')
const page = readFileSync('widgets/admin-reports/ui/reports-page.tsx', 'utf8')
const exportHelpers = readFileSync('widgets/admin-reports/lib/export.ts', 'utf8')
const i18n = [
  readFileSync('shared/i18n/admin/admin-i18n-context.tsx', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/th.ts', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/en.ts', 'utf8'),
].join('\n')

test('reports route is a thin widget shell', () => {
  assert.match(route, /@\/widgets\/admin-reports/)
  assert.match(route, /<ReportsPage \/>/)
  assert.doesNotMatch(route, /fetch\(/)
  assert.doesNotMatch(route, /exportReportCsv/)
  assert.doesNotMatch(route, /printReport/)
  assert.doesNotMatch(route, /<BarChart/)
})

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
  assert.match(page, /useAdminI18n/)
  assert.match(page, /useLocationLookupMaps/)
  assert.match(page, /buildAdminCategoryCollections\(referenceCategories, preferThai\)/)
  assert.match(page, /localizeReportSummaryAreas\(reportSummary, provinceByCode, districtByCode, preferThai\)/)
  assert.match(page, /<Tabs/)
  assert.match(page, /reportsCallsTab/)
  assert.match(page, /reportsCategoryTab/)
  assert.match(page, /reportsAreaTab/)
})

test('reports page enables csv export from current report summary', () => {
  assert.match(page, /exportReportCsv/)
  assert.match(page, /localizedReportSummary\.byArea\.map/)
  assert.match(page, /Smart Emergency Report/)
  assert.match(page, /text\/csv;charset=utf-8/)
  assert.match(page, /smart-emergency-report-\$\{dateRange\}\.csv/)
  assert.match(page, /toast\.success\(t\("reportsCsvExported"\)\)/)
  assert.doesNotMatch(page, /title="ยังไม่เปิดใช้ export ในรอบนี้"/)
  assert.doesNotMatch(page, /<Button disabled[^>]*>\s*<Download/)
})

test('reports page offers a shadcn export menu with pdf export', () => {
  assert.match(page, /DropdownMenu/)
  assert.match(page, /exportReportPdf/)
  assert.match(page, /buildPdfReportPages/)
  assert.match(page, /html2canvas/)
  assert.match(page, /jsPDF/)
  assert.match(page, /smart-emergency-report-\$\{dateRange\}\.pdf/)
  assert.match(page, /reportsExportPdf/)
})

test('reports page offers print action using the same safe report snapshot', () => {
  assert.match(page, /printReport/)
  assert.match(page, /buildPrintableReportHtml/)
  assert.match(page, /printReportHtml/)
  assert.match(page, /setPrintReportHtml/)
  assert.match(page, /window\.print\(\)/)
  assert.match(page, /print-only-report/)
  assert.match(page, /reportsPrint/)
  assert.doesNotMatch(page, /window\.open/)
  assert.doesNotMatch(page, /about:blank/)
})

test('reports print snapshot keeps light document colors while admin is in dark theme', () => {
  assert.match(page, /html\.dark \.print-only-report/)
  assert.match(page, /color-scheme: light/)
  assert.match(page, /background: #ffffff/)
  assert.match(page, /color: #111827 !important/)
  assert.match(page, /border-color: #e5e7eb !important/)
})

test('reports pdf export uses a safe inline report snapshot instead of capturing the app shell', () => {
  assert.match(exportHelpers, /escapeHtml/)
  assert.match(exportHelpers, /buildPdfReportPages/)
  assert.match(exportHelpers, /createPdfPageElement/)
  assert.match(exportHelpers, /element\.style\.position = "fixed"/)
  assert.match(exportHelpers, /element\.style\.left = "-10000px"/)
  assert.match(exportHelpers, /element\.style\.backgroundColor = "#ffffff"/)
  assert.match(page, /document\.body\.appendChild\(pageElement\)/)
  assert.match(page, /pageElement\.remove\(\)/)
})

test('reports pdf export paginates by report sections instead of slicing one long canvas', () => {
  assert.match(exportHelpers, /chunkRows/)
  assert.match(page, /for \(const \[index, pageElement\] of pdfPages\.entries\(\)\)/)
  assert.doesNotMatch(page, /remainingHeight/)
  assert.doesNotMatch(page, /position = remainingHeight - imageHeight/)
})

test('reports page has polished loading, empty, and retry states', () => {
  assert.match(page, /reportsLoading/)
  assert.match(page, /reportsNoDataToExport/)
  assert.match(page, /reportsRetry/)
  assert.match(page, /onClick=\{\(\) => void loadReports\(\)\}/)
})

test('admin i18n dictionary contains reports translations in Thai and English', () => {
  assert.match(i18n, /reportsPageTitle: "รายงานและสถิติ"/)
  assert.match(i18n, /reportsPageTitle: "Reports and statistics"/)
  assert.match(i18n, /reportsExportPdf: "ส่งออก PDF"/)
  assert.match(i18n, /reportsExportPdf: "Export PDF"/)
  assert.match(i18n, /reportsStatusReported: "แจ้งเหตุแล้ว"/)
  assert.match(i18n, /reportsStatusReported: "Reported"/)
})
