import { VnaEntry } from '../../src/lib/vna-service'

const B3_API_URL =
  'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/listaprecoprazo/lista-preco-prazo.json'

const TARGET_SELIC_CODE = '760199'

interface B3Bond {
  cd?: string
  nm?: string
  untrRedVal?: number
  redVal?: number
  anulInvstmRate?: number
  minInvstmAmt?: number
  mtrtyDt?: string
  bdyng?: string
  finIndx?: string
  tradgSts?: string
}

interface B3Response {
  response?: {
    TrsrBondMkt?: {
      TrsrBdTradgList?: B3Bond[]
      qtTxPrDay?: number
      qtPrDay?: number
    }
  }
}

function parseB3Response(data: unknown): VnaEntry[] {
  const entries: VnaEntry[] = []
  const today = new Date().toISOString().split('T')[0]

  const bondList: B3Bond[] = (data as B3Response)?.response?.TrsrBondMkt?.TrsrBdTradgList || []

  for (const bond of bondList) {
    const code = bond.cd || ''
    const title = bond.nm || ''
    const vna = bond.untrRedVal || 0
    const dateRaw = bond.mtrtyDt || today
    const entryDate = dateRaw ? String(dateRaw).split('T')[0] : today

    if (code && vna > 0) {
      entries.push({
        code: String(code),
        title,
        vna: Number(vna),
        date: entryDate,
      })
    }
  }

  return entries
}

async function fetchFromB3(): Promise<VnaEntry[]> {
  const response = await fetch(B3_API_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; TesouroMonitor/1.0)',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`B3 API returned status ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<!--')) {
      throw new Error('B3 API returned HTML instead of JSON (possible CORS or server error)')
    }
    throw new Error(`B3 API returned unexpected content type: ${contentType}`)
  }

  const data: unknown = await response.json()

  if (!data || typeof data !== 'object') {
    throw new Error('B3 API returned invalid data format')
  }

  const entries = parseB3Response(data)
  if (entries.length === 0) {
    throw new Error('No bond entries found in B3 API response')
  }

  return entries
}

export default async function handler(_req: Request): Promise<Response> {
  try {
    const entries = await fetchFromB3()
    const targetEntry = entries.find((e) => e.code === TARGET_SELIC_CODE)
    const referenceDate =
      targetEntry?.date || entries[0]?.date || new Date().toISOString().split('T')[0]

    return Response.json({
      success: true,
      entries,
      date: referenceDate,
      targetEntry: targetEntry || null,
      fetchedAt: new Date().toISOString(),
      source: 'B3-TesouroDireto',
    })
  } catch (error) {
    console.error('[fetch-vna] B3 API fetch error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorType =
      error instanceof TypeError
        ? 'NETWORK_ERROR'
        : error instanceof DOMException && error.name === 'TimeoutError'
          ? 'TIMEOUT_ERROR'
          : 'API_ERROR'

    return Response.json(
      {
        success: false,
        error: errorMessage,
        errorType,
        entries: [],
        date: null,
        fetchedAt: new Date().toISOString(),
        source: 'B3-TesouroDireto',
      },
      { status: 502 },
    )
  }
}
