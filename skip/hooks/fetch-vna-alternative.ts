interface VnaEntry {
  code: string
  title: string
  vna: number
  date: string
}

const ALTERNATIVE_URL = 'https://brasilindicadores.com.br/titulos-publicos/vna/'
const TARGET_CODE = '760199'

function sanitizeValue(raw: string): number {
  let cleaned = raw.replace(/R\$\s*/gi, '').trim()
  cleaned = cleaned.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  return parseFloat(cleaned)
}

function extractVnaFromHtml(html: string, code: string): number | null {
  const rowRegex = new RegExp(`<tr[^>]*>(?:(?!</tr>).)*?${code}(?:(?!</tr>).)*?</tr>`, 'is')
  const rowMatch = html.match(rowRegex)
  if (rowMatch) {
    const rowHtml = rowMatch[0]
    const valueRegex = /R\$\s*([\d.,]+)/gi
    const valueMatches = [...rowHtml.matchAll(valueRegex)]
    if (valueMatches.length > 0) {
      return sanitizeValue(valueMatches[valueMatches.length - 1][1])
    }
    const numRegex = /(\d{1,3}(?:\.\d{3})*,\d{2,})/g
    const numMatches = [...rowHtml.matchAll(numRegex)]
    if (numMatches.length > 0) {
      return sanitizeValue(numMatches[numMatches.length - 1][1])
    }
  }

  const codeIndex = html.indexOf(code)
  if (codeIndex !== -1) {
    const context = html.substring(codeIndex, codeIndex + 3000)
    const valueRegex = /(?:R\$\s*)?([\d.]+,\d{2,})/g
    const valueMatches = [...context.matchAll(valueRegex)]
    if (valueMatches.length > 0) {
      return sanitizeValue(valueMatches[0][1])
    }
  }

  const tdRegex = new RegExp(`<td[^>]*>\\s*${code}\\s*</td>\\s*<td[^>]*>(.*?)</td>`, 'is')
  const tdMatch = html.match(tdRegex)
  if (tdMatch) {
    const cellContent = tdMatch[1].replace(/<[^>]+>/g, '').trim()
    const numMatch = cellContent.match(/([\d.,]+)/)
    if (numMatch) {
      return sanitizeValue(numMatch[1])
    }
  }

  return null
}

export default async function handler(_req: Request): Promise<Response> {
  try {
    const response = await fetch(ALTERNATIVE_URL, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; TesouroMonitor/1.0)',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`Alternative source returned status ${response.status}`)
    }

    const html = await response.text()

    if (!html || html.length < 100) {
      throw new Error('Alternative source returned empty or invalid content')
    }

    const vna = extractVnaFromHtml(html, TARGET_CODE)

    if (vna === null || isNaN(vna) || vna <= 0) {
      throw new Error(`Could not extract VNA value for code ${TARGET_CODE} from alternative source`)
    }

    const entry: VnaEntry = {
      code: TARGET_CODE,
      title: 'Tesouro IPCA+ com Juros Semestrais 2045',
      vna,
      date: new Date().toISOString().split('T')[0],
    }

    return Response.json({
      success: true,
      entries: [entry],
      date: entry.date,
      fetchedAt: new Date().toISOString(),
      source: 'BrasilIndicadores',
    })
  } catch (error) {
    console.error('[fetch-vna-alternative] Error:', error)

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
        source: 'BrasilIndicadores',
      },
      { status: 502 },
    )
  }
}
