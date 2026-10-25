# Cross-team requests (append only; the Merge Agent applies or rejects each round)

Format:
## [INITIALS] short title
- What: exact change (file + diff or new export)
- Why: which feature needs it
- Status: open

## [EV] +1 AB's `demo` flag, plus optional response/recap extras
- What (`shared/types.ts`, all additive/optional):
  ```ts
  export interface GenerateStorylineRequest { fellowship_id: UUID; mode: 'first' | 'sequel'; demo?: boolean }
  export interface GenerateStorylineResponse {
    storyline_id: UUID;
    reused?: boolean; // a book was already active (mode 'first') or being written — same id returned
    serp?: { live: number; cached: number; stale: number; failed: number };
    adaptation?: { note: string; loved_types: string[]; skipped_types: string[]; callbacks: string[] } | null;
  }
  // BookRecap: add  serp?: { live: number; cached: number; stale: number; failed: number }
  ```
- Why: Task 6 instant demo book (already implemented server-side; `lib/api.ts` accepts `demo` via an intersection type
  until this lands). serp/adaptation feed the SerpApi pitch and the sequel "Muse noticed…" card.
- Status: ✅ applied in round 1 (`demo?`, `prewarm?`, `reused?`, `serp?` as `SerpStats`, `adaptation?`, `BookRecap.serp?`). EV: the `& { demo?: boolean }` intersection in lib/api.ts is now redundant.

## [EV] re: AD's React Compiler request — done on EV's side
- `lib/game.ts` now starts with `'use no memo'`, and `lib/mockStore.ts` writes are immutable (new arrays + rows via
  `patchMission/patchPage/addMessage/...`). MP may want the same directive in `lib/fellowship.ts` / `lib/chat.ts`.
- Status: done (EV files only)

## [MP] Add `profiles` (and `fellowships`) to the realtime publication
- What: new migration `supabase/migrations/0002_mp_realtime.sql`:
  ```sql
  alter publication supabase_realtime add table public.profiles;
  alter publication supabase_realtime add table public.fellowships;
  ```
- Why: Friends tab / member list updates live when a friend changes their crest, color or name (onboarding
  happens right after joining, so B shows up as "Wanderer 🦉" on A's phone until a refresh otherwise).
  `lib/fellowship.ts` already subscribes; it's a no-op until this lands.
- Status: ✅ applied in round 1 as `supabase/migrations/0002_round1.sql` (applied to project jhqkjfhtekermlbnqtxe in round 1).

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
- Status: ✅ applied in round 1 in `0002_round1.sql` (not 0003). Differences: surrogate `id uuid pk` + `unique(message_id,user_id,emoji)`
  (duplicate insert still returns 23505); `fellowship_id` is overwritten by a trigger from the message; select policy checks
  membership via the message; no fixed emoji list (length 1–16). `MessageReaction` type added to `shared/types.ts`.

## [MP] → AB: mount `<ProclamationToast />` once in `app/(tabs)/_layout.tsx`
- What: `import ProclamationToast from '@/components/friends/ProclamationToast';` and render it once as a sibling
  AFTER `<Tabs …/>` (wrap both in `<View style={{ flex: 1 }}>`). It positions itself absolutely under the status bar.
- Why: when a friend colors a region (or texts) while you're on Missions/Page/Storybook, a "Hear ye!" banner slides
  in with their crest; tap → the mission/page/storybook. Hidden on the Friends tab. It also keeps the chat Presence
  channel alive app-wide, so online dots reflect anyone with the app open (not just people on the Friends tab).
- Status: ✅ applied in round 1 by the merge agent (integration fix in `app/(tabs)/_layout.tsx`).

## [AD] lib/game.ts + lib/fellowship.ts: opt hooks out of React Compiler (mock staleness)
- What: add `'use no memo';` as the first statement of `lib/game.ts` (and `lib/fellowship.ts`, `lib/chat.ts`), OR make
  `mockStore` writes immutable (replace `mock.missions`/`mock.pages` arrays + row objects instead of `Object.assign`).
- Why: `app.json` has `experiments.reactCompiler: true`. The compiler memoizes `useStoryline`'s derived values
  (`[...mock.pages].sort(...)`, `activePage`) because they don't depend on props/state, so after `submitProof` completes a
  page in mock mode `activePage` stays on Chapter I forever. Rows mutated in place also skip re-renders in memoized children.
  AD works around it locally (recomputes activePage from `pages` + `'use no memo'` in AD files), but AB's Missions tab will
  hit the same bug.
- Status: ✅ done by EV (`'use no memo'` in lib/game.ts + immutable mockStore writes); MP added the directive to its mock hooks. Verified in round 1 — see ROUND-1.md.

## [AD] fixtures: 3–4 mock Memory rows + a recap for the Storybook demo
- What: in `fixtures/demo.ts` fill `MEMORIES` with photo memories for completed missions, e.g.
  `{ id: 'mem-1', fellowship_id: 'f-lantern', storyline_id: 's-1', page_id: 'p-1', mission_id: 'm-2', user_id: 'u-bram',
     image_url: 'https://picsum.photos/seed/questbound-bridge/900/1100', caption: null, kind: 'photo', created_at: now }`
  (also m-4 moon, m-1 coffeehouse once complete). Optionally have mock `submitProof` push a photo Memory when `proof_url` is set.
  Also: missions for p-2/p-3 so later chapters have regions to tap after the page turn.
- Why: Storybook tale entries + montage. AD already lends stock photos in mock mode when MEMORIES is empty
  (`components/storybook/bookData.ts#withDemoMemories`), so this is polish, not a blocker.
- Status: ✅ done by EV on feat/engine (3 photo memories, chapters 2–3 missions, recap) — on main since round 1. Verified: Chapter II shows its regions in mock mode.

## [AD] lib/game.ts: `usePages(storylineId)` (+ missions) for older books
- What: `export function usePages(storylineId: string | null): { pages: Page[]; loading: boolean }` (ordered by chapter_number).
- Why: Storybook shelf/reader can only show pages of the CURRENT book today (`useStoryline` returns the latest one).
  After a sequel, Book I needs its pages + missions to render its cover and reader. AD falls back to a "shelved" note.
- Status: ➡️ EV-owned (`lib/game.ts`) — `TODO(EV)` left in lib/game.ts in round 1; not written by the merge agent.

## [AB] `demo` flag on GenerateStorylineRequest
- What: `shared/types.ts` → `export interface GenerateStorylineRequest { fellowship_id: UUID; mode: 'first' | 'sequel'; demo?: boolean }`
  (mirror in `supabase/functions/_shared/types.ts`).
- Why: Demo Tools "Summon instant demo book" (AB) → EV's instant demo book (EV.md Task 6). AB currently casts.
- Status: ✅ applied in round 1 (`shared/types.ts`; EV's `_shared/types.ts` mirror is EV-owned). AB: drop the cast.

## [AD] Round 2 — local stand-ins to swap when the real exports reach main (merge agent: one-line swaps)
- `components/storybook/useStoryData.ts` → local `usePages(storylineId) → { pages, loading }` and
  `useCompletions(storylineId) → { completions: Completion[], loading }` (EV E5/E7/P11 signatures). When EV's land in
  `lib/game.ts`, replace the file body with `export { usePages, useCompletions } from '@/lib/game';`.
  EV: my real-mode query for completions is `completions.select('*, missions!inner(storyline_id)').eq('missions.storyline_id', sid)`.
- `components/coloring/sage.tsx` → local `Sage` placeholder with AB's props `{ expression?, size? }` (plus AD's `SageSays`
  bubble). When `components/wizard/Sage.tsx` lands, change `Sage` in that file to `export { Sage } from '@/components/wizard/Sage';`
  and delete the local drawing (keep `SageSays`).
- `components/coloring/sfx.ts` → no-op `playSfx(name: 'ping'|'crayon'|'page'|'seal'): void`. When AB's
  `components/shell/sfx.ts` lands, replace the body with `export { playSfx } from '@/components/shell/sfx';`.
