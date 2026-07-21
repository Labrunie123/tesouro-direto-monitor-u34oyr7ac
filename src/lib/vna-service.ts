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
  | 'DATABASE_ERROR'
  | 'EMPTY_RESPONSE_ERROR'
  | 'CONFIG_ERROR'
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

const TARGET_BOND_TYPE = 'NTN-B 2026-07-15'
const TARGET_MATURITY_DATE = '2026-07-15'
const FETCH_CACHE_KEY = '@tesouro-vision:vna-fetch-cache'
const FETCH_DATE_KEY = '@tesouro-vision:vna-fetch-date'
const FETCH_SYNC_KEY = '@tesouro-vision:vna-fetch-sync'
const FETCH_ERROR_KEY = '@tesouro-vision:vna-fetch-error'

const todayStr = () => new Date().toISOString().split('T')[0]

export const DEFAULT_VNA_DATA: VnaEntry[] = [
  {
    code: '760100',
    title: `NTN-B ${TARGET_MATURITY_DATE}`,
    vna: 4757.829461,
    date: todayStr(),
  },
]

export function findVnaForTitle(entries: VnaEntry[], title: string): number | null {
  const targetEntry = entries.find(
    (e) => (e.title.includes(TARGET_MATURITY_DATE) || e.code === '760100') && e.vna > 0,
  )
  if (targetEntry) return targetEntry.vna

  if (title.includes('2026')) {
    const byMaturity = entries.find((e) => e.title.includes('2026') && e.vna > 0)
    if (byMaturity) return byMaturity.vna
  }

  if (title.includes('IPCA+') || title.includes('NTN-B')) {
    const fallback = entries.find((e) => e.vna > 0)
    if (fallback) return fallback.vna
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
    backendError = e instanceof Error ? e.message : String(e)
    backendErrorType = classifyError(e)
  }

  const errorMessage =
    backendError ||
    `Não foi possível obter dados do VNA (${TARGET_BOND_TYPE}) da ANBIMA. Exibindo último valor conhecido.`
  const errorType: VnaErrorType = backendErrorType || 'API_ERROR'

  console.warn('[vna-service] VNA fetch fallback:', {
    errorMessage,
    errorType,
    hasCached: !!getCachedEntries(),
  })

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
