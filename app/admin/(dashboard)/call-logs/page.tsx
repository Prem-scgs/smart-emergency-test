"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Phone,
  PhoneMissed,
  Printer,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
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
import { useAuth } from "@/shared/auth"
import { buildAdminCategoryCollections, adminEmergencyCategoryStyles } from "@/shared/reference"
import { getEmergencyApiBaseUrl } from "@/shared/config/emergency-api"
import type { EmergencyCategory } from "@/entities/incident"
import type { CallStatus } from "@/entities/call"
import { cn } from "@/lib/utils"

const API_BASE_URL = getEmergencyApiBaseUrl()

type DateFilter = "all" | "today" | "week" | "month"

interface ApiIncident {
  id: string
  category: EmergencyCategory
  severity: "low" | "medium" | "high" | "critical"
  status: string
  description: string | null
  agencyContactId: string | null
  agencyName: string | null
  agencyPhone: string | null
  province: string | null
  district: string | null
  accuracy: number | null
  callStatus: CallStatus | null
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
}

interface EmergencyCategoryInfo {
  id: EmergencyCategory
  name: string
  nameTh?: string
  color: string
  bgColor: string
}

const fallbackCategories: EmergencyCategoryInfo[] = adminEmergencyCategoryStyles

function selectLabel(label: string) {
  return (
    <span data-slot="select-value" className="flex flex-1 items-center gap-1.5 text-left">
      {label}
    </span>
  )
}

function getCallStatus(incident: ApiIncident): CallStatus {
  if (incident.callStatus) return incident.callStatus
  if (incident.status === "closed") return "connected"
  if (incident.status === "acknowledged") return "connected"
  return "no-answer"
}

function getLocation(incident: ApiIncident) {
  const parts = [incident.district, incident.province].filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  return `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
}

function formatDate(date: string, language: "th" | "en") {
  return new Date(date).toLocaleDateString(language === "en" ? "en-US" : "th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatTime(date: string, language: "th" | "en") {
  return new Date(date).toLocaleTimeString(language === "en" ? "en-US" : "th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function escapeCsvCell(value: string | number) {
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return '"' + text.replaceAll('"', '""') + '"'
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
        .map(cell => `<td style="padding:10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;vertical-align:top;">${escapeHtml(cell)}</td>`)
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

function createPdfPageElement(title: string, subtitle: string, bodyHtml: string, footerLabel: string) {
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
          <div style="font-size:13px;color:#ef4444;font-weight:700;">Smart Emergency Call Logs</div>
          <h1 style="font-size:28px;margin:6px 0 0;">${escapeHtml(title)}</h1>
          <p style="font-size:14px;color:#6b7280;margin:8px 0 0;">${escapeHtml(subtitle)}</p>
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

function buildPrintableHtml(pages: HTMLDivElement[]) {
  return pages
    .map(page => {
      const content = page.innerHTML
      page.remove()
      return `<main class="call-logs-print-page">${content}</main>`
    })
    .join("")
}

export default function CallLogsPage() {
  const { language, t } = useAdminI18n()
  const preferThai = language !== "en"
  const { user, canViewAllAgencies, getFilteredCategories, getUserAgency } = useAuth()
  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const allowedCategories = getFilteredCategories()

  const [incidents, setIncidents] = useState<ApiIncident[]>([])
  const [categories, setCategories] = useState<EmergencyCategoryInfo[]>(fallbackCategories)
  const [isLoading, setIsLoading] = useState(true)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [printHtml, setPrintHtml] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | "all">("all")
  const [statusFilter, setStatusFilter] = useState<CallStatus | "all">("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  const { labelMap: categoryLabelMap } = useMemo(
    () => buildAdminCategoryCollections(categories as never, preferThai),
    [categories, preferThai]
  )

  const dateFilterLabels: Record<DateFilter, string> = {
    all: t("callLogsDateAll"),
    today: t("callLogsDateToday"),
    week: t("callLogsDateWeek"),
    month: t("callLogsDateMonth"),
  }

  const statusConfig: Record<CallStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
    connected: {
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      label: t("callLogsStatusConnected"),
    },
    busy: {
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
      label: t("callLogsStatusBusy"),
    },
    "no-answer": {
      icon: PhoneMissed,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: t("callLogsStatusNoAnswer"),
    },
    "wrong-number": {
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      label: t("callLogsStatusWrongNumber"),
    },
    cancelled: {
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: t("callLogsStatusCancelled"),
    },
  }

  const agencyLabel = (preferThai ? agency?.nameTh : agency?.name ?? agency?.nameTh) ?? t("callLogsAgencyFallback")
  const scopeLabel = isSuperAdmin
    ? t("callLogsScopeAll")
    : t("callLogsScopePrefix") + agencyLabel

  const getCategoryLabel = useCallback(
    (category: string) => categoryLabelMap[category] ?? category,
    [categoryLabelMap]
  )

  const loadCallLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [incidentsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/incidents`, { headers: buildAdminApiHeaders(user) }),
        fetch(`${API_BASE_URL}/api/reference/categories`),
      ])

      if (!incidentsResponse.ok) {
        throw new Error(t("callLogsLoadError"))
      }

      setIncidents((await incidentsResponse.json()) as ApiIncident[])

      if (categoriesResponse.ok) {
        const apiCategories = (await categoriesResponse.json()) as EmergencyCategoryInfo[]
        if (apiCategories.length > 0) {
          setCategories(apiCategories)
        }
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : t("callLogsLoadError")
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [t, user])

  useEffect(() => {
    void loadCallLogs()
  }, [loadCallLogs])

  const availableCategories = useMemo(() => {
    if (isSuperAdmin) return categories
    return categories.filter(category => allowedCategories.includes(category.id))
  }, [allowedCategories, categories, isSuperAdmin])

  const baseFilteredLogs = useMemo(() => {
    if (isSuperAdmin) return incidents
    return incidents.filter(incident => allowedCategories.includes(incident.category))
  }, [allowedCategories, incidents, isSuperAdmin])

  const filteredLogs = useMemo(() => {
    const keyword = searchQuery.trim().toLocaleLowerCase("th-TH")

    return baseFilteredLogs.filter(incident => {
      const callStatus = getCallStatus(incident)
      const location = getLocation(incident)
      const categoryLabel = getCategoryLabel(incident.category)
      const searchable = [
        incident.agencyName,
        incident.agencyPhone,
        incident.category,
        categoryLabel,
        incident.province,
        incident.district,
        location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("th-TH")

      const matchesSearch = !keyword || searchable.includes(keyword)
      const matchesCategory = categoryFilter === "all" || incident.category === categoryFilter
      const matchesStatus = statusFilter === "all" || callStatus === statusFilter

      const now = new Date()
      const logDate = new Date(incident.createdAt)
      let matchesDate = true
      if (dateFilter === "today") {
        matchesDate = logDate.toDateString() === now.toDateString()
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDate = logDate >= weekAgo
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        matchesDate = logDate >= monthAgo
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesDate
    })
  }, [baseFilteredLogs, categoryFilter, dateFilter, getCategoryLabel, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [currentPage, filteredLogs, pageSize])
  const pageStart = filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(currentPage * pageSize, filteredLogs.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, dateFilter, pageSize, searchQuery, statusFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const exportRows = useMemo(() => {
    return filteredLogs.map(incident => {
      const callStatus = getCallStatus(incident)
      return [
        formatDate(incident.createdAt, language),
        formatTime(incident.createdAt, language),
        getLocation(incident),
        getCategoryLabel(incident.category),
        incident.agencyName ?? t("callLogsUnknownAgency"),
        incident.agencyPhone ?? "-",
        statusConfig[callStatus].label,
      ]
    })
  }, [filteredLogs, getCategoryLabel, language, statusConfig, t])

  const exportHeaders = [
    t("callLogsTableDate"),
    t("callLogsTableTime"),
    t("callLogsTableLocation"),
    t("callLogsTableCategory"),
    t("callLogsTableAgency"),
    t("callLogsTablePhone"),
    t("callLogsTableStatus"),
  ]

  const buildPdfPages = useCallback(() => {
    const generatedAt = new Date().toLocaleString(language === "en" ? "en-US" : "th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    const footerLabel = `${t("callLogsGeneratedAt")} ${generatedAt}`
    const subtitle = `${scopeLabel} · ${dateFilterLabels[dateFilter]} · ${t("callLogsShowingPrefix")} ${filteredLogs.length} ${t("callLogsShowingMiddle")} ${baseFilteredLogs.length} ${t("callLogsShowingSuffix")}`
    const rowChunks = chunkRows(exportRows, 22)

    return rowChunks.map((rows, index) =>
      createPdfPageElement(
        index === 0 ? t("callLogsPageTitle") : `${t("callLogsPageTitle")} (${index + 1})`,
        subtitle,
        buildPdfTable(exportHeaders, rows, t("callLogsEmpty")),
        footerLabel
      )
    )
  }, [baseFilteredLogs.length, dateFilter, dateFilterLabels, exportHeaders, exportRows, filteredLogs.length, language, scopeLabel, t])

  const exportCsv = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.error(t("callLogsNoDataToExport"))
      return
    }

    const rows = [
      [t("callLogsPageTitle")],
      [t("callLogsScopeHeader"), scopeLabel],
      [t("callLogsDateHeader"), dateFilterLabels[dateFilter]],
      [],
      exportHeaders,
      ...exportRows,
    ]
    const csv = "\uFEFF" + rows.map(row => row.map(escapeCsvCell).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `smart-emergency-call-logs-${dateFilter}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success(t("callLogsCsvExported"))
  }, [dateFilter, dateFilterLabels, exportHeaders, exportRows, filteredLogs.length, scopeLabel, t])

  const exportPdf = useCallback(async () => {
    if (filteredLogs.length === 0) {
      toast.error(t("callLogsNoDataToExport"))
      return
    }

    const pdfPages = buildPdfPages()
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

      pdf.save(`smart-emergency-call-logs-${dateFilter}.pdf`)
      toast.success(t("callLogsPdfExported"))
    } catch (error) {
      console.error("Call logs PDF export failed", error)
      toast.error(t("callLogsPdfExportFailed"))
    } finally {
      for (const pageElement of pdfPages) {
        pageElement.remove()
      }
      setIsExportingPdf(false)
    }
  }, [buildPdfPages, dateFilter, filteredLogs.length, t])

  const printCallLogs = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.error(t("callLogsNoDataToExport"))
      return
    }

    setPrintHtml(buildPrintableHtml(buildPdfPages()))
    window.setTimeout(() => {
      window.print()
    }, 250)
  }, [buildPdfPages, filteredLogs.length, t])

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media screen {
              .print-only-call-logs { display: none; }
            }
            @media print {
              @page { size: A4; margin: 0; }
              body * { visibility: hidden !important; }
              .print-only-call-logs, .print-only-call-logs * {
                visibility: visible !important;
              }
              .print-only-call-logs {
                display: block !important;
                position: absolute;
                inset: 0 auto auto 0;
                width: 210mm;
                background: #ffffff;
                color: #111827;
                font-family: Arial, Tahoma, sans-serif;
              }
              .print-only-call-logs .call-logs-print-page {
                width: 210mm;
                min-height: 297mm;
                margin: 0;
                padding: 32px;
                background: #ffffff;
                page-break-after: always;
              }
              html.dark .print-only-call-logs,
              html.dark .print-only-call-logs .call-logs-print-page {
                background: #ffffff;
                color: #111827;
                color-scheme: light;
              }
              html.dark .print-only-call-logs h1,
              html.dark .print-only-call-logs h2,
              html.dark .print-only-call-logs p,
              html.dark .print-only-call-logs div,
              html.dark .print-only-call-logs table,
              html.dark .print-only-call-logs th,
              html.dark .print-only-call-logs td {
                color: #111827 !important;
                border-color: #e5e7eb !important;
              }
              html.dark .print-only-call-logs div[style*="#ef4444"] {
                color: #ef5350 !important;
              }
              .print-only-call-logs .call-logs-print-page:last-child {
                page-break-after: auto;
              }
            }
          `,
        }}
      />
      <div className="print-only-call-logs" dangerouslySetInnerHTML={{ __html: printHtml }} />

      {!isSuperAdmin && agency && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">{preferThai ? agency.nameTh : agency.name}</h2>
                <p className="text-sm text-muted-foreground">{t("callLogsAgencyScopeDescription")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{t("callLogsPageTitle")}</CardTitle>
              <CardDescription>
                {isSuperAdmin
                  ? t("callLogsPageDescriptionAll")
                  : t("callLogsPageDescriptionAgency") + agencyLabel}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void loadCallLogs()} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("callLogsReload")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" type="button" disabled={isExportingPdf} />
                  }
                >
                  {isExportingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t("callLogsExport")}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={exportCsv}>
                    <FileText className="mr-2 h-4 w-4" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportPdf()}>
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={printCallLogs}>
                    <Printer className="mr-2 h-4 w-4" />
                    {t("callLogsPrint")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("callLogsSearchPlaceholder")}
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={value => setDateFilter(value as DateFilter)}>
              <SelectTrigger className="w-full lg:w-36">
                <Calendar className="mr-2 h-4 w-4" />
                {selectLabel(dateFilterLabels[dateFilter])}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("callLogsDateAll")}</SelectItem>
                <SelectItem value="today">{t("callLogsDateToday")}</SelectItem>
                <SelectItem value="week">{t("callLogsDateWeek")}</SelectItem>
                <SelectItem value="month">{t("callLogsDateMonth")}</SelectItem>
              </SelectContent>
            </Select>
            {(isSuperAdmin || availableCategories.length > 1) && (
              <Select
                value={categoryFilter}
                onValueChange={value => setCategoryFilter(value as EmergencyCategory | "all")}
              >
                <SelectTrigger className="w-full lg:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  {selectLabel(
                    categoryFilter === "all"
                      ? t("callLogsAllCategories")
                      : getCategoryLabel(categoryFilter)
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("callLogsAllCategories")}</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {getCategoryLabel(category.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={value => setStatusFilter(value as CallStatus | "all")}>
              <SelectTrigger className="w-full lg:w-44">
                {selectLabel(statusFilter === "all" ? t("callLogsAllStatuses") : statusConfig[statusFilter].label)}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("callLogsAllStatuses")}</SelectItem>
                <SelectItem value="connected">{t("callLogsStatusConnected")}</SelectItem>
                <SelectItem value="busy">{t("callLogsStatusBusy")}</SelectItem>
                <SelectItem value="no-answer">{t("callLogsStatusNoAnswer")}</SelectItem>
                <SelectItem value="wrong-number">{t("callLogsStatusWrongNumber")}</SelectItem>
                <SelectItem value="cancelled">{t("callLogsStatusCancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("callLogsTableDate")}</TableHead>
                  <TableHead>{t("callLogsTableTime")}</TableHead>
                  <TableHead>{t("callLogsTableLocation")}</TableHead>
                  <TableHead>{t("callLogsTableCategory")}</TableHead>
                  <TableHead>{t("callLogsTableAgency")}</TableHead>
                  <TableHead>{t("callLogsTableStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      {t("callLogsLoading")}
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      {t("callLogsEmpty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map(incident => {
                    const category = categories.find(item => item.id === incident.category)
                    const callStatus = getCallStatus(incident)
                    const StatusIcon = statusConfig[callStatus].icon
                    const agencyName = incident.agencyName ?? t("callLogsUnknownAgency")
                    const agencyPhone = incident.agencyPhone ?? "-"

                    return (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(incident.createdAt, language)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(incident.createdAt, language)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {getLocation(incident)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(category?.bgColor, category?.color)}>
                            {getCategoryLabel(incident.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{agencyName}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {agencyPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(statusConfig[callStatus].bgColor, statusConfig[callStatus].color)}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig[callStatus].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <span>
              {t("callLogsShowingRangePrefix")} {pageStart}-{pageEnd} {t("callLogsShowingMiddle")} {filteredLogs.length} {t("callLogsShowingSuffix")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span>{t("callLogsRowsPerPage")}</span>
              <Select value={String(pageSize)} onValueChange={value => setPageSize(Number(value))}>
                <SelectTrigger className="h-9 w-[88px]">
                  {selectLabel(String(pageSize))}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>
                {t("callLogsPageLabel")} {currentPage} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                >
                  {t("callLogsPreviousPage")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  {t("callLogsNextPage")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
