export type ReportRange = "week" | "month" | "quarter" | "year"

export interface ReportSummary {
  range: ReportRange
  totals: {
    totalIncidents: number
    activeIncidents: number
    closedIncidents: number
    connectedCalls: number
  }
  byStatus: Array<{ status: string; count: number }>
  byCategory: Array<{ category: string; count: number }>
  byArea: Array<{ areaName: string; count: number }>
  trend: Array<{ bucket: string; count: number; closedCount: number }>
}

export interface ReportCopy {
  pageTitle: string
  generatedAt: string
  totalIncidents: string
  activeIncidents: string
  closureRate: string
  connectedCalls: string
  trendTitle: string
  date: string
  closedCases: string
  statusAndCategoryTitle: string
  currentStatus: string
  status: string
  count: string
  category: string
  area: string
  topAreasTitle: string
  empty: string
}
