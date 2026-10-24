# Merge round 1 — report

`main` @ round 1 merge (`[MERGE] fix: TODO(EV) for usePages`), all four branches merged in order engine → friends →
coloring → shell. **`npm run typecheck` passes, `npx expo export --platform ios` bundles cleanly**, and the real backend
smoke test passes (Muse wrote the book, see below).

> **Each agent: run `git fetch origin && git merge origin/main` before continuing.**

> ⚠️ Tag `round-1` was created locally but the cloud session's git proxy refused the tag push (HTTP 403; branch
> pushes work). A human, please run: `git fetch origin && git tag round-1 origin/main && git push origin round-1`
> (or tag the merge commit after this report's commit: either is fine).

## What merged

**feat/engine (EV)**
- `_shared/llm.ts` (Meta json_schema output, reasoning_effort, retry), hardened `serp.ts` (cache, stale fallback, stats, Lens).
- `generate-storyline`: outline + parallel chapters, validate/repair, deterministic fallback, instant `demo` book, `prewarm`, sequel adaptation.
- `submit-proof`: riddle/photo+Lens/text/gift verification, race-safe page turn, recap, chapter art + montage in the background.
- `reroll-mission` function + `rerollMission()` client.
- `lib/game.ts` realtime hooks + `useGenerationInfo`; `lib/mockStore.ts` immutable writes; richer fixtures (chapters 2–3, memories, recap).
- `supabase/functions/_dev/` local test stack (fake Meta/SerpApi).

**feat/friends (MP)**
- Real anonymous auth + profile store (`lib/session.ts`), real fellowship create/join/leave + live members (`lib/fellowship.ts`).
- Realtime chat with optimistic send/retry, Presence online dots, typing (`lib/chat.ts`).
- Friends tab: chat with proclamation scroll cards + fellowship view; member profile sheet + Muse nudge.
- Invite QR/code (`InviteSheet`, `QrScanner`), `join/[code]` deep link.
- Reactions on messages (now live via `message_reactions`), `ProclamationToast` banner.

**feat/coloring (AD)**
- 4 coloring pages (`assets/pages/`) with a region-id dev assertion.
- `ColoringPage` — region states, crayon texture, teammate stripes, fill reveal + sparkle + haptic.
- Coloring tab — progress, mission sheet, chapter nav, page turn + ribbon, empty/writing/end states.
- Storybook — shelf, paged reader with scrapbook entries, recap (with data-built fallback), montage player.
- `MissionTypeIcon` ink glyphs.

**feat/shell (AB)**
- Shell: fonts, splash, onboarding gate, `T`/`Button` primitives, inked tab bar, Muse FAB + sheet, coach marks, Demo Tools.
- Onboarding: Muse-guided steps, pickers, found/join fellowship, summon ritual.
- Missions dashboard (progress, leaderboard, filters, grouped cards) and mission detail (all proof flows, Magic Mirror, wax seal, Lens titles, gift seal).
- Settings (profile editors, invite/leave, tour reset, demo tools).
- `wizard-chat` edge function (live context, validated actions, canned fallback) + "Plan our next meetup".

## Requests
| Request | Result |
|---|---|
| [EV]/[AB] `demo?` on `GenerateStorylineRequest` | ✅ applied, plus `prewarm?`; response `reused?`, `serp?` (`SerpStats`), `adaptation?`; `BookRecap.serp?` |
| [MP] realtime on `profiles` + `fellowships` | ✅ `0002_round1.sql` |
| [MP] `message_reactions` | ✅ `0002_round1.sql` — `id uuid pk`, `unique(message_id,user_id,emoji)`, `fellowship_id` (filled from the message by a trigger, so it can't be spoofed), RLS: members of the message's fellowship read, insert/delete only your own; replica identity full; in realtime. `MessageReaction` type in `shared/types.ts`. |
| [MP] mount `<ProclamationToast />` | ✅ merge-agent integration fix |
| [AD] React Compiler stale mocks | ✅ done by EV/MP; verified below |
| [AD] mock memories + ch. 2–3 missions | ✅ done by EV |
| [AD] `usePages(storylineId)` | ➡️ open for EV (`TODO(EV)` in `lib/game.ts`) |
| (user) `app.json` `expo.web.output` → `"single"` | ✅ (web preview no longer SSR-crashes on supabase) |

**Migration `0002_round1.sql` is already applied** to project `jhqkjfhtekermlbnqtxe` (via the Management API; verified table,
3 policies, replica identity full, publication now = fellowship_members, fellowships, memories, message_reactions,
messages, missions, pages, profiles, storylines). It is idempotent; new projects run 0001 then 0002 in the SQL editor.

## Integration fixes (merge agent)
- `app/(tabs)/_layout.tsx` (AB) — mounted MP's `<ProclamationToast />` once, after `<Tabs>`.
- `components/shell/teammates.tsx` (AB) — now re-exports MP's `Crest`, `CrestRow`, `InviteSheet`/`InviteCard`,
  `QrScanner`/`parseInviteCode` and AD's `MissionTypeIcon`/`MISSION_TYPE_LABEL`. Props matched; no caller changes.
- `components/coloring/Crests.tsx` (AD) — `CrestRow` re-exports MP's; `CrestBubble` is a 3-line wrapper on MP's `Crest`.
- `components/coloring/ui.tsx` (AD) — `InkButton` = AB's `Button`; `Txt` = AB's `T` (keeps AD's `v` prop so no caller changed).
  Visible change: small buttons are pill-shaped now (AB's style).
- `lib/game.ts` (EV) — `TODO(EV)` for `usePages` only; no code written.

## React Compiler stale-mock bug — verified fixed
`lib/game.ts` has a file-level `'use no memo'`, mock writes are immutable, and MP's mock hooks opt out too. Tested in a
mock-mode web dev build with Playwright: opened Missions (Chapter I), switched to Page, colored all 6 regions → page
turned → the **already-mounted Missions tab showed "Chapter II"**; proclamation toast and chat proclamations appeared.
AD's local workaround (recomputing `activePage` in `coloring.tsx` + `'use no memo'` in AD files) is now redundant but
harmless — left as is.

## Real backend smoke test (project jhqkjfhtekermlbnqtxe)
Two anonymous users, fellowship "Round 1 Smoke Test" (`2acb09e3-…`, code `CC6348`, left in the DB for inspection).
- `generate-storyline` **prewarm**: 8.5 s, 16 places, SerpApi 7 live.
- `generate-storyline` **first**: 13.6 s, "The Lost Hum of Austin", 3 pages / 18 missions, SerpApi 4 cached.
  `generation_context.source = { outline: "llm", chapters: ["llm","llm","llm"], repaired: 0, llm_available: true }` →
  **Muse wrote it, not the fallback.** The configured `LLM_MODEL` works; no model change needed.
- `wizard-chat`: 3.8 s, real reply naming the fellowship, real mission names and places, plus a valid `open_mission` action.
- `submit-proof` (bard, text): a sloppy verse was **rejected** with a helpful reason; a proper 4-line verse **passed**
  (0.98) → mission `complete`, story line written, "Hear ye!" proclamation posted.
- Reactions: insert ✔, friend reads it ✔, duplicate → 23505 ✔, reacting as someone else → blocked ✔.

## Open TODOs per owner
- **EV**: `usePages(storylineId)` (TODO in `lib/game.ts`). The `& { demo?: boolean }` intersection in `lib/api.ts` is now
  redundant. Check whether `submit-proof` should require an assignee: a bard mission assigned to Bram was completed by
  a different member in the smoke test (fine if intended).
- **MP**: none blocking. Reactions are live now; `fellowship_id` on insert is overwritten from the message server-side.
- **AD**: optional cleanup of the now-redundant `activePage` workaround. Real-phone check of fill reveal + page turn.
- **AB**: drop the `demo` cast; swap inline `MUSE_PERSONA` for `_shared/prompts.ts` (now on main); hard-coded `rgba(...)`
  backdrops in `settings.tsx`, `WizardSheet.tsx`, `DemoTools.tsx`, `MagicMirror.tsx` → theme tokens / `withAlpha`.
- **Human**: push the `round-1` tag (see top).

## Known breakages
- Web only: react-native-svg logs "Unknown event handler" for `<Path onPress>` (dev error toast). Harmless; native unaffected.

## Two-phone smoke test (Expo Go, real mode: `npm run dev`)
1. **Phone A**: finish onboarding (name, crest, crayon, interests) → "Found a fellowship" → see the invite QR.
2. **Phone B**: onboarding → "Join" → scan A's QR (or type the code). Both phones' Friends tab shows both crests;
   A sees B's real name and crest update live (no refresh).
3. **Phone A**: summon the storyline (Muse ritual, ~15 s). **Phone B** sees the coloring page and the "Hear ye! Muse has
   written a new tale" proclamation appear without refreshing.
4. **Phone B**: open a solo Bard or Relic mission on the Missions tab → submit proof (a 4-line verse or a photo).
   **Phone A**, sitting on the Missions or Page tab, sees the region fill with B's crayon + a "Hear ye!" banner slide in;
   long-press that proclamation in chat → 👑 → B sees the reaction chip.
5. Either phone: tap Muse → "What should we do next?" → the reply names real missions and places from your book.
