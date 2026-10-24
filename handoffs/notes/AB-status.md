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

## In progress / next
- Task 2 tabs + FAB.

## Known bugs
- none yet
