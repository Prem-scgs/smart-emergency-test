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

export function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks.length > 0 ? chunks : [[]]
}

/**
 * สร้าง DOM page สำหรับ PDF/print ของ call logs
 *
 * ตั้ง style inline เพื่อให้ html2canvas render เหมือนกันทุกธีม และไม่พึ่ง class จาก dashboard
 */
export function createPdfPageElement(title: string, subtitle: string, bodyHtml: string, footerLabel: string) {
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

/**
 * ดึง HTML จาก offscreen pages มาใส่ print-only container
 *
 * หลังอ่าน innerHTML ต้อง remove node เพื่อไม่ให้ element ล่องหนค้างใน document
 */
export function buildPrintableHtml(pages: HTMLDivElement[]) {
  return pages
    .map(page => {
      const content = page.innerHTML
      page.remove()
      return `<main class="call-logs-print-page">${content}</main>`
    })
    .join("")
}
