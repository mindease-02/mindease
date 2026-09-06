-- Companion Mode: one companion per user, its memories and its transcript.
-- The server talks to these with the service role after its own session check;
-- the RLS policies below are defence in depth so that even a leaked anon/auth
-- key can only ever see the caller's own rows.

create table if not exists public.companions (
  id                  text primary key,
  user_id             text not null unique,
  name                text not null,
  avatar_id           text not null,
  personality_config  jsonb not null default '{}'::jsonb,
  voice_config        jsonb not null default '{}'::jsonb,
  conversation_config jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.companion_memories (
  id            text primary key,
  user_id       text not null,
  companion_id  text not null references public.companions(id) on delete cascade,
  memory        text not null,
  kind          text not null default 'fact',
  importance    real not null default 0.4,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists companion_memories_user_idx on public.companion_memories (user_id, companion_id, created_at desc);

create table if not exists public.companion_messages (
  id            text primary key,
  user_id       text not null,
  companion_id  text not null references public.companions(id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  proactive     boolean not null default false,
  kind          text,
  created_at    timestamptz not null default now()
);
create index if not exists companion_messages_user_idx on public.companion_messages (user_id, companion_id, created_at desc);

alter table public.companions         enable row level security;
alter table public.companion_memories enable row level security;
alter table public.companion_messages enable row level security;

-- A signed-in user may only touch rows whose user_id is their own auth id.
drop policy if exists companions_own on public.companions;
create policy companions_own on public.companions
  for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists companion_memories_own on public.companion_memories;
create policy companion_memories_own on public.companion_memories
  for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists companion_messages_own on public.companion_messages;
create policy companion_messages_own on public.companion_messages
  for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

-- Housekeeping: keep the companion transcript to the most recent 400 messages per user.
create or replace function public.prune_companion_messages() returns void language sql as $$
  delete from public.companion_messages m
  using (
    select id from (
      select id, row_number() over (partition by user_id order by created_at desc) as rn
      from public.companion_messages
    ) t where t.rn > 400
  ) old
  where m.id = old.id;
$$;
