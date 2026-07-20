const ANBIMA_VNA_URLS = [
  'https://www.anbima.com.br/pt_br/informar/vna.asp',
  'https://www.anbima.com.br/informacoes/vna/vna.asp',
  'https://www.anbima.com.br/pt_br/informar/vna',
  'https://www.anbima.com.br/informacoes/vna/',
  'https://www.anbima.com.br/pt-br/informar/vna',
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

function parseISODate(s: string): string | null {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function stripHtml(h: string): string {
  return h
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractBalancedJson(str: string, start: number): string | null {
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < str.length; i++) {
    const ch = str[i]
    if (esc) {
      esc = false
      continue
    }
    if (ch === '\\') {
      esc = true
      continue
    }
    if (ch === '"') {
      inStr = !inStr
      continue
    }
    if (inStr) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return str.slice(start, i + 1)
    }
  }
  return null
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

function jsonSearch(d: unknown, bt: string, mat: string): VnaEntry[] {
  const res: VnaEntry[] = []
  const dBR = mat.split('-').reverse().join('/')
  const walk = (o: unknown) => {
    if (res.length || !o || typeof o !== 'object') return
    if (Array.isArray(o)) return o.forEach(walk)
    const r = o as Record<string, unknown>
    const type = String(r.tipo_titulo || r.tipoTitulo || r.tipo || r.type || '').toUpperCase()
    const maturity = String(
      r.data_vencimento || r.vencimento || r.maturity || r.maturity_date || r.data_validade || '',
    ).split('T')[0]
    const hasVna = r.vna ?? r.valor ?? r.value
    if (
      type.includes(bt) &&
      (maturity === mat || maturity.includes(dBR) || maturity.includes(mat.replace(/-/g, '/'))) &&
      hasVna
    ) {
      const vna = Number(hasVna)
      if (vna > 0) {
        const refDate = String(
          r.data_referencia || r.data || r.reference_date || r.date || '',
        ).split('T')[0]
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

function tryJsonStr(jsonStr: string, bt: string, mat: string, label: string): VnaEntry[] {
  try {
    const result = jsonSearch(JSON.parse(jsonStr.trim()), bt, mat)
    if (result.length) console.log(`[html-scraper] Found via ${label}`)
    return result
  } catch {
    return []
  }
}

function tryEmbeddedJson(html: string, bt: string, mat: string): VnaEntry[] {
  const nextMatch = html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/i)
  if (nextMatch) {
    const r = tryJsonStr(nextMatch[1], bt, mat, '__NEXT_DATA__')
    if (r.length) return r
  }

  const assignPatterns = [
    /window\.__DATA__\s*=\s*/i,
    /window\.__NUXT__\s*=\s*/i,
    /window\.__INITIAL_STATE__\s*=\s*/i,
    /window\.__APOLLO_STATE__\s*=\s*/i,
    /window\.__APP_DATA__\s*=\s*/i,
  ]
  for (const p of assignPatterns) {
    const m = html.match(p)
    if (m && m.index !== undefined) {
      const braceIdx = html.indexOf('{', m.index + m[0].length)
      if (braceIdx !== -1) {
        const jsonStr = extractBalancedJson(html, braceIdx)
        if (jsonStr) {
          const r = tryJsonStr(jsonStr, bt, mat, m[0].trim())
          if (r.length) return r
        }
      }
    }
  }

  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const r = tryJsonStr(m[1], bt, mat, 'JSON script tag')
    if (r.length) return r
  }

  return []
}

function fromTables(rows: string[][], bt: string, mat: string): VnaEntry[] {
  const entries: VnaEntry[] = []
  const dBR = mat.split('-').reverse().join('/')
  for (const cells of rows) {
    if (!cells.join(' ').toUpperCase().includes(bt)) continue
    if (
      !cells.some((c) => c.includes(mat) || c.includes(dBR) || c.includes(mat.replace(/-/g, '/')))
    )
      continue
    let vna = 0,
      dt = ''
    for (const c of cells) {
      const pd = parseBRDate(c) || parseISODate(c)
      if (pd && !dt) dt = pd
      const nm = c.match(/[\d.]+,\d+/)
      if (nm) {
        const p = parseBRNumber(nm[0])
        if (p > 100) vna = p
      }
    }
    if (vna > 0)
      entries.push({
        code: '760199',
        title: TARGET_BOND_LABEL,
        vna,
        date: dt || new Date().toISOString().split('T')[0],
        bondType: TARGET_BOND_LABEL,
      })
  }
  return entries
}

async function tryFetch(url: string, method: string, body?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

      const jsonEntries = tryEmbeddedJson(html, bondType, maturity)
      if (jsonEntries.length > 0) return jsonEntries

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
