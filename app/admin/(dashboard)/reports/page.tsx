"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronDown,
  CheckCircle,
  Download,
  FileText,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buildAdminApiHeaders } from "@/shared/api/admin-api"
import { useAdminI18n } from "@/lib/admin-i18n"
import { useAuth } from "@/lib/auth-context"
import { getEmergencyApiBaseUrl } from "@/shared/config/emergency-api"
import { buildAdminCategoryCollections, useReferenceCategories } from "@/shared/reference"

const API_BASE_URL = getEmergencyApiBaseUrl()

type ReportRange = "week" | "month" | "quarter" | "year"

interface ReportSummary {
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

function getChartConfig(totalLabel: string, closedLabel: string) {
  return {
    count: { label: totalLabel, color: "var(--chart-1)" },
    closedCount: { label: closedLabel, color: "var(--chart-3)" },
  }
}

const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#64748b",
]

function formatNumber(value: number | undefined, language: "th" | "en") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "th-TH").format(value ?? 0)
}

function formatPercent(value: number, language: "th" | "en") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "th-TH", { maximumFractionDigits: 1 }).format(value) + "%"
}

function formatDateLabel(value: string, language: "th" | "en") {
  const date = new Date(value + "T00:00:00")
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(language === "en" ? "en-US" : "th-TH", { day: "2-digit", month: "short" })
}

function escapeCsvCell(value: string | number) {
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return '"' + text.replaceAll('"', '""') + '"'
}

function buildCsvSection(title: string, rows: Array<Array<string | number>>) {
  return [
    [title],
    ...rows,
    [],
  ]
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function buildPdfTable(headers: string[], rows: Array<Array<string | number>>, emptyLabel: string) {
  const headerHtml = headers
    .map(header => `<th style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;color:#4b5563;">${escapeHtml(header)}</th>`)
    .join("")
  const rowHtml = rows
    .map(row => {
      const cells = row
        .map(cell => `<td style="padding:10px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">${escapeHtml(cell)}</td>`)
        .join("")
      return `<tr>${cells}</tr>`
    })
    .join("")

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:10px;">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowHtml || `<tr><td colspan="${headers.length}" style="padding:14px;color:#6b7280;">${escapeHtml(emptyLabel)}</td></tr>`}</tbody>
    </table>
  `
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks.length > 0 ? chunks : [[]]
}

function createPdfPageElement(title: string, bodyHtml: string, footerLabel: string) {
  const element = document.createElement("div")
  element.style.position = "fixed"
  element.style.left = "-10000px"
  element.style.top = "0"
  element.style.width = "794px"
  element.style.minHeight = "1123px"
  element.style.backgroundColor = "#ffffff"
  element.style.color = "#111827"
  element.style.padding = "32px"
  element.style.fontFamily = "Arial, Tahoma, sans-serif"
  element.style.lineHeight = "1.5"
  element.style.boxSizing = "border-box"

  element.innerHTML = `
    <section style="display:flex;min-height:1059px;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #ef4444;padding-bottom:18px;">
        <div>
          <div style="font-size:13px;color:#ef4444;font-weight:700;">Smart Emergency Report</div>
          <h1 style="font-size:28px;margin:6px 0 0;">${escapeHtml(title)}</h1>
        </div>
        <div style="font-size:12px;color:#6b7280;text-align:right;">${escapeHtml(footerLabel)}</div>
      </div>
      <div style="flex:1;padding-top:22px;">${bodyHtml}</div>
      <div style="border-top:1px solid #e5e7eb;padding-top:10px;font-size:11px;color:#9ca3af;">
        Smart Emergency Platform
      </div>
    </section>
  `

  return element
}

interface ReportCopy {
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

function buildPdfReportPages(
  report: ReportSummary,
  rangeLabel: string,
  scopeLabel: string,
  language: "th" | "en",
  statusLabels: Record<string, string>,
  categoryLabelMap: Record<string, string>,
  copy: ReportCopy
) {
  const closedRate = report.totals.totalIncidents > 0
    ? (report.totals.closedIncidents / report.totals.totalIncidents) * 100
    : 0
  const generatedAt = new Date().toLocaleString(language === "en" ? "en-US" : "th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const footerLabel = `${copy.generatedAt} ${generatedAt}`
  const pages: HTMLDivElement[] = []
  const trendRows = report.trend.map(item => [formatDateLabel(item.bucket, language), item.count, item.closedCount])
  const statusRows = report.byStatus.map(item => [statusLabels[item.status] ?? item.status, item.count])
  const categoryRows = report.byCategory.map(item => [categoryLabelMap[item.category] ?? item.category, item.count])
  const areaRows = report.byArea.map(item => [item.areaName, item.count])

  pages.push(createPdfPageElement(
    copy.pageTitle,
    `
      <p style="font-size:14px;color:#6b7280;margin:0;">${escapeHtml(scopeLabel)} · ${escapeHtml(rangeLabel)}</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px;">
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#6b7280;">${escapeHtml(copy.totalIncidents)}</div>
          <div style="font-size:26px;font-weight:700;">${formatNumber(report.totals.totalIncidents, language)}</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#6b7280;">${escapeHtml(copy.activeIncidents)}</div>
          <div style="font-size:26px;font-weight:700;">${formatNumber(report.totals.activeIncidents, language)}</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#6b7280;">${escapeHtml(copy.closureRate)}</div>
          <div style="font-size:26px;font-weight:700;">${formatPercent(closedRate, language)}</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#6b7280;">${escapeHtml(copy.connectedCalls)}</div>
          <div style="font-size:26px;font-weight:700;">${formatNumber(report.totals.connectedCalls, language)}</div>
        </div>
      </div>

      <h2 style="font-size:18px;margin:28px 0 0;">${escapeHtml(copy.trendTitle)}</h2>
      ${buildPdfTable(
        [copy.date, copy.totalIncidents, copy.closedCases],
        trendRows,
        copy.empty
      )}
    `,
    footerLabel
  ))

  pages.push(createPdfPageElement(
    copy.statusAndCategoryTitle,
    `
      <h2 style="font-size:18px;margin:0;">${escapeHtml(copy.currentStatus)}</h2>
      ${buildPdfTable(
        [copy.status, copy.count],
        statusRows,
        copy.empty
      )}

      <h2 style="font-size:18px;margin:28px 0 0;">${escapeHtml(copy.category)}</h2>
      ${buildPdfTable(
        [copy.category, copy.count],
        categoryRows,
        copy.empty
      )}
    `,
    footerLabel
  ))

  for (const [index, rows] of chunkRows(areaRows, 24).entries()) {
    pages.push(createPdfPageElement(
      index === 0 ? copy.area : `${copy.area} (${index + 1})`,
      `
        <h2 style="font-size:18px;margin:0;">${escapeHtml(copy.topAreasTitle)}</h2>
        ${buildPdfTable([copy.area, copy.count], rows, copy.empty)}
      `,
      footerLabel
    ))
  }

  return pages
}

function buildPrintableReportHtml(
  report: ReportSummary,
  rangeLabel: string,
  scopeLabel: string,
  language: "th" | "en",
  statusLabels: Record<string, string>,
  categoryLabelMap: Record<string, string>,
  copy: ReportCopy
) {
  const pages = buildPdfReportPages(report, rangeLabel, scopeLabel, language, statusLabels, categoryLabelMap, copy)
  return pages
    .map(page => {
      const content = page.innerHTML
      page.remove()
      return `<main class="report-page">${content}</main>`
    })
    .join("")
}

export default function ReportsPage() {
  const { language, t } = useAdminI18n()
  const preferThai = language !== "en"
  const { user, canViewAllAgencies, getUserAgency } = useAuth()
  const { categories: referenceCategories } = useReferenceCategories()
  const [dateRange, setDateRange] = useState<ReportRange>("month")
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [printReportHtml, setPrintReportHtml] = useState("")

  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const { labelMap: categoryLabelMap } = useMemo(
    () => buildAdminCategoryCollections(referenceCategories, preferThai),
    [preferThai, referenceCategories]
  )
  const chartConfig = useMemo(
    () => getChartConfig(t("reportsTotalIncidents"), t("reportsClosedCases")),
    [t]
  )
  const statusLabels: Record<string, string> = {
    open: t("reportsStatusOpen"),
    reported: t("reportsStatusReported"),
    acknowledged: t("reportsStatusAcknowledged"),
    coordinating: t("reportsStatusCoordinating"),
    dispatched: t("reportsStatusDispatched"),
    on_scene: t("reportsStatusOnScene"),
    closed: t("reportsStatusClosed"),
  }
  const reportRangeLabels: Record<ReportRange, string> = {
    week: t("reportsRangeWeek"),
    month: t("reportsRangeMonth"),
    quarter: t("reportsRangeQuarter"),
    year: t("reportsRangeYear"),
  }
  const reportCopy: ReportCopy = {
    pageTitle: t("reportsPageTitle"),
    generatedAt: t("reportsGeneratedAt"),
    totalIncidents: t("reportsTotalIncidents"),
    activeIncidents: t("reportsActiveIncidents"),
    closureRate: t("reportsClosureRate"),
    connectedCalls: t("reportsConnectedCalls"),
    trendTitle: t("reportsTrendTitle"),
    date: t("reportsTableDate"),
    closedCases: t("reportsClosedCases"),
    statusAndCategoryTitle: t("reportsStatusAndCategoryTitle"),
    currentStatus: t("reportsCurrentStatus"),
    status: t("reportsStatusColumn"),
    count: t("reportsCountColumn"),
    category: t("reportsCategoryTab"),
    area: t("reportsAreaTab"),
    topAreasTitle: t("reportsTopAreasTitle"),
    empty: t("reportsNoDataInRange"),
  }
  const scopeLabel = isSuperAdmin
    ? t("reportsScopeAll")
    : t("reportsScopePrefix") + (preferThai ? agency?.nameTh : agency?.name ?? agency?.nameTh ?? t("reportsOwnAgencyFallback"))

  const closedRate = useMemo(() => {
    const total = reportSummary?.totals.totalIncidents ?? 0
    if (total === 0) return 0
    return ((reportSummary?.totals.closedIncidents ?? 0) / total) * 100
  }, [reportSummary])

  const trendData = useMemo(() => {
    return (reportSummary?.trend ?? []).map(item => ({
      ...item,
      label: formatDateLabel(item.bucket, language),
    }))
  }, [language, reportSummary])

  const categoryData = useMemo(() => {
    return (reportSummary?.byCategory ?? []).map((item, index) => ({
      ...item,
      name: categoryLabelMap[item.category] ?? item.category,
      color: categoryColors[index % categoryColors.length],
    }))
  }, [categoryLabelMap, reportSummary])

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMessage("")
      const response = await fetch(
        API_BASE_URL + "/api/reports/summary?range=" + dateRange,
        { headers: buildAdminApiHeaders(user) }
      )
      if (!response.ok) throw new Error(t("reportsLoadError"))
      const data = (await response.json()) as ReportSummary
      setReportSummary(data)
    } catch {
      setErrorMessage(t("reportsLoadFromDbError"))
      setReportSummary(null)
      toast.error(t("reportsLoadError"))
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, t, user])

  const exportReportCsv = useCallback(() => {
    if (!reportSummary) {
      toast.error(t("reportsNoDataToExport"))
      return
    }

    const rows = [
      ...buildCsvSection("Smart Emergency Report", [
        [t("reportsDateRange"), reportRangeLabels[dateRange]],
        [t("reportsDataScope"), scopeLabel],
        [t("reportsTotalIncidents"), reportSummary.totals.totalIncidents],
        [t("reportsActiveIncidents"), reportSummary.totals.activeIncidents],
        [t("reportsClosedCases"), reportSummary.totals.closedIncidents],
        [t("reportsConnectedCalls"), reportSummary.totals.connectedCalls],
      ]),
      ...buildCsvSection(t("reportsTrendTitle"), [
        [t("reportsTableDate"), t("reportsTotalIncidents"), t("reportsClosedCases")],
        ...reportSummary.trend.map(item => [item.bucket, item.count, item.closedCount]),
      ]),
      ...buildCsvSection(t("reportsCurrentStatus"), [
        [t("reportsStatusColumn"), t("reportsCountColumn")],
        ...reportSummary.byStatus.map(item => [statusLabels[item.status] ?? item.status, item.count]),
      ]),
      ...buildCsvSection(t("reportsCategoryTab"), [
        [t("reportsCategoryTab"), t("reportsCountColumn")],
        ...reportSummary.byCategory.map(item => [categoryLabelMap[item.category] ?? item.category, item.count]),
      ]),
      ...buildCsvSection(t("reportsAreaTab"), [
        [t("reportsAreaTab"), t("reportsCountColumn")],
        ...reportSummary.byArea.map(item => [item.areaName, item.count]),
      ]),
    ]

    const csv = "\uFEFF" + rows.map(row => row.map(escapeCsvCell).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `smart-emergency-report-${dateRange}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success(t("reportsCsvExported"))
  }, [categoryLabelMap, dateRange, reportRangeLabels, reportSummary, scopeLabel, statusLabels, t])

  const exportReportPdf = useCallback(async () => {
    if (!reportSummary) {
      toast.error(t("reportsNoDataToExport"))
      return
    }

    const pdfPages = buildPdfReportPages(reportSummary, reportRangeLabels[dateRange], scopeLabel, language, statusLabels, categoryLabelMap, reportCopy)
    try {
      setIsExportingPdf(true)
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const JsPdf = jsPdfModule.default ?? jsPdfModule.jsPDF
      const pdf = new JsPdf("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      for (const [index, pageElement] of pdfPages.entries()) {
        document.body.appendChild(pageElement)
        const canvas = await html2canvas(pageElement, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
        })
        const imageHeight = (canvas.height * pageWidth) / canvas.width
        const imageData = canvas.toDataURL("image/png")

        if (index > 0) pdf.addPage()
        pdf.addImage(imageData, "PNG", 0, 0, pageWidth, Math.min(pageHeight, imageHeight))
        pageElement.remove()
      }

      pdf.save(`smart-emergency-report-${dateRange}.pdf`)
      toast.success(t("reportsPdfExported"))
    } catch (error) {
      console.error("Report PDF export failed", error)
      toast.error(t("reportsPdfExportFailed"))
    } finally {
      for (const pageElement of pdfPages) {
        pageElement.remove()
      }
      setIsExportingPdf(false)
    }
  }, [categoryLabelMap, dateRange, language, reportCopy, reportRangeLabels, reportSummary, scopeLabel, statusLabels, t])

  const printReport = useCallback(() => {
    if (!reportSummary) {
      toast.error(t("reportsNoDataToExport"))
      return
    }

    setPrintReportHtml(buildPrintableReportHtml(reportSummary, reportRangeLabels[dateRange], scopeLabel, language, statusLabels, categoryLabelMap, reportCopy))
    window.setTimeout(() => {
      window.print()
    }, 250)
  }, [categoryLabelMap, dateRange, language, reportCopy, reportRangeLabels, reportSummary, scopeLabel, statusLabels, t])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  return (
    <div className="flex flex-col gap-6 p-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media screen {
              .print-only-report { display: none; }
            }
            @media print {
              @page { size: A4; margin: 0; }
              body * { visibility: hidden !important; }
              .print-only-report, .print-only-report * {
                visibility: visible !important;
              }
              .print-only-report {
                display: block !important;
                position: absolute;
                inset: 0 auto auto 0;
                width: 210mm;
                background: #ffffff;
                color: #111827;
                font-family: Arial, Tahoma, sans-serif;
              }
              .print-only-report .report-page {
                width: 210mm;
                min-height: 297mm;
                margin: 0;
                padding: 32px;
                background: #ffffff;
                page-break-after: always;
              }
              html.dark .print-only-report,
              html.dark .print-only-report .report-page {
                background: #ffffff;
                color: #111827;
                color-scheme: light;
              }
              html.dark .print-only-report h1,
              html.dark .print-only-report h2,
              html.dark .print-only-report p,
              html.dark .print-only-report div,
              html.dark .print-only-report table,
              html.dark .print-only-report th,
              html.dark .print-only-report td {
                color: #111827 !important;
                border-color: #e5e7eb !important;
              }
              html.dark .print-only-report div[style*="#ef4444"] {
                color: #ef5350 !important;
              }
              .print-only-report .report-page:last-child {
                page-break-after: auto;
              }
            }
          `,
        }}
      />
      <div
        className="print-only-report"
        dangerouslySetInnerHTML={{ __html: printReportHtml }}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("reportsPageTitle")}</h1>
          <p className="text-muted-foreground">
            {t("reportsPageDescription")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="min-h-10 px-3">
            {scopeLabel}
          </Badge>
          <Select value={dateRange} onValueChange={value => setDateRange((value ?? "month") as ReportRange)}>
            <SelectTrigger className="w-[170px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t("reportsSelectRange")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{reportRangeLabels.week}</SelectItem>
              <SelectItem value="month">{reportRangeLabels.month}</SelectItem>
              <SelectItem value="quarter">{reportRangeLabels.quarter}</SelectItem>
              <SelectItem value="year">{reportRangeLabels.year}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => void loadReports()} disabled={isLoading}>
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  disabled={isLoading || !reportSummary || isExportingPdf}
                />
              }
            >
              <Download className="mr-2 h-4 w-4" />
              {t("reportsExport")}
              <ChevronDown className="ml-2 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={exportReportCsv}>
                <Download className="mr-2 h-4 w-4" />
                {t("reportsExportCsv")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportReportPdf()}>
                <FileText className="mr-2 h-4 w-4" />
                {t("reportsExportPdf")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={printReport}>
                <Printer className="mr-2 h-4 w-4" />
                {t("reportsPrint")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 py-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4" />
              {errorMessage}
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadReports()}>
              {t("reportsRetry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t("reportsLoading")}
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("reportsTotalIncidents")}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatNumber(reportSummary?.totals.totalIncidents, language)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("reportsSelectedRangeHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("reportsActiveIncidents")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatNumber(reportSummary?.totals.activeIncidents, language)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("reportsActiveIncidentsHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("reportsClosureRate")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : formatPercent(closedRate, language)}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatNumber(reportSummary?.totals.closedIncidents, language)} {t("reportsClosedSuffix")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("reportsConnectedCalls")}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatNumber(reportSummary?.totals.connectedCalls, language)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("reportsConnectedCallsHint")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calls">{t("reportsCallsTab")}</TabsTrigger>
          <TabsTrigger value="categories">{t("reportsCategoryTab")}</TabsTrigger>
          <TabsTrigger value="locations">{t("reportsAreaTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("reportsTrendTitle")}</CardTitle>
                <CardDescription>{t("reportsTrendDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--chart-1)" name={t("reportsTotalIncidents")} />
                      <Bar dataKey="closedCount" fill="var(--chart-3)" name={t("reportsClosedCases")} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("reportsCurrentStatus")}</CardTitle>
                <CardDescription>{t("reportsCurrentStatusDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(reportSummary?.byStatus ?? []).map(item => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{statusLabels[item.status] ?? item.status}</div>
                        <div className="text-sm text-muted-foreground">{item.status}</div>
                      </div>
                      <Badge variant="secondary">{formatNumber(item.count, language)}</Badge>
                    </div>
                  ))}
                  {!isLoading && (reportSummary?.byStatus.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">{t("reportsNoDataInRange")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("reportsCategoryShareTitle")}</CardTitle>
                <CardDescription>{t("reportsCategoryShareDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                      >
                        {categoryData.map(item => (
                          <Cell key={item.category} fill={item.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("reportsCategoryDetailTitle")}</CardTitle>
                <CardDescription>{t("reportsCategoryDetailDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map(item => (
                    <div key={item.category} className="flex items-center gap-4">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">{formatNumber(item.count, language)}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width:
                                (reportSummary?.totals.totalIncidents ?? 0) > 0
                                  ? Math.max(4, (item.count / (reportSummary?.totals.totalIncidents ?? 1)) * 100) + "%"
                                  : "0%",
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {!isLoading && categoryData.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("reportsNoCategoryData")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("reportsTopAreasTitle")}
              </CardTitle>
              <CardDescription>{t("reportsTopAreasDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reportsRankColumn")}</TableHead>
                    <TableHead>{t("reportsAreaTab")}</TableHead>
                    <TableHead className="text-right">{t("reportsCountColumn")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportSummary?.byArea ?? []).map((area, index) => (
                    <TableRow key={area.areaName}>
                      <TableCell>
                        <Badge variant="outline">{index + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{area.areaName}</TableCell>
                      <TableCell className="text-right">{formatNumber(area.count, language)}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (reportSummary?.byArea.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {t("reportsNoAreaData")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
