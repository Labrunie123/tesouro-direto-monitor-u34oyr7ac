export interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
}

export type VnaFetchStatus = 'fresh' | 'cached' | 'default'

export type VnaErrorType =
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

const HOOK_URL = import.meta.env.VITE_VNA_HOOK_URL || '/hooks/fetch-vna'
const ALTERNATIVE_HOOK_URL =
  import.meta.env.VITE_VNA_ALTERNATIVE_HOOK_URL || '/hooks/fetch-vna-alternative'

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

interface HookResponse {
  success: boolean
  entries: VnaEntry[]
  date: string | null
  error?: string
  errorType?: string
  fetchedAt?: string
  source?: string
}

async function fetchFromHook(): Promise<HookResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(HOOK_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timeout)

    const data: HookResponse = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Hook returned status ${response.status}`)
    }

    return data
  } catch (error) {
    clearTimeout(timeout)
    if (
      error instanceof DOMException &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    ) {
      throw new Error('Tempo limite excedido ao conectar com a API da B3')
    }
    throw error
  }
}

async function fetchFromAlternativeHook(): Promise<HookResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(ALTERNATIVE_HOOK_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timeout)

    const data: HookResponse = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Alternative hook returned status ${response.status}`)
    }

    return data
  } catch (error) {
    clearTimeout(timeout)
    if (
      error instanceof DOMException &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    ) {
      throw new Error('Tempo limite excedido ao conectar com fonte alternativa')
    }
    throw error
  }
}

async function fetchWithRetry(maxRetries: number = 2): Promise<HookResponse> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFromHook()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(
        `[vna-service] B3 API fetch attempt ${attempt + 1}/${maxRetries + 1} failed:`,
        lastError.message,
      )
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('All retry attempts failed')
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

function classifyError(error: unknown): VnaErrorType {
  if (error instanceof TypeError) return 'NETWORK_ERROR'
  if (error instanceof DOMException) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'TIMEOUT_ERROR'
  }
  if (error instanceof Error) {
    if (error.message.includes('parse') || error.message.includes('JSON')) return 'PARSE_ERROR'
    if (error.message.includes('status') || error.message.includes('format')) return 'API_ERROR'
  }
  return 'UNKNOWN_ERROR'
}

export async function fetchVnaData(onFallback?: () => void): Promise<VnaFetchResult> {
  const today = todayStr()
  const lastFetchDate = getCachedDate()
  const expectedDate = getMostRecentBusinessDay()

  try {
    const result = await fetchWithRetry(2)

    const targetEntry = result.entries.find((e) => e.code === TARGET_SELIC_CODE && e.vna > 0)
    const referenceDate = targetEntry?.date || result.date || today

    localStorage.setItem(FETCH_CACHE_KEY, JSON.stringify(result.entries))
    localStorage.setItem(FETCH_DATE_KEY, referenceDate)
    localStorage.setItem(FETCH_SYNC_KEY, result.fetchedAt || new Date().toISOString())
    localStorage.removeItem(FETCH_ERROR_KEY)

    return {
      entries: result.entries,
      date: referenceDate,
      status: 'fresh',
      fetchedAt: result.fetchedAt || new Date().toISOString(),
      source: 'B3-TesouroDireto',
    }
  } catch (e) {
    const primaryError = e instanceof Error ? e.message : String(e)
    const primaryErrorType = classifyError(e)

    console.warn(
      '[vna-service] B3 API failed, attempting alternative source (Brasil Indicadores):',
      {
        message: primaryError,
        type: primaryErrorType,
        timestamp: new Date().toISOString(),
      },
    )

    onFallback?.()

    try {
      const altResult = await fetchFromAlternativeHook()
      const targetEntry = altResult.entries.find(
        (entry) => entry.code === TARGET_SELIC_CODE && entry.vna > 0,
      )
      const referenceDate = targetEntry?.date || altResult.date || today

      localStorage.setItem(FETCH_CACHE_KEY, JSON.stringify(altResult.entries))
      localStorage.setItem(FETCH_DATE_KEY, referenceDate)
      localStorage.setItem(FETCH_SYNC_KEY, altResult.fetchedAt || new Date().toISOString())
      localStorage.removeItem(FETCH_ERROR_KEY)

      console.info('[vna-service] Alternative source (Brasil Indicadores) fetch succeeded:', {
        vna: targetEntry?.vna,
        date: referenceDate,
        timestamp: new Date().toISOString(),
      })

      return {
        entries: altResult.entries,
        date: referenceDate,
        status: 'fresh',
        fetchedAt: altResult.fetchedAt || new Date().toISOString(),
        source: 'BrasilIndicadores',
      }
    } catch (altError) {
      const errorMessage = altError instanceof Error ? altError.message : String(altError)
      const errorType = classifyError(altError)

      console.error('[vna-service] Both primary and alternative sources failed:', {
        primaryError: primaryError,
        alternativeError: errorMessage,
        timestamp: new Date().toISOString(),
      })

      localStorage.setItem(
        FETCH_ERROR_KEY,
        JSON.stringify({
          message: errorMessage,
          type: errorType,
          timestamp: new Date().toISOString(),
        }),
      )

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
    // ignore
  }
}
