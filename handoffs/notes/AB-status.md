# AB status (Wizard & Shell) — V1 (final round)

## Done in V1 (all on feat/shell, typecheck clean; checked on web in mock mode at 390×844 / 375×667)
- **V1 crash (P0)** — `components/shell/NewBook.tsx` rewritten:
  - No active fellowship → nothing writes a book: `openNewBook()`/`writeBook()` route to `/onboarding?step=fellowship`.
    New `FellowshipGuard` in `app/(tabs)/_layout.tsx` sends a fellowship-less player to create/join (after pop-ups
    close). Settings → Leave: closes the sheet, waits for its slide-out, then leaves the tabs.
  - `writeBook` first closes EVERY pop-up (new-book sheet, Sage's sheet, Demo Tools, keyboard; coach marks hide on
    `writing`), swallows taps for `POPUP_CLOSE_MS` (420 ms) while they animate away, THEN shows the overlay and calls
    the server. Demo Tools' confirm alert also waits for its own dismissal.
  - ONE full-screen, in-tree (non-Modal) overlay "Sage is writing your book…": blocks double taps, narration lines +
    gold progress bar, after 45 s "The ink is thick tonight" with **Try again** / Keep exploring. Failures stay in the
    overlay (**Try again** / Back to my book) — no sheet re-opens on top. Fellowship errors from the server → create/join.
    No layout entering/exiting animations (opacity fade-in only). Realtime arrival of the new book also counts as done.
  - Verified: Settings → New storyline → confirm → overlay → lands on the new book; slow state renders (tested with a
    1 s timeout); Demo Tools → Start UT campus demo → overlay → page.
- **V2 (P0)** — mission detail reads `storyline.geo_enforced`; when `false` the place card shows "1.2 mi away · counts
  from anywhere", no "Location off" warning, and a failed verdict never blames distance. Demo Tools "Start UT campus
  demo" already writes `demo: 'ut'` through the new overlay. (The UT book content + server geo skip are EV's.)
- **V3** — `RewardPack`: region fill moved off SVG `animatedProps` (react-native-svg re-sent fillOpacity=1 on each of the
  ~14 count-up re-renders → flicker) to an animated-view-opacity layer; mini page memoized. Frame-checked: uncolored →
  one fill → seal. AD note in REQUESTS.md (same pattern in ColoringPage).
- **V5** — the floating music toggle hides while a focused screen hides Sage's FAB (Storybook reader + montage), so
  Montage owns the top-right. Shelf keeps the toggle.
- **V8** — one module-level bards player (no second/overlapping track, never restarted when already playing) +
  `useMusicDuck(active)` to lower it (35 %, 300 ms glide).

## Needs someone else (REQUESTS.md)
- AD: V8 one line `useMusicDuck(montage)` in `app/(tabs)/storybook.tsx`; V3 same flicker pattern in ColoringPage;
  V5 optional `<HeaderMusicToggle />` in the reader top bar.
- EV: V1 server half (friendly error for missing/foreign fellowship — client already maps "Only members…"/"not found"
  to create/join); V2 UT book content + `geo_enforced=false` skip in submit-proof.
- Still not deployed from here: `wizard-chat` (unchanged this round).

## Known bugs / caveats
- Web dev build: "Unknown event handler property onStartShouldSetResponder…" console errors come from the Page tab
  (AD's SVG), not AB code; dev-only.
- After a 45 s timeout + "Keep exploring", a late server success isn't announced by the overlay (the book just appears
  via realtime). Intentional: no pop-ups the player didn't ask for.
- Leave fellowship is a no-op in mock mode (MP's mock), so the guard can only be exercised against real Supabase.

---

# Round 3 (previous)

## Done in Round 3 (all on feat/shell, typecheck clean, checked in mock mode on web at 390×844 / 375×667)
- **B4 keyboard — `components/shell/KeyboardSafe.tsx`** (pushed first so others can use it):
  `<KeyboardSafe>` pads by exactly the keyboard overlap (measures itself — no offsets; iOS frame-synced via reanimated,
  Android measures real overlap so edge-to-edge and adjustResize are both right), tap outside = dismiss.
  `<KeyboardSafeScroll>` scrolls the focused input above the keyboard. `useKeyboardVisible()`, `useKeyboardInset()`.
  Used in onboarding, mission detail, Settings editor, every `Sheet`, Sage's sheet + FAB. Usage note in REQUESTS.md.
- **B1 new-book crash:** root cause on the client = the sheet's `<Modal>` was swapped for a second ritual `<Modal>` in
  the same frame (iOS can't present while dismissing) AND the sheet lived inside a Missions branch that unmounted when
  the book flipped to `generating`. Now one host, `components/shell/NewBook.tsx` (`NewBookProvider` in the tabs layout,
  `useNewBook().openNewBook()/writeBook()`): never two Modals (ritual = in-tree overlay), one in-flight guard, host never
  unmounts, "Keep exploring" after 9 s. Ritual has no exit layout animations. Demo Tools writes through the same host.
  Tested Easy/Hard/Normal from Missions "…" (mock, web): no errors, lands on the new book.
- **B1 error boundary — `components/shell/ErrorBoundary.tsx`:** `AppErrorBoundary` around the root stack, route
  `ErrorBoundary` exports on (tabs) layout, mission detail and onboarding, and `installCrashNet()` (fatal JS errors
  outside render show the same "Something went awry — tap to recover" Sage screen instead of killing the app).
- **B5 FAB:** always mounted (fades, never remounts → never loses its spot), home bottom-right above the tab bar, free
  drag tucked to the nearest side, clamped on every layout change, position persisted as fractions
  (`qb.sage.fabPos.v2`). Hidden only while Sage's sheet/pill is up, the keyboard is up, or a FOCUSED screen calls
  `useHideWizardFab(true)` (was global → a background tab's montage hid Sage everywhere).
- **U4 reward pack — `components/shell/RewardPack.tsx`:** sealed card shakes → bursts (rays, sparkles, flash) → flips to
  your page with your region filling in your crayon → points count up → seal + story line. Layered haptics + sfx
  ('reward', 'crayon'), ~2.5 s, tap to skip. Page-complete auto-turn waits for it.
- **U5 spotlight tours — `components/wizard/CoachMark.tsx` + `coachTargets.tsx`:** dims + blurs (iOS) everything but the
  target and Sage's bubble, tap anywhere to continue, step dots. Tours in `screens.ts` (`COACH_TOURS`). Targets:
  `tab.<name>`, `sage.fab`, `missions.chapters|firstCard|leaders`, `settings.hero`, `music.header`. Anyone can add
  `<CoachTarget id>`. Never shows over Sage's sheet, Demo Tools or the writing ritual. Onboarding calmer: Sage still
  (no idle loop) between lines.
- **U6 music at the top:** `HeaderMusicToggle` (Missions, Settings, left of "…"); `FloatingMusicToggle` fallback on
  Page/Storybook that steps aside when a header renders one. Removed from the tab bar.
- **U7 sounds:** 9 new CC0 sfx (`assets/audio/synth_r3.py`): tap, toggle, open, close, send, success, error, reward,
  pageBack. `<Button sfx>` (default 'tap'). One sfx per action enforced in `playSfx` (soft tap/toggle drop when the
  action plays a real sound). Every tap in AB screens has its sound.
- **U8:** tab bar on parchment (no plain white). Screen backgrounds were already tinted / mood gradients.

## Needs someone else (REQUESTS.md)
- MP: `<HeaderMusicToggle />` in the Friends header (left of Invite); chat → `KeyboardSafe` or keep `useKeyboardLift`;
  chat Send → `playSfx('send')`.
- AD: B6 `playSfx('pageBack')`; optional `<HeaderMusicToggle />` on Page/Storybook.
- EV: B1 server half (status transitions on replace_active) is EV's.
- Still not deployed from here: `wizard-chat` (unchanged this round).

## Known bugs / caveats
- Web: `useAnimatedKeyboard` is native-only (warning in web console; KeyboardSafe is a no-op on web by design).
- Android spotlight panes dim without blur (expo-blur on Android needs a BlurTargetView around the content).
- Turning Sound effects ON doesn't click (the setting is off at the moment of the tap); turning it off does.

---

# Round 2 (previous)

## Done (all on feat/shell, typecheck clean, checked in mock mode on web at iPhone SE 375×667 and Pro Max 430×932)
- **P6 sound + Sage (built first):**
  - `components/shell/sfx.ts` → `playSfx('ping' | 'crayon' | 'page' | 'seal')` (preloaded expo-audio, low volume,
    honors Settings → Sound effects, never throws). Sounds are original + CC0: `assets/audio/` (+ `README.md`, `synth.py`).
  - `components/wizard/Sage.tsx` → `<Sage expression size variant="face|full" still speakKey silent />`, `<SageTitle />`
    ("Sage" + "✦ powered by Muse"), `speakOnce(key)`, `markSpoken(keys)`. Talk animation + ping once per NEW key.
  - `components/shell/soundSettings.ts` — Music + Sound effects (AsyncStorage, listeners).
- **A1 music:** `components/shell/music.tsx` (`<MusicController/>` in root layout: loops `bards-loop.mp3` at low volume,
  pauses in background; `useMusicToggle()` writes AsyncStorage + `profile.music_enabled`; `<MuteToggle/>` sits on the
  tab bar). Onboarding "Shall the bards play?" step; Settings → Sound.
- **A2–A5 onboarding:** debounced name reaction (700 ms idle or blur, only on a meaningful change); big labeled crayon
  swatches + live region preview + Sage says the color; fit-to-screen layout (Sage beside content, content centered,
  castle skyline only in leftover space); waiting-for-founder summon screen (realtime; "Summon it myself"); gate sends a
  `generating` book to the ritual.
- **A6:** mission detail "…" → "Ask Sage for a different mission" (`RerollSheet`, easier/similar/harder);
  `NewStorylineSheet` (difficulty + confirm, `replace_active`) from Missions "…" and Settings.
- **A7 GPS:** `components/shell/useProximity.ts` (permission, watch, haversine, "You're close!" within 400 m + accuracy
  slack, ft/mi distance, retry), lat/lng/accuracy_m sent on submit, distance shown on fail.
- **A8:** points via `components/shell/engine.ts` (`pointsFor`/`leaderboard` — uses EV's lib/game.ts exports as soon
  as they exist, identical fallback until then).
- **A9 Sage sheet:** pill / half / full (drag handle + buttons), history per fellowship in memory + AsyncStorage
  (`qb.sage.chat.<fid>`; greeting stored once; API only on send; replies type out once), flush on keyboard
  (`useAnimatedKeyboard`), tap outside = dismiss keyboard (or minimize).
- **A10 FAB:** Sage face, draggable, snaps to nearest corner (remembered), hidden while keyboard/sheet/pill is up or
  any screen calls `useHideWizardFab(true)`.
- **A11:** Demo Tools → "Start UT campus demo" (`demo:'ut'`, replace_active) + SerpApi counts from `useGenerationInfo`.
- **P7:** Missions chapter selector I · II · III (past chapters read-only, default active).
- **P8 / SIMPLIFY:** onboarding, Missions, mission detail (one pinned primary action, "…" menu), Settings (hero card +
  Invite friends, Leave in "…"), wizard sheet. Chunky game `Button` (press depth; AD re-exports it as InkButton),
  shared `Sheet` / `ActionMenu` with one radius + overflow hidden (no jagged corners), mood gradients per chapter.
- **MAPS:** every place tap (mission detail card + mission cards) → `openInMaps(place)`; `place.website` is a separate
  small "Website" link.
- **NAMING:** Sage everywhere in AB copy, incl. `wizard-chat` persona + app guide (reroll/new storyline/GPS/music).

## For teammates
- `playSfx`, `<Sage>`, `<SageTitle>`, `speakOnce` — see top. `useHideWizardFab(hidden)` from
  `components/wizard/WizardProvider` (AD: Storybook reader/montage — see REQUESTS.md).
- `<Button tone="gold|forest|swamp|lantern|primary">` for any gameButton face.

## Needs someone else
- **Deploy `wizard-chat`** (persona/guide changed): `npx supabase functions deploy wizard-chat --use-api`. My deploy
  attempt was blocked by this session's permission policy (production deploy), so it is NOT deployed from here.
- REQUESTS.md: AD `useHideWizardFab`, EV `rerollMission(..., difficulty)` + `pointsFor`, MERGE README audio credit.

## Next
- When EV's E2/E4/E6 land: nothing to change (adapters pick them up); drop the cast in `engine.ts` if desired.
- Optional polish: confetti on mission pass is left to AD's coloring celebration (one animation at a time).

## Known bugs / caveats
- Web preview: `useAnimatedKeyboard` reports 0 (sheet still works; keyboard flush is native-only by design).
- RN-web has no `Alert`; AB confirms use in-app sheets (Leave, New storyline). Demo Tools skips confirms on web.
