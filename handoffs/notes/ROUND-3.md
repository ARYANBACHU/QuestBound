# ROUND 3 — merge report (main @ round 3)

**Each agent: run `git fetch origin && git merge origin/main` before continuing.**

## Results at a glance
| Check | Result |
|---|---|
| Merges (engine → friends → coloring → shell) | ✅ only conflicts were `handoffs/notes/REQUESTS.md` (unioned). No frozen-file edits on any branch. |
| `npm install` / `npm run typecheck` | ✅ / ✅ clean |
| EV node tests | ✅ `fixtures/points.test.mjs` 6 passed · `fixtures/templates.test.mjs` 4 passed |
| `npx expo export --platform ios` | ✅ 6.5 MB Hermes bundle, 26 assets |
| Art | ✅ all 20 template ids render drawn art (AD 12 + MP 8); `validatePageArt()` → no problems; no placeholder left; no NaN paths |
| Violations grep (Meta/SerpApi URLs in app, hard-coded hex/rgba in app/components) | ✅ none |
| Mock web smoke (Playwright, 390×844) | ✅ 0 page errors / 0 console errors (except react-native-svg's known web-only "Unknown event handler" warnings) |
| Edge functions deployed | ✅ generate-storyline v18, submit-proof v17, reroll-mission v8, paint-chapter v4, wizard-chat v11 (verify_jwt kept on) |
| Live smoke (project `jhqkjfhtekermlbnqtxe`) | ✅ see below |
| Tag `round-3` | ⚠️ created locally, but this session's git proxy refuses tag pushes (no tags exist on the remote from earlier rounds either). Repo owner: `git tag round-3 <main sha> && git push origin round-3` if you want it. |

### Mock-mode web smoke (all pass)
1. Onboarding: Begin → bards → crest → crayon → interests → budget/time → "Seal my page" → lands on the coloring page.
2. New book from Missions "…" → New storyline… → **Easy / Normal / Hard** each → confirm → ritual ("Sage is writing…") →
   Book II on the Page tab (new templates: owl_library, beanstalk_sky — real art).
3. Mission m-6 (bard verse) → Submit proof → **reward pack** (sealed card → burst → "Region colored!" +10, story line) →
   "See it on the page" → the Moat **fills in the player's crayon** (3 of 6).
4. Finished chapter I → **page turns** to chapter II automatically; ‹ back to I and › forward to II both flip.
5. Storybook tab → shelf ("Chapter 1 of 3 · 2 colored" style labels) → open book → chapter I view with Sage's painting
   hero ("✦ Storybook · painted by Sage") + coloring-page thumbnail → next page → **Montage** plays (segment bars advance).

### Live smoke (throwaway fellowship "Round 3 Merge Smoke", anon user)
- **UT demo book** (`demo:'ut'`): 1.2 s, castle_gate → enchanted_forest → dragon_peak → royal_feast, 24 missions.
- **wizard-chat**: 2.7 s, "I am Sage! Round hat. Cloud beard. Keeper of your Book…" (never calls itself Muse).
- **paint-chapter**: unfinished page → refused ("…Finish this page first!"). After coloring chapter I (SQL on the
  throwaway fellowship only) → 14.5 s → `…/art/…/<page>.jpg`, `image/jpeg`, 359 KB, JPEG magic bytes ✓.
- **New AI book** (`replace_active`, normal, `art_ready` = all 20): 26.6 s, *The Owl's Brew of Austin*,
  **witch_cottage → rose_garden → candy_village** (3 non-classic), avoided the previous book's classics; UT book shelved
  (`complete`, `recap.abandoned = true`).

## What merged
**EV (feat/engine)**
- B2 status transitions: a book completes only when every page is complete; sequels never shelve an unfinished book;
  double-fired replace reuses the fresh book; `bookStatus()` / `useBookStatus()`.
- G1 group play: fallback missions + chapter text for all 20 templates; crew plan (1 trio medium + 1 duet small per
  page, ≤2 solos); points solo 10 / duet 20 / trio 30 / fellowship 40 × difficulty; `crewOf` / `CREW_LABEL`.
- G2 template variety: mood-fit picker from art-ready templates only (`art_ready` from the client), no repeats, avoids
  the previous book.
- G3 `paint-chapter` edge function + `paintChapter(pageId)` / `paintBook(storylineId)`; 1024² JPEG paintings (~370 KB).
- B1 root-cause write-up + fix diff for AB.

**MP (feat/friends)**
- B4 chat keyboard (now swapped to AB's shared helper — see fixes).
- U8: no plain white in MP UI (parchment bubbles/pills/input, mood-tinted composer bar).
- U2: 8 new pages in `assets/pages/set-mp/` (troll_bridge, cloud_kingdom, crystal_cave, owl_library, rose_garden,
  lantern_festival, swamp_hollow, unicorn_meadow) + `SET_MP` barrel.

**AD (feat/coloring)**
- U1 coloring moment: crayon tip rides the scribble, waxy grain fill, gold ring + sparkles; fills wait until the Page tab
  is focused again.
- U2: redrew the 4 classics in the picture-book style + 8 new pages; optional `scenery` layer in PageArt.
- U3 Storybook chapter = one view (painting hero, colored-page thumbnail, tale entries); new Montage button.
- B2 shelf labels, B3 montage single clock, B6 page-back sound, U8 off-white surfaces.

**AB (feat/shell)**
- B1: one `NewBookProvider` host for writing a book (no Modal swap) + app/route error boundaries + crash net.
- B4 shared `KeyboardSafe`; B5 Sage FAB always mounted, draggable, position persisted.
- U4 reward pack; U5 spotlight coach-mark tours; U6 music toggle at the top of screens; U7 13 sfx (one per action);
  U8 parchment tab bar.

## Requests
- ✅ `shared/types.ts`: `GenerateStorylineRequest.art_ready?: TemplateId[]` (EV). No new migration this round
  (0004 already live per EV). `ART_READY_TEMPLATES` secret left unset — Expo Go phones run the new JS and send the list.
- Every other round-3 request is marked in `REQUESTS.md` (all ✅ except the two open items below).

## Integration fixes (one commit each)
| Fix | Files (owner) |
|---|---|
| MP's set-mp pages wired into `PAGE_ART`; placeholder deleted; `DRAWN` typed `Record<TemplateId, PageArt>` (a missing page is now a type error); `DRAWN_TEMPLATES` exported → lib/api sends all 20 as `art_ready` | `assets/pages/index.ts`, `assets/pages/placeholder.ts` (AD) |
| Chat + join screen on AB's `KeyboardSafe` (`dismissOnTap={false}` + `useKeyboardVisible()` in chat); MP's local KeyboardSafe deleted; chat Send plays `'send'` | `components/friends/ChatView.tsx`, `app/join/[code].tsx`, `components/friends/KeyboardSafe.tsx` (MP) |
| `<HeaderMusicToggle />` left of Invite | `components/friends/FellowshipHeader.tsx` (MP) |
| Sfx replay never silent: first play goes straight out, every replay pauses + awaits `seekTo(0)` then plays | `components/shell/sfx.ts` (AB) |
| AD page turns back on `playSfx('page' / 'pageBack')` (fresh-player workaround removed; AB ships `pageBack.wav`) | `components/coloring/sfx.ts` (AD) |
| B1 leftover from EV's diff: "…" menu waits 350 ms (was 120) for its Modal to fade before the next sheet presents. Rest of the diff is covered by NewBook.tsx | `components/shell/ActionMenu.tsx` (AB) |
| Shelf state from EV's `bookStatus()`; AD's wording kept ("Being written…", "Chapter N of M · X colored", "Finished ✦", "Set aside · Chapter N of M") | `components/storybook/bookData.ts` (AD) |
| "Sage is painting…" calls `paintChapter(pageId)` from lib/api directly (no runtime lookup / stock-image fallback; EV's mock paints in mock mode) | `components/storybook/paint.ts` (AD) |
| Group-size labels = Solo / Duet / Trio / Fellowship from `crewOf(m)`: mission card, mission detail header + who line ("🤝 Trio — needs 3 heroes"), AD mission sheet, AD Up next, Missions section "Duets & trios", Sage's local help line | `components/shell/MissionCard.tsx`, `app/mission/[id].tsx`, `components/shell/missionUtils.ts`, `components/wizard/localMuse.ts` (AB); `components/coloring/MissionSheet.tsx`, `components/coloring/UpNext.tsx` (AD) |

## Open TODOs per owner
- **AD:** in the Storybook reader the floating music toggle (AB's fallback, top-right) **overlaps the "Montage" button**.
  Put `<HeaderMusicToggle />` in the reader/Page headers (it auto-hides the floating one), or move Montage.
  Check the U1 reveal at 60 fps on a low-end Android.
- **MP:** `'tap'` / `'toggle'` sfx on plain Pressables (chips, toggles). Device-test the chat composer on Android with
  AB's KeyboardSafe (Friends tab sits above the tab bar).
- **AB:** `needsLabel()` in missionUtils is now unused (MissionCard shows the crew label). Sage's wizard-chat answer for a
  one-person fellowship says "A Gathering needs more wizards!" — players aren't wizards; consider "more heroes".
  Verify B1 (new book from Missions "…" and Settings, every difficulty) on a real iPhone in Expo Go.
- **EV:** an LLM book took 26.6 s (budget 27 s) — keep `demo:'ut'` / `demo:true` for the judging table. Test data
  from this smoke run: fellowship "Round 3 Merge Smoke" (`d8de7585-a797-4ad0-acda-8a40be8ff65c`), delete if you like.

## Phone test checklist (Expo Go, 2 phones)
1. **Mock** (`npm run mock`): onboarding → Page → open a mission → submit → reward pack → region fills in your crayon →
   proclamation in chat → finish the page → page turns; flip back (hear the softer page sound) and forward.
2. **Sounds:** tap the same button 3× fast-ish (every tap audible); flip pages back and forth 4× (every flip audible).
3. **Keyboard:** Friends chat — composer rides the keyboard, list taps dismiss it, ⌄ hides it; join with a wrong code →
   the code field stays above the keyboard. Same in mission detail and Settings editor.
4. **Real** (`npm run dev`): A creates a fellowship, B joins by QR; Missions "…" → New storyline… → Hard → confirm →
   no freeze/crash on iPhone; both phones land on the new book; its chapters use the new pages (not only the 4 classics).
5. Mission labels read Solo / Duet / Trio / Fellowship; a trio mission asks for 3 heroes.
6. Finish a chapter → Storybook → chapter shows "Sage is painting…" then the painting (10–40 s) → Montage plays.
7. Friends header: 🔊 toggle sits left of Invite and mutes the bards.
8. Ask Sage "What should we do next?" → answers as Sage with real mission names.
