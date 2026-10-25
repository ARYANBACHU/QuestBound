# AB status (Wizard & Shell) — Round 2 + UI revamp

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
