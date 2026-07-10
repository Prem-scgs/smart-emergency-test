/**
 * Formatting helper ของ reports page
 *
 * ใช้ร่วมกันทั้ง UI, CSV และ PDF/print เพื่อให้ตัวเลข/เปอร์เซ็นต์/วันที่แสดงตรงกัน
 * ถ้าแก้ต้องทดสอบ export กับ chart labels ด้วย.
 */
export function getChartConfig(totalLabel: string, closedLabel: string) {
  return {
    count: { label: totalLabel, color: "var(--chart-1)" },
    closedCount: { label: closedLabel, color: "var(--chart-3)" },
  }
}

export const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#64748b",
]

export function formatNumber(value: number | undefined, language: "th" | "en") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "th-TH").format(value ?? 0)
}

export function formatPercent(value: number, language: "th" | "en") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "th-TH", { maximumFractionDigits: 1 }).format(value) + "%"
}

export function formatDateLabel(value: string, language: "th" | "en") {
  const date = new Date(value + "T00:00:00")
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(language === "en" ? "en-US" : "th-TH", { day: "2-digit", month: "short" })
}

export function escapeCsvCell(value: string | number) {
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return '"' + text.replaceAll('"', '""') + '"'
}

export function buildCsvSection(title: string, rows: Array<Array<string | number>>) {
  return [
    [title],
    ...rows,
    [],
  ]
}
