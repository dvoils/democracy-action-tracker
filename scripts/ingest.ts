import fs from 'node:fs/promises'
import path from 'node:path'

type Category =
  | 'Legislative'
  | 'Executive'
  | 'Judicial'
  | 'Elections'
  | 'Rights & Liberties'
  | 'Civil Society'
  | 'Political Violence'

type EventItem = {
  id: string
  date: string
  title: string
  summary?: string
  url?: string
  category: Category
  direction: 1 | -1
  magnitude: number
  confidence: number
}

async function loadEnvFiles() {
  const candidates = ['.env.local', '.env']
  for (const candidate of candidates) {
    const filePath = path.join(process.cwd(), candidate)
    try {
      const contents = await fs.readFile(filePath, 'utf8')
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const equals = line.indexOf('=')
        if (equals === -1) continue
        const key = line.slice(0, equals).trim()
        const value = line.slice(equals + 1).trim()
        if (key && !(key in process.env)) {
          process.env[key] = value
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`Unable to read ${candidate}:`, error)
      }
    }
  }
}

async function fetchProPublica(): Promise<unknown[]> {
  const key = process.env.PROPUBLICA_API_KEY
  if (!key) return []
  try {
    const response = await fetch('https://api.propublica.org/congress/v1/both/votes/recent.json', {
      headers: { 'X-API-Key': key },
    })
    if (!response.ok) return []
    const json = (await response.json()) as unknown
    if (!json || typeof json !== 'object') return []
    const results = (json as { results?: { votes?: unknown[] } }).results?.votes
    return Array.isArray(results) ? results : []
  } catch (error) {
    console.error('Failed to fetch ProPublica data.', (error as Error).message ?? error)
    return []
  }
}

async function fetchOpenStates(): Promise<unknown[]> {
  const key = process.env.OPENSTATES_API_KEY
  if (!key) return []
  const url =
    'https://v3.openstates.org/bills?classification=bill&q=voting%20OR%20elections&sort=date&jurisdiction=US'
  try {
    const response = await fetch(url, { headers: { 'X-API-KEY': key } })
    if (!response.ok) return []
    const json = (await response.json()) as unknown
    if (!json || typeof json !== 'object') return []
    const results = (json as { results?: unknown[] }).results
    return Array.isArray(results) ? results : []
  } catch (error) {
    console.error('Failed to fetch OpenStates data.', (error as Error).message ?? error)
    return []
  }
}

async function fetchCourtListener(): Promise<unknown[]> {
  const url =
    'https://www.courtlistener.com/api/rest/v3/opinions/?search=voting%20rights%20OR%20election%20law&order_by=-dateFiled&docket_court__jurisdiction=F'
  try {
    const response = await fetch(url)
    if (!response.ok) return []
    const json = (await response.json()) as unknown
    if (!json || typeof json !== 'object') return []
    const results = (json as { results?: unknown[] }).results
    return Array.isArray(results) ? results : []
  } catch (error) {
    console.error('Failed to fetch CourtListener data.', (error as Error).message ?? error)
    return []
  }
}

async function fetchGDELT(): Promise<unknown[]> {
  const url =
    'https://api.gdeltproject.org/api/v2/doc/doc?query=protest%20OR%20%22press%20freedom%22%20sourcecountry:US&mode=ArtList&format=json&maxrecords=50'
  try {
    const response = await fetch(url)
    if (!response.ok) return []
    const json = (await response.json()) as unknown
    if (!json || typeof json !== 'object') return []
    const articles = (json as { articles?: unknown[] }).articles
    return Array.isArray(articles) ? articles : []
  } catch (error) {
    console.error('Failed to fetch GDELT data.', (error as Error).message ?? error)
    return []
  }
}

function magnitudeFromType(kind: string | undefined): number {
  if (!kind) return 1
  const k = kind.toLowerCase()
  if (k.includes('final') || k.includes('enacted') || k.includes('signed') || k.includes('opinion')) return 3
  if (k.includes('vote') || k.includes('pass')) return 2.5
  if (k.includes('introduced') || k.includes('hearing')) return 1.5
  return 1
}

function normalizeProPublica(votes: unknown[]): EventItem[] {
  const events: EventItem[] = []
  for (const raw of votes) {
    if (!raw || typeof raw !== 'object') continue
    const vote = raw as Record<string, unknown>
    const chamber = typeof vote.chamber === 'string' ? vote.chamber.toUpperCase() : 'CONGRESS'
    const description = typeof vote.description === 'string' ? vote.description : undefined
    const question = typeof vote.question === 'string' ? vote.question : undefined
    const title = `${chamber} vote: ${description ?? question ?? 'Measure'}`
    const dateValue = typeof vote.date === 'string' ? vote.date : undefined
    const timeValue = typeof vote.time === 'string' ? vote.time : undefined
    const isoDate = dateValue
      ? new Date(`${dateValue}T${timeValue ?? '00:00'}Z`).toISOString()
      : new Date().toISOString()
    const result = typeof vote.result === 'string' ? vote.result : ''
    const passed = result.toLowerCase().includes('passed')
    const bill = typeof vote.bill === 'object' && vote.bill !== null ? (vote.bill as Record<string, unknown>) : undefined
    const latestAction =
      (bill && typeof bill.latest_action === 'string' && bill.latest_action) || result || 'vote'
    const magnitude = magnitudeFromType(latestAction)
    const summary =
      (bill && typeof bill.title === 'string' && bill.title) || description || question || undefined
    const urlCandidate = typeof vote.url === 'string' ? vote.url : undefined
    const billUrls = [
      bill && typeof bill.govtrack_url === 'string' ? bill.govtrack_url : undefined,
      bill && typeof bill.congressdotgov_url === 'string' ? bill.congressdotgov_url : undefined,
    ]
    const url = urlCandidate ?? billUrls.find(Boolean)
    const fallbackParts = [vote.chamber, vote.congress, vote.session, vote.roll_call]
      .map(part => (typeof part === 'string' || typeof part === 'number' ? String(part) : undefined))
      .filter((part): part is string => Boolean(part))
    const fallbackId = fallbackParts.length > 0 ? fallbackParts.join('-') : `${Date.now()}`
    const idValue = typeof vote.vote_id === 'string' ? vote.vote_id : fallbackId
    events.push({
      id: `pp-${idValue}`,
      date: isoDate,
      title,
      summary,
      url,
      category: 'Legislative',
      direction: passed ? 1 : -1,
      magnitude,
      confidence: 0.9,
    })
  }
  return events
}

function normalizeOpenStates(results: unknown[]): EventItem[] {
  const events: EventItem[] = []
  for (const raw of results) {
    if (!raw || typeof raw !== 'object') continue
    const bill = raw as Record<string, unknown>
    const idValue =
      typeof bill.id === 'string'
        ? bill.id
        : typeof bill.id === 'number'
        ? bill.id.toString()
        : undefined
    if (!idValue) continue
    const latestCandidate =
      (typeof bill.latest_action_date === 'string' && bill.latest_action_date) ||
      (typeof bill.updated_at === 'string' && bill.updated_at) ||
      (typeof bill.created_at === 'string' && bill.created_at) ||
      undefined
    const isoDate = latestCandidate ? new Date(latestCandidate).toISOString() : new Date().toISOString()
    const jurisdiction =
      typeof bill.jurisdiction === 'object' && bill.jurisdiction !== null
        ? (bill.jurisdiction as Record<string, unknown>)
        : undefined
    const jurisdictionName = typeof jurisdiction?.name === 'string' ? jurisdiction.name : 'State'
    const title = typeof bill.title === 'string' ? bill.title : `${jurisdictionName} bill`
    const subjects = Array.isArray(bill.subjects)
      ? bill.subjects.filter((subject): subject is string => typeof subject === 'string')
      : []
    const textForDirection = `${title} ${subjects.join(' ')}`.toLowerCase()
    const direction: 1 | -1 = /expand|access|registration|mail|drop box|preclearance|independent/.test(
      textForDirection,
    )
      ? 1
      : -1
    const latestActionDescription =
      typeof bill.latest_action_description === 'string' ? bill.latest_action_description : undefined
    const magnitude = magnitudeFromType(latestActionDescription ?? 'bill')
    const sources = Array.isArray(bill.sources) ? bill.sources : []
    const sourceUrl = sources.find(
      source => typeof source === 'object' && source !== null && typeof (source as Record<string, unknown>).url === 'string',
    ) as Record<string, unknown> | undefined
    const openstatesUrl = typeof bill.openstates_url === 'string' ? bill.openstates_url : undefined
    const url = openstatesUrl ?? (sourceUrl ? (sourceUrl.url as string) : undefined)
    events.push({
      id: `os-${idValue}`,
      date: isoDate,
      title,
      summary: latestActionDescription,
      url,
      category: 'Elections',
      direction,
      magnitude,
      confidence: 0.85,
    })
  }
  return events
}

function normalizeCourtListener(results: unknown[]): EventItem[] {
  const events: EventItem[] = []
  for (const raw of results) {
    if (!raw || typeof raw !== 'object') continue
    const opinion = raw as Record<string, unknown>
    const idValue =
      typeof opinion.id === 'string'
        ? opinion.id
        : typeof opinion.id === 'number'
        ? opinion.id.toString()
        : undefined
    if (!idValue) continue
    const dateFiled = typeof opinion.date_filed === 'string' ? opinion.date_filed : undefined
    const isoDate = dateFiled ? new Date(dateFiled).toISOString() : new Date().toISOString()
    const caseName = typeof opinion.caseName === 'string' ? opinion.caseName : undefined
    const absoluteUrl = typeof opinion.absolute_url === 'string' ? opinion.absolute_url : undefined
    const title = caseName ?? absoluteUrl ?? 'Court opinion'
    const url = absoluteUrl ? `https://www.courtlistener.com${absoluteUrl}` : undefined
    const citation = typeof opinion.citation === 'string' ? opinion.citation : undefined
    const cluster =
      typeof opinion.cluster === 'object' && opinion.cluster !== null
        ? (opinion.cluster as Record<string, unknown>)
        : undefined
    const opinionText = typeof cluster?.opinion_text === 'string' ? cluster.opinion_text : ''
    const text = `${caseName ?? ''} ${citation ?? ''} ${opinionText}`.toLowerCase()
    const direction: 1 | -1 = /protect|expand|enjoin|strike/.test(text) ? 1 : -1
    events.push({
      id: `cl-${idValue}`,
      date: isoDate,
      title,
      summary: citation,
      url,
      category: 'Judicial',
      direction,
      magnitude: 3,
      confidence: 0.9,
    })
  }
  return events
}

function normalizeGDELT(articles: unknown[]): EventItem[] {
  const events: EventItem[] = []
  for (const raw of articles) {
    if (!raw || typeof raw !== 'object') continue
    const article = raw as Record<string, unknown>
    const seendate = typeof article.seendate === 'string' ? article.seendate : undefined
    const isoDate = seendate ? new Date(seendate).toISOString() : new Date().toISOString()
    const title = typeof article.title === 'string' ? article.title : 'Civic action'
    const summary =
      typeof article.sourcecountry === 'string'
        ? `${article.sourcecountry} · ${typeof article.source === 'string' ? article.source : ''}`.trim()
        : undefined
    const url = typeof article.url === 'string' ? article.url : undefined
    const guid = typeof article.guid === 'string' ? article.guid : undefined
    const direction: 1 | -1 = /protest|march|rally|press freedom|journalist/.test(title.toLowerCase()) ? 1 : -1
    events.push({
      id: `gd-${url ?? guid ?? isoDate}`,
      date: isoDate,
      title,
      summary,
      url,
      category: 'Civil Society',
      direction,
      magnitude: 1.5,
      confidence: 0.75,
    })
  }
  return events
}

function dedupeAndSort(items: EventItem[]): EventItem[] {
  const map = new Map<string, EventItem>()
  for (const event of items) {
    const key = event.id || `${event.url ?? ''}-${event.date}`
    if (!map.has(key)) {
      map.set(key, event)
    }
  }
  return Array.from(map.values()).sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

async function main() {
  await loadEnvFiles()
  try {
    const [pp, os, cl, gd] = await Promise.all([
      fetchProPublica(),
      fetchOpenStates(),
      fetchCourtListener(),
      fetchGDELT(),
    ])

    const events = dedupeAndSort([
      ...normalizeProPublica(pp),
      ...normalizeOpenStates(os),
      ...normalizeCourtListener(cl),
      ...normalizeGDELT(gd),
    ])

    const outputPath = path.join(process.cwd(), 'public', 'data', 'events.json')
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify({ events }, null, 2), 'utf8')
    console.log(`Wrote ${events.length} events to ${outputPath}`)
  } catch (error) {
    console.error('Ingest failed; writing empty dataset.', error)
    const outputPath = path.join(process.cwd(), 'public', 'data', 'events.json')
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify({ events: [] }, null, 2), 'utf8')
  }
}

void main().catch(error => {
  console.error('Unexpected ingest failure.', error)
  process.exitCode = 1
})
