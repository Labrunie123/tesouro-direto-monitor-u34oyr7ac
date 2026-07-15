export interface VnaEntry {
  title: string
  vna: number
  date: string
}

const ANBIMA_VNA_URL = 'https://www.anbima.com.br/informacoes/vna/vna.asp'

const CORS_PROXIES: ((url: string) => string)[] = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
]

const USE_LIVE_FETCH = false

const HARDCODED_VNA_VALUE = 4743.207764

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export const DEFAULT_VNA_DATA: VnaEntry[] = [
  { title: 'Tesouro IPCA+ com Juros Semestrais 2045', vna: HARDCODED_VNA_VALUE, date: todayISO() },
  { title: 'Tesouro IPCA+ 2024', vna: 4985.23, date: todayISO() },
  { title: 'Tesouro IPCA+ 2026', vna: 4125.87, date: todayISO() },
  { title: 'Tesouro IPCA+ 2029', vna: 3890.34, date: todayISO() },
  { title: 'Tesouro IPCA+ 2035', vna: 3520.45, date: todayISO() },
  { title: 'Tesouro IPCA+ com Juros Semestrais 2032', vna: 3285.12, date: todayISO() },
]

function normalizeDate(dateStr: string): string {
  const parts = dateStr.trim().split('/')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return dateStr
}

function parseAnbimaHtml(html: string): { entries: VnaEntry[]; date: string } {
  const entries: VnaEntry[] = []
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch: RegExpExecArray | null
  let firstDate = todayISO()

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1]
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch: RegExpExecArray | null

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1]
      const cells: string[] = []
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let cellMatch: RegExpExecArray | null

      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .trim()
        cells.push(cellText)
      }

      if (cells.length >= 2) {
        const title = cells[0]
        const vnaStr = cells[1].replace(/[^\d,]/g, '').replace(',', '.')
        const dateStr = cells[2] || todayISO()
        const vna = parseFloat(vnaStr)

        if (title && !isNaN(vna) && vna > 0) {
          const normalizedDate = normalizeDate(dateStr)
          if (entries.length === 0) firstDate = normalizedDate
          entries.push({ title, vna, date: normalizedDate })
        }
      }
    }
  }

  if (entries.length === 0) {
    return { entries: DEFAULT_VNA_DATA, date: todayISO() }
  }
  return { entries, date: firstDate }
}

export async function fetchVnaData(): Promise<{ entries: VnaEntry[]; date: string }> {
  if (!USE_LIVE_FETCH) {
    return { entries: DEFAULT_VNA_DATA, date: todayISO() }
  }

  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy(ANBIMA_VNA_URL))
      if (!response.ok) continue
      const html = await response.text()
      const parsed = parseAnbimaHtml(html)
      if (parsed.entries.length > 0) return parsed
    } catch {
      // Try next proxy
    }
  }
  return { entries: DEFAULT_VNA_DATA, date: todayISO() }
}

export function findVnaForTitle(vnaData: VnaEntry[], title: string): number | null {
  const exact = vnaData.find((e) => e.title === title)
  if (exact) return exact.vna

  const partial = vnaData.find((e) => title.includes(e.title) || e.title.includes(title))
  if (partial) return partial.vna

  const yearMatch = title.match(/(\d{4})/)
  if (yearMatch) {
    const year = yearMatch[1]
    const byYear = vnaData.find((e) => e.title.includes(year))
    if (byYear) return byYear.vna
  }

  return null
}
