# ROUND 4 (V1, final) — merge report (main @ round 4)

**Each agent: run `git fetch origin && git merge origin/main` before continuing.** Feature freeze: bug fixes only.

## Results at a glance
| Check | Result |
|---|---|
| Merges (engine → friends → coloring → shell) | ✅ only conflict was `handoffs/notes/REQUESTS.md` (unioned; one duplicate "Status: open." line the union dropped was restored). No frozen-file edits on any branch. |
| `npm install` / `npm run typecheck` | ✅ / ✅ clean |
| EV fixture tests | ✅ `points.test.mjs` 6 · `templates.test.mjs` 5 · `ut-campus.test.mjs` 4 — 15/15 |
| `npx expo export --platform ios` | ✅ |
| `npx expo export --platform web` | ✅ mock build and live (non-mock) build |
| Violations grep (Meta/SerpApi URLs in app/components/lib, hex/rgba in changed app/components files) | ✅ none |
| Mock web smoke (Playwright, 390×844) | ✅ all steps pass, 0 page errors, 0 console errors (see below) |
| Live web smoke (real Supabase, local build of main) | ✅ leave fellowship → New storyline → server `403 not_member` → app goes to create/join, no crash |
| Edge functions | ✅ no redeploy needed: EV deployed generate-storyline v22 / submit-proof v21 / reroll-mission v12 / paint-chapter v8 with the final V6 code (EV-status). wizard-chat v13 unchanged this round. |
| Tag `round-4` | ⚠️ created locally, but this session's git proxy refuses tag pushes (same as round 3). Repo owner: `git tag round-4 d7abdf9 && git push origin round-4` (or tag the final main sha). |
| Production web (questbound.expo.app) | ⚠️ **not redeployed** — no `EXPO_TOKEN` in this session. Repo owner: `npx expo export --platform web && npx eas-cli deploy --prod` from main (build env from eas.json / .env). |

No new migration this round (0005 `storylines.geo_enforced` is already applied to prod).

### Mock-mode web smoke (all pass)
1. App opens on the Page tab (book I). Long-press Sage's FAB → **Demo Tools** → **Start UT campus demo** → writing
   overlay → Book II "The Legend of the Forty Acres", Chapter I **The Forty Acres Awaken**, 0 of 6 colored.
2. Missions → **The Turtle Keepers' Riddle** (Duet) → place card shows **"Counts from anywhere"** (`isGeoEnforced`) →
   pick Bram → answer "red-eared sliders" → **Speak the answer** → Magic Mirror → **reward pack**. Frame strip (every
   350 ms): sealed card → open → region **uncolored → one fill → stays colored** through the +20 count-up → seal.
   No flicker.
3. **See it on the page** → the **same** Coloring page instance comes back (DOM node tagged before the mission is still
   mounted; still one copy of the page) → the Moon is already colored and plays **one glow** (sparkle → gold ring →
   settled). No second fill.
4. Storybook: shelf (one music toggle, top-right) → open book → reader (Montage + music side by side, no overlap,
   FAB hidden) → **Montage**: the one bards player ducks **0.16 → 0.056**, back to **0.16** on close. One player throughout.
5. Settings "…" → Leave fellowship → **Leave the fellowship** → lands on onboarding's create/join step.
   (Mock `leave()` is a no-op, so step 6 was verified live.)
6. **Live**: fresh anon user → onboarding → found "Round 4 Merge Smoke". Tab B leaves the fellowship → create/join.
   Tab A (stale, still on Missions) → **Summon our story** → server answers `403 {code:'not_member'}` → app routes to
   `/onboarding?step=fellowship` within 1 s. Opening `/settings` after leaving also redirects to create/join.
   (Throwaway data on prod: ~6 anonymous users and fellowships named "Round 4 Merge Smoke". Delete them if you like.)

## What merged
**EV (feat/engine)**
- V1 server guard: generate-storyline answers a missing/disbanded/foreign fellowship with 400/404/403 + `code`
  (`no_fellowship` / `not_member`), never a book and never a 500. Unexpected throws in any EV function become 503 `retry`.
- Client: `EngineError { code, status }` + `isNoFellowshipError(e)` in `lib/api`; `generateStoryline` refuses locally
  without a fellowship id.
- V2 UT Campus Demo: `demo:'ut'` writes `geo_enforced=false`; new Chapter I "The Forty Acres Awaken" (Great Tournament,
  Salute the Tower, Harvest Horns @ University Co-op, Royal Portraitist, Turtle Keepers' Riddle, March the South Mall).
  submit-proof never blocks on location for that book but still returns the distance. `isGeoEnforced()` in lib/game.
- V6: far more group quests, max 1 solo per page (fallbacks and UT Chapter I: 0); copy names its crew.
- New `fixtures/ut-campus.test.mjs`, live smoke scripts in `supabase/functions/_dev/`.

**MP (feat/friends)**
- V7: proclamation toast is a calm fade + slide (no spring bounce).
- Chat composer: Sage button lives in the composer (tap = Sage, long-press = Demo Tools); floating FAB hidden on chat.
- Phone-width web fixes: Enter sends, composer starts one row and grows, fellowship name shrinks to fit one line.
- `useSoftKeyboard()` (native + mobile web); the Up next strip steps aside while typing.

**AD (feat/coloring)**
- V3: a newly colored region fills once, then glows. A region colored while you were away arrives colored and only
  glows. Stale refetches that briefly revert `complete` are ignored.
- V4: the colored-region sheet has its own ✕ close button.
- V5: `HeaderMusicToggle` in the Coloring chapter header, the Storybook shelf row and the reader's top bar (beside Montage).
- V8: the montage starts no audio of its own. V9: the Storybook tab always opens on the shelf.

**AB (feat/shell)**
- V1 crash fix: `FellowshipGuard` in the tabs, one non-modal "Sage is writing your book…" overlay (closes pop-ups first,
  45 s slow state with Try again, failures stay in the overlay). New-book success handled once.
- V2: mission detail shows the distance but never blocks on demo books.
- V3: reward pack renders the region once (animated view opacity, memoized mini page).
- V5: floating mute hides while the reader/montage is open. V8: one app-wide bards player + `useMusicDuck(active)`.

## Requests applied (all in REQUESTS.md with ✅ round 4)
- [EV → AB] V1/V2 client wiring, [MP → AB] tab bar vs keyboard, [AD → EV] `useLive` sequencing,
  [AD → AB] `router.dismissTo`, [AB → AD] `useMusicDuck(montage)`. None rejected.

## Integration fixes (one commit each)
1. `app/mission/[id].tsx` (AB): every tab-bound `router.navigate` → `router.dismissTo` ("See it on the page", "Back to
   missions" on the done/result screens) — AD's tested fix. Also `geoFree = !isGeoEnforced(storyline)` (EV's helper).
2. `components/shell/NewBook.tsx` (AB): fellowship errors now check `isNoFellowshipError(e)` first (old text match kept
   as a fallback) → create/join. `app/onboarding.tsx` (AB): summon on `isNoFellowshipError` → back to the fellowship step.
3. `app/(tabs)/storybook.tsx` (AD): `useMusicDuck(montage)`. Music toggles checked: exactly one per screen (Coloring
   header, Storybook shelf, reader top bar, Missions, Settings, Friends headers; the floating fallback only shows on the
   Page tab's loading/blank-book states, and hides wherever a header toggle or hidden FAB exists). Montage is a
   full-screen modal, nothing overlaps its ✕.
4. `components/shell/TabBar.tsx` (AB): returns `null` while `useSoftKeyboard()` is true on Android + web. iOS native
   unchanged (the keyboard already covers the bar; avoids a layout jump).
5. `lib/game.ts` (EV): `useLive` keeps only the latest load (`seq` guard, exactly AD's diff) — a stale refetch can't
   flip a mission from complete back to open. EV's structure untouched.
6. Verified, no change: MP's composer Sage button uses `useWizard().open()` / `openDemoTools()` and the chat view calls
   `useHideWizardFab(true)` — all still exported by AB's latest WizardProvider; WizardFab honours `fabHidden`.

## Open TODOs (post-freeze, optional)
- **AB:** `FRIENDS_COMPOSER_HEIGHT` lift in `app/(tabs)/_layout.tsx` now only applies to the Friends roster (no
  composer there) and could be 0 — cosmetic.
- **AD:** `coloring.tsx` summon and Storybook "Write the sequel" still show generic errors on `not_member`; the tabs'
  `FellowshipGuard` already handles it, so optional: route on `isNoFellowshipError(e)`.
- **MP:** mock `leave()` is a no-op (mock-mode leave can't fully exercise the no-fellowship path).
- **Owner:** push tag `round-4`; redeploy the web app (`eas deploy --prod`) so questbound.expo.app gets round 4.

## Phone test checklist (Expo Go, 2 phones; then one phone browser)
1. **Mock** (`npm run mock`): Page tab → long-press Sage → Demo Tools → **Start UT campus demo** → overlay → Chapter I
   "The Forty Acres Awaken". No crash, no second pop-up.
2. Missions → The Turtle Keepers' Riddle → "counts from anywhere" → 2 heroes → answer "red-eared slider" → reward pack:
   region fills **once** (no blank/color/blank) → seal → **See it on the page** → page shows it colored with **one**
   glow. Repeat with a second mission: the back button / tab bar should not stack extra pages (Android back once
   returns to the previous tab, not a duplicate page).
3. Storybook → open the book → **Montage**: music gets quieter (same tune, no new track), back up on close. Only one
   speaker icon on each screen; nothing covers Montage. Leave the tab and come back → shelf.
4. Friends → chat: tap the field → keyboard up → **Android:** tab bar disappears, composer sits right on the keyboard;
   **iOS:** unchanged. Sage button in the composer opens Sage; long-press opens Demo Tools. Toast slides in calmly.
5. **Live** (`npm run dev`): phone A founds a fellowship, B joins by QR/code. A: Demo Tools → UT campus demo; B sees the
   page appear. B completes a duet with A from anywhere (distance shows, never blocks); A sees the fill + proclamation.
6. **Live V1:** B → Settings "…" → Leave fellowship → lands on create/join. On A's phone nothing breaks. On B, tap any
   path to a new book (or reopen the app) → always create/join, never a crash, never a book written.
7. Tap the region sheet ✕ → it closes (V4).

## Known breakages
- None found in mock or live web smoke. Native-only behaviour (Expo Go audio ducking, Android keyboard resize, iOS
  modal dismissal via `dismissTo`) was verified on web only — run checklist steps 2–4 on real phones.
