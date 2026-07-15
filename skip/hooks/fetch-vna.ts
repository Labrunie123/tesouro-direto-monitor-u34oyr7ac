import { VnaEntry } from '../../src/lib/vna-service'

const ANBIMA_URL = 'https://data.anbima.com.br/titulos-publicos/valor-nominal-atualizado'
const TARGET_SELIC_CODE = '760199'

function parseAnbimaJson(data: unknown): VnaEntry[] {
  const entries: VnaEntry[] = []
  const today = new Date().toISOString().split('T')[0]

  const records: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.results)
          ? (data as any).results
          : []

  for (const record of records) {
    const code = record.codigoSelic || record.codigo_selic || record.code || record.codigo || ''
    const title = record.titulo || record.title || record.nome || record.name || ''
    const dateRaw =
      record.dataReferencia ||
      record.data_referencia ||
      record.data ||
      record.date ||
      record.dataAtualizacao ||
      record.data_atualizacao
    const entryDate = dateRaw ? String(dateRaw).split('T')[0] : today
    const vnaRaw =
      record.valorNominalAtualizado ||
      record.valor_nominal_atualizado ||
      record.vna ||
      record.valor ||
      0
    const vna =
      typeof vnaRaw === 'string'
        ? parseFloat(vnaRaw.replace(/\./g, '').replace(',', '.'))
        : Number(vnaRaw)

    if (code && vna > 0) {
      entries.push({ code: String(code), title, vna, date: entryDate })
    }
  }

  return entries
}

function parseAnbimaHtml(html: string): VnaEntry[] {
  const entries: VnaEntry[] = []
  const today = new Date().toISOString().split('T')[0]

  const jsonMatches = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '')
        const parsed = JSON.parse(jsonStr)
        const extracted = parseAnbimaJson(parsed)
        if (extracted.length > 0) return extracted
      } catch {
        continue
      }
    }
  }

  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      const parsed = JSON.parse(nextDataMatch[1])
      const pageProps = (parsed as any)?.props?.pageProps
      if (pageProps) {
        const extracted = parseAnbimaJson(pageProps)
        if (extracted.length > 0) return extracted
      }
    } catch {
      // continue
    }
  }

  const dateMatch = html.match(
    /data[_-]?(?:referencia|atualizacao|base)["\s:>]+(\d{4}-\d{2}-\d{2})/i,
  )
  const refDate = dateMatch ? dateMatch[1] : today

  const codeRegex = /760199[\s\S]{0,500}?(\d{1,3}(?:\.\d{3})*(?:,\d{2,}))/gi
  let match: RegExpExecArray | null
  while ((match = codeRegex.exec(html)) !== null) {
    const vnaStr = match[1]
    const vna = parseFloat(vnaStr.replace(/\./g, '').replace(',', '.'))
    if (vna > 0) {
      entries.push({
        code: TARGET_SELIC_CODE,
        title: 'Tesouro IPCA+ com Juros Semestrais 2045',
        vna,
        date: refDate,
      })
    }
  }

  const tableRowRegex =
    /760199[\s\S]{0,300}?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,300}?(\d{1,3}(?:\.\d{3})*(?:,\d{2,}))/gi
  while ((match = tableRowRegex.exec(html)) !== null) {
    const [d, m, y] = match[1].split('/')
    const isoDate = `${y}-${m}-${d}`
    const vna = parseFloat(match[2].replace(/\./g, '').replace(',', '.'))
    if (vna > 0) {
      entries.push({
        code: TARGET_SELIC_CODE,
        title: 'Tesouro IPCA+ com Juros Semestrais 2045',
        vna,
        date: isoDate,
      })
    }
  }

  return entries
}

async function fetchFromAnbima(): Promise<VnaEntry[]> {
  const response = await fetch(ANBIMA_URL, {
    headers: { Accept: 'application/json, text/html' },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`ANBIMA returned status ${response.status}`)
  }

  const text = await response.text()

  try {
    const data = JSON.parse(text)
    const entries = parseAnbimaJson(data)
    if (entries.length > 0) return entries
  } catch {
    // not JSON, try HTML
  }

  const entries = parseAnbimaHtml(text)
  if (entries.length > 0) return entries

  throw new Error('Could not extract VNA data from ANBIMA response')
}

export default async function handler(_req: Request): Promise<Response> {
  try {
    const entries = await fetchFromAnbima()
    const targetEntry = entries.find((e) => e.code === TARGET_SELIC_CODE)
    const referenceDate = targetEntry?.date || new Date().toISOString().split('T')[0]

    return Response.json({
      success: true,
      entries,
      date: referenceDate,
      targetEntry: targetEntry || null,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('VNA fetch hook error:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        entries: [],
        date: null,
        fetchedAt: new Date().toISOString(),
      },
      { status: 502 },
    )
  }
}
