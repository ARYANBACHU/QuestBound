# EV status — Story Engine (feat/engine)

## Round 2 — DONE on feat/engine (all deployed to the live project + smoke-tested, Oct 25)
Every item for EV in ROUND-2-PLAN (E1–E7, P11, P12, NAMING, MAPS LINKS). Functions deployed: generate-storyline,
submit-proof, reroll-mission. `npm run typecheck` ✓, `deno check` ✓ on every function, `node fixtures/points.test.mjs` ✓.

**New / changed client API (lib/game.ts, lib/api.ts)**
- `usePages(storylineId)` → `{ pages, loading }` for ANY book (current or shelved), by chapter.
- `useMissions(storylineId)` → missions of EVERY chapter (locked/open/complete), sorted chapter → region.
- `useChapters(storylineId)` → `{ chapters: { page, missions, completed, total }[] }` (P4 past chapters, P7 selector).
- `useCompletions(storylineId)` → `{ completions: CompletionEntry[] }`: each has `proof_text`, `participant_ids`,
  `verdict` (`lens_titles`, `distance_m`), `story_line`, `mission { id,title,type,region_id,page_id,proof_type }`, and
  `verse` (the full poem for bard missions). Bard `story_line` quotes the verse's first line.
- Points (ONE source of truth, `supabase/functions/_shared/points.ts`, re-exported from lib/game.ts):
  `pointsFor(userId, missions)`, `leaderboard(members, missions)` → `{ member, user_id, points, missions, rank }[]`
  (desc, ties share a rank; members can be FellowshipMember rows or profiles), `missionPoints(size, difficulty)`.
  Points = 40/20/10 × easy 0.75 / normal 1 / hard 1.5, always set server-side. Pass every book's missions for a
  lifetime score, one book's for that book.
- `generateStoryline({ fellowship_id, mode, difficulty?, replace_active?, demo?: true | 'ut' })`. Response has `difficulty`.
- `rerollMission(missionId, reason?, difficulty?)` — difficulty is relative: 'easy' = easier (default), 'normal' =
  similar, 'hard' = harder; the new mission's points follow it.
- `submitProof` accepts `lat`, `lng`, `accuracy_m`. Verdict has `distance_m` when the mission's place has coordinates.
- `GENERATING_STALE_MS`, `isStaleGenerating(book)` exported.

**E1 Join race** — any member can summon, any time. No book → `useStoryline` gives `{ storyline: null, pages: [],
activePage: null }`; then `'generating'` → `'active'` over realtime (DELETE events of a failed summon are watched
too). Stale `'generating'` rows (>90 s) are skipped client- and server-side. Two phones summoning in the same second
get the same `storyline_id` (verified live: 2 concurrent calls → 1 book). Mock: `EXPO_PUBLIC_MOCK_NO_STORY=1` or
`mockDev.clearStory()`; summoning then writes the demo book.

**E2 Difficulty** — prompts get easy/normal/hard guidance, map search zoom 15/14/12 (closer/farther places),
`storylines.difficulty` stored, sequels inherit it. `replace_active: true` shelves the current book (status
`complete`, `recap.abandoned = true`, summary "…was set aside with N of M regions colored") and writes a new one.
Demo books and sequels shelve an unfinished active book the same way. Shelved books reject proofs/rerolls kindly.

**E3 GPS** — `submit-proof`: if `mission.place` has lat/lng, the submitter must be within `GEO_RADIUS_M` (secret,
default 400 m) + min(accuracy_m, 150). Fails return `reason: 'no_location' | 'too_far'`, `distance_m`, and a friendly
flavor ("You're about 1.2 km (0.7 mi) from UT Tower, roughly a 10-minute stroll. It won't come to you (Sage asked
politely)…"). `DEMO_FORCE_PASS=1` bypasses (it's `0` on the project now). Same rule in mock mode
(`_shared/geo.ts` is shared). Gifts and place-less missions are never gated.

**E6 UT demo** — `generateStoryline({ mode: 'first', demo: 'ut' })` → "The Legend of the Forty Acres", 4 chapters,
24 missions (discovery photos, campus-trivia riddles, verses), 20 of them GPS-gated. 11 landmarks (UT Tower, Littlefield
Fountain, Turtle Pond, Blanton, Harry Ransom Center, PCL, Gates Dell Complex on Speedway, Gregory Gym, DKR, LBJ Library,
Texas Union) — every coordinate VERIFIED with SerpApi google_maps (2–60 m from our pins; place_ids saved) in
`supabase/functions/_shared/ut-campus.ts`, re-exported by `fixtures/ut-campus.ts`. Re-verified at generation (cached),
~1 s. No LLM, riddles hand-checked (307 ft, "free", Niépce, 36th, Darrell K Royal, Cactus Cafe). Mock mode builds the
same book (real answers, GPS gate).

**MAPS LINKS / P12** — `serp.ts`: business site → `place.website`; `place.maps_url` = Google Maps link (place_id when
known); `place.link` now ALSO holds the maps link (so old `p.link` code stops opening websites); lat/lng from
`gps_coordinates` (also single `place_results`); events geocoded via their venue (verified live: events have lat/lng).
Books written before today still have the old `link` = website.

**NAMING** — narrator copy says Sage everywhere (proclamations, flavor text, errors, "Sage is writing…"
placeholder, adaptation note "Sage noticed you love…"). `SAGE_PERSONA` (cheekier, still kind, no gendered
pronouns for players); `MUSE_PERSONA` kept as an alias for wizard-chat.

**Smoke tests run against the live project** (scripts were in the session scratchpad; anonymous users + REST):
join race (concurrent summons → one book, friend reads all 18 missions), demo book points 40/20/10, GPS gate
(14 km / no fix / 300 m / accuracy slack at 480 m), photo verdict with Lens titles + distance_m, UT demo (4 pages,
24 missions), UT riddle far → too_far, wrong answer → hint, right answer at the Tower → colored, co-op riddle needs 2,
bard verse quoted, completions query for useCompletions, LLM "hard" book with replace_active in 26 s (points
15/30/60, UT book shelved as abandoned), easier reroll 30 → 15 points.

**Known limits / next**
- A hard LLM book took 26 s (budget 27 s; one chapter fell back to the handcrafted missions). Fine for the demo; use
  `demo: 'ut'` or `demo: true` at the judging table for instant books.
- Reroll's LLM call sometimes times out (9 s) → handcrafted alternate (still valid, still priced by difficulty).
- useCompletions refreshes on mission changes (completions aren't in the realtime publication; every completion also
  updates its mission row, so this is enough).

**Notes for teammates**
- **AB**: A6 → `rerollMission(id, reason, 'easy' | 'normal' | 'hard')`; "New storyline" → `generateStoryline({
  fellowship_id, mode: 'first', difficulty, replace_active: true })`. A7 → send `lat/lng/accuracy_m`; show
  `verdict.distance_m`; `verdict.reason === 'no_location' | 'too_far'` for the friendly states. A8 → `pointsFor` /
  `leaderboard` from lib/game. A11 → `generateStoryline({ mode: 'first', demo: 'ut' })`. A5: anyone may summon.
  Mission detail: use `openInMaps(place)` and show `place.website` separately (old code used `p.link`).
- **AD**: D4 → `useCompletions(storyline.id)` and `entry.verse` (+ the author's crest via `entry.user_id`). D5/P4 →
  `usePages` / `useChapters`. Shelved books: `recap.abandoned === true`.
- **MP**: M3 → `pointsFor` / `leaderboard`. Proclamation bodies now say Sage; rerolls are `kind: 'wizard'`.

## Environment
- (Round 1 note) Meta + SerpApi keys were not available in round 1. Round 2: all secrets set on the project, functions deployed, live smoke tests pass.
- (Round 1) Code follows the documented APIs
  (dev.meta.ai docs read on Oct 24; details in EV-decisions.md). No `SUPABASE_ACCESS_TOKEN` here → not deployed.
- Everything was run end-to-end locally against the real schema with fake Meta/SerpApi (see `supabase/functions/_dev/`).
  With no keys at all the app still works: fallback book, photos pass at confidence 0.5, no art.

## Done (Round 1 + Task 6)
- `_shared/llm.ts` (json_schema structured output, reasoning_effort, bare-retry on 400, HAS_LLM), `_shared/serp.ts`
  (timeouts, stale-cache fallback, per-request stats, Lens knowledge_graph), `_shared/prompts.ts`, `_shared/interests.ts`,
  `_shared/book.ts` (fallback missions for all 24 regions, validate/repair, DB writer), `_shared/progress.ts`.
- `generate-storyline`: membership 403, interest analysis, SerpApi grounding ∥ LLM outline, chapters in parallel,
  repair, deterministic fallback, `generating` placeholder row (UI ritual), idempotent double-tap, sequel adaptation
  (`generation_context.adaptation.note`), `demo: true` instant book ("The Lantern Thief of <city>"), `prewarm: true`.
  Measured locally: fallback ~40 ms, slow LLM capped at ~11 s.
- `submit-proof`: answer (normalize + alternates + LLM judge), photo/group_photo (Lens + vision, `lens_titles`),
  text, gift handshake, headcount, race-safe conditional updates, page turn, chapter illustration + montage frames in
  background, book recap, proclamations with `{event, region_id, color, user_id}`.
- `reroll-mission` (Round 2 #1) + `rerollMission()` client.
- Montage frames (Round 2 #2): painted automatically on book complete (memories kind `montage_frame`).
- `lib/api.ts`: real `uploadProof`, readable server errors, faithful mock engine. `lib/game.ts`: realtime hooks +
  `useGenerationInfo`. `lib/mockStore.ts`: immutable writes + `mockDev`. Fixtures: chapters 2–3 missions, memories, recap.
- Full loop test passes (24 missions, all proof types, page turns, recap, art, sequel); RLS verified (outsiders see nothing,
  trial answers hidden); all four branches merged together typecheck.

## Deploy (anyone with SUPABASE_ACCESS_TOKEN)
```bash
npx supabase link --project-ref <ref>
npx supabase secrets set LLM_API_KEY=... SERPAPI_KEY=... LLM_MODEL=muse-spark-1.3 IMAGE_MODEL=muse-image-1.0 DEMO_FORCE_PASS=0
npx supabase functions deploy generate-storyline submit-proof reroll-mission
# smoke (user JWT from the app): first a prewarm, then a demo book
curl -s -X POST https://<ref>.supabase.co/functions/v1/generate-storyline -H "Authorization: Bearer <JWT>" \
  -H 'Content-Type: application/json' -d '{"fellowship_id":"<id>","prewarm":true}'
```
`muse-spark-1.1` is the default if `LLM_MODEL` is unset; 1.3 is newer per Meta's docs.

## Next
- Once keys exist: run the Task 0 curls, then one real `generate-storyline` and look at `generation_context.source`
  (`llm` vs `fallback`) and `timings_ms`. Tune prompts in `_shared/prompts.ts` if missions read flat.
- Round 2 #4 (MCP connector) and #5 (Royal Appraiser) not started.

## Known limits
- Voice Bard skipped: Meta ASR (`/v1/asr/transcribe`) only takes 16-bit mono WAV; Expo Go on Android can't record WAV
  and no audio package is installed. Bard stays text.
- Realtime wasn't testable locally (no Realtime server); hooks follow the documented `postgres_changes` pattern and also
  reload whenever the channel (re)subscribes.

## Notes for teammates
- **AB**: `generateStoryline({ ..., demo: true })` works now (no cast needed: the client accepts `demo`).
  Gift: the giver's submit resolves with `verdict.pass=true, verdict.reason='gift_pending', mission.status='pending'`.
  Show "Waiting for <name>'s seal"; the recipient seals with `confirm_for = giver`. Failed proofs resolve (not throw)
  with `verdict.pass=false` + `flavor_text`. `rerollMission(id, reason?)` for the wizard. Pick photos with
  `quality: 0.6`. `useGenerationInfo(storyline.id)` gives `serp` (live/cached) + `adaptation.note` for Demo tools and
  the sequel card. `MUSE_PERSONA` lives in `supabase/functions/_shared/prompts.ts`.
- **AD**: hooks are `'use no memo'` and mock writes are immutable now. `mockDev.completeActivePage()` /
  `mockDev.completeBook()` from `lib/mockStore` jump ahead in mock mode. Memories kinds: `photo`, `illustration`
  (one per finished page, also on `page.illustration_url`), `montage_frame` (3–4 on book complete). Fixtures now have
  3 photo memories and missions for chapters 2–3.
- **MP**: proclamations use `kind:'proclamation'` with payload events `storyline_ready | mission_complete |
  page_complete | book_complete`; "gift sent" is `kind:'system'`; rerolls post `kind:'wizard'`.
