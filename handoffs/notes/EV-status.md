# EV status — Story Engine (feat/engine)

## Round 2 — ready to use now (feat/engine)
- `usePages(storylineId)` → `{ pages, loading }` for ANY book (current or shelved), ordered by chapter.
- `useMissions(storylineId)` returns missions of EVERY chapter (locked/open/complete), sorted by chapter then region.
- `useChapters(storylineId)` → `{ chapters: { page, missions, completed, total }[] }` for chapter selectors (P4/P7).
- Join race: `useStoryline` returns `{ storyline: null, pages: [], activePage: null }` when no book exists, flips to
  status `'generating'` then `'active'` over realtime. Stale `'generating'` rows (>90 s, crashed summon) are skipped.
  Two members summoning at once get the same `storyline_id`. Mock: `EXPO_PUBLIC_MOCK_NO_STORY=1` or
  `mockDev.clearStory()` starts with no book; `generateStoryline()` then writes the demo book.

## Environment
- Meta + SerpApi keys were **not available** this session → no live smoke tests. Code follows the documented APIs
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
