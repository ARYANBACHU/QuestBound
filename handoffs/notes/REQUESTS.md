# Cross-team requests (append only; the Merge Agent applies or rejects each round)

Format:
## [INITIALS] short title
- What: exact change (file + diff or new export)
- Why: which feature needs it
- Status: open

## [MP] Add `profiles` (and `fellowships`) to the realtime publication
- What: new migration `supabase/migrations/0002_mp_realtime.sql`:
  ```sql
  alter publication supabase_realtime add table public.profiles;
  alter publication supabase_realtime add table public.fellowships;
  ```
- Why: Friends tab / member list updates live when a friend changes their crest, color or name (onboarding
  happens right after joining, so B shows up as "Wanderer 🦉" on A's phone until a refresh otherwise).
  `lib/fellowship.ts` already subscribes; it's a no-op until this lands.
- Status: open

## [MP] `message_reactions` table (reactions on proclamations + messages)
- What: new migration `supabase/migrations/0003_mp_reactions.sql`:
  ```sql
  create table if not exists public.message_reactions (
    message_id uuid not null references public.messages(id) on delete cascade,
    fellowship_id uuid not null references public.fellowships(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    emoji text not null check (emoji in ('👑','🔥','😂','❤️','🎉')),
    created_at timestamptz not null default now(),
    primary key (message_id, user_id, emoji)
  );
  alter table public.message_reactions enable row level security;
  create policy "reactions read" on public.message_reactions for select to authenticated using (public.is_member(fellowship_id));
  create policy "reactions add" on public.message_reactions for insert to authenticated
    with check (user_id = auth.uid() and public.is_member(fellowship_id));
  create policy "reactions remove" on public.message_reactions for delete to authenticated using (user_id = auth.uid());
  alter table public.message_reactions replica identity full; -- DELETE events carry fellowship_id
  alter publication supabase_realtime add table public.message_reactions;
  ```
  (Optional: mirror a `MessageReaction` type in `shared/types.ts`; `lib/chat.ts` defines its own row type for now.)
- Why: Round 2 #1 — long-press a proclamation → 👑🔥😂❤️🎉; friends see reactions live. Already built in
  `lib/chat.ts` (`reactions`, `toggleReaction`); until this lands, reactions stay local to each phone (no errors).
- Status: open

## [MP] → AB: mount `<ProclamationToast />` once in `app/(tabs)/_layout.tsx`
- What: `import ProclamationToast from '@/components/friends/ProclamationToast';` and render it once as a sibling
  AFTER `<Tabs …/>` (wrap both in `<View style={{ flex: 1 }}>`). It positions itself absolutely under the status bar.
- Why: when a friend colors a region (or texts) while you're on Missions/Page/Storybook, a "Hear ye!" banner slides
  in with their crest; tap → the mission/page/storybook. Hidden on the Friends tab. It also keeps the chat Presence
  channel alive app-wide, so online dots reflect anyone with the app open (not just people on the Friends tab).
- Status: open
