import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { scrapeVnaFromAnbimaPage, type VnaEntry } from './html-scraper.ts'

const ANBIMA_TOKEN_URL = 'https://api.anbima.com.br/oauth/access-token'
const ANBIMA_VNA_URL = 'https://api.anbima.com.br/feed/precos-indices/v1/titulos-publicos/vna'
const FETCH_TIMEOUT_MS = 20000
const TARGET_MATURITY_DATE = '2026-07-15'
const TARGET_BOND_TYPE = 'NTN-B'
const TARGET_BOND_LABEL = 'NTN-B 2026-07-15'
const TARGET_SELIC_CODES = ['760100', '760199']

interface FoundBondInfo {
  tipo_titulo: string
  data_vencimento: string
  codigo_selic: string
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
  console.log('[fetch-vna-anbima] Requesting ANBIMA token from:', ANBIMA_TOKEN_URL)

  const headerVariants = [
    {
      client_id: clientId,
      client_secret: clientSecret,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    {
      client_id: clientId,
      client_secret: clientSecret,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
  ]

  const bodyVariants = [
    JSON.stringify({ grant_type: 'client_credentials' }),
    'grant_type=client_credentials',
  ]

  let lastErrorStatus = 0
  let lastErrorBody = ''

  for (let i = 0; i < headerVariants.length; i++) {
    for (let j = 0; j < bodyVariants.length; j++) {
      try {
        const contentType = headerVariants[i]['Content-Type'] as string
        console.log(
          `[fetch-vna-anbima] Trying token variant ${i + 1}.${j + 1} ` +
            `(auth: ${i === 0 ? 'Sensedia-headers' : i === 1 ? 'Basic' : 'Sensedia-form'}, ` +
            `body: ${j === 0 ? 'json' : 'form'})`,
        )
        const resp = await fetch(ANBIMA_TOKEN_URL, {
          method: 'POST',
          headers: headerVariants[i],
          body: bodyVariants[j],
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })

        if (resp.status === 401 || resp.status === 403) {
          lastErrorBody = await resp.text().catch(() => '')
          lastErrorStatus = resp.status
          console.warn(
            `[fetch-vna-anbima] Token variant ${i + 1}.${j + 1} returned ${resp.status}. ` +
              `Response: ${lastErrorBody.slice(0, 300)}`,
          )
          continue
        }

        if (!resp.ok) {
          lastErrorBody = await resp.text().catch(() => '')
          lastErrorStatus = resp.status
          console.warn(
            `[fetch-vna-anbima] Token variant ${i + 1}.${j + 1} returned ${resp.status}.`,
          )
          continue
        }

        const data = await resp.json()
        if (data.access_token) {
          console.log(`[fetch-vna-anbima] Token obtained via variant ${i + 1}.${j + 1}`)
          return data.access_token as string
        }
        if (data.access_token === undefined && data.token) {
          console.log(
            `[fetch-vna-anbima] Token obtained via variant ${i + 1}.${j + 1} (token field)`,
          )
          return data.token as string
        }
      } catch (e) {
        console.warn(`[fetch-vna-anbima] Token variant ${i + 1}.${j + 1} threw:`, e)
      }
    }
  }

  const credHint =
    lastErrorStatus === 401 || lastErrorStatus === 403
      ? ' ANBIMA credentials (ANBIMA_Client_ID / ANBIMA_Client_Secret) appear to be invalid or expired. Please verify them in Supabase Project Secrets.'
      : ''

  throw new Error(
    `ANBIMA authentication failed (HTTP ${lastErrorStatus}).${credHint} Response: ${lastErrorBody.slice(0, 500)}`,
  )
}

function getMaturityDate(t: Record<string, unknown>): string | null {
  const raw =
    t.data_vencimento ||
    t.data_validade ||
    t.vencimento ||
    t.maturity_date ||
    t.due_date ||
    t.data_maturidade
  if (!raw) return null
  return String(raw).split('T')[0]
}

function getBondType(t: Record<string, unknown>): string {
  return String(t.tipo_titulo || t.tipoTitulo || t.tipo || t.title_type || '').toUpperCase()
}

function extractTitulosFromItem(
  item: Record<string, unknown>,
  foundBonds: FoundBondInfo[],
): VnaEntry[] {
  const entries: VnaEntry[] = []
  const parentRefDate = String(item.data_referencia || item.data || item.reference_date || '')

  const titulos = item.titulos
  if (Array.isArray(titulos)) {
    for (const titulo of titulos) {
      const t = titulo as Record<string, unknown>
      const maturityDate = getMaturityDate(t)
      const bondType = getBondType(t)
      const selicCode = String(t.codigo_selic || t.code || t.codigo || '')

      foundBonds.push({
        tipo_titulo: bondType || 'UNKNOWN',
        data_vencimento: maturityDate || 'UNKNOWN',
        codigo_selic: selicCode,
      })

      const matchesSelic = TARGET_SELIC_CODES.includes(selicCode)
      const matchesMaturity = maturityDate === TARGET_MATURITY_DATE
      if (!matchesSelic && !matchesMaturity) continue
      if (bondType && bondType !== TARGET_BOND_TYPE && !matchesSelic) continue

      const vna = Number(t.vna || t.valor || 0)
      const code = selicCode || '760100'
      const title = String(t.titulo || t.title || t.nome_titulo || TARGET_BOND_LABEL)
      const entryDate = String(t.data_referencia || t.data || parentRefDate || '')

      if (vna > 0 && entryDate) {
        entries.push({
          code,
          title,
          vna,
          date: entryDate.split('T')[0],
          bondType: TARGET_BOND_LABEL,
        })
      }
    }
  } else {
    const maturityDate = getMaturityDate(item)
    const bondType = getBondType(item)
    const selicCode = String(item.codigo_selic || item.code || item.codigo || '')

    foundBonds.push({
      tipo_titulo: bondType || 'UNKNOWN',
      data_vencimento: maturityDate || 'UNKNOWN',
      codigo_selic: selicCode,
    })

    const matchesSelicNonArray = TARGET_SELIC_CODES.includes(selicCode)
    const matchesMaturityNonArray = maturityDate === TARGET_MATURITY_DATE
    if (!matchesSelicNonArray && !matchesMaturityNonArray) return entries
    if (bondType && bondType !== TARGET_BOND_TYPE && !matchesSelicNonArray) return entries

    const vna = Number(item.vna || item.valor || 0)
    const code = selicCode || '760100'
    const title = String(item.titulo || item.title || item.nome_titulo || TARGET_BOND_LABEL)

    if (vna > 0 && parentRefDate) {
      entries.push({
        code,
        title,
        vna,
        date: parentRefDate.split('T')[0],
        bondType: TARGET_BOND_LABEL,
      })
    }
  }

  return entries
}

function parseAnbimaVna(data: unknown, foundBonds: FoundBondInfo[]): VnaEntry[] {
  const items: unknown[] = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.data as unknown[]) ||
      ((data as Record<string, unknown>)?.items as unknown[]) ||
      []

  const entries: VnaEntry[] = []
  for (const item of items) {
    if (item && typeof item === 'object') {
      entries.push(...extractTitulosFromItem(item as Record<string, unknown>, foundBonds))
    }
  }
  return entries
}

interface FetchResult {
  entries: VnaEntry[]
  status: number
  rawBody: string
  foundBonds: FoundBondInfo[]
}

async function fetchVnaForDate(
  token: string,
  clientId: string,
  date?: string,
): Promise<FetchResult> {
  const url = date ? `${ANBIMA_VNA_URL}?data_referencia=${date}` : ANBIMA_VNA_URL
  console.log('[fetch-vna-anbima] Fetching VNA from ANBIMA:', { url, date: date || 'none' })

  const headerVariants = [
    {
      access_token: token,
      client_id: clientId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    {
      Authorization: `Bearer ${token}`,
      client_id: clientId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    {
      access_token: token,
      client_id: clientId,
      Accept: 'application/json',
    },
  ]

  let response: Response | null = null
  let rawBody = ''
  let variantUsed = 0
  let lastErrorStatus = 0
  let lastErrorBody = ''

  for (let i = 0; i < headerVariants.length; i++) {
    try {
      console.log(
        `[fetch-vna-anbima] Trying header variant ${i + 1}/${headerVariants.length} ` +
          `(${i === 0 ? 'access_token+client_id' : i === 1 ? 'Bearer+client_id' : 'access_token+client_id(no-ct)'})`,
      )
      const resp = await fetch(url, {
        method: 'GET',
        headers: headerVariants[i],
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      variantUsed = i + 1

      if (resp.status === 401 || resp.status === 403) {
        lastErrorBody = await resp.text().catch(() => '')
        lastErrorStatus = resp.status
        console.warn(
          `[fetch-vna-anbima] Variant ${i + 1} returned ${resp.status}. ` +
            `Response: ${lastErrorBody.slice(0, 300)}`,
        )
        continue
      }

      response = resp
      break
    } catch (e) {
      console.warn(`[fetch-vna-anbima] Variant ${i + 1} threw:`, e)
      continue
    }
  }

  if (!response) {
    if (lastErrorStatus > 0) {
      const credHint =
        lastErrorStatus === 401 || lastErrorStatus === 403
          ? ' ANBIMA credentials (ANBIMA_Client_ID / ANBIMA_Client_Secret) appear to be invalid or expired. Please verify them in Supabase Project Secrets.'
          : ''
      return {
        entries: [],
        status: lastErrorStatus,
        rawBody: `ANBIMA VNA API unauthorized (${lastErrorStatus}) after ${variantUsed} header variants.${credHint} Response: ${lastErrorBody}`,
        foundBonds: [],
      }
    }
    return {
      entries: [],
      status: 500,
      rawBody: 'All header variants failed with network errors',
      foundBonds: [],
    }
  }

  rawBody = await response.text().catch(() => '')
  console.log(
    '[fetch-vna-anbima] ANBIMA response status:',
    response.status,
    '(variant',
    variantUsed + ', date:',
    date || 'none' + ')',
  )

  if (response.status === 429) {
    return {
      entries: [],
      status: 429,
      rawBody: 'ANBIMA VNA API rate limit exceeded.',
      foundBonds: [],
    }
  }

  if (!response.ok) {
    return { entries: [], status: response.status, rawBody, foundBonds: [] }
  }

  let data: unknown
  try {
    data = JSON.parse(rawBody)
  } catch {
    return {
      entries: [],
      status: response.status,
      rawBody: `Parse error. Raw: ${rawBody.slice(0, 500)}`,
      foundBonds: [],
    }
  }

  const foundBonds: FoundBondInfo[] = []
  const entries = parseAnbimaVna(data, foundBonds)

  if (entries.length === 0 && foundBonds.length > 0) {
    console.warn(
      '[fetch-vna-anbima] Target bond (NTN-B, maturity 2026-07-15, SELIC 760100/760199) NOT found in response.',
      'Bonds returned by ANBIMA:',
      foundBonds.map((b) => `${b.tipo_titulo} (${b.data_vencimento}) [SELIC: ${b.codigo_selic}]`),
    )
  } else if (entries.length > 0) {
    console.log(
      '[fetch-vna-anbima] Target bond found! Entries:',
      entries.length,
      'Matched by SELIC code or maturity date.',
    )
  }

  return { entries, status: response.status, rawBody, foundBonds }
}

async function fetchVnaWithFallback(
  token: string,
  clientId: string,
): Promise<{
  entries: VnaEntry[]
  triedDates: string[]
  lastStatus: number
  lastRawBody: string
  foundBonds: FoundBondInfo[]
}> {
  const recentDate = getMostRecentBusinessDay()
  const triedDates: string[] = [recentDate]
  console.log('[fetch-vna-anbima] Primary fetch for date:', recentDate)
  const latestResult = await fetchVnaForDate(token, clientId, recentDate)

  if (latestResult.entries.length > 0) {
    return {
      entries: latestResult.entries,
      triedDates,
      lastStatus: latestResult.status,
      lastRawBody: latestResult.rawBody,
      foundBonds: latestResult.foundBonds,
    }
  }

  if (latestResult.status !== 200) {
    if (latestResult.status === 401 || latestResult.status === 403) {
      console.log(
        '[fetch-vna-anbima] API returned',
        latestResult.status,
        '- trying HTML scraping fallback',
      )
      try {
        const scraped = await scrapeVnaFromAnbimaPage(TARGET_BOND_TYPE, TARGET_MATURITY_DATE)
        if (scraped.length > 0) {
          console.log(
            '[fetch-vna-anbima] HTML scraping fallback succeeded with',
            scraped.length,
            'entries',
          )
          return {
            entries: scraped,
            triedDates,
            lastStatus: 200,
            lastRawBody: 'HTML scraping fallback succeeded',
            foundBonds: [],
          }
        }
      } catch (e) {
        console.warn('[fetch-vna-anbima] HTML scraping fallback failed:', e)
      }
    }
    return {
      entries: [],
      triedDates,
      lastStatus: latestResult.status,
      lastRawBody: latestResult.rawBody,
      foundBonds: latestResult.foundBonds,
    }
  }

  const dates = getLast5BusinessDays()
  let lastStatus = latestResult.status
  let lastRawBody = latestResult.rawBody
  let allFoundBonds = [...latestResult.foundBonds]

  for (const date of dates) {
    if (triedDates.includes(date)) continue
    triedDates.push(date)
    console.log('[fetch-vna-anbima] Fallback fetch for date:', date)
    const dateResult = await fetchVnaForDate(token, clientId, date)
    lastStatus = dateResult.status
    lastRawBody = dateResult.rawBody
    allFoundBonds = [...allFoundBonds, ...dateResult.foundBonds]

    if (dateResult.entries.length > 0) {
      return {
        entries: dateResult.entries,
        triedDates,
        lastStatus: dateResult.status,
        lastRawBody: dateResult.rawBody,
        foundBonds: allFoundBonds,
      }
    }

    if (dateResult.status !== 200) {
      return {
        entries: [],
        triedDates,
        lastStatus: dateResult.status,
        lastRawBody: dateResult.rawBody,
        foundBonds: allFoundBonds,
      }
    }
  }

  if (allFoundBonds.length > 0) {
    console.warn(
      '[fetch-vna-anbima] Target bond NOT found across all attempted dates.',
      'Dates tried:',
      triedDates.join(', '),
      'All bonds found:',
      allFoundBonds.map(
        (b) => `${b.tipo_titulo} (${b.data_vencimento}) [SELIC: ${b.codigo_selic}]`,
      ),
    )
  }

  console.log('[fetch-vna-anbima] Trying HTML scraping as final fallback')
  try {
    const scraped = await scrapeVnaFromAnbimaPage(TARGET_BOND_TYPE, TARGET_MATURITY_DATE)
    if (scraped.length > 0) {
      console.log(
        '[fetch-vna-anbima] HTML scraping final fallback succeeded with',
        scraped.length,
        'entries',
      )
      return {
        entries: scraped,
        triedDates,
        lastStatus: 200,
        lastRawBody: 'HTML scraping fallback succeeded',
        foundBonds: allFoundBonds,
      }
    }
  } catch (e) {
    console.warn('[fetch-vna-anbima] HTML scraping final fallback failed:', e)
  }

  return { entries: [], triedDates, lastStatus, lastRawBody, foundBonds: allFoundBonds }
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
      bond_type: e.bondType || TARGET_BOND_LABEL,
    }))

  if (rows.length === 0) return

  console.log('[fetch-vna-anbima] Inserting/updating VNA rows:', rows.length, rows)

  const { error } = await supabase.from('vna_history').upsert(rows, {
    onConflict: 'reference_date,bond_type',
    ignoreDuplicates: true,
  })

  if (error) {
    throw new Error(`Database error during VNA persistence: ${error.message}`)
  }

  console.log('[fetch-vna-anbima] VNA rows persisted successfully')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientId =
      Deno.env.get('ANBIMA_Client_ID') ||
      Deno.env.get('ANBIMA_CLIENT_ID') ||
      Deno.env.get('ANDIMA_Client_ID')
    const clientSecret =
      Deno.env.get('ANBIMA_Client_Secret') ||
      Deno.env.get('ANBIMA_CLIENT_SECRET') ||
      Deno.env.get('ANDIMA_Client_Secret')

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

    console.log(
      '[fetch-vna-anbima] Starting VNA fetch for NTN-B maturity:',
      TARGET_MATURITY_DATE,
      'Client ID:',
      clientId.slice(0, 4) + '****',
    )

    const token = await getAnbimaToken(clientId, clientSecret)
    const { entries, triedDates, lastStatus, lastRawBody, foundBonds } = await fetchVnaWithFallback(
      token,
      clientId,
    )

    if (entries.length === 0) {
      const isApiError = lastStatus !== 200
      const foundBondsSummary =
        foundBonds.length > 0
          ? foundBonds
              .map(
                (b) => `${b.tipo_titulo} (venc: ${b.data_vencimento}) [SELIC: ${b.codigo_selic}]`,
              )
              .join('; ')
          : 'No bonds returned by API'

      const errorMsg = isApiError
        ? lastStatus === 401 || lastStatus === 403
          ? `ANBIMA API authentication failed (HTTP ${lastStatus}). Please verify that ANBIMA_Client_ID and ANBIMA_Client_Secret are valid and correctly configured in Supabase Secrets. Response: ${lastRawBody.slice(0, 300)}`
          : `ANBIMA VNA API returned HTTP ${lastStatus}. Raw response: ${lastRawBody.slice(0, 500)}`
        : `No bond with tipo_titulo=NTN-B and maturity date ${TARGET_MATURITY_DATE} (${TARGET_BOND_LABEL}) was found in the ANBIMA API response for dates: ${triedDates.join(', ')}. Bonds found in response: ${foundBondsSummary}. Last raw response (truncated): ${lastRawBody.slice(0, 500)}`

      return okResponse({
        success: false,
        error: errorMsg,
        errorType: isApiError ? 'API_ERROR' : 'EMPTY_RESPONSE_ERROR',
        entries: [],
        date: null,
        fetchedAt: new Date().toISOString(),
        source: 'ANBIMA',
        triedDates,
        targetBond: TARGET_BOND_LABEL,
        targetMaturity: TARGET_MATURITY_DATE,
        foundBonds: foundBonds.map((b) => ({
          tipo_titulo: b.tipo_titulo,
          data_vencimento: b.data_vencimento,
          codigo_selic: b.codigo_selic,
        })),
      })
    }

    await insertVnaHistory(entries)

    const target = entries.find((e) => e.bondType === TARGET_BOND_LABEL) || entries[0]

    return okResponse({
      success: true,
      entries,
      date: target.date,
      fetchedAt: new Date().toISOString(),
      source: 'ANBIMA',
      targetBond: TARGET_BOND_LABEL,
      targetMaturity: TARGET_MATURITY_DATE,
      triedDates,
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

    console.error('[fetch-vna-anbima] Error:', errorType, userMessage)

    try {
      const scraped = await scrapeVnaFromAnbimaPage(TARGET_BOND_TYPE, TARGET_MATURITY_DATE)
      if (scraped.length > 0) {
        await insertVnaHistory(scraped)
        const target = scraped[0]
        return okResponse({
          success: true,
          entries: scraped,
          date: target.date,
          fetchedAt: new Date().toISOString(),
          source: 'ANBIMA-HTML-Scrape',
          targetBond: TARGET_BOND_LABEL,
          targetMaturity: TARGET_MATURITY_DATE,
          triedDates: [],
        })
      }
    } catch (e) {
      console.warn('[fetch-vna-anbima] HTML scraping in catch block failed:', e)
    }

    return okResponse({
      success: false,
      error: userMessage,
      errorType,
      entries: [],
      date: null,
      fetchedAt: new Date().toISOString(),
      source: 'ANBIMA',
      targetBond: TARGET_BOND_LABEL,
      targetMaturity: TARGET_MATURITY_DATE,
    })
  }
})
