import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ANBIMA_TOKEN_URL = 'https://api.anbima.com.br/oauth/access-token'
const ANBIMA_VNA_URL =
  'https://api-sandbox.anbima.com.br/feed/precos-indices/v1/titulos-publicos/vna'

const FETCH_TIMEOUT_MS = 20000

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

async function getAnbimaToken(clientId: string, clientSecret: string): Promise<string> {
  console.log('[fetch-vna-anbima] Step 1: Starting ANBIMA OAuth authentication')
  console.log('[fetch-vna-anbima] Token URL:', ANBIMA_TOKEN_URL)
  console.log('[fetch-vna-anbima] Client ID present:', !!clientId)
  console.log('[fetch-vna-anbima] Client Secret present:', !!clientSecret)

  const credentials = btoa(`${clientId}:${clientSecret}`)
  console.log('[fetch-vna-anbima] Sending auth request with Basic credentials header')

  const response = await fetch(ANBIMA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  console.log('[fetch-vna-anbima] Auth response status:', response.status)

  if (response.status === 401 || response.status === 403) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] AUTH FAILED: Status', response.status, 'Body:', text)
    throw new Error(
      `ANBIMA authentication unauthorized (${response.status}). Verify ANBIMA_Client_ID and ANBIMA_Client_Secret. ANBIMA response: ${text}`,
    )
  }

  if (response.status === 429) {
    console.error('[fetch-vna-anbima] AUTH RATE LIMITED: Too many token requests')
    throw new Error('ANBIMA auth rate limit exceeded. Please try again later.')
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] AUTH HTTP ERROR: Status', response.status, 'Body:', text)
    throw new Error(`ANBIMA auth request failed (HTTP ${response.status}): ${text}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    console.error(
      '[fetch-vna-anbima] AUTH ERROR: No access_token in response:',
      JSON.stringify(data),
    )
    throw new Error('ANBIMA auth succeeded but no access_token was returned in the response')
  }

  console.log('[fetch-vna-anbima] Step 1 Complete: Token obtained successfully')
  return data.access_token as string
}

function parseAnbimaVna(data: unknown): VnaEntry[] {
  const items: unknown[] = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.data as unknown[]) ||
      ((data as Record<string, unknown>)?.items as unknown[]) ||
      []

  const entries: VnaEntry[] = []

  for (const item of items) {
    const obj = item as Record<string, unknown>
    const bondType = String(obj.tipo_titulo || obj.tipo || obj.bond_type || 'NTN-B')
    const vna = Number(obj.vna || obj.valor || 0)
    const refDate = String(obj.data_referencia || obj.data || obj.reference_date || '')
    const code = String(obj.codigo_selic || obj.code || obj.codigo || '760199')
    const title = String(obj.titulo || obj.title || obj.nome_titulo || bondType)

    if (vna > 0 && refDate) {
      entries.push({
        code,
        title,
        vna,
        date: refDate.split('T')[0],
        bondType,
      })
    }
  }
  return entries
}

async function fetchVnaFromAnbima(token: string, clientId: string): Promise<VnaEntry[]> {
  console.log('[fetch-vna-anbima] Step 2: Fetching VNA data from ANBIMA sandbox API')
  console.log('[fetch-vna-anbima] VNA URL:', ANBIMA_VNA_URL)

  const response = await fetch(ANBIMA_VNA_URL, {
    method: 'GET',
    headers: {
      client_id: clientId,
      access_token: token,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  console.log('[fetch-vna-anbima] VNA API response status:', response.status)

  if (response.status === 401 || response.status === 403) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] VNA API UNAUTHORIZED: Status', response.status, 'Body:', text)
    throw new Error(
      `ANBIMA VNA API unauthorized (${response.status}). Token may be invalid or expired. ANBIMA response: ${text}`,
    )
  }

  if (response.status === 429) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] VNA API RATE LIMITED: Body:', text)
    throw new Error('ANBIMA VNA API rate limit exceeded. Please try again later.')
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] VNA API HTTP ERROR: Status', response.status, 'Body:', text)
    throw new Error(`ANBIMA VNA API failed (HTTP ${response.status}): ${text}`)
  }

  const data = await response.json()
  console.log('[fetch-vna-anbima] VNA data received, parsing entries...')

  const entries = parseAnbimaVna(data)
  if (entries.length === 0) {
    console.error(
      '[fetch-vna-anbima] No VNA entries parsed from response:',
      JSON.stringify(data).slice(0, 500),
    )
    throw new Error('No VNA entries returned from ANBIMA')
  }

  console.log('[fetch-vna-anbima] Step 2 Complete: Parsed', entries.length, 'VNA entries')
  return entries
}

async function upsertVnaHistory(entries: VnaEntry[]): Promise<void> {
  console.log('[fetch-vna-anbima] Step 3: Persisting VNA data to vna_history table')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const rows = entries
    .filter((e) => e.vna > 0 && e.date)
    .map((e) => ({
      reference_date: e.date,
      vna_value: e.vna,
      bond_type: e.bondType || 'NTN-B',
    }))

  if (rows.length === 0) {
    console.warn('[fetch-vna-anbima] No valid rows to upsert after filtering')
    return
  }

  console.log('[fetch-vna-anbima] Upserting', rows.length, 'rows into vna_history')

  const { error } = await supabase.from('vna_history').upsert(rows, {
    onConflict: 'reference_date,bond_type',
  })

  if (error) {
    console.error('[fetch-vna-anbima] DATABASE UPSERT ERROR:', error.message, error.details)
    throw new Error(`Database error during VNA persistence: ${error.message}`)
  }

  console.log('[fetch-vna-anbima] Step 3 Complete: Database upsert successful')
}

Deno.serve(async (req: Request) => {
  console.log('[fetch-vna-anbima] === VNA Fetch Request Received ===')
  console.log('[fetch-vna-anbima] Request method:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientId = Deno.env.get('ANBIMA_CLIENT_ID') || Deno.env.get('ANBIMA_Client_ID')
    const clientSecret =
      Deno.env.get('ANBIMA_CLIENT_SECRET') || Deno.env.get('ANBIMA_Client_Secret')

    console.log('[fetch-vna-anbima] Credential check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdSource: Deno.env.get('ANBIMA_CLIENT_ID')
        ? 'ANBIMA_CLIENT_ID'
        : Deno.env.get('ANBIMA_Client_ID')
          ? 'ANBIMA_Client_ID'
          : 'NOT_FOUND',
      clientSecretSource: Deno.env.get('ANBIMA_CLIENT_SECRET')
        ? 'ANBIMA_CLIENT_SECRET'
        : Deno.env.get('ANBIMA_Client_Secret')
          ? 'ANBIMA_Client_Secret'
          : 'NOT_FOUND',
    })

    if (!clientId || !clientSecret) {
      console.error(
        '[fetch-vna-anbima] MISSING CREDENTIALS: ANBIMA credentials not found in environment variables',
      )
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

    console.log('[fetch-vna-anbima] Credentials found, proceeding with ANBIMA API calls')

    const token = await getAnbimaToken(clientId, clientSecret)
    const entries = await fetchVnaFromAnbima(token, clientId)
    await upsertVnaHistory(entries)

    const target = entries.find((e) => e.code === '760199') || entries[0]

    console.log('[fetch-vna-anbima] === VNA Fetch Successful ===')
    console.log('[fetch-vna-anbima] Target entry:', {
      code: target.code,
      title: target.title,
      date: target.date,
      vna: target.vna,
    })

    return okResponse({
      success: true,
      entries,
      date: target.date,
      fetchedAt: new Date().toISOString(),
      source: 'ANBIMA',
    })
  } catch (error) {
    console.error('[fetch-vna-anbima] === VNA Fetch Failed ===')
    console.error('[fetch-vna-anbima] Error constructor:', error?.constructor?.name || 'Unknown')
    console.error(
      '[fetch-vna-anbima] Error message:',
      error instanceof Error ? error.message : String(error),
    )
    if (error instanceof Error && error.stack) {
      console.error('[fetch-vna-anbima] Error stack:', error.stack)
    }

    let errorType = 'UNKNOWN_ERROR'
    let userMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        errorType = 'TIMEOUT_ERROR'
        userMessage =
          'Timeout Error: ANBIMA API did not respond within 20 seconds. Please try again in a few moments.'
        console.error('[fetch-vna-anbima] TIMEOUT: Request exceeded 20 second limit')
      } else if (error instanceof TypeError) {
        errorType = 'NETWORK_ERROR'
        userMessage =
          'Network Error: Unable to connect to ANBIMA API. Please verify network connectivity.'
        console.error('[fetch-vna-anbima] NETWORK ERROR:', error.message)
      } else {
        const msg = error.message.toLowerCase()
        if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
          errorType = 'AUTH_ERROR'
          console.error('[fetch-vna-anbima] AUTH ERROR: Check ANBIMA credentials')
        } else if (msg.includes('rate limit') || msg.includes('429')) {
          errorType = 'RATE_LIMIT_ERROR'
          console.error('[fetch-vna-anbima] RATE LIMIT: Too many requests to ANBIMA API')
        } else if (msg.includes('database')) {
          errorType = 'DATABASE_ERROR'
          console.error('[fetch-vna-anbima] DATABASE ERROR: Failed to persist VNA data')
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
    })
  }
})
