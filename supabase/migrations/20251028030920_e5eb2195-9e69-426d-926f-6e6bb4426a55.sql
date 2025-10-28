-- Phase 6: Add missing fields and production tables

-- Add missing fields to listings
alter table listings 
  add column if not exists country_code text default 'GB',
  add column if not exists city text,
  add column if not exists region text;

-- Create ingest_events table for observability
create table if not exists ingest_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null,
  input_url text not null,
  status text not null, -- 'started', 'completed', 'failed'
  run_id text,
  dataset_id text,
  items_count integer default 0,
  error_message text,
  error_code text,
  user_id uuid references auth.users(id),
  request_id text,
  metadata jsonb default '{}'::jsonb
);

-- Index for querying recent events
create index if not exists idx_ingest_events_created_at on ingest_events(created_at desc);
create index if not exists idx_ingest_events_provider on ingest_events(provider);
create index if not exists idx_ingest_events_status on ingest_events(status);

-- RLS for ingest_events
alter table ingest_events enable row level security;

create policy "Users can view own ingest events"
  on ingest_events for select
  using (auth.uid() = user_id);

create policy "Service role can manage all ingest events"
  on ingest_events for all
  using (true)
  with check (true);

-- Create logs table for structured logging
create table if not exists app_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level text not null, -- 'info', 'warn', 'error'
  message text not null,
  request_id text,
  user_id uuid,
  metadata jsonb default '{}'::jsonb
);

-- Index for log queries
create index if not exists idx_app_logs_created_at on app_logs(created_at desc);
create index if not exists idx_app_logs_level on app_logs(level);

-- RLS for app_logs
alter table app_logs enable row level security;

create policy "Service role can manage all logs"
  on app_logs for all
  using (true)
  with check (true);