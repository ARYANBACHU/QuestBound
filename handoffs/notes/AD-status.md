# AD status (Artist — coloring page & storybook)

## Done
- `components/coloring/MissionTypeIcon.tsx` — READY for AB.
  - `import { MissionTypeIcon } from '@/components/coloring/MissionTypeIcon'` → `<MissionTypeIcon type={mission.type} size={24} color? />`
  - Also exports `MISSION_TYPE_LABEL` (display names), `MissionTypeGlyph` (raw 24×24 group for use inside an existing `<Svg>`), `HourglassGlyph`.
- Task 1: `assets/pages/` — 4 pages (`PAGE_ART`), shared helpers in `shapes.ts`, `__DEV__` assertion that region ids == `shared/templates.ts`.
  Regions use the nonzero fill rule; holes (castle gate/banners, owl in the tree) are drawn counter-clockwise.
- Task 2: `components/coloring/ColoringPage.tsx` — READY for AB (onboarding mini):
  `<ColoringPage templateId missions members onRegionPress? highlightRegionId? interactive? locked? width? animate? />`
  open (stitched edge + type glyph) / pending (25% wash + hourglass) / complete (crayon fill + texture + teammate stripes) /
  locked. Fill reveal (900 ms growing clip circle) + gold sparkle + success haptic when a mission flips to complete while mounted.
- Task 3: `app/(tabs)/coloring.tsx` — header + crayon-stub progress, mission bottom sheet (place → Google Maps, crests,
  story line when colored, "Open mission" → `/mission/<id>`), chapter dots/arrows, locked page silhouette, page turn
  (hold for last fill → Y-rotation around left edge 1100 ms + heavy haptic → chapter ribbon 2 s), blank book / Muse writing /
  "The End… for now" states. Mock-only dev link "Dev: color a random region" (calls `submitProof`).

## In progress
- Task 4 storybook

## Notes / decisions
- React Compiler is on (app.json). Mock store mutates rows in place, so AD files start with `'use no memo'` and the coloring
  tab recomputes `activePage` from `pages`. Filed in REQUESTS.md for EV.
- Web preview: `web.output: "server"` SSR crashes on supabase (`window is not defined`). I preview locally with a
  git-excluded `app.config.js` that sets `web.output: 'single'`. Native (Expo Go) is unaffected.
- On web, react-native-svg logs "Unknown event handler" for responder props on `<Path onPress>` — harmless.
- Local `components/coloring/Crests.tsx` + `ui.tsx` stand in for MP's `Crest` and AB's `Button`/`T` until they land on main.

## Known bugs
- Mock fixtures only have missions for Chapter I, so later chapters show empty regions (no glyphs) in mock mode.
