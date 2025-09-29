import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Pool } from 'pg'

export async function migrate() {
  const { DATABASE_URL } = process.env
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()
  try {
    const sqlPath = join(process.cwd(), 'backend', 'migrations', '001_init.sql')
    const fallbackPath = join(process.cwd(), 'migrations', '001_init.sql')
    let sql: string | undefined

    try {
      sql = await readFile(sqlPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }

    if (!sql) {
      sql = await readFile(fallbackPath, 'utf8')
    }

    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
    console.log('✅ Migration applied')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}
