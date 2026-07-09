import type { ReportCopy, ReportSummary } from "../model/types"
import { formatDateLabel, formatNumber, formatPercent } from "./format"

export function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function buildPdfTable(headers: string[], rows: Array<Array<string | number>>, emptyLabel: string) {
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

export function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks.length > 0 ? chunks : [[]]
}

export function createPdfPageElement(title: string, bodyHtml: string, footerLabel: string) {
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

/**
 * สร้าง DOM page สำหรับ PDF/print จาก report summary
 *
 * Helper นี้ตั้งใจไม่ใช้ component React เพราะต้องส่ง element ให้ html2canvas/jsPDF โดยตรง
 * ถ้าแก้ style ต้องเช็กทั้ง PDF export และ browser print ใน dark mode
 */
export function buildPdfReportPages(
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
      <p style="font-size:14px;color:#6b7280;margin:0;">${escapeHtml(scopeLabel)} ยท ${escapeHtml(rangeLabel)}</p>
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

/**
 * แปลง PDF page DOM เป็น HTML สำหรับ print-only container
 *
 * หลังดึง innerHTML แล้วต้อง remove element ทิ้ง เพื่อไม่ให้ offscreen node ค้างใน document
 */
export function buildPrintableReportHtml(
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
