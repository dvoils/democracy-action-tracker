// backend/src/db.ts
import { Pool, type PoolConfig } from 'pg'

const { DATABASE_URL } = process.env
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

function createPoolConfig(databaseUrl: string): PoolConfig {
  const url = new URL(databaseUrl)

  const sslMode = url.searchParams.get('sslmode')?.toLowerCase()
  if (sslMode) {
    url.searchParams.delete('sslmode')
  }

  const sslDisabled = sslMode === 'disable'

  return {
    connectionString: url.toString(),
    max: 5,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  }
}

export const pool = new Pool(createPoolConfig(DATABASE_URL))

type UpsertRow = {
  id: string
  source: string
  date: string
  title: string
  url?: string | null
  category: string
  direction: number
  magnitude: number
  confidence: number
  raw?: unknown | null
}

/** Bulk upsert EventItem[] into public.events (idempotent) */
export async function upsertEvents(rows: UpsertRow[]) {
  if (!rows.length) return 0
  const client = await pool.connect()
  try {
    const values: any[] = []
    const tuples = rows
      .map((row, index) => {
        const base = index * 10
        values.push(
          row.id,
          row.source,
          row.date,
          row.title,
          row.url ?? null,
          row.category,
          row.direction,
          row.magnitude,
          row.confidence,
          row.raw ?? null
        )
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`
      })
      .join(',')

    const text = `
      insert into public.events (id, source, date, title, url, category, direction, magnitude, confidence, raw)
      values ${tuples}
      on conflict (id) do update set
        date = excluded.date,
        title = excluded.title,
        url = excluded.url,
        category = excluded.category,
        direction = excluded.direction,
        magnitude = excluded.magnitude,
        confidence = excluded.confidence,
        raw = excluded.raw
    `
    const res = await client.query(text, values)
    return res.rowCount ?? 0
  } finally {
    client.release()
  }
}
