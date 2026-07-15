import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ANBIMA_TOKEN_URL = 'https://api.anbima.com.br/oauth2/token'
const ANBIMA_VNA_URL = 'https://api.anbima.com.br/feed/precos-indices/v1/titulos-publicos/vna'

interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
}

async function getAnbimaToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch(ANBIMA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ANBIMA auth failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error('ANBIMA auth: no access_token in response')
  }
  return data.access_token as string
}

function parseAnbimaVna(data: unknown): VnaEntry[] {
  const items: unknown[] = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.data as unknown[]) ||
      ((data as Record<string, unknown>)?.items as unknown[]) ||
      []

  const today = new Date().toISOString().split('T')[0]
  const entries: VnaEntry[] = []

  for (const item of items) {
    const obj = item as Record<string, unknown>
    const bondType = String(obj.tipo_titulo || obj.tipo || obj.bond_type || 'NTN-B')
    const vna = Number(obj.vna || obj.valor || 0)
    const refDate = String(obj.data_referencia || obj.data || obj.reference_date || today)

    if (vna > 0) {
      entries.push({
        code: bondType.includes('NTN-B') ? '760199' : '760199',
        title: bondType,
        vna,
        date: refDate.split('T')[0],
      })
    }
  }
  return entries
}

async function fetchVnaFromAnbima(token: string): Promise<VnaEntry[]> {
  const response = await fetch(ANBIMA_VNA_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ANBIMA VNA API failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  const entries = parseAnbimaVna(data)
  if (entries.length === 0) {
    throw new Error('No VNA entries returned from ANBIMA')
  }
  return entries
}

async function upsertVnaHistory(entries: VnaEntry[]): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const target = entries.find((e) => e.code === '760199') || entries[0]

  const { error } = await supabase.from('vna_history').upsert(
    {
      reference_date: target.date,
      vna_value: target.vna,
      bond_type: 'NTN-B',
    },
    { onConflict: 'reference_date,bond_type' },
  )

  if (error) {
    console.error('[fetch-vna-anbima] Database upsert error:', error.message)
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
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ANBIMA credentials not configured',
          entries: [],
          date: null,
          fetchedAt: new Date().toISOString(),
          source: 'ANBIMA',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const token = await getAnbimaToken(clientId, clientSecret)
    const entries = await fetchVnaFromAnbima(token)
    await upsertVnaHistory(entries)

    const target = entries.find((e) => e.code === '760199') || entries[0]

    return new Response(
      JSON.stringify({
        success: true,
        entries,
        date: target.date,
        fetchedAt: new Date().toISOString(),
        source: 'ANBIMA',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (error) {
    console.error('[fetch-vna-anbima] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        entries: [],
        date: null,
        fetchedAt: new Date().toISOString(),
        source: 'ANBIMA',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }
})
