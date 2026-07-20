const ANBIMA_VNA_URLS = [
  'https://www.anbima.com.br/pt_br/informar/vna.asp',
  'https://www.anbima.com.br/informacoes/vna/vna.asp',
]
const FETCH_TIMEOUT_MS = 20000
const TARGET_BOND_LABEL = 'NTN-B 2026-07-15'

export interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
  bondType: string
}

function parseBRNumber(s: string): number {
  const c = s.replace(/[R$\s\xa0]/g, '')
  if (c.includes('.') && c.includes(',')) return parseFloat(c.replace(/\./g, '').replace(',', '.'))
  if (c.includes(',')) return parseFloat(c.replace(',', '.'))
  return parseFloat(c)
}

function parseBRDate(s: string): string | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function stripHtml(h: string): string {
  return h
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractRows(html: string): string[][] {
  const rows: string[][] = []
  for (const t of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    for (const r of t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
        stripHtml(m[1]),
      )
      if (cells.length) rows.push(cells)
    }
  }
  return rows
}

function tryJson(html: string, bt: string, mat: string): VnaEntry[] {
  const patterns = [
    /window\.__DATA__\s*=\s*(\{[\s\S]*?\});/i,
    /window\.__NUXT__\s*=\s*(\{[\s\S]*?\});/i,
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/i,
    /__NEXT_DATA__"[^>]*>(\{[\s\S]*?\})<\/script>/i,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) {
      try {
        return jsonSearch(JSON.parse(m[1]), bt, mat)
      } catch {
        /* continue */
      }
    }
  }
  return []
}

function jsonSearch(d: unknown, bt: string, mat: string): VnaEntry[] {
  const res: VnaEntry[] = []
  const walk = (o: unknown) => {
    if (res.length || !o || typeof o !== 'object') return
    if (Array.isArray(o)) return o.forEach(walk)
    const r = o as Record<string, unknown>
    const type = String(r.tipo_titulo || r.tipoTitulo || r.tipo || '').toUpperCase()
    const maturity = String(r.data_vencimento || r.vencimento || r.maturity || '').split('T')[0]
    if (type.includes(bt) && maturity === mat && r.vna) {
      const vna = Number(r.vna)
      if (vna > 0) {
        const refDate = String(r.data_referencia || r.data || '').split('T')[0]
        res.push({
          code: '760199',
          title: TARGET_BOND_LABEL,
          vna,
          date: refDate || new Date().toISOString().split('T')[0],
          bondType: TARGET_BOND_LABEL,
        })
      }
    }
    Object.values(r).forEach(walk)
  }
  walk(d)
  return res
}

function fromTables(rows: string[][], bt: string, mat: string): VnaEntry[] {
  const entries: VnaEntry[] = []
  const dBR = mat.split('-').reverse().join('/')
  for (const cells of rows) {
    if (!cells.join(' ').toUpperCase().includes(bt)) continue
    if (!cells.some((c) => c.includes(mat) || c.includes(dBR))) continue
    let vna = 0,
      dt = ''
    for (const c of cells) {
      const pd = parseBRDate(c)
      if (pd && !dt) dt = pd
      const nm = c.match(/[\d.]+,\d+/)
      if (nm) {
        const p = parseBRNumber(nm[0])
        if (p > 100) vna = p
      }
    }
    if (vna > 0) {
      entries.push({
        code: '760199',
        title: TARGET_BOND_LABEL,
        vna,
        date: dt || new Date().toISOString().split('T')[0],
        bondType: TARGET_BOND_LABEL,
      })
    }
  }
  return entries
}

async function tryFetch(url: string, method: string, body?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    }
    if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded'
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn('[html-scraper] HTTP', res.status, 'for', url, method)
      return null
    }
    return await res.text()
  } catch (e) {
    console.warn('[html-scraper] Fetch failed for', url, method, ':', e)
    return null
  }
}

export async function scrapeVnaFromAnbimaPage(
  bondType: string,
  maturity: string,
): Promise<VnaEntry[]> {
  console.log('[html-scraper] Starting scrape for', bondType, maturity)
  for (const url of ANBIMA_VNA_URLS) {
    for (const method of ['GET', 'POST'] as const) {
      const body =
        method === 'POST'
          ? new URLSearchParams({ tipo: bondType, data: maturity }).toString()
          : undefined
      const html = await tryFetch(url, method, body)
      if (!html) continue
      console.log('[html-scraper] Fetched', url, method, 'length:', html.length)

      const jsonEntries = tryJson(html, bondType, maturity)
      if (jsonEntries.length > 0) {
        console.log('[html-scraper] Found via JSON extraction:', jsonEntries.length)
        return jsonEntries
      }

      const tableEntries = fromTables(extractRows(html), bondType, maturity)
      if (tableEntries.length > 0) {
        console.log('[html-scraper] Found via table extraction:', tableEntries.length)
        return tableEntries
      }
    }
  }
  console.warn('[html-scraper] No entries found from any URL')
  return []
}
