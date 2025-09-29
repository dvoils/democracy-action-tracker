import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pool } from './db.js'

export async function migrate() {
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
  }
}
