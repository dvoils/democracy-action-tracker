export const CATEGORIES = [
  'Legislative',
  'Executive',
  'Judicial',
  'Elections',
  'Rights & Liberties',
  'Civil Society',
  'Political Violence',
] as const

export type Category = (typeof CATEGORIES)[number]
export type CategoryScores = Record<Category, number>
export type CategoryWeights = Record<Category, number>
export type EventDirection = 1 | -1

export type EventItem = {
  id: string
  date: string // ISO
  title: string
  summary?: string
  url?: string
  category: Category
  direction: EventDirection // +1 = towards democracy, -1 = towards autocracy
  magnitude: number // 0.5..5 typical; can exceed
  confidence: number // 0..1
}

export type ScoreHistoryPoint = { ts: number; value: number }

export const CATEGORY_META: Record<
  Category,
  {
    description: string
    accentColor: string
  }
> = {
  Legislative: {
    description: 'Law-making, oversight, and checks on executive power.',
    accentColor: '#6366f1',
  },
  Executive: {
    description: 'Administrative actions, transparency, and rule implementation.',
    accentColor: '#0ea5e9',
  },
  Judicial: {
    description: 'Courts, judicial independence, and rule-of-law decisions.',
    accentColor: '#8b5cf6',
  },
  Elections: {
    description: 'Voting access, election integrity, and representation.',
    accentColor: '#22c55e',
  },
  'Rights & Liberties': {
    description: 'Civil liberties, minority protections, and free expression.',
    accentColor: '#f97316',
  },
  'Civil Society': {
    description: 'Media, organizing, and civic participation.',
    accentColor: '#ec4899',
  },
  'Political Violence': {
    description: 'Political intimidation, violence, and security of participants.',
    accentColor: '#ef4444',
  },
}

export function createDefaultWeights(): CategoryWeights {
  return Object.fromEntries(CATEGORIES.map(category => [category, 1])) as CategoryWeights
}

export function computeCategoryScores(events: EventItem[], now = new Date()): CategoryScores {
  const halfLifeDays = 365
  const lambda = Math.log(2) / halfLifeDays
  const base = Object.fromEntries(CATEGORIES.map(category => [category, 0])) as CategoryScores

  for (const event of events) {
    const ageDays = Math.max(0, (now.getTime() - new Date(event.date).getTime()) / (1000 * 60 * 60 * 24))
    const decay = Math.exp(-lambda * ageDays)
    const signedImpact = event.direction * event.magnitude * event.confidence * decay
    base[event.category] += signedImpact
  }

  const normalized: CategoryScores = { ...base }
  for (const category of CATEGORIES) {
    normalized[category] = Math.tanh(base[category] / 10) * 100
  }

  return normalized
}

export function weightedIndex(categoryScores: CategoryScores, weights: CategoryWeights) {
  const totalWeight = Object.values(weights).reduce((acc, value) => acc + value, 0) || 1
  const sum = (CATEGORIES as readonly Category[]).reduce(
    (acc, category) => acc + categoryScores[category] * weights[category],
    0,
  )

  return sum / totalWeight
}

export type EventStats = {
  total: number
  positive: number
  negative: number
  netImpact: number
  averageConfidence: number
  latestEventDate?: string
}

export function computeEventStats(events: EventItem[]): EventStats {
  if (!events.length) {
    return { total: 0, positive: 0, negative: 0, netImpact: 0, averageConfidence: 0, latestEventDate: undefined }
  }

  let positive = 0
  let negative = 0
  let netImpact = 0
  let confidenceSum = 0
  let latestEventDate: string | undefined

  for (const event of events) {
    if (event.direction === 1) positive += 1
    else negative += 1

    netImpact += event.direction * event.magnitude * event.confidence
    confidenceSum += event.confidence

    if (!latestEventDate || new Date(event.date) > new Date(latestEventDate)) {
      latestEventDate = event.date
    }
  }

  return {
    total: events.length,
    positive,
    negative,
    netImpact,
    averageConfidence: confidenceSum / events.length,
    latestEventDate,
  }
}

export const seedEvents: EventItem[] = [
  {
    id: 'seed-1',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    title: 'Court curtails gerrymandered map',
    category: 'Elections',
    direction: 1,
    magnitude: 2.5,
    confidence: 0.9,
    url: '#',
  },
  {
    id: 'seed-2',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    title: 'Legislature advances voter ID expansion',
    category: 'Elections',
    direction: -1,
    magnitude: 2.0,
    confidence: 0.8,
  },
  {
    id: 'seed-3',
    date: new Date().toISOString(),
    title: 'Peaceful mass protest for press freedom',
    category: 'Civil Society',
    direction: 1,
    magnitude: 1.2,
    confidence: 0.7,
  },
]

export const exampleImportPayload = JSON.stringify(
  [
    {
      id: 'ext-001',
      date: new Date().toISOString(),
      title: 'Independent commission adopts fair maps',
      category: 'Elections',
      direction: 1,
      magnitude: 3,
      confidence: 0.9,
      url: 'https://example.com/source',
    },
    {
      id: 'ext-002',
      date: new Date().toISOString(),
      title: 'Court stays injunction; restrictive law reinstated',
      category: 'Rights & Liberties',
      direction: -1,
      magnitude: 2,
      confidence: 0.85,
    },
  ],
  null,
  2,
)
