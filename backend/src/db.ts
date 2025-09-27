import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Pool } from 'pg'

const { DATABASE_URL } = process.env
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

export const pool = new Pool({ connectionString: DATABASE_URL, max: 5 })

async function loadMigration(): Promise<string> {
  const candidates = [
    resolve(process.cwd(), 'migrations/001_init.sql'),
    resolve(process.cwd(), 'backend/migrations/001_init.sql')
  ]
  for (const file of candidates) {
    try {
      return await readFile(file, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  throw new Error('Could not find migrations/001_init.sql')
}

export async function migrate() {
  const sql = await loadMigration()
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

export async function upsertEvents(rows: {
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
}[]) {
  if (!rows.length) return 0
  const client = await pool.connect()
  try {
    const values: unknown[] = []
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
