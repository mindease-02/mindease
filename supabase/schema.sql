-- MindEase state tables. Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Auth users live in auth.users (managed by Supabase). user_state.user_id = auth.users.id.

create table if not exists public.user_state (
  user_id        text primary key,
  state          jsonb not null,
  updated_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
create index if not exists user_state_last_active_idx on public.user_state (last_active_at desc);

create table if not exists public.outbox (
  id         bigserial primary key,
  user_id    text not null,
  message    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists outbox_user_idx on public.outbox (user_id, id);

-- Lock the tables down: only the service role (server) may touch them.
alter table public.user_state enable row level security;
alter table public.outbox     enable row level security;
-- No policies = no access for anon/authenticated keys. The server uses the service role.

-- Housekeeping: drop undelivered check-ins older than 7 days.
create or replace function public.prune_outbox() returns void language sql as $$
  delete from public.outbox where created_at < now() - interval '7 days';
$$;
