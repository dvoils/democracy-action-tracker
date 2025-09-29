Great call—since this backend is just a Node script that writes to **Supabase Postgres**, the simplest “deployment” is:

* host **nothing**,
* use Supabase only for the **DB**,
* and run the ingest on a **GitHub Actions cron** (with your Supabase connection string as a secret).

Here’s the minimal, step-by-step:

---

# 1) Create your Supabase project

1. Go to Supabase → New Project.
2. In **Project Settings → Database**, copy the **connection string**.

   * Use either:

     * **Direct**: `postgresql://postgres:<PASSWORD>@db.<id>.supabase.co:5432/postgres?sslmode=require`, or
     * **Pooler** (recommended for many short-lived connections): same host, port **6543**.
3. In **Table Editor**, you don’t need to create tables manually—we’ll run the migration.

```bash
postgresql://postgres.zofkjuptztjonovygwts:$SUPABASE_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres

```

---

# 2) Test locally once (optional but recommended)

From your repo root (where we added `backend/`):

```bash
cd backend
cp .env.example .env
# paste DATABASE_URL=postgresql://... into .env

npm ci
npm run build
npm run migrate   # creates the 'events' table
npm run ingest    # fetches CourtListener and upserts rows
```

Verify in Supabase Studio → `public.events` has rows.

---

# 3) Set up scheduled ingestion (GitHub Actions)

Add this workflow at `.github/workflows/ingest.yml`:

```yaml
name: Ingest to Supabase (Hourly)

on:
  schedule:
    - cron: "0 * * * *"   # every hour
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install deps
        run: npm ci

      - name: Build
        run: npm run build

      # Run migration on each run is fine & idempotent, but you can remove after first successful run
      - name: Migrate schema
        run: node --env-file=.env ./dist/src/index.js migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Ingest CourtListener
        run: node --env-file=.env ./dist/src/index.js ingest
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Then in your repo settings → **Secrets and variables → Actions → New repository secret**:

* `DATABASE_URL` = your Supabase Postgres connection string (include `?sslmode=require`).

> That’s it. Every hour the workflow will fetch fresh opinions and upsert into `public.events`.

---

## Common gotchas (quick fixes)

* **SSL errors**: ensure your `DATABASE_URL` ends with `?sslmode=require`.
* **Connection pool**: if you ever see connection limits, switch to the **pooler port 6543** in your connection string.
* **RLS**: we’re writing directly to `public.events` with a server secret; Row Level Security defaults won’t block this. (You’ll add RLS later if you expose a public API.)
* **Idempotency**: we upsert on `id`, so re-running won’t create duplicates.

---

## What you have now

* A persistent DB in Supabase,
* An hourly ingestion pipeline that keeps `public.events` fresh,
* No servers to run or deploy.

When you’re ready for the **read API**, we can add a tiny service (Vercel/Express) or Supabase Edge Functions to expose `/events` (with optional filters) to your future frontend.
