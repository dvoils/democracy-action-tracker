
Absolutely—let’s do a clean local test end-to-end with the new SSL fix and the `test:db` helper.

### 0) Make sure `.env` is set

In `backend/.env` (replace with your real password, URL-encode special chars):

```
DATABASE_URL=postgresql://postgres.<projectref>:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### 1) Fresh install & build

```bash
cd backend
npm install          # first time only (creates package-lock.json)
npm run build
```

### 2) Quick connectivity check

```bash
npm run test:db
```

**Expected:**
`✅ DB connection OK. Current time: ...`

If this fails, double-check the DATABASE_URL (password encoding; `?sslmode=require`), and that `backend/src/db.ts` has:

```ts
ssl: { rejectUnauthorized: false }
```

### 3) Apply the migration

```bash
npm run migrate
```

**Expected:**
`✅ Migration applied`

### 4) Run the ingester

```bash
npm run ingest
```

**Expected:**
`✅ ingested <N> items (<N> upserted)`
(N can be 0–50+ depending on what CourtListener returns at the moment.)

### 5) Verify in Supabase

Open Supabase Studio → **Table Editor** → `public.events`
(or via SQL if you have `psql`):

```bash
PGPASSWORD='YOUR_PASSWORD' psql \
  "host=aws-1-us-east-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.<projectref> sslmode=require" \
  -c "select count(*) total, min(date), max(date) from public.events;"
```

---

## Troubleshooting quickies

* **SELF_SIGNED_CERT_IN_CHAIN** → ensure `ssl: { rejectUnauthorized: false }` in `db.ts` and `?sslmode=require` in `DATABASE_URL`.
* **“URI malformed”** → URL-encode your password (`#` → `%23`, `@` → `%40`, etc.).
* **Ingest says 0 items** → the query might be returning few right now; try again later or loosen the filter in `ingest-courtlistener.ts`.
* **Still stuck?** Run with a bit more logging:

  ```bash
  node --trace-warnings --env-file=.env ./dist/src/index.js ingest
  ```

If you hit any error message, paste it here and I’ll zero in on the fix.



Ah, that error is expected — `npm ci` only works if a **`package-lock.json`** already exists. Since this backend skeleton is brand new, there isn’t one yet.

Here’s how to fix it:

---

### 1. Do a normal install first

In your `backend/` directory:

```bash
npm install
```

That will:

* Install dependencies from `package.json`
* Create a fresh `package-lock.json`

---

### 2. Then you can use `npm ci`

Once `package-lock.json` exists, the “clean install” command will work:

```bash
npm ci
```

---

### 3. Workflow for you right now

Since this is your **first time bootstrapping**, just run:

```bash
cd backend
npm install
npm run build
npm run migrate
npm run ingest
```

---

⚡ TL;DR:

* Use `npm install` once to generate `package-lock.json`.
* After that, `npm ci` will be your repeatable, fast, “from-scratch” install command (great for CI/CD and GitHub Actions).

---

Do you want me to include a **starter `package-lock.json`** in your Codex PR request so you can skip `npm install` and go straight to `npm ci` in CI/CD?



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
