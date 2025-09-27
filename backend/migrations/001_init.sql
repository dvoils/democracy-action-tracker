create table if not exists public.events (
  id text primary key,
  source text not null,
  date timestamptz not null,
  title text not null,
  url text,
  category text not null,
  direction smallint not null,
  magnitude real not null,
  confidence real not null,
  raw jsonb,
  inserted_at timestamptz not null default now()
);

create index if not exists events_date_idx on public.events (date desc);
