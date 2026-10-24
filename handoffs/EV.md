# EV — Story Engine · branch `feat/engine`

## Paste this into Claude Code to start
> Read `CLAUDE.md` and `handoffs/EV.md` completely. You are the Story Engine agent for Questbound and you have
> full authority over the paths EV owns — make decisions without asking me. Follow the git protocol in
> CLAUDE.md §3 exactly: switch to `feat/engine`, merge `origin/main`, and **commit + push to `feat/engine`
> after every task and at least every 20 minutes**. Work through the tasks in EV.md in order. Keep
> `handoffs/notes/EV-status.md` updated. Never edit files you don't own; put cross-team needs in
> `handoffs/notes/REQUESTS.md`. Start now with Task 0.

---

## Your role
You build the **brain**: everything that turns interests + real places into a book, verifies proofs, advances
pages, paints illustrations, writes recaps, and writes sequels. You also own the read/write client libraries the
UI agents depend on. Everyone else is building UI against your mock contracts right now. Your job is to make the
real versions behave **identically** to the mocks, only real.

**You own:** `supabase/functions/_shared/**`, `supabase/functions/generate-storyline/**`,
`supabase/functions/submit-proof/**`, any new function you add (not `wizard-chat`), `lib/api.ts`, `lib/game.ts`,
`lib/mockStore.ts`, `fixtures/**`.

**Consumers of your work:** AD (coloring + storybook read `useStoryline/useMissions/useMemories/useBooks`),
AB (missions dashboard + mission detail call `useMission`, `submitProof`, `uploadProof`, onboarding calls
`generateStoryline`, wizard imports `_shared/llm.ts`), MP (chat renders your proclamations).

---

## Task 0 — Environment & smoke tests (≤20 min)
1. Confirm secrets exist (the repo owner sets them once — see `handoffs/SETUP.md`):
   `LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, IMAGE_MODEL, SERPAPI_KEY, DEMO_FORCE_PASS`.
2. **Verify the Meta Model API shape before building on it.** It is OpenAI-compatible per Meta's docs, but confirm
   base URL + model ids on dev.meta.ai. Smoke test:
   ```bash
   curl -s "$LLM_BASE_URL/chat/completions" -H "Authorization: Bearer $LLM_API_KEY" -H "Content-Type: application/json" \
     -d '{"model":"'"$LLM_MODEL"'","messages":[{"role":"user","content":"Say hi as a wizard in 8 words"}]}'
   ```
   If image input, `response_format`, or the images endpoint differ, adapt `_shared/llm.ts` ONLY (it's the single
   seam). If Meta access fails entirely, point `LLM_BASE_URL/LLM_MODEL` at any OpenAI-compatible provider and keep
   going — tell the team in `EV-status.md`.
3. SerpApi smoke test:
   `curl -s "https://serpapi.com/search.json?engine=google_maps&type=search&q=coffee&ll=@30.2849,-97.7341,14z&api_key=$SERPAPI_KEY" | head -c 600`
4. Deploying functions (from any machine with network + `SUPABASE_ACCESS_TOKEN`):
   ```bash
   npx supabase login            # or export SUPABASE_ACCESS_TOKEN
   npx supabase link --project-ref <ref>
   npx supabase functions deploy generate-storyline submit-proof
   ```
   Test with a real user JWT (sign in anonymously once from the app, or create a test user in the dashboard):
   `curl -s -X POST https://<ref>.supabase.co/functions/v1/generate-storyline -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" -d '{"fellowship_id":"<id>","mode":"first"}'`
   Logs: Supabase dashboard → Edge Functions → Logs.

Commit + push.

---

## Task 1 — Prompts module `_shared/prompts.ts`
Create one file holding every prompt so they're easy to tune. Muse's persona (used everywhere):

> You are Muse, a warm, witty wizard-narrator who writes fairy tales about real friend groups. You speak in short,
> vivid sentences with gentle humor. You never mock anyone. You turn ordinary real-world activities (getting
> coffee, walking a bridge, playing board games) into chapters of a fairy tale. You care about one thing: getting
> friends to spend real time together.

Export: `MUSE_PERSONA`, `storylineSystem(...)`, `storylineUser(ctx)`, `verifierSystem`, `verifierUser(...)`,
`storyLineFor(...)`, `recapSystem`, `illustrationPrompt(...)`, `sequelAddendum(recap, stats)`.

---

## Task 2 — `generate-storyline` (the most important function)
**Request** `{ fellowship_id, mode: 'first' | 'sequel' }` → **Response** `{ storyline_id }`.
Must return in **< 30 s**. Must never fail the demo (deterministic fallback below).

**Algorithm**
1. Auth: `callerId(req)`; verify caller is a member of `fellowship_id` (query `fellowship_members`). 403 otherwise.
2. Load fellowship (lat/lng/area_label; fallback to UT Austin 30.2849,-97.7341 "Austin, TX") and members joined
   with profiles (display_name, crest, color, interests, budget, availability).
3. Interest analysis (pure code, no LLM): count interest ids across members → `shared` (≥2 members),
   `unique` (1 member, keep per-person). Pick up to 3 search themes: top shared interests first, then one unique
   interest per member so everyone sees something of theirs.
4. **SerpApi grounding** (parallel, `Promise.allSettled`, all cached via `serp()`):
   - For each theme → `mapsSearch(<human query>, lat, lng, 4)`. Map interest ids to queries, e.g.
     `coffee→"cozy coffee shop"`, `hiking→"hiking trail"`, `board_games→"board game cafe"`,
     `live_music→"live music venue"`, `museums→"museum"`, `food_trucks→"food truck park"`, `sunsets→"scenic overlook"`,
     `arcades→"arcade bar"`, `thrifting→"thrift store"`, `parks→"park"`… (write the full map for all ids in `shared/theme.ts` INTERESTS).
   - `eventsSearch("events in <area_label>", 6)`.
   - Merge into `places: Place[]` (dedupe by title, max ~16). Give each an index `P0..Pn` for the prompt.
   - Respect budget: if most members are `free`/`$`, tell the LLM to prefer free places/events.
5. Choose chapters: `first` → 3 chapters (`castle_gate`, `enchanted_forest`, `dragon_peak`); add `royal_feast`
   as chapter 4 if fellowship has ≥4 members. `sequel` → 3 chapters, different order allowed, include
   `royal_feast` as finale.
6. **LLM call** (`chatJSON`, temperature 0.9) with: persona, fellowship (names, crests, interests per member),
   places list with indexes, chapter templates **with their exact region ids + sizes + labels + mood**, and the
   SIZE RULES (from `_shared/types.ts`). Required output JSON:
   ```json
   {
     "title": "The Lantern Thief of Austin",
     "synopsis": "2-3 sentences",
     "theme_tags": ["coffee","live_music"],
     "chapters": [{
       "chapter_number": 1, "template_id": "castle_gate",
       "title": "The Gathering at the Gate", "narrative": "2-3 sentences",
       "missions": [{
         "region_id": "castle", "type": "gathering", "title": "Council at the Coffeehouse",
         "description": "Plain-language task, concrete, doable in < 2 hours, safe, legal, cheap",
         "story_hook": "1 sentence of fairy-tale flavor",
         "place_ref": "P3",            // or null
         "assignee_names": [],          // optional: names of members this suits (use their unique interests)
         "trial_question": null, "trial_answer": null,  // trials only
         "verification_hint": "what a photo/answer must show",
         "points": 40
       }]
     }]
   }
   ```
   Prompt rules to include: exactly one mission per region of each template; obey size rules
   (large=gathering with whole fellowship; medium=duet|gift|trial(co-op) with 2; small=relic|bard|trial solo);
   ≥50% of missions reference a real `place_ref`; every member gets at least one mission matching a unique
   interest; missions in chapter N escalate a little in ambition; riddles must be answerable from the place
   facts given or common knowledge; NO dangerous, illegal, expensive or romantic tasks; photos never of strangers.
7. **Validate + repair** in code (don't trust the model):
   - template ids valid, every region present exactly once (add missing via fallback mission, drop unknown);
   - `type` allowed for region size, else coerce to the first allowed type;
   - `proof_type = PROOF_FOR_TYPE[type]`; `required_members` = size rule (`all` → member count, min 2);
   - resolve `place_ref` → `Place` or null; `assignee_names` → user ids;
   - trial without question/answer → convert to `relic`.
   If JSON parse fails → retry once with the error message appended. If it fails again → **deterministic fallback
   book** built from templates + places (write `fallbackBook(ctx)`; generic but sensible missions). Demo never dies.
8. **Write to DB** (service role): insert `storylines` (status `active`, `book_number` = previous max + 1,
   `generation_context` = { interests, places, serp: serpStats, prior_recap }), `pages` (chapter 1 `active`, others
   `locked`), `missions` (chapter 1 `open`, others `locked`), `mission_secrets` for trial answers. If a previous
   storyline is `active`, mark it `complete`.
9. `proclaim(fellowship_id, "Hear ye! Muse has written a new tale: \"<title>\". Chapter I: <chapter title> awaits.", { event: 'storyline_ready', storyline_id })`.
10. Return `{ storyline_id }`.

**Sequel mode** (`mode:'sequel'`): additionally load the last complete storyline's `recap`, its missions (which types
were completed fastest, which were never done), completions' photos count, and the last 40 chat texts. Append
`sequelAddendum`: continue the same world with a new villain/quest, lean into the mission types the group completed,
drop ones they skipped, call back to 2 specific moments from the recap by name, raise the stakes slightly.
This adaptation is a key judging point — log what was adapted into `generation_context.adaptation` so the UI can
show "Muse noticed you love Duets…".

---

## Task 3 — `submit-proof`
**Request** `SubmitProofRequest` → **Response** `SubmitProofResponse` (see `shared/types.ts`). Return < 15 s.

1. Auth caller; load mission (+ `mission_secrets`), its page and storyline. Mission must be `open` (or `pending`
   for gift confirmation). Caller must be a fellowship member.
2. `participant_ids` must include caller; length ≥ `required_members` (gathering: allow `required_members - 1`
   if fellowship ≥ 4, people are busy). Fail fast with a friendly flavor_text if not.
3. Verify by `proof_type`:
   - `answer` → normalize (lowercase, strip punctuation/articles) and compare to `trial_answer`; if not exact, ask
     LLM "is X an acceptable answer to Q whose answer is A?" (JSON {pass}). Wrong answers get a hint-y flavor_text.
   - `photo` / `group_photo` → in parallel: `lensTitles(proof_url)` (SerpApi Google Lens, 8 s timeout) and an LLM
     vision call with the image (`{type:'image_url', image_url:{url: proof_url}}`), the mission description,
     `verification_hint`, the Lens titles, and (group) the expected number of people. LLM returns
     `Verdict` JSON. Include Lens titles in the verdict (`lens_titles`) — the UI shows them as "The Mirror sees: …"
     which is our visible SerpApi moment. If Lens times out, verify with vision only. If vision fails, pass with
     confidence 0.5 (never block a real group on an API outage).
   - `text` / `voice` → LLM checks it's on-topic, non-empty, not offensive; pass generously; the text becomes part of
     the story.
   - `confirm` (gift) → first submit by giver sets mission `pending` + `mission_secrets.pending_payload =
     {giver, recipient: confirm_for}` and proclaims "<giver> sent a gift to <recipient>! Awaiting their seal."
     A second call by the **recipient** with `confirm_for` = giver completes it.
   - If `DEMO_FORCE_PASS` → pass with flavor text, still call Lens (we want the Lens titles in the demo) but don't
     wait > 4 s for it.
4. On pass:
   - Write `story_line` with the LLM (one sentence, past tense, names + crests, e.g. "Sir Bram the Dragon and Lady
     Cleo crossed the drawbridge as the sun sank, and the chains sang.").
   - Insert `completions`; update mission `status='complete'`, `completed_by=participant_ids`, `completed_at`,
     `story_line`. If photo → insert `memories` (kind `photo`, caption = story_line).
   - Proclaim with payload `{ event:'mission_complete', mission_id, region_id, color: <submitter's color>, user_id }`
     and body like `Hear ye! <story_line>`.
   - **Page check:** if every mission on the page is complete → page `complete` + `completed_at`; next chapter's page
     `active` and its missions `open`; proclaim `page_complete` ("Chapter I is fully colored! The page turns…").
     Then generate the chapter illustration **in the background** with `EdgeRuntime.waitUntil(...)`:
     `generateImage(illustrationPrompt(page, story_lines, crests))` → if b64, upload to `art/<storyline>/<page>.png`;
     set `pages.illustration_url`; insert memory kind `illustration`.
   - **Book check:** if it was the last page → storyline `complete`; generate `recap` (LLM, `BookRecap` JSON using all
     missions, story_lines, completions per member, serpStats) → save; proclaim `book_complete` with the recap
     summary. The founder/anyone can then summon the sequel (AB's UI calls `generateStoryline({mode:'sequel'})`).
5. On fail: don't write a completion; return verdict with Muse's playful `flavor_text` ("The Mirror squints… I see a
   lovely ceiling, but no moon. Try again under the night sky!").

---

## Task 4 — `lib/api.ts` real implementations
Keep the mock branches. Real:
```ts
export async function uploadProof(localUri: string, fellowshipId: string): Promise<string> {
  if (USE_MOCKS) { /* existing */ }
  const res = await fetch(localUri);
  const buf = await res.arrayBuffer();
  const path = `${fellowshipId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('proofs').upload(path, buf, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('proofs').getPublicUrl(path).data.publicUrl; // public => Lens can fetch it
}
```
`invoke()` already sends the user's JWT. Surface function errors as `Error(message)` with the server's `error` text.
Tell AB in `EV-status.md` to resize photos before upload (`ImagePicker` `quality: 0.6`).

## Task 5 — `lib/game.ts` real hooks (realtime)
Pattern for each hook (keep signatures):
```ts
useEffect(() => {
  if (USE_MOCKS || !storylineId) return;
  let alive = true;
  const load = async () => {
    const { data } = await supabase.from('missions').select('*').eq('storyline_id', storylineId);
    if (alive && data) setMissions(data as Mission[]);
  };
  load();
  const ch = supabase.channel(`missions:${storylineId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: `storyline_id=eq.${storylineId}` }, load)
    .subscribe();
  return () => { alive = false; supabase.removeChannel(ch); };
}, [storylineId]);
```
- `useStoryline(fid)`: latest storyline by `created_at` for the fellowship + its pages; subscribe to `storylines`
  (filter fellowship_id) and `pages` (filter storyline_id). Status `generating` → UI shows a loading ritual.
- `useMissions(sid)`, `useMission(id)`, `useBooks(fid)` (all storylines desc), `useMemories(fid, sid?)` — same pattern.
- Unique channel names per hook instance (append a random suffix) to avoid duplicate-channel errors.

## Task 6 — Demo hardening (do before 3 AM)
- **Instant demo book:** support `{ mode: 'first', demo: true }` in `generate-storyline` — skip the LLM and insert
  a book shaped like `fixtures/demo.ts` instantly (real places from cache if available). AB wires it to a hidden
  long-press in Settings. Add `demo?: boolean` to the request via `REQUESTS.md`.
- All LLM/Serp calls have timeouts; every failure path still produces a valid response.
- Log `serpStats` (live vs cached) into `generation_context` and recap — our SerpApi pitch shows it.
- Pre-warm cache: call generate once at the venue coordinates before judging so maps/events are cached.

## Acceptance checklist
- [ ] Mock mode untouched and still works for UI teammates.
- [ ] `generate-storyline` creates a valid 3–4 chapter book with real places in < 30 s; fallback works with LLM key removed.
- [ ] `submit-proof` passes/fails correctly for answer, photo (with Lens titles), text, gift confirm; page turns; book completes with recap.
- [ ] Realtime: completing a mission on phone A recolors the region on phone B within ~2 s.
- [ ] Sequel generation references the previous recap and shows an adaptation note.

## Round 2 backlog (after merge round 1)
1. `reroll-mission` function (Muse swaps one open mission; AB's wizard calls it).
2. Montage: on book complete, generate 3–5 `montage_frame` images (Muse Image "storybook illustration of <story_line>") for AD's montage player.
3. Voice Bard: accept audio upload → Muse Voice Transcribe → text proof.
4. Muse connector / MCP tool exposing `quest_status` and `create_quest` (only if time; don't pitch it unless it works).
5. Google Shopping "Royal Appraiser" relic type (Lens → shopping price → group guesses value).

## Git reminder
`npm run typecheck && git add -A && git commit -m "[EV] …" && git push origin HEAD:feat/engine` — after every task.
