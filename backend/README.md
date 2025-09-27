# Democracy Tracker – Minimal Backend (Supabase + CourtListener)

This is the smallest possible backend to:
1) Create an `events` table on Supabase (Postgres).
2) Fetch recent judicial opinions from CourtListener (no API key).
3) Normalize and insert them.

## Prereqs
- Node 20+
- A Supabase project (free tier is fine)

## Configure
1. Create a Supabase project and get your **Postgres connection string**.
2. Copy `.env.example` → `.env` and set `DATABASE_URL`.

## Migrate
```bash
npm ci
npm run build
npm run migrate
```

## Ingest once (manual)

```bash
npm run ingest
```

## Notes

* Safe to re-run: upserts by stable `id`.
* Next steps: add sources (OpenStates/ProPublica), a read API, and a scheduler (GH Action).

