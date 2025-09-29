import type { EventItem } from './types.js'

const CL_URL =
  'https://www.courtlistener.com/api/rest/v3/opinions/?search=voting%20OR%20election%20OR%20%22press%20freedom%22&order_by=-dateFiled&docket_court__jurisdiction=F'

function toISO(d?: string) {
  try {
    return d ? new Date(d).toISOString() : new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

/** Minimal heuristic mapping to EventItem */
export async function fetchCourtListener(): Promise<EventItem[]> {
  const r = await fetch(CL_URL)
  if (!r.ok) return []
  const json = (await r.json()) as { results?: any[] }
  const results: any[] = json?.results ?? []

  return results.map((o): EventItem => {
    const date = toISO(o.date_filed)
    const title: string = o.caseName ?? 'Court opinion'
    const url: string | undefined = o.absolute_url ? `https://www.courtlistener.com${o.absolute_url}` : undefined
    const text = `${o.caseName ?? ''} ${o.citation ?? ''}`.toLowerCase()
    const direction: 1 | -1 = /protect|expand|enjoin|strike|invalidate|uphold/i.test(text) ? 1 : -1

    return {
      id: `cl-${o.id}`,
      source: 'courtlistener',
      date,
      title,
      url,
      category: 'Judicial',
      direction,
      magnitude: 3.0,
      confidence: 0.9,
      raw: o
    }
  })
}
