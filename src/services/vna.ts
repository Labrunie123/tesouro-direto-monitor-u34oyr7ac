import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { VnaEntry, VnaFetchResult, VnaErrorType } from '@/lib/vna-service'

const TARGET_BOND_TYPE = 'NTN-B 2026-07-15'
const TARGET_MATURITY_DATE = '2026-07-15'
const TARGET_SELIC_CODE = '760199'
const FETCH_CACHE_KEY = '@tesouro-vision:vna-fetch-cache'
const FETCH_DATE_KEY = '@tesouro-vision:vna-fetch-date'
const FETCH_SYNC_KEY = '@tesouro-vision:vna-fetch-sync'

const ERROR_TYPE_MAP: Record<string, VnaErrorType> = {
  RATE_LIMIT_ERROR: 'API_ERROR',
  EMPTY_RESPONSE_ERROR: 'EMPTY_RESPONSE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  CONFIG_ERROR: 'API_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  API_ERROR: 'API_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

export interface VnaHistoryRow {
  id: string
  reference_date: string
  vna_value: number
  bond_type: string
  created_at: string
}

function getMostRecentBusinessDay(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  if (day !== 0 && day !== 6) return today.toISOString().split('T')[0]
  const friday = new Date(today)
  friday.setDate(friday.getDate() - (day === 0 ? 2 : 1))
  return friday.toISOString().split('T')[0]
}

function mapRowToVnaEntry(row: VnaHistoryRow): VnaEntry {
  const isTargetBond = row.bond_type === TARGET_BOND_TYPE
  return {
    code: TARGET_SELIC_CODE,
    title: isTargetBond ? `NTN-B ${TARGET_MATURITY_DATE}` : row.bond_type,
    vna: Number(row.vna_value),
    date: row.reference_date,
  }
}

function cacheToLocalStorage(entries: VnaEntry[], date: string, fetchedAt: string): void {
  try {
    localStorage.setItem(FETCH_CACHE_KEY, JSON.stringify(entries))
    localStorage.setItem(FETCH_DATE_KEY, date)
    localStorage.setItem(FETCH_SYNC_KEY, fetchedAt)
  } catch {
    // ignore
  }
}

function buildCachedResult(
  existingRows: VnaHistoryRow[],
  error: string,
  errorType: VnaErrorType,
): VnaFetchResult {
  const entries = existingRows.map(mapRowToVnaEntry)
  return {
    entries,
    date: existingRows[0].reference_date,
    status: 'cached',
    fetchedAt: existingRows[0].created_at,
    source: 'Supabase-Cached',
    error,
    errorType,
  }
}

async function readErrorBody(
  context: Response,
): Promise<{ error?: string; errorType?: string; anbimaStatus?: number } | null> {
  try {
    const text = await context.text()
    try {
      return JSON.parse(text)
    } catch {
      return { error: text || `HTTP ${context.status} error` }
    }
  } catch {
    return null
  }
}

export async function fetchVnaHistory(): Promise<VnaHistoryRow[]> {
  const { data, error } = await supabase
    .from('vna_history')
    .select('*')
    .eq('bond_type', TARGET_BOND_TYPE)
    .order('reference_date', { ascending: true })
    .limit(90)

  if (error) throw error
  return (data || []) as VnaHistoryRow[]
}

export async function fetchVnaFromSupabase(): Promise<VnaFetchResult> {
  const expectedDate = getMostRecentBusinessDay()
  let existingRows: VnaHistoryRow[] | null = null
  let lastErrorType: VnaErrorType = 'API_ERROR'

  try {
    const { data, error } = await supabase
      .from('vna_history')
      .select('*')
      .eq('bond_type', TARGET_BOND_TYPE)
      .order('reference_date', { ascending: false })
      .limit(10)

    if (!error && data) {
      existingRows = data as VnaHistoryRow[]
    }
  } catch (e) {
    console.warn('[vna-service] Database query failed:', e)
  }

  if (existingRows && existingRows.length > 0) {
    const hasExpected = existingRows.some((r) => r.reference_date === expectedDate)

    if (hasExpected) {
      const entries = existingRows.map(mapRowToVnaEntry)
      const latest = existingRows[0]
      cacheToLocalStorage(entries, latest.reference_date, latest.created_at)
      return {
        entries,
        date: latest.reference_date,
        status: 'fresh',
        fetchedAt: latest.created_at,
        source: 'Supabase-ANBIMA',
      }
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('fetch-vna-anbima')

    if (error instanceof FunctionsHttpError) {
      const errorBody = await readErrorBody(error.context)
      const status = error.context.status
      const errMsg = errorBody?.error || `Error ${status}: Edge function failed`
      const rawType = (errorBody?.errorType as string) || 'API_ERROR'
      lastErrorType = (ERROR_TYPE_MAP[rawType] || 'API_ERROR') as VnaErrorType

      if (errorBody?.foundBonds) {
        console.warn(
          '[vna-service] Bonds found by ANBIMA but target not matched:',
          errorBody.foundBonds,
        )
      }

      const formattedMsg = `Error ${status}: ${errMsg}`

      if (existingRows && existingRows.length > 0) {
        return buildCachedResult(existingRows, formattedMsg, lastErrorType)
      }

      return {
        entries: [],
        date: expectedDate,
        status: 'default',
        fetchedAt: null,
        error: formattedMsg,
        errorType: lastErrorType,
      }
    }

    if (error) {
      const errMsg = error.message || 'Edge function invocation failed'
      lastErrorType = 'NETWORK_ERROR'
      throw new Error(errMsg)
    }

    if (!data?.success) {
      let errMsg = data?.error || 'Edge function returned failure'
      const rawType = (data?.errorType as string) || 'API_ERROR'
      lastErrorType = (ERROR_TYPE_MAP[rawType] || 'API_ERROR') as VnaErrorType

      if (data?.foundBonds) {
        console.warn('[vna-service] Bonds found by ANBIMA but target not matched:', data.foundBonds)
      }

      throw new Error(errMsg)
    }

    const entries: VnaEntry[] = data.entries || []
    if (entries.length === 0) throw new Error('No VNA entries returned')

    const refDate = data.date || expectedDate
    const fetchedAt = data.fetchedAt || new Date().toISOString()
    cacheToLocalStorage(entries, refDate, fetchedAt)

    return {
      entries,
      date: refDate,
      status: 'fresh',
      fetchedAt,
      source: data.source || 'ANBIMA',
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    const errType = lastErrorType

    if (existingRows && existingRows.length > 0) {
      return buildCachedResult(existingRows, errMsg, errType)
    }

    return {
      entries: [],
      date: expectedDate,
      status: 'default',
      fetchedAt: null,
      error: errMsg,
      errorType: errType,
    }
  }
}
