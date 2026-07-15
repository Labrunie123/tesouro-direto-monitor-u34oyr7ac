import { supabase } from '@/lib/supabase/client'
import type { VnaEntry, VnaFetchResult, VnaErrorType } from '@/lib/vna-service'

const TARGET_SELIC_CODE = '760199'
const FETCH_CACHE_KEY = '@tesouro-vision:vna-fetch-cache'
const FETCH_DATE_KEY = '@tesouro-vision:vna-fetch-date'
const FETCH_SYNC_KEY = '@tesouro-vision:vna-fetch-sync'

interface VnaHistoryRow {
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
  return {
    code: TARGET_SELIC_CODE,
    title: row.bond_type === 'NTN-B' ? 'Tesouro IPCA+ com Juros Semestrais 2045' : row.bond_type,
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

export async function fetchVnaFromSupabase(): Promise<VnaFetchResult> {
  const expectedDate = getMostRecentBusinessDay()
  let existingRows: VnaHistoryRow[] | null = null
  let lastErrorType: VnaErrorType = 'API_ERROR'

  try {
    const { data, error } = await supabase
      .from('vna_history')
      .select('*')
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

    if (error) {
      console.warn('[vna-service] Edge function returned error:', error)
    }

    if (!data?.success) {
      const errMsg = data?.error || error?.message || 'Edge function returned failure'
      lastErrorType = (data?.errorType as VnaErrorType) || 'API_ERROR'
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
    console.warn('[vna-service] Edge function invocation failed:', errMsg)

    if (existingRows && existingRows.length > 0) {
      const entries = existingRows.map(mapRowToVnaEntry)
      return {
        entries,
        date: existingRows[0].reference_date,
        status: 'cached',
        fetchedAt: existingRows[0].created_at,
        source: 'Supabase-Cached',
        error: errMsg,
        errorType: errType,
      }
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
