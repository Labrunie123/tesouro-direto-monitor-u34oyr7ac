export interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
}

export type VnaFetchStatus = 'fresh' | 'cached' | 'default'

export interface VnaFetchResult {
  entries: VnaEntry[]
  date: string
  status: VnaFetchStatus
}

const TARGET_SELIC_CODE = '760199'
const FETCH_CACHE_KEY = '@tesouro-vision:vna-fetch-cache'
const FETCH_DATE_KEY = '@tesouro-vision:vna-fetch-date'
const ANBIMA_URL = 'https://data.anbima.com.br/titulos-publicos/valor-nominal-atualizado'

const CORS_PROXIES: ((url: string) => string)[] = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
]

async function fetchWithFallback(url: string): Promise<Response> {
  const attempts: { url: string }[] = [
    { url },
    ...CORS_PROXIES.map((proxy) => ({ url: proxy(url) })),
  ]

  for (const attempt of attempts) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch(attempt.url, {
        signal: controller.signal,
        headers: { Accept: 'application/json, text/html' },
      })
      clearTimeout(timeout)
      if (response.ok) return response
    } catch {
      clearTimeout(timeout)
    }
  }

  throw new Error('All fetch attempts failed (direct and proxy)')
}

const todayStr = () => new Date().toISOString().split('T')[0]

export const DEFAULT_VNA_DATA: VnaEntry[] = [
  {
    code: '760199',
    title: 'Tesouro IPCA+ com Juros Semestrais 2045',
    vna: 4743.207764,
    date: todayStr(),
  },
  {
    code: '760198',
    title: 'Tesouro IPCA+ com Juros Semestrais 2035',
    vna: 3128.451893,
    date: todayStr(),
  },
  {
    code: '760197',
    title: 'Tesouro IPCA+ 2029',
    vna: 2856.732451,
    date: todayStr(),
  },
  {
    code: '760196',
    title: 'Tesouro IPCA+ 2035',
    vna: 3012.183567,
    date: todayStr(),
  },
]

const TITLE_CODE_MAP: Record<string, string> = {
  '2045': '760199',
  '2035': '760198',
  '2029': '760197',
}

export function findVnaForTitle(entries: VnaEntry[], title: string): number | null {
  const exact = entries.find((e) => e.title === title && e.vna > 0)
  if (exact) return exact.vna

  const partial = entries.find((e) => title.includes(e.title) || e.title.includes(title))
  if (partial && partial.vna > 0) return partial.vna

  for (const [year, code] of Object.entries(TITLE_CODE_MAP)) {
    if (title.includes(year)) {
      const byCode = entries.find((e) => e.code === code && e.vna > 0)
      if (byCode) return byCode.vna
    }
  }

  if (title.includes('IPCA+')) {
    const target = entries.find((e) => e.code === TARGET_SELIC_CODE && e.vna > 0)
    if (target) return target.vna
  }

  return null
}

function parseAnbimaJson(data: unknown): VnaEntry[] {
  const entries: VnaEntry[] = []

  const records: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.results)
          ? (data as any).results
          : []

  for (const record of records) {
    const code = record.codigoSelic || record.codigo_selic || record.code || record.codigo || ''
    const title = record.titulo || record.title || record.nome || record.name || ''
    const dateRaw =
      record.dataReferencia ||
      record.data_referencia ||
      record.data ||
      record.date ||
      record.dataAtualizacao ||
      record.data_atualizacao
    const entryDate = dateRaw ? String(dateRaw).split('T')[0] : todayStr()
    const vnaRaw =
      record.valorNominalAtualizado ||
      record.valor_nominal_atualizado ||
      record.vna ||
      record.valor ||
      0
    const vna =
      typeof vnaRaw === 'string'
        ? parseFloat(vnaRaw.replace(/\./g, '').replace(',', '.'))
        : Number(vnaRaw)

    if (code && vna > 0) {
      entries.push({ code: String(code), title, vna, date: entryDate })
    }
  }

  return entries
}

function parseAnbimaHtml(html: string): VnaEntry[] {
  const entries: VnaEntry[] = []
  const date = todayStr()

  const jsonMatches = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '')
        const parsed = JSON.parse(jsonStr)
        const extracted = parseAnbimaJson(parsed)
        if (extracted.length > 0) return extracted
      } catch {
        continue
      }
    }
  }

  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      const parsed = JSON.parse(nextDataMatch[1])
      const pageProps = (parsed as any)?.props?.pageProps
      if (pageProps) {
        const extracted = parseAnbimaJson(pageProps)
        if (extracted.length > 0) return extracted
      }
    } catch {
      // continue
    }
  }

  const dateMatch = html.match(
    /data[_-]?(?:referencia|atualizacao|base)["\s:>]+(\d{4}-\d{2}-\d{2})/i,
  )
  const refDate = dateMatch ? dateMatch[1] : date

  const codeRegex = /760199[\s\S]{0,500}?(\d{1,3}(?:\.\d{3})*(?:,\d{2,}))/gi
  let match: RegExpExecArray | null
  while ((match = codeRegex.exec(html)) !== null) {
    const vnaStr = match[1]
    const vna = parseFloat(vnaStr.replace(/\./g, '').replace(',', '.'))
    if (vna > 0) {
      entries.push({
        code: TARGET_SELIC_CODE,
        title: 'Tesouro IPCA+ com Juros Semestrais 2045',
        vna,
        date: refDate,
      })
    }
  }

  const tableRowRegex =
    /760199[\s\S]{0,300}?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,300}?(\d{1,3}(?:\.\d{3})*(?:,\d{2,}))/gi
  while ((match = tableRowRegex.exec(html)) !== null) {
    const [d, m, y] = match[1].split('/')
    const isoDate = `${y}-${m}-${d}`
    const vna = parseFloat(match[2].replace(/\./g, '').replace(',', '.'))
    if (vna > 0) {
      entries.push({
        code: TARGET_SELIC_CODE,
        title: 'Tesouro IPCA+ com Juros Semestrais 2045',
        vna,
        date: isoDate,
      })
    }
  }

  return entries
}

async function fetchVnaFromAnbima(): Promise<VnaEntry[]> {
  const response = await fetchWithFallback(ANBIMA_URL)
  const text = await response.text()

  try {
    const data = JSON.parse(text)
    const entries = parseAnbimaJson(data)
    if (entries.length > 0) return entries
  } catch {
    // not JSON, try HTML parsing
  }

  const entries = parseAnbimaHtml(text)
  if (entries.length > 0) return entries

  throw new Error('Could not extract VNA data from ANBIMA response')
}

function getCachedEntries(): VnaEntry[] | null {
  try {
    const cached = localStorage.getItem(FETCH_CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch {
    // ignore
  }
  return null
}

export async function fetchVnaData(): Promise<VnaFetchResult> {
  const today = todayStr()
  const lastFetchDate = localStorage.getItem(FETCH_DATE_KEY)

  try {
    const entries = await fetchVnaFromAnbima()
    const targetEntry = entries.find((e) => e.code === TARGET_SELIC_CODE)
    const referenceDate = targetEntry?.date || today
    localStorage.setItem(FETCH_CACHE_KEY, JSON.stringify(entries))
    localStorage.setItem(FETCH_DATE_KEY, referenceDate)
    return { entries, date: referenceDate, status: 'fresh' }
  } catch (e) {
    console.warn('ANBIMA VNA fetch failed, using cached/default data', e)

    const cached = getCachedEntries()
    if (cached && cached.length > 0) {
      return { entries: cached, date: lastFetchDate || today, status: 'cached' }
    }

    return { entries: DEFAULT_VNA_DATA, date: lastFetchDate || today, status: 'default' }
  }
}
