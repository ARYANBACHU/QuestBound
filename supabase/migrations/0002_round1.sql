-- QUESTBOUND round 1 (merge agent). Additive only; safe to re-run.
-- Requests: MP realtime on profiles/fellowships, MP message_reactions.

-- ============ REALTIME: profiles + fellowships ============
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fellowships') then
    alter publication supabase_realtime add table public.fellowships;
  end if;
end $$;

-- ============ MESSAGE REACTIONS ============
-- lib/chat.ts selects (message_id, fellowship_id, user_id, emoji), filters realtime on fellowship_id,
-- inserts { message_id, fellowship_id, user_id, emoji } and deletes by (message_id, user_id, emoji).
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  fellowship_id uuid not null references public.fellowships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists message_reactions_fellowship on public.message_reactions (fellowship_id, created_at desc);

-- fellowship_id always comes from the message (clients can't spoof it). RLS WITH CHECK runs after this.
create or replace function public.message_reactions_fill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select m.fellowship_id into new.fellowship_id from public.messages m where m.id = new.message_id;
  return new;
end $$;
drop trigger if exists message_reactions_fill on public.message_reactions;
create trigger message_reactions_fill before insert on public.message_reactions
  for each row execute function public.message_reactions_fill();

alter table public.message_reactions enable row level security;

drop policy if exists "reactions read" on public.message_reactions;
create policy "reactions read" on public.message_reactions for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.fellowship_id)));

drop policy if exists "reactions add" on public.message_reactions;
create policy "reactions add" on public.message_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.fellowship_id))
  );

drop policy if exists "reactions remove" on public.message_reactions;
create policy "reactions remove" on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

-- DELETE events carry every column (lib/chat.ts filters DELETEs client-side by fellowship_id).
alter table public.message_reactions replica identity full;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions') then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;
