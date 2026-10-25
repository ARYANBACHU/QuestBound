# EV decisions log

- **Meta Model API shape (from dev.meta.ai docs, not smoke-tested — no key yet):** base `https://api.meta.ai/v1`,
  `POST /chat/completions` (OpenAI-compatible, stateless). Structured output is
  `response_format: {type:'json_schema', json_schema:{name, schema}}` — there is NO `json_object` mode, so `llm.ts`
  sends json_schema. `reasoning_effort` is top-level (`minimal|low|medium|high|xhigh`; `none` = 400). We default to
  `minimal` for latency. Images: `{type:'image_url', image_url:{url}}` parts, **user messages only**.
  Image gen: `POST /images/generations` `{model:'muse-image-1.0', prompt, n, size, response_format:'b64_json', output_format:'png'}`
  -> `data[0].b64_json`. Newer text model ids exist (`muse-spark-1.3`); `LLM_MODEL` secret picks it.
- **Defensive LLM client:** if the API rejects optional params (400/422), `chat()` retries once with only
  `{model, messages}`. `HAS_LLM=false` (no key) skips straight to deterministic fallbacks — no waiting on timeouts.
- **SerpApi:** fresh cache (12 h) -> live (10 s timeout) -> **stale cache of any age** -> throw. Maps `ll` coords are
  rounded to 3 decimals so nearby fellowships share cache. Lens also reads `knowledge_graph` titles first.
  `serpStats` is reset per request (module state survives between requests in an isolate).
- **Storyline generation is split for speed:** 1 outline call, then all chapters' missions in parallel (one call each).
  A 24-mission single JSON blob would blow the 30 s budget. Each chapter falls back independently.
- **required_members enforcement is capped at the fellowship size** in submit-proof so a 1–2 person test group can
  still finish pages (stored value still follows the size rule, min 2 for gatherings).
- **Gift response:** the giver's first submit returns `pass:true, reason:'gift_pending'` (not a failure) with the mission
  `pending`; the region paints in the giver's crayon when the recipient seals it.
- **Mock `proof_text: 'dev'`** passes any mission (AD's dev button relies on it). Real server has no such bypass.
- **Recap** is generated synchronously (≤ remaining budget, fallback otherwise) so `book_completed` responses already have
  it; illustrations and montage frames are painted in the background (`EdgeRuntime.waitUntil`).
- **`mode:'first'` is idempotent**: if a book is already active it returns that id (`reused:true`). `demo:true` always
  writes a fresh instant book and retires the active one. Sequels pick 2 of the first 3 templates (rotating) + royal_feast.
- **Voice Bard deferred** (WAV-only ASR, see status).
- **Prewarm** is a flag on generate-storyline instead of a new function: fewer deploys.

## Round 2 (Oct 25)
- **Points are pure + shared**: `supabase/functions/_shared/points.ts` has no imports, so Deno, the app (lib/game.ts
  re-export, Metro bundles it) and plain `node` (the test) all use the same code. The LLM's `points` field is ignored.
  Chapter bonus (+5/chapter) dropped: points = size × difficulty only, per E4.
- **Same trick for GPS and the UT book**: `_shared/geo.ts` and `_shared/ut-campus.ts` are import-free; the mock engine
  imports them so mock and server behave identically. `fixtures/ut-campus.ts` re-exports the data (spec location).
- **Join race without a migration** (migrations are frozen): insert the `'generating'` row, then re-read; the oldest
  fresh one wins, losers delete their row and return the winner with `reused: true`.
- **`place.link` = maps link** for new places (website moved to `website`) so any old `p.link` code opens maps.
- **GPS applies to every proof type** of a located mission (photo, riddle, verse), checked before the (slow) vision
  call. Gifts are never located. Distance is reported on passes too.
- **UT book has 4 chapters** regardless of fellowship size (more campus to explore); gatherings still need everyone.
  Speedway Mall isn't a Google Maps place, so its mission is anchored at the Gates Dell Complex on Speedway.
  SerpApi pins are used only when within 150 m of ours (a 609 m "match" was a shop).
- **Reroll difficulty default is 'easy'** (most rerolls mean "too much today").
- **Abandoned recap is instant** (no LLM) so `replace_active` doesn't add latency.

## Round 3 (Oct 25)
- **Sequels never shelve an unfinished book** (B2): a stale "Write the sequel" tap was shelving brand-new books.
  Shelving is only `replace_active` / `demo`. A replace double-fired within 2 min (same difficulty, nothing colored)
  returns the book it just wrote. No new storyline status (migrations frozen): `bookStatus()` derives it from pages.
- **Crew plan is fixed per template slot, not chosen by the model** (G1): each template marks one trio medium and one
  duet small in `_shared/fallbacks.ts`, so fallback copy and LLM copy agree and the rule (≤2 solos) is guaranteed. A
  trio keeps `type: 'duet' | 'trial'` (no new mission type → no migration); UIs label with `crewOf()`. Gifts stay 2.
  Fellowship of 2 → the trio becomes a duet; of 1 → everything solo except the gathering row (capped at submit time).
- **Fallbacks + picker are import-free files** so Deno and the app's mock engine run the same code (like points.ts).
- **Art-ready list comes from the client** (G2): only the app build knows what it can draw. Server default = classics
  (+ `ART_READY_TEMPLATES` secret). Classics are always allowed as a safety net.
- **Template choice is deterministic scoring, not the LLM**: the outline needs the chapter list up front (it runs in
  parallel with SerpApi), and a bad pick can't break the book. Slots: opener / middle / finale.
- **paint-chapter only paints completed pages**: an unfinished chapter isn't a story yet, and it keeps the cost bounded.
- **JPEG re-encode on the server** (G3): the image API ignores `output_format`; storage image transforms are not on
  this plan (403). imagescript decode+resize+encode ≈ 250 ms CPU, well under the edge CPU budget.

## V1 final round (Oct 25)
- **Coded errors, not text matching** (V1): `{ error, code }` with `no_fellowship | not_member | retry | auth`. The app
  routes on `code` (lib/api `EngineError`, `isNoFellowshipError`). Disbanded vs. left are both "go to create/join".
- **No bare 500s**: every EV function is wrapped in `safe()`; unexpected throws → 503 `retry` with Sage's text. 503 (not
  200) so supabase-js still surfaces it as an error the overlay can Retry.
- **geo_enforced is per book** (V2): written at insert (`!utDemo`), read by submit-proof. Not enforced = we still compute
  and return `distance_m` (the demo shows "290 km away") but pass `force` to `checkGeo`. Mock engine mirrors it.
- **UT Chapter I has 0 solos**: Turtle Pond riddle + Littlefield walk became duets (plan: "prefer 0"). Chapters II–IV
  keep exactly one solo each (a verse or a single photo) for pacing. New riddle answer: red-eared slider (+ alternates;
  the LLM judge forgives near misses). Co-op pin = SerpApi's (63 m from my estimate).
- **Photo verifier expects a crew only for people photos** (gathering/duet). A duet relic ("photograph your sketch with
  the museum behind it", "the moon") is an object photo; demanding 2 faces would fail honest proofs.
- **V6: small = duet by default**, `crew: 1` is the only way to get a solo (max one per template, none used in fallbacks).
  Copy is fixed centrally by `withCrew()` (imperative → "Two of you photograph…") instead of rewriting 40 strings; a
  test checks every fallback reads "Two of you…/Three of you…".
