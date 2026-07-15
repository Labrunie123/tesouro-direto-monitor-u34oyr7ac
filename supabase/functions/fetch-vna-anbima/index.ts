import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ANBIMA_TOKEN_URL = 'https://api.anbima.com.br/oauth/access-token'
const ANBIMA_VNA_URL =
  'https://api-sandbox.anbima.com.br/feed/precos-indices/v1/titulos-publicos/vna'
const FETCH_TIMEOUT_MS = 20000
const TARGET_MATURITY_DATE = '2026-07-15'
const TARGET_BOND_TYPE = 'NTN-B 2026-07-15'

interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
  bondType: string
}

function okResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function getLast5BusinessDays(): string[] {
  const dates: string[] = []
  const today = new Date()
  let count = 0
  let offset = 0
  while (count < 5) {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().split('T')[0])
      count++
    }
    offset++
  }
  return dates
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

async function getAnbimaToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch(ANBIMA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const status = response.status
    if (status === 401 || status === 403) {
      throw new Error(
        `ANBIMA authentication unauthorized (${status}). Verify ANBIMA_Client_ID and ANBIMA_Client_Secret. ANBIMA response: ${text}`,
      )
    }
    if (status === 429) {
      throw new Error('ANBIMA auth rate limit exceeded. Please try again later.')
    }
    throw new Error(`ANBIMA auth request failed (HTTP ${status}): ${text}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error('ANBIMA auth succeeded but no access_token was returned')
  }

  return data.access_token as string
}

function getMaturityDate(t: Record<string, unknown>): string | null {
  const raw =
    t.data_vencimento || t.vencimento || t.maturity_date || t.due_date || t.data_maturidade
  if (!raw) return null
  return String(raw).split('T')[0]
}

function extractTitulosFromItem(item: Record<string, unknown>): VnaEntry[] {
  const entries: VnaEntry[] = []
  const parentRefDate = String(item.data_referencia || item.data || item.reference_date || '')

  const titulos = item.titulos
  if (Array.isArray(titulos)) {
    for (const titulo of titulos) {
      const t = titulo as Record<string, unknown>
      const maturityDate = getMaturityDate(t)
      if (maturityDate !== TARGET_MATURITY_DATE) continue

      const vna = Number(t.vna || t.valor || 0)
      const code = String(t.codigo_selic || t.code || t.codigo || '760199')
      const title = String(t.titulo || t.title || t.nome_titulo || TARGET_BOND_TYPE)
      const entryDate = String(t.data_referencia || t.data || parentRefDate || '')

      if (vna > 0 && entryDate) {
        entries.push({
          code,
          title,
          vna,
          date: entryDate.split('T')[0],
          bondType: TARGET_BOND_TYPE,
        })
      }
    }
  } else {
    const maturityDate = getMaturityDate(item)
    if (maturityDate !== TARGET_MATURITY_DATE) return entries

    const vna = Number(item.vna || item.valor || 0)
    const code = String(item.codigo_selic || item.code || item.codigo || '760199')
    const title = String(item.titulo || item.title || item.nome_titulo || TARGET_BOND_TYPE)

    if (vna > 0 && parentRefDate) {
      entries.push({
        code,
        title,
        vna,
        date: parentRefDate.split('T')[0],
        bondType: TARGET_BOND_TYPE,
      })
    }
  }

  return entries
}

function parseAnbimaVna(data: unknown): VnaEntry[] {
  const items: unknown[] = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.data as unknown[]) ||
      ((data as Record<string, unknown>)?.items as unknown[]) ||
      []

  const entries: VnaEntry[] = []
  for (const item of items) {
    if (item && typeof item === 'object') {
      entries.push(...extractTitulosFromItem(item as Record<string, unknown>))
    }
  }
  return entries
}

interface FetchResult {
  entries: VnaEntry[]
  status: number
  rawBody: string
}

async function fetchVnaForDate(
  token: string,
  clientId: string,
  date?: string,
): Promise<FetchResult> {
  const url = date ? `${ANBIMA_VNA_URL}?data_referencia=${date}` : ANBIMA_VNA_URL

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      client_id: clientId,
      access_token: token,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  const rawBody = await response.text().catch(() => '')

  if (response.status === 401 || response.status === 403) {
    return {
      entries: [],
      status: response.status,
      rawBody: `ANBIMA VNA API unauthorized (${response.status}). Token may be invalid or expired. Response: ${rawBody}`,
    }
  }

  if (response.status === 429) {
    return { entries: [], status: 429, rawBody: 'ANBIMA VNA API rate limit exceeded.' }
  }

  if (!response.ok) {
    return { entries: [], status: response.status, rawBody }
  }

  let data: unknown
  try {
    data = JSON.parse(rawBody)
  } catch {
    return {
      entries: [],
      status: response.status,
      rawBody: `Parse error. Raw: ${rawBody.slice(0, 500)}`,
    }
  }

  return { entries: parseAnbimaVna(data), status: response.status, rawBody }
}

async function fetchVnaWithFallback(
  token: string,
  clientId: string,
): Promise<{ entries: VnaEntry[]; triedDates: string[]; lastStatus: number; lastRawBody: string }> {
  const recentDate = getMostRecentBusinessDay()
  const triedDates: string[] = [recentDate]
  const latestResult = await fetchVnaForDate(token, clientId, recentDate)

  if (latestResult.entries.length > 0) {
    return {
      entries: latestResult.entries,
      triedDates,
      lastStatus: latestResult.status,
      lastRawBody: latestResult.rawBody,
    }
  }

  if (latestResult.status !== 200) {
    return {
      entries: [],
      triedDates,
      lastStatus: latestResult.status,
      lastRawBody: latestResult.rawBody,
    }
  }

  const dates = getLast5BusinessDays()
  let lastStatus = latestResult.status
  let lastRawBody = latestResult.rawBody

  for (const date of dates) {
    if (triedDates.includes(date)) continue
    triedDates.push(date)
    const dateResult = await fetchVnaForDate(token, clientId, date)
    lastStatus = dateResult.status
    lastRawBody = dateResult.rawBody

    if (dateResult.entries.length > 0) {
      return {
        entries: dateResult.entries,
        triedDates,
        lastStatus: dateResult.status,
        lastRawBody: dateResult.rawBody,
      }
    }

    if (dateResult.status !== 200) {
      return {
        entries: [],
        triedDates,
        lastStatus: dateResult.status,
        lastRawBody: dateResult.rawBody,
      }
    }
  }

  return { entries: [], triedDates, lastStatus, lastRawBody }
}

async function insertVnaHistory(entries: VnaEntry[]): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const rows = entries
    .filter((e) => e.vna > 0 && e.date)
    .map((e) => ({
      reference_date: e.date,
      vna_value: e.vna,
      bond_type: e.bondType || TARGET_BOND_TYPE,
    }))

  if (rows.length === 0) return

  const { error } = await supabase.from('vna_history').upsert(rows, {
    onConflict: 'reference_date,bond_type',
    ignoreDuplicates: true,
  })

  if (error) {
    throw new Error(`Database error during VNA persistence: ${error.message}`)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientId = Deno.env.get('ANBIMA_CLIENT_ID') || Deno.env.get('ANBIMA_Client_ID')
    const clientSecret =
      Deno.env.get('ANBIMA_CLIENT_SECRET') || Deno.env.get('ANBIMA_Client_Secret')

    if (!clientId || !clientSecret) {
      return okResponse({
        success: false,
        error:
          'ANBIMA credentials not configured. Set ANBIMA_Client_ID and ANBIMA_Client_Secret in Supabase project secrets.',
        errorType: 'CONFIG_ERROR',
        entries: [],
        date: null,
        fetchedAt: new Date().toISOString(),
        source: 'ANBIMA',
      })
    }

    const token = await getAnbimaToken(clientId, clientSecret)
    const { entries, triedDates, lastStatus, lastRawBody } = await fetchVnaWithFallback(
      token,
      clientId,
    )

    if (entries.length === 0) {
      const isApiError = lastStatus !== 200
      const errorMsg = isApiError
        ? `ANBIMA VNA API returned HTTP ${lastStatus}. Raw response: ${lastRawBody.slice(0, 500)}`
        : `No bond with maturity date ${TARGET_MATURITY_DATE} (${TARGET_BOND_TYPE}) was found in the ANBIMA API response for the most recent dates. Dates attempted: ${triedDates.join(', ')}. The bond may not have been issued yet or the API response structure may have changed. Last raw response (truncated): ${lastRawBody.slice(0, 500)}`

      return okResponse({
        success: false,
        error: errorMsg,
        errorType: isApiError ? 'API_ERROR' : 'EMPTY_RESPONSE_ERROR',
        entries: [],
        date: null,
        fetchedAt: new Date().toISOString(),
        source: 'ANBIMA',
        triedDates,
        targetBond: TARGET_BOND_TYPE,
        targetMaturity: TARGET_MATURITY_DATE,
      })
    }

    await insertVnaHistory(entries)

    const target = entries.find((e) => e.bondType === TARGET_BOND_TYPE) || entries[0]

    return okResponse({
      success: true,
      entries,
      date: target.date,
      fetchedAt: new Date().toISOString(),
      source: 'ANBIMA',
      targetBond: TARGET_BOND_TYPE,
      targetMaturity: TARGET_MATURITY_DATE,
    })
  } catch (error) {
    let errorType = 'UNKNOWN_ERROR'
    let userMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        errorType = 'TIMEOUT_ERROR'
        userMessage =
          'Timeout Error: ANBIMA API did not respond within 20 seconds. Please try again in a few moments.'
      } else if (error instanceof TypeError) {
        errorType = 'NETWORK_ERROR'
        userMessage =
          'Network Error: Unable to connect to ANBIMA API. Please verify network connectivity.'
      } else {
        const msg = error.message.toLowerCase()
        if (
          msg.includes('unauthorized') ||
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('auth')
        ) {
          errorType = 'AUTH_ERROR'
        } else if (msg.includes('rate limit') || msg.includes('429')) {
          errorType = 'RATE_LIMIT_ERROR'
        } else if (msg.includes('database')) {
          errorType = 'DATABASE_ERROR'
        } else if (msg.includes('parse') || msg.includes('json') || msg.includes('html')) {
          errorType = 'PARSE_ERROR'
        } else if (msg.includes('no vna entries') || msg.includes('empty')) {
          errorType = 'EMPTY_RESPONSE_ERROR'
        } else {
          errorType = 'API_ERROR'
        }
      }
    }

    return okResponse({
      success: false,
      error: userMessage,
      errorType,
      entries: [],
      date: null,
      fetchedAt: new Date().toISOString(),
      source: 'ANBIMA',
      targetBond: TARGET_BOND_TYPE,
      targetMaturity: TARGET_MATURITY_DATE,
    })
  }
})
