import type { EventItem } from '@/lib/democracy'

type CourtListenerOpinion = {
  id?: string | number
  date_filed?: string
  caseName?: string
  absolute_url?: string
  citation?: string
}

type GdeltArticle = {
  url?: string
  seendate?: string
  title?: string
}

function toISO(input?: string | null) {
  try {
    return input ? new Date(input).toISOString() : new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export async function fetchCourtListenerLive(): Promise<EventItem[]> {
  const url =
    'https://www.courtlistener.com/api/rest/v3/opinions/?search=voting%20OR%20election%20OR%20%22press%20freedom%22&order_by=-dateFiled&docket_court__jurisdiction=F'
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return []
  const payload = await response.json()
  const results = Array.isArray(payload?.results) ? payload.results : []

  return results.map(opinionRaw => {
    const opinion =
      typeof opinionRaw === 'object' && opinionRaw !== null ? (opinionRaw as CourtListenerOpinion) : {}

    const date = toISO(typeof opinion.date_filed === 'string' ? opinion.date_filed : undefined)
    const title = typeof opinion.caseName === 'string' ? opinion.caseName : 'Court opinion'
    const path = typeof opinion.absolute_url === 'string' ? opinion.absolute_url : undefined
    const summaryText = `${title} ${typeof opinion.citation === 'string' ? opinion.citation : ''}`
    const direction: 1 | -1 = /protect|expand|enjoin|strike/i.test(summaryText) ? 1 : -1

    return {
      id: `cl-${String(opinion.id ?? path ?? date)}`,
      date,
      title,
      url: path ? `https://www.courtlistener.com${path}` : undefined,
      category: 'Judicial',
      direction,
      magnitude: 3,
      confidence: 0.9,
    }
  })
}

export async function fetchGdeltLive(): Promise<EventItem[]> {
  const url =
    'https://api.gdeltproject.org/api/v2/doc/doc?query=protest%20OR%20%22press%20freedom%22%20sourcecountry:US&mode=ArtList&format=json&maxrecords=50'
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return []
  const payload = await response.json()
  const articles = Array.isArray(payload?.articles) ? payload.articles : []

  return articles.map(articleRaw => {
    const article =
      typeof articleRaw === 'object' && articleRaw !== null ? (articleRaw as GdeltArticle) : {}

    const title = typeof article.title === 'string' ? article.title : 'Civic action'
    const direction: 1 | -1 = /press freedom|protect|support|rally|march|protest/i.test(
      title.toLowerCase(),
    )
      ? 1
      : -1

    return {
      id: `gd-${String(article.url ?? title)}`,
      date: toISO(typeof article.seendate === 'string' ? article.seendate : undefined),
      title,
      url: typeof article.url === 'string' ? article.url : undefined,
      category: 'Civil Society',
      direction,
      magnitude: 1.5,
      confidence: 0.75,
    }
  })
}

export async function fetchLiveBlend(): Promise<EventItem[]> {
  const [courtListener, gdelt] = await Promise.all([
    fetchCourtListenerLive(),
    fetchGdeltLive(),
  ])

  return [...courtListener, ...gdelt].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}
