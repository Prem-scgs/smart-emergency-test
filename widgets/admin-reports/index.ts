/**
 * Public API ของ admin reports widget
 *
 * ReportsPage เป็น owner ของ summary fetch, charts, CSV/PDF และ print snapshot.
 */
export { default as ReportsPage } from "./ui/reports-page"
export type { ReportCopy, ReportRange, ReportSummary } from "./model/types"
