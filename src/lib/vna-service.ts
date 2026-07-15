import { fetchVnaFromSupabase } from '@/services/vna'

export interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
}

export type VnaFetchStatus = 'fresh' | 'cached' | 'default'

export type VnaErrorType =
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR'

export interface VnaFetchResult {
  entries: VnaEntry[]
  date: string
  status: VnaFetchStatus
  fetchedAt: string | null
  error?: string
  errorType?: VnaErrorType
  source?: string
}

const TARGET_SELIC_CODE = '760199'
const FETCH_CACHE_KEY = '@tesouro-vision:vna-fetch-cache'
const FETCH_DATE_KEY = '@tesouro-vision:vna-fetch-date'
const FETCH_SYNC_KEY = '@tesouro-vision:vna-fetch-sync'
const FETCH_ERROR_KEY = '@tesouro-vision:vna-fetch-error'

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
  { code: '760197', title: 'Tesouro IPCA+ 2029', vna: 2856.732451, date: todayStr() },
  { code: '760196', title: 'Tesouro IPCA+ 2035', vna: 3012.183567, date: todayStr() },
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

function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function getMostRecentBusinessDay(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (isBusinessDay(today)) return today.toISOString().split('T')[0]
  const friday = new Date(today)
  friday.setDate(friday.getDate() - (today.getDay() === 0 ? 2 : 1))
  return friday.toISOString().split('T')[0]
}

function getCachedEntries(): VnaEntry[] | null {
  try {
    const cached = localStorage.getItem(FETCH_CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch {
    /* ignore */
  }
  return null
}

function getCachedSyncTime(): string | null {
  try {
    return localStorage.getItem(FETCH_SYNC_KEY)
  } catch {
    return null
  }
}

function getCachedDate(): string | null {
  try {
    return localStorage.getItem(FETCH_DATE_KEY)
  } catch {
    return null
  }
}

function classifyError(error: unknown): VnaErrorType {
  if (error instanceof TypeError) return 'NETWORK_ERROR'
  if (error instanceof DOMException) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'TIMEOUT_ERROR'
  }
  if (error instanceof SyntaxError) return 'PARSE_ERROR'
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('parse') || msg.includes('json') || msg.includes('html')) return 'PARSE_ERROR'
    if (
      msg.includes('unauthorized') ||
      msg.includes('auth') ||
      msg.includes('401') ||
      msg.includes('403')
    )
      return 'AUTH_ERROR'
    if (msg.includes('status') || msg.includes('format') || msg.includes('api')) return 'API_ERROR'
  }
  return 'UNKNOWN_ERROR'
}

export async function fetchVnaData(onFallback?: () => void): Promise<VnaFetchResult> {
  const expectedDate = getMostRecentBusinessDay()
  const lastFetchDate = getCachedDate()

  let backendError: string | null = null
  let backendErrorType: VnaErrorType | null = null

  try {
    const supaResult = await fetchVnaFromSupabase()
    if (supaResult.entries.length > 0) return supaResult
    backendError = supaResult.error || null
    backendErrorType = supaResult.errorType || null
  } catch (e) {
    console.warn('[vna-service] Supabase VNA fetch failed:', e)
  }

  const errorMessage =
    backendError ||
    'Não foi possível obter dados do VNA da ANBIMA. Exibindo último valor conhecido.'
  const errorType: VnaErrorType = backendErrorType || 'API_ERROR'

  try {
    localStorage.setItem(
      FETCH_ERROR_KEY,
      JSON.stringify({
        message: errorMessage,
        type: errorType,
        timestamp: new Date().toISOString(),
      }),
    )
  } catch {
    /* ignore */
  }

  const cached = getCachedEntries()
  if (cached && cached.length > 0) {
    return {
      entries: cached,
      date: lastFetchDate || expectedDate,
      status: 'cached',
      fetchedAt: getCachedSyncTime(),
      error: errorMessage,
      errorType,
    }
  }

  return {
    entries: DEFAULT_VNA_DATA,
    date: expectedDate,
    status: 'default',
    fetchedAt: null,
    error: errorMessage,
    errorType,
  }
}

export function getLastError(): { message: string; type: string; timestamp: string } | null {
  try {
    const raw = localStorage.getItem(FETCH_ERROR_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearLastError(): void {
  try {
    localStorage.removeItem(FETCH_ERROR_KEY)
  } catch {
    /* ignore */
  }
}

const MANUAL_VNA_KEY = '@tesouro-vision:vna-manual'
const MANUAL_VNA_DATE_KEY = '@tesouro-vision:vna-manual-date'

export interface ManualVnaData {
  vna: number
  date: string
}

export function saveManualVna(vna: number): void {
  try {
    localStorage.setItem(MANUAL_VNA_KEY, String(vna))
    localStorage.setItem(MANUAL_VNA_DATE_KEY, new Date().toISOString())
  } catch {
    /* ignore */
  }
}

export function getManualVna(): ManualVnaData | null {
  try {
    const raw = localStorage.getItem(MANUAL_VNA_KEY)
    if (!raw) return null
    const vna = parseFloat(raw)
    if (isNaN(vna) || vna <= 0) return null
    const date = localStorage.getItem(MANUAL_VNA_DATE_KEY) || new Date().toISOString()
    return { vna, date }
  } catch {
    return null
  }
}

export function clearManualVna(): void {
  try {
    localStorage.removeItem(MANUAL_VNA_KEY)
    localStorage.removeItem(MANUAL_VNA_DATE_KEY)
  } catch {
    /* ignore */
  }
}
