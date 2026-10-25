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

## [EV] `BookRecap.abandoned?: boolean` (round 2, E2)
- What: `shared/types.ts` → in `BookRecap` add `abandoned?: boolean; // book shelved unfinished (replace_active)`.
  Mirror already in `supabase/functions/_shared/types.ts`.
- Why: `generateStoryline({ replace_active: true })` shelves the current book with status `complete` and a quick recap
  marked `abandoned: true` ("…was set aside with 3 of 24 regions colored"). AD's Storybook can show it as "set aside"
  instead of "complete". Until it lands, read it as `(recap as BookRecap & { abandoned?: boolean }).abandoned`.
- Optional secret: `GEO_RADIUS_M` (default 400) tunes the GPS gate in submit-proof. Not set on the project = 400 m.
- Status: ✅ applied in round 2 (`shared/types.ts` BookRecap.abandoned; Deno mirror already on feat/engine). GEO_RADIUS_M: unset on the project = 400 m default (per EV); not re-verified in round 2 — merge session had no Supabase access.

## [MP] → EV: `pointsFor` / `leaderboard` in lib/game.ts (Round 2 · E4)
- What: MP codes against `pointsFor(userId: string, missions: Mission[]): number` and
  `leaderboard(members: FellowshipMember[], missions: Mission[]): { user_id; points; missions }[]` (highest first,
  every member incl. 0). Local copy with the same rule lives in `components/friends/points.ts`.
- Why: one source of truth for points (Friends tab member cards + profile sheet).
- When EV's exports land, MP swaps `components/friends/points.ts` to `export { pointsFor, leaderboard } from '@/lib/game'`.
  If EV's `leaderboard` row shape differs, MP adapts — no change needed from EV.
- Status: ✅ landed in round 2 (EV's E4 in lib/game.ts). Merge agent swapped `components/friends/points.ts` to re-export EV's `pointsFor`/`leaderboard` and adapted callers to EV's row shape.

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
- Checked against origin/feat/engine + origin/feat/shell (end of AD round 2): EV's `usePages`/`useCompletions` and AB's
  `Sage`/`playSfx` are drop-in compatible (EV's `CompletionEntry extends Completion`; AD reads mission_id/proof_text/user_id).
  Status: ✅ round 2 — all three swaps done by the merge agent after merging (useStoryData → lib/game, Sage → components/wizard/Sage, playSfx → components/shell/sfx).

## [AB → AD] Storybook: hide Sage's FAB while the reader / montage is open (A10)
- What: in `app/(tabs)/storybook.tsx` add `import { useHideWizardFab } from '@/components/wizard/WizardProvider';` and call
  `useHideWizardFab(!!openId || montage);` inside the screen component.
- Why: the plan says the FAB auto-hides on the Storybook reader/montage. AB can't see AD's reader state; the hook is
  ref-counted and safe to call from any screen under the tabs.
- Status: ✅ round 2 — merge agent added `useHideWizardFab(!!openId || montage)` in `app/(tabs)/storybook.tsx`.

## [AB → AD, MP] Sound + Sage are ready to import (P6)
- `import { playSfx } from '@/components/shell/sfx'` → `playSfx('ping' | 'crayon' | 'page' | 'seal')`. Preloaded,
  low volume, honors Settings → "Sound effects", never throws.
- `import { Sage, SageTitle, speakOnce } from '@/components/wizard/Sage'` →
  `<Sage expression="happy" size="sm|md|lg" speakKey={message.id} />` talks + pings ONCE per new key (never on
  re-render/reopen). `variant="face"` = head only, `still` = no idle loop (use it in long lists).
  `speakOnce(key)` = ping once without rendering Sage. `<SageTitle />` = "Sage" + "✦ powered by Muse".
- Status: ✅ round 2 — MP and AD stand-ins now re-export these.

## [AB → EV] reroll-mission difficulty + points helpers (E2, E4)
- What: `lib/api.ts` → `rerollMission(missionId: string, reason?: string, difficulty?: Difficulty)` and send
  `{ mission_id, reason?, difficulty? }`. AB already calls it with the 3rd arg (extra args are ignored until then)
  and puts the difficulty in `reason` as a fallback hint. Also `pointsFor(userId, missions)` export from lib/game.ts:
  AB's `components/shell/engine.ts` uses it automatically the moment it exists (local identical fallback until then).
- Status: ✅ round 2 — both on feat/engine (EV E2/E4); AB's `components/shell/engine.ts` now re-exports EV's helpers.

## [AB → MERGE] README credits for audio
- What: add to README.md: "Music & sound effects: original, synthesized for Questbound, CC0 — see assets/audio/README.md".
- Why: plan A1/P6 asks to credit the audio in README; README isn't in AB's paths. The full credit table lives in
  `assets/audio/README.md` (AB).
- Status: ✅ applied in round 2 (README.md Credits line).

## [EV → AB] B1 "new book crashes Expo Go" — root cause is the Modal swap in NewStorylineSheet (round 3)
- Investigated in mock AND real mode (Expo web + Playwright, 7 real LLM books + 6 mock books, New storyline from the
  Missions "…" menu and Settings, every difficulty): no JS error, no error overlay. The 482 SVG paths of all 20 templates
  parse fine. So the crash is native-only.
- Most likely cause: `components/shell/NewStorylineSheet.tsx` `if (writing) return <Modal …><SummonRitual/></Modal>` —
  in ONE commit the Sheet's `<Modal>` (`Sheet.tsx`) unmounts and a different full-screen `<Modal>` mounts. On iOS (RN
  0.88 `RCTModalHostViewComponentView`) presenting while the old modal is still dismissing is rejected while RN thinks it
  presented → frozen/invisible ritual or a crash. `SummonRitual`'s reanimated `exiting={FadeOut}` view unmounting inside
  the closing Modal is a second known native crash source.
- Fix (typechecks, mock web flow verified; full diff: `handoffs/notes/EV-B1-fix-for-AB.diff`): keep ONE Modal for the
  whole flow — `Sheet` gets a `cover?: ReactNode` prop rendered inside the same Modal; NewStorylineSheet renders
  `<Sheet visible={visible || writing} dismissable={!writing} cover={writing ? <LayoutAnimationConfig skipExiting><SummonRitual …/></LayoutAnimationConfig> : null}>`.
- Also: `components/shell/ActionMenu.tsx` opens the next sheet 120 ms after closing the menu; iOS fade-out is ~300 ms →
  raise to ~350 ms. Wrap DemoTools' `SummonRitual` in `<LayoutAnimationConfig skipExiting>` too.
- Engine side (EV, deployed): a double-fired "New storyline" (same difficulty, < 2 min, nothing colored) now returns the
  book it just wrote (`reused: true`) instead of shelving it, so a crash + re-tap can't eat a fresh book.
- Status: ✅ applied in round 3 — AB's NewBookProvider covers it (ritual is an in-tree overlay, never a 2nd Modal; no exit anims; Demo Tools uses the same host); merge added the ActionMenu 350 ms delay.

## [EV → AD, AB, MP] G1 crews — label missions by crew, not type (round 3)
- Missions now need solo / duet / trio / fellowship. A trio still has `type: 'duet'` (or `'trial'`), so label from
  `required_members`: `import { crewOf, CREW_LABEL } from '@/lib/game'` → `CREW_LABEL[crewOf(mission)]` = "Solo" | "Duet" |
  "Trio" | "Fellowship". Crest pickers: ask for `mission.required_members` heroes (already the rule).
- Points = solo 10 / duet 20 / trio 30 / fellowship 40 × difficulty, always on `mission.points` (use `pointsFor`/`leaderboard`).
- Status: ✅ applied in round 3 (merge, callers): Missions card/detail, AD's mission sheet + Up next, Missions "Duets & trios" section use CREW_LABEL[crewOf(m)].

## [EV → AD] B2 shelf labels + G3 paintings (round 3)
- `import { bookStatus, useBookStatus } from '@/lib/game'`: `bookStatus(book, pages)` → `{ state: 'writing'|'reading'|
  'finished'|'set_aside', label, chapter, chapters, colored }`. Labels: "Chapter 2 of 3", "Finished", "Set aside · 1 of 3
  chapters", "Sage is writing…". Never says Finished unless every page is complete. `useBookStatus(book)` loads the pages.
- `import { paintChapter, paintBook } from '@/lib/api'`: `paintChapter(pageId)` → `{ illustration_url, cached }` for a
  COMPLETED page (10–40 s when it has to paint; throws "Finish this page first!" for unfinished pages). `paintBook(sid)`
  back-fills every completed page of a book. Paintings are 1024² JPEGs (~370 KB). `page.illustration_url` also updates
  over realtime. Show "Sage is painting…" while it runs.
- Status: ✅ applied in round 3 (merge): AD's bookProgress() derives its state from bookStatus() (AD's wording kept); Storybook painting calls paintChapter() directly.

## [EV → AD, MP] G2 needs to know which pages have real art — please export DRAWN_TEMPLATES (round 3)
- What: in `assets/pages/index.ts` add `export const DRAWN_TEMPLATES = Object.keys(DRAWN) as TemplateId[];` (the ids in
  your `DRAWN` map, i.e. NOT the placeholder frame; include MP's set-mp pages once imported).
- Why: `generateStoryline` sends this list as `art_ready`, and the engine only picks chapter templates from it (+ the 4
  classics). Until the export exists, `lib/api.ts drawnTemplates()` detects placeholder art by its path, which works but
  is fragile. Never leave a template in DRAWN that still renders the placeholder.
- Status: ✅ applied in round 3 (merge): `DRAWN_TEMPLATES` exported from assets/pages/index.ts — all 20 ids; placeholder.ts deleted.

## [EV → MERGE] shared/types additions (round 3, additive)
- `GenerateStorylineRequest`: add `art_ready?: TemplateId[]; // G2: templates this app build can draw (lib/api sends it)`.
  lib/api.ts already sends it by spreading the request; nothing breaks without the type.
- `shared/templates.ts` header comment already describes the G1 crew rule; the engine's single source is
  `supabase/functions/_shared/fallbacks.ts` (`crewFor`) + `_shared/points.ts` (`crewOf`, `CREW_POINTS`).
- Optional secret: `ART_READY_TEMPLATES=<comma-separated ids>` makes OLD app builds (that don't send `art_ready`) use the
  new templates too. Leave unset until the new art is on every phone.
- Status: ✅ applied in round 3: `GenerateStorylineRequest.art_ready?: TemplateId[]`. `ART_READY_TEMPLATES` secret left unset (Expo Go phones load the new JS, so they send art_ready).
## [MP → AD] Round 3 U2: MP's 8 pages are drawn — wire them into PAGE_ART
- What: in `assets/pages/index.ts` add `import { SET_MP } from './set-mp';` and spread it into DRAWN:
  `const DRAWN: Partial<Record<TemplateId, PageArt>> = { castle_gate, enchanted_forest, dragon_peak, royal_feast, ...SET_MP };`
  (put AD's 12 new pages in the same object; order doesn't matter). Individual named exports exist too.
- Covers: troll_bridge, cloud_kingdom, crystal_cave, owl_library, rose_garden, lantern_festival, swamp_hollow,
  unicorn_meadow. Same PageArt format (1000×1400, storybookFrame, regions + ink + background), region ids exactly
  shared/templates.ts. Checked on feat/friends: all 48 ids match, every `labelAt` is inside its region (browser
  isPointInFill), no NaN paths, and the two-line wiring above typechecks with `validatePageArt()` passing.
- Why: the plan says AD owns index.ts and adds the imports.
- Status: ✅ applied in round 3 (merge): `...SET_MP` spread into DRAWN; validatePageArt() clean for all 20.
## [AD → EV] Round 3 G3: `paintChapter(pageId)` in lib/api.ts (U3 Storybook painting hero)
- What: export `paintChapter(pageId: string): Promise<{ illustration_url: string | null }>` from `lib/api.ts`
  (invokes the `paint-chapter` edge function; mock mode can resolve a stock image after ~1.5 s).
- AD's side is ready: `components/storybook/paint.ts` looks the export up at runtime (`api.paintChapter`), caches one
  request per page, and accepts `{ illustration_url }`, `{ url }`, `{ page: { illustration_url } }` or a bare string.
  Until it exists: mock mode shows a stock painting after a "Sage is painting…" beat; real mode keeps the coloring page
  as the hero. No AD change needed when EV's lands.
- Status: ✅ EV shipped it; merge wired components/storybook/paint.ts to import it directly.

## [AD → AB] Round 3 U7: a dedicated `'pageBack'` sound in components/shell/sfx.ts
- What: add `'pageBack'` to `SfxName` (a softer, lower page settle). AD already calls `playSfx('pageBack')` through
  `components/coloring/sfx.ts`, which today plays page.wav at 0.86× rate as a stand-in.
- B6 root cause FYI (AB's helper): a reused `AudioPlayer` reliably plays only the first time — `seekTo(0)` is async,
  so `play()` right after it can start at the end and stay silent (that's why the back flip, usually the 2nd flip, had
  no sound). AD's page turns now use a fresh one-shot player per turn. AB may want `await p.seekTo(0); p.play()` or
  a fresh player for every sfx.
- When AB ships `'pageBack'`: in `components/coloring/sfx.ts` drop the `pageTurn` stand-in only if AB's helper also
  fixes the replay bug; otherwise keep it and point it at the new file.
- Status: ✅ applied in round 3 (merge): shell sfx replays wait for seekTo(0); AB ships pageBack.wav; components/coloring/sfx.ts now re-exports AB's playSfx.

## [AD → MERGE] Round 3 U2: import MP's set-mp pages in assets/pages/index.ts when feat/friends lands
- MP's 8 pages export `export const <templateId>: PageArt` from `assets/pages/set-mp/<templateId>.ts`.
- When merging feat/friends into main, add to `assets/pages/index.ts` (AD's file) — one import per file that exists:
  `import { troll_bridge } from './set-mp/troll_bridge';` (… cloud_kingdom, crystal_cave, owl_library, rose_garden,
  lantern_festival, swamp_hollow, unicorn_meadow) and add each name to the `DRAWN` object. Anything not imported keeps
  the placeholder frame. AD will do it on the next `git merge origin/main` if the merge agent doesn't.
- Status: ✅ applied in round 3.
## [AB → MP, AD, everyone with a text input] Round 3 B4 — shared keyboard helper is on feat/shell
- `import { KeyboardSafe, KeyboardSafeScroll, useKeyboardVisible, useKeyboardInset } from '@/components/shell/KeyboardSafe';`
- Pattern (replace any `KeyboardAvoidingView`):
  ```tsx
  <KeyboardSafe>                                     {/* pads by exactly the keyboard overlap; tap outside = dismiss */}
    <KeyboardSafeScroll contentContainerStyle={…}>…inputs…</KeyboardSafeScroll>  {/* scrolls focused input into view */}
    <Composer />                                     {/* pinned below the scroll → rides on the keyboard */}
  </KeyboardSafe>
  ```
- No offsets to pass: it measures itself (works under the tab bar, in modals and in `Modal` sheets). iOS follows the
  keyboard frame by frame (reanimated); Android measures the real overlap (edge-to-edge and adjustResize both right).
- Props: `dismissOnTap` (default true; pass false inside a sheet whose backdrop already closes it), `pointerEvents`,
  `offset` (override only if measuring is impossible), `enabled`.
- MP: `components/friends/ChatView.tsx` (+ `useKeyboardLift`) and `app/join/[code].tsx` can switch to it, or keep
  `useKeyboardLift` if it already tests well — just make sure the composer is visible and tap-outside dismisses.
- AB already uses it in: onboarding, mission detail, Settings editor sheet, every `components/shell/Sheet`, Sage's sheet.
- Status: ✅ applied in round 3 (merge): MP's ChatView + join screen use components/shell/KeyboardSafe; MP's local copy deleted.

## [AB → MP, AD] Round 3 U6 — music toggle moves to the top of screens
- `import { HeaderMusicToggle } from '@/components/shell/music';` → a 40 px header icon (same look as the "…" button).
- **MP (Friends):** put `<HeaderMusicToggle />` in the Friends header, just left of the Invite button. Friends has no
  toggle until then (the tab-bar one is gone; the floating fallback is skipped there because Invite sits top-right).
- **AD (Page, Storybook):** optional — put `<HeaderMusicToggle />` header-right. Until you do, the tabs layout shows a
  small floating fallback top-right on those two tabs; it hides itself automatically while your header renders one.
- Status: MP ✅ applied in round 3 (merge, Friends header). AD: open — the floating fallback overlaps the Storybook reader's Montage button (see ROUND-3.md).

## [AB → AD, MP] Round 3 U7 — sound effects for every tap (one per action)
- `playSfx(name)` names now: `tap · toggle · open · close · send · success · error · reward · page · pageBack · crayon ·
  seal · ping` (all original CC0, `assets/audio/sfx/`). Respects the Sound effects toggle.
- `<Button>` (and AD's `InkButton` re-export) plays `'tap'` by default. Pass the action's own sound instead:
  `<Button sfx="send" …/>`, `sfx="open"`, `sfx="close"`, or `sfx={null}` for silence.
- One sound per action is enforced inside `playSfx`: `tap`/`toggle` are dropped if the same action plays a real sound
  within a frame — so `Button` + `playSfx('success')` in its onPress is heard as just `success`.
- **AD B6:** flipping back → `playSfx('pageBack')`; forward stays `playSfx('page')`.
- **MP:** chat Send → `playSfx('send')`; plain Pressables (chips, toggles) → `'tap'` / `'toggle'`.
- Status: MP chat Send ✅ applied in round 3 (merge); AD pageBack ✅. Open (MP): 'tap'/'toggle' on plain Pressables.


## [AD → EV] V3 — `useLive` loads can land out of order (stale rows overwrite fresh ones)
- What: in `lib/game.ts` `useLive`, `load()` calls are not sequenced. Several realtime events >150 ms apart start
  several loads; if an older one resolves last, its stale rows replace the fresh ones (a mission just marked
  `complete` flips back to `open` for a moment, then forward again). That replays the coloring fill.
- Proposed diff (inside the effect):
  ```ts
  let seq = 0;
  const load = async () => {
    const mine = ++seq;
    try {
      const data = await loader(key);
      if (alive && mine === seq) setState({ key, data, loading: false });
    } catch (e) { … same, also guarded by `mine === seq` … }
  };
  ```
- Why: V3 flicker. AD's `ColoringPage` now tolerates it (a regression within 8 s of completion is ignored, and each
  mission's fill plays once per mount), but other screens (Missions, mission detail) would still blink.
- Status: open.

## [AD → AB] V8 — montage plays no audio; check native for a second music player
- AD verified on web (every `new Audio` / `play()` logged) that opening, tapping through, replaying and closing the
  montage starts no sound — only `bards-loop.mp3` plays, once. Montage slides are photos + title cards only.
- If a different/second track is still heard in Expo Go, it's a second `MusicController` player (e.g. the root layout
  remounting, or a player created before `remove()` finishes). Suggest: keep the player in a module-level singleton
  so remounts reuse it. If you want ducking during the montage, export `useMusicDuck(active: boolean)` and AD will call
  `useMusicDuck(visible)` inside `Montage` — same track, lower volume.
- Status: open.

## [AD → AB] V3 — "See it on the page" stacks a NEW copy of the tabs (use `router.dismissTo`)
- What: in expo-router 58, `router.navigate('/(tabs)/coloring')` from the `mission/[id]` modal PUSHES a second `(tabs)`
  navigator on the root stack instead of going back. Verified on web with mount logs: the Coloring page mounts a fresh
  instance (r2) while the old one (r1) stays alive underneath. Every mission finished this way grows the stack, the
  new page has no memory of what just changed, and the old page's queued glow never plays.
- Proposed diff (`app/mission/[id].tsx`, every navigate that leaves the modal for a tab — lines ~93, 182, 183, 342):
  ```diff
  - router.navigate('/(tabs)/coloring')
  + router.dismissTo('/(tabs)/coloring')
  - router.navigate('/(tabs)/missions')
  + router.dismissTo('/(tabs)/missions')
  ```
  AD tested exactly this locally (not committed — AB's file): the modal closes, the SAME Coloring page comes back,
  the region is already colored and plays one glow (gold ring + sparkles + shimmer). No second fill.
- With it, V3 reads: reward card = the single fill (blank → your color), page = glow. AD's side is pushed.
- Status: open.
