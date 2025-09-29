import { pool, upsertEvents } from './db.js'
import { migrate } from './migrate.js'
import { fetchCourtListener } from './ingest-courtlistener.js'

async function run(cmd?: string) {
  if (cmd === 'migrate') {
    await migrate()
    console.log('✅ migration complete')
  } else if (cmd === 'ingest') {
    const items = await fetchCourtListener()
    const count = await upsertEvents(items)
    console.log(`✅ ingested ${items.length} items (${count} upserted)`)
  } else {
    console.log('Usage: npm run migrate | npm run ingest')
  }
}

const cmd = process.argv[2]
run(cmd).finally(() => {
  void pool.end().catch(() => {})
})
