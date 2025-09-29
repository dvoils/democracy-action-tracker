Here’s a quick, no-mystery playbook to test the ingester locally and prove it’s doing the right thing end-to-end.

# 0) One-time setup

```bash
cd backend
cp .env.example .env
# Put your full Supabase URL in backend/.env:
# DATABASE_URL=postgresql://postgres.<ref>:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
npm ci
npm run build
```

# 1) Sanity: DB connectivity + schema

```bash
npm run migrate
# expect: "✅ Migration applied"
```

If you prefer, also poke the DB directly (optional):

```bash
# Requires psql locally; replace values as needed
PGPASSWORD='PASSWORD' psql "host=aws-1-us-east-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.<ref> sslmode=require" \
  -c "select now();"
```

# 2) Dry-run the fetch (no DB writes)

Temporarily add a quick probe **before** upserting. Open `backend/src/index.ts` and just before calling `upsertEvents(items)` add:

```ts
console.log('Fetched items:', items.length);
if (items[0]) console.log('Sample:', { id: items[0].id, title: items[0].title, date: items[0].date, url: items[0].url });
```

Then:

```bash
npm run build
npm run ingest
# expect: "Fetched items: <n>" then "✅ ingested <n> items (<n> upserted)"
```

# 3) Verify rows landed

In Supabase Studio → Table Editor → `public.events`, or via SQL:

```bash
PGPASSWORD='PASSWORD' psql "host=aws-1-us-east-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.<ref> sslmode=require" \
  -c "select count(*) as total, min(date), max(date) from public.events;"
```

# 4) Idempotency test (no duplicates)

Run it again:

```bash
npm run ingest
```

The “upserted” count should be ≤ fetched count (often 0 if nothing changed). Your table row count should not balloon.

# 5) Quick “sample view” check

List 5 newest rows:

```bash
PGPASSWORD='PASSWORD' psql "host=aws-1-us-east-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.<ref> sslmode=require" \
  -c "select id, source, date, left(title,80) as title, direction, magnitude from public.events order by date desc limit 5;"
```

# 6) Troubleshooting fast-paths

* **SSL/auth error** → ensure `?sslmode=require` at the end of `DATABASE_URL`.
* **“URI malformed”** → your password likely needs URL-encoding (e.g., `#` → `%23`).
* **Fetched 0 items** → the public API may have no recent matches at this moment. Try loosening the query in `ingest-courtlistener.ts` or log the raw URL/response status.
* **Timeouts** → just re-run; the script is short-lived. If persistent, your local network might block the API.

# 7) Helpful temporary flags (optional)

You can add two tiny conveniences without changing architecture:

**A) DRY_RUN (fetch without writing)**

```ts
// in src/index.ts after fetching items
if (process.env.DRY_RUN === '1') {
  console.log('DRY_RUN on – not writing to DB.');
  console.log(JSON.stringify(items.slice(0,3), null, 2));
  return;
}
```

Run:

```bash
DRY_RUN=1 npm run ingest
```

**B) LIMIT results to a small number while testing**
In `src/ingest-courtlistener.ts`, after mapping:

```ts
return results.slice(0, 10).map(/* ... */);
```

# 8) Clean/retest (optional)

If you want to reset the table for a clean run:

```bash
PGPASSWORD='PASSWORD' psql "host=aws-1-us-east-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.<ref> sslmode=require" \
  -c "truncate table public.events;"
npm run ingest
```

# 9) When you’re happy → enable Actions

* Add the workflow we drafted (`.github/workflows/ingest.yml`).
* Add repo secret `DATABASE_URL` (same string you used locally).
* Manually **Run workflow** once in GitHub to confirm.

If anything throws errors while you test, paste the exact console output and I’ll zero in on the fix.
