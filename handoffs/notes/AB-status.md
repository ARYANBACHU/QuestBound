# AB status (Wizard & Shell)

## Done
- Task 1: fonts + splash + providers (`app/_layout.tsx`), gate (`app/index.tsx`).
  Gate: ensureSignedIn → !onboarded → `/onboarding` · no fellowship → `/onboarding?step=fellowship` ·
  no storyline → `/onboarding?step=summon` · else `/(tabs)/coloring`.

## For teammates
- **`<T variant="hero|title|heading|body|bodyBold|small|smallBold|story">` in `components/shell/T.tsx`** — use it
  instead of `<Text>` so Fraunces/Nunito apply. Props: `color`, `center`, plus all Text props.
- `components/shell/Button.tsx` — `<Button label variant="primary|secondary|ghost|danger" small icon loading />`.
- `components/shell/ParchmentLoading.tsx` — full-screen loader.

- Task 2: custom `TabBar` (inked SVG icons, crayon squiggle, Friends unread badge), Muse FAB (tap = sheet,
  long-press = Demo Tools), coach marks once per tab, `WizardSheet` chat client (Task 7 client side).
  `TAB_CONTENT_BOTTOM_PAD` (from `components/shell/TabBar.tsx`) — pad your tab's scroll content so the FAB
  doesn't cover it. `useWizard().open('question')` from any tab opens Muse and asks it.

- Task 3: onboarding (`app/onboarding.tsx`) with Muse bubble + typewriter, quill dots, crest/crayon/interest
  (with quips)/budget+availability pickers (reusable in `components/shell/`), fellowship found/join (QR + code),
  summon ritual (`components/wizard/SummonRitual.tsx`) with error → "write a quick demo book" fallback.
- Local fallbacks for teammates' components live in **`components/shell/teammates.tsx`** (Crest, CrestRow,
  InviteSheet, QrScanner, MissionTypeIcon). Swap to re-exports once MP/AD land on main.

- Task 4: Missions dashboard (header, 6-segment page progress in completers' crayons, points leaderboard,
  filters, Whole fellowship / Pairs / Solo sections, collapsed locked chapters), `MissionCard`, `StatusPill`.

## In progress / next
- Task 5 mission detail + proof.

## Known bugs
- none yet
