-- Initial persistence foundation. Game writes are server-only.
create table public.characters (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 40),
 origin text not null check (char_length(btrim(origin)) between 1 and 60),
 goal text not null check (char_length(btrim(goal)) between 1 and 160),
 weapon text not null check (char_length(btrim(weapon)) between 1 and 60),
 created_at timestamptz not null default now(),
 unique (id, owner_id)
);
create index characters_owner_created_idx on public.characters(owner_id, created_at desc);

create table public.campaigns (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 title text not null default 'O sino sem voz' check (char_length(btrim(title)) between 1 and 100),
 status text not null default 'active' check (status in ('active','archived')),
 version integer not null default 0 check (version >= 0),
 state jsonb not null check (jsonb_typeof(state) = 'object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (character_id, owner_id) references public.characters(id, owner_id) on delete cascade,
 unique (id, owner_id),
 constraint campaigns_state_required check (state ?& array['hp','energy','turn','location','memory','rival']),
 constraint campaigns_state_numbers check (
  coalesce(jsonb_typeof(state->'hp')='number' and (state->>'hp')::numeric between 1 and 12 and mod((state->>'hp')::numeric,1)=0,false)
  and coalesce(jsonb_typeof(state->'energy')='number' and (state->>'energy')::numeric between 0 and 6 and mod((state->>'energy')::numeric,1)=0,false)
  and coalesce(jsonb_typeof(state->'turn')='number' and (state->>'turn')::numeric=version,false)
 ),
 constraint campaigns_state_text check (
  coalesce(jsonb_typeof(state->'location')='string' and char_length(state->>'location')<=100,false)
  and coalesce(jsonb_typeof(state->'memory')='string' and char_length(state->>'memory')<=2400,false)
  and coalesce(jsonb_typeof(state->'rival')='string' and char_length(state->>'rival')<=300,false)
 )
);
create index campaigns_owner_updated_idx on public.campaigns(owner_id, updated_at desc);
create index campaigns_character_owner_idx on public.campaigns(character_id, owner_id);

create table public.turns (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 sequence integer not null check (sequence >= 1),
 action text not null check (char_length(btrim(action)) between 1 and 600),
 status text not null default 'pending' check (status in ('pending','resolved','failed','completed')),
 roll smallint not null check (roll between 1 and 12),
 intent jsonb,
 resolution jsonb,
 entry jsonb,
 provider text check (char_length(provider)<=80),
 error_code text check (char_length(error_code)<=80),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (campaign_id, owner_id) references public.campaigns(id, owner_id) on delete cascade,
 unique (campaign_id, request_id),
 unique (campaign_id, sequence),
 constraint turns_intent_object check (intent is null or jsonb_typeof(intent)='object'),
 constraint turns_resolution_object check (resolution is null or jsonb_typeof(resolution)='object'),
 constraint turns_entry_object check (entry is null or jsonb_typeof(entry)='object'),
 constraint turns_resolved_payload check (status not in ('resolved','completed') or (intent is not null and resolution is not null)),
 constraint turns_completed_entry check (status <> 'completed' or entry is not null)
);
create index turns_owner_created_idx on public.turns(owner_id, created_at desc);
create index turns_campaign_owner_idx on public.turns(campaign_id, owner_id);
-- A failed turn must resume with the same request_id/roll before another starts.
create unique index turns_one_unfinished_per_campaign_idx on public.turns(campaign_id) where status <> 'completed';

alter table public.characters enable row level security;
alter table public.campaigns enable row level security;
alter table public.turns enable row level security;
revoke all on public.characters, public.campaigns, public.turns from public, anon, authenticated;
grant select on public.characters, public.campaigns, public.turns to authenticated;
grant select, insert, update, delete on public.characters, public.campaigns, public.turns to service_role;
create policy characters_read_own on public.characters for select to authenticated using ((select auth.uid())=owner_id);
create policy campaigns_read_own on public.campaigns for select to authenticated using ((select auth.uid())=owner_id);
create policy turns_read_own on public.turns for select to authenticated using ((select auth.uid())=owner_id);
comment on table public.characters is 'Player creation choices. No equipment or origin defaults. Server validates all writes.';
comment on table public.campaigns is 'Canonical game snapshot. Server updates state, version and updated_at atomically after a completed turn.';
comment on table public.turns is 'Durable request identity, roll and narrative. Provider retries reuse this row. Contains no API keys.';
