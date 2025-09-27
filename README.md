# Democracy Action Tracker (Backend reset)

This repository now houses a minimal backend in `backend/`:
- Supabase Postgres schema (`events` table)
- Ingest script for CourtListener (no API key)
- Run `npm ci && npm run build && npm run migrate && npm run ingest` inside `backend/`

Frontend will be rebuilt later against this backend.
