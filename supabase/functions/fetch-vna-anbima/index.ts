import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ANBIMA_TOKEN_URL = 'https://api.anbima.com.br/oauth/access-token'
const ANBIMA_VNA_URL =
  'https://api-sandbox.anbima.com.br/feed/precos-indices/v1/titulos-publicos/vna'

interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
  bondType: string
}

class AnbimaAuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AnbimaAuthError'
    this.status = status
  }
}

class AnbimaApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AnbimaApiError'
    this.status = status
  }
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
    signal: AbortSignal.timeout(10000),
  })

  if (response.status === 401 || response.status === 403) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] Auth failed:', response.status, text)
    throw new AnbimaAuthError(
      `ANBIMA authentication unauthorized (${response.status}). Verify client_id and client_secret. ANBIMA response: ${text}`,
      response.status,
    )
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] Auth HTTP error:', response.status, text)
    throw new AnbimaAuthError(`ANBIMA auth failed (${response.status}): ${text}`, response.status)
  }

  const data = await response.json()
  if (!data.access_token) {
    console.error('[fetch-vna-anbima] Auth response missing access_token:', JSON.stringify(data))
    throw new AnbimaAuthError('ANBIMA auth: no access_token in response', 502)
  }
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
  const response = await fetch(ANBIMA_VNA_URL, {
    method: 'GET',
    headers: {
      client_id: clientId,
      access_token: token,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (response.status === 401 || response.status === 403) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] VNA API unauthorized:', response.status, text)
    throw new AnbimaApiError(
      `ANBIMA VNA API unauthorized (${response.status}). Token may be invalid or expired. ANBIMA response: ${text}`,
      response.status,
    )
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[fetch-vna-anbima] VNA API HTTP error:', response.status, text)
    throw new AnbimaApiError(`ANBIMA VNA API failed (${response.status}): ${text}`, response.status)
  }

  const data = await response.json()
  const entries = parseAnbimaVna(data)
  if (entries.length === 0) {
    console.error(
      '[fetch-vna-anbima] No VNA entries parsed from response:',
      JSON.stringify(data).slice(0, 500),
    )
    throw new AnbimaApiError('No VNA entries returned from ANBIMA', 502)
  }
  return entries
}

async function upsertVnaHistory(entries: VnaEntry[]): Promise<void> {
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

  if (rows.length === 0) return

  const { error } = await supabase.from('vna_history').upsert(rows, {
    onConflict: 'reference_date,bond_type',
  })

  if (error) {
    console.error('[fetch-vna-anbima] Database upsert error:', error.message, error.details)
  }
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
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
      console.error('[fetch-vna-anbima] Missing ANBIMA credentials in secrets')
      return jsonResponse(
        {
          success: false,
          error:
            'ANBIMA credentials not configured. Set ANBIMA_Client_ID and ANBIMA_Client_Secret in Supabase secrets.',
          entries: [],
          date: null,
          fetchedAt: new Date().toISOString(),
          source: 'ANBIMA',
        },
        500,
      )
    }

    const token = await getAnbimaToken(clientId, clientSecret)
    const entries = await fetchVnaFromAnbima(token, clientId)
    await upsertVnaHistory(entries)

    const target = entries.find((e) => e.code === '760199') || entries[0]

    return jsonResponse(
      {
        success: true,
        entries,
        date: target.date,
        fetchedAt: new Date().toISOString(),
        source: 'ANBIMA',
      },
      200,
    )
  } catch (error) {
    console.error('[fetch-vna-anbima] Error:', error)

    if (error instanceof AnbimaAuthError) {
      return jsonResponse(
        {
          success: false,
          error: error.message,
          errorType: 'AUTH_ERROR',
          entries: [],
          date: null,
          fetchedAt: new Date().toISOString(),
          source: 'ANBIMA',
        },
        401,
      )
    }

    if (error instanceof AnbimaApiError) {
      return jsonResponse(
        {
          success: false,
          error: error.message,
          errorType: 'API_ERROR',
          anbimaStatus: error.status,
          entries: [],
          date: null,
          fetchedAt: new Date().toISOString(),
          source: 'ANBIMA',
        },
        error.status >= 400 && error.status < 600 ? error.status : 502,
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse(
      {
        success: false,
        error: errorMessage,
        errorType: 'UNKNOWN_ERROR',
        entries: [],
        date: null,
        fetchedAt: new Date().toISOString(),
        source: 'ANBIMA',
      },
      502,
    )
  }
})
