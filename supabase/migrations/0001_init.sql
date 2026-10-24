-- QUESTBOUND schema v1 (FROZEN — changes only via the merge agent, as 0002_*.sql)
-- Paste into Supabase Dashboard > SQL Editor > Run.  Mirrors shared/types.ts.

create extension if not exists pgcrypto;

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Wanderer',
  crest text not null default 'owl',
  color text not null default 'lagoon',
  interests text[] not null default '{}',
  budget text not null default '$' check (budget in ('free','$','$$','$$$')),
  availability text[] not null default '{}',
  home_area text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ FELLOWSHIPS ============
create table if not exists public.fellowships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid references public.profiles(id) on delete set null,
  lat double precision,
  lng double precision,
  area_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.fellowship_members (
  fellowship_id uuid not null references public.fellowships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('founder','member')),
  joined_at timestamptz not null default now(),
  primary key (fellowship_id, user_id)
);

create or replace function public.is_member(fid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.fellowship_members where fellowship_id = fid and user_id = auth.uid());
$$;

-- ============ STORY ============
create table if not exists public.storylines (
  id uuid primary key default gen_random_uuid(),
  fellowship_id uuid not null references public.fellowships(id) on delete cascade,
  book_number int not null default 1,
  title text not null default '',
  synopsis text not null default '',
  theme_tags text[] not null default '{}',
  status text not null default 'generating' check (status in ('generating','active','complete')),
  recap jsonb,
  generation_context jsonb, -- server only: interests, serp places, prior recap
  created_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  storyline_id uuid not null references public.storylines(id) on delete cascade,
  chapter_number int not null,
  title text not null,
  narrative text not null default '',
  template_id text not null check (template_id in ('castle_gate','enchanted_forest','dragon_peak','royal_feast')),
  status text not null default 'locked' check (status in ('locked','active','complete')),
  illustration_url text,
  completed_at timestamptz,
  unique (storyline_id, chapter_number)
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  storyline_id uuid not null references public.storylines(id) on delete cascade,
  fellowship_id uuid not null references public.fellowships(id) on delete cascade,
  region_id text not null,
  title text not null,
  description text not null default '',
  story_hook text not null default '',
  type text not null check (type in ('gathering','duet','relic','bard','trial','gift')),
  proof_type text not null check (proof_type in ('photo','group_photo','text','voice','answer','confirm')),
  required_members int not null default 1,
  assignee_ids uuid[] not null default '{}',
  place jsonb,
  trial_question text,
  verification_hint text not null default '',
  points int not null default 10,
  status text not null default 'locked' check (status in ('locked','open','pending','complete')),
  completed_by uuid[] not null default '{}',
  completed_at timestamptz,
  story_line text,
  created_at timestamptz not null default now(),
  unique (page_id, region_id)
);

-- Answers to trial riddles: service role only (no RLS policies => clients cannot read)
create table if not exists public.mission_secrets (
  mission_id uuid primary key references public.missions(id) on delete cascade,
  trial_answer text,
  pending_payload jsonb -- e.g. gift waiting for friend confirmation
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_ids uuid[] not null default '{}',
  proof_url text,
  proof_text text,
  verdict jsonb,
  story_line text,
  created_at timestamptz not null default now()
);

-- ============ SOCIAL ============
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  fellowship_id uuid not null references public.fellowships(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'text' check (kind in ('text','proclamation','system','wizard')),
  body text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_fellowship_created on public.messages (fellowship_id, created_at desc);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  fellowship_id uuid not null references public.fellowships(id) on delete cascade,
  storyline_id uuid references public.storylines(id) on delete cascade,
  page_id uuid references public.pages(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  image_url text not null,
  caption text,
  kind text not null default 'photo' check (kind in ('photo','illustration','montage_frame')),
  created_at timestamptz not null default now()
);

-- SerpApi response cache (service role only). Saves credits; shown in demo as "N cached".
create table if not exists public.serp_cache (
  key text primary key,
  engine text not null,
  response jsonb not null,
  hits int not null default 0,
  created_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.fellowships enable row level security;
alter table public.fellowship_members enable row level security;
alter table public.storylines enable row level security;
alter table public.pages enable row level security;
alter table public.missions enable row level security;
alter table public.mission_secrets enable row level security;
alter table public.completions enable row level security;
alter table public.messages enable row level security;
alter table public.memories enable row level security;
alter table public.serp_cache enable row level security;

-- profiles: anyone signed in can read (needed to show fellow members); you edit only yourself
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());

-- fellowships: readable by signed-in users (join-by-code lookup); create as yourself; members update
create policy "fellowships read" on public.fellowships for select to authenticated using (true);
create policy "fellowships create" on public.fellowships for insert to authenticated with check (created_by = auth.uid());
create policy "fellowships update" on public.fellowships for update to authenticated using (public.is_member(id));

-- members: read all memberships of fellowships you are in (and your own); join/leave as yourself
create policy "members read" on public.fellowship_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(fellowship_id));
create policy "members join" on public.fellowship_members for insert to authenticated with check (user_id = auth.uid());
create policy "members leave" on public.fellowship_members for delete to authenticated using (user_id = auth.uid());

-- story tables: members read; ALL writes go through edge functions (service role bypasses RLS)
create policy "storylines read" on public.storylines for select to authenticated using (public.is_member(fellowship_id));
create policy "pages read" on public.pages for select to authenticated
  using (exists (select 1 from public.storylines s where s.id = storyline_id and public.is_member(s.fellowship_id)));
create policy "missions read" on public.missions for select to authenticated using (public.is_member(fellowship_id));
create policy "completions read" on public.completions for select to authenticated
  using (exists (select 1 from public.missions m where m.id = mission_id and public.is_member(m.fellowship_id)));
create policy "memories read" on public.memories for select to authenticated using (public.is_member(fellowship_id));

-- messages: members read; members post 'text' and 'system' as themselves
create policy "messages read" on public.messages for select to authenticated using (public.is_member(fellowship_id));
create policy "messages post" on public.messages for insert to authenticated
  with check (public.is_member(fellowship_id) and user_id = auth.uid() and kind in ('text','system'));

-- ============ REALTIME ============
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.missions;
alter publication supabase_realtime add table public.pages;
alter publication supabase_realtime add table public.storylines;
alter publication supabase_realtime add table public.fellowship_members;
alter publication supabase_realtime add table public.memories;

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('art', 'art', true) on conflict (id) do nothing;

create policy "proofs upload" on storage.objects for insert to authenticated with check (bucket_id = 'proofs');
create policy "proofs read" on storage.objects for select using (bucket_id in ('proofs','art'));
