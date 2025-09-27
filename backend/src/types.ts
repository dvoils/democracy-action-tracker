export type EventItem = {
  id: string
  source: 'courtlistener'
  date: string // ISO
  title: string
  url?: string
  category: 'Judicial'
  direction: 1 | -1
  magnitude: number
  confidence: number
  raw?: unknown
}
