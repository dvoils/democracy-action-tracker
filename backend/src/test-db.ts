// backend/src/test-db.ts
import { performance } from 'node:perf_hooks'
import { pool } from './db.js'   // ✅ reuse the pool from db.ts

async function main() {
  const start = performance.now()
  const { rows } = await pool.query('select now() as now')
  const serverTime = rows[0]?.now
  console.log('✅ Database connectivity OK')
  if (serverTime) {
    console.log(`Server time: ${serverTime}`)
  }
  const duration = Math.round(performance.now() - start)
  console.log(`Query latency: ${duration}ms`)
}

main()
  .then(async () => {
    await pool.end()
    console.log('Database connectivity check succeeded.')
  })
  .catch(async (error) => {
    console.error('❌ Database connectivity check failed:')
    console.error(error)
    try {
      await pool.end()
    } catch (endError) {
      console.error('Failed to close pool cleanly:', endError)
    }
    process.exitCode = 1
  })
