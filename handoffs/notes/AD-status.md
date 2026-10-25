# AD status (Artist — coloring page & storybook)

## Done — Round 1
- `MissionTypeIcon` (exports `MissionTypeIcon`, `MISSION_TYPE_LABEL`, `MissionTypeGlyph`, `HourglassGlyph`) — used by AB.
- 4 coloring pages in `assets/pages/` (`PAGE_ART`, `__DEV__` region-id assertion), `ColoringPage`, Coloring tab, Storybook
  (shelf → reader → recap → montage).

## Done — Round 2 (all pushed to feat/coloring, typecheck clean)
- NAMING: narrator is **Sage** everywhere in AD copy; Sage bubbles show "✦ powered by Muse". Sheets/modals: outer + edge
  children share radius with overflow hidden. Chunky game buttons (`InkButton` in `components/coloring/ui.tsx`, gameButton tokens) + `Chip`.
- D1 colorful pages: mood-gradient storybook frame on every page, chapter-mood screen backgrounds, mood spines on the shelf.
- D2 `ExpandableStory`: fade-out + "Read more ▾" / "Show less ▴" chip (native line count via onTextLayout, width estimate on web).
- D3 Montage = stories: animated segment bars, auto-advance, HOLD pauses, tap left/right, swipe sideways, swipe DOWN closes.
- D4 Bard verses: `VerseCard` (illuminated drop cap, gold rules, author crest) in the Storybook tale entries.
- D5 Storybook opens ANY book (current or shelved) via `usePages` — removed the "shelved book" workaround and the local activePage recompute.
- UI upgrade: `Celebration` (crayon-shaving confetti + gold sparkles) after page turns and when the book completes; Sage in blank,
  writing (thinking), loading, no-fellowship, empty shelf, The End, chapter ribbon, recap.
- SIMPLIFY: header = "Chapter I · Book" + title + one clamped line + crayon progress; `UpNext` card under the page; leaner mission sheet; calmer shelf.
- MAPS LINKS: mission sheet place → `openInMaps(place)`; `place.website` is a separate small "Website" link.
- P1 `PageFlip` (hinged on the spine, lifts from the right edge, light + cast shadow, heavy haptic, page sfx): automatic page
  turns, chapter arrows/dots/horizontal swipe on the Coloring tab, and the Storybook reader (arrows/dots/swipe). `CoverSwing`: the cover swings open from the shelf.
- P2 scribble reveal: crayon strokes sweep across the region (dash offset) then settle into the textured fill + sparkle, ~1.2 s,
  `playSfx('crayon')` + success haptic; reduced motion = instant color.
- P3 100% coloring: sky/ground behind regions gets a textured mood wash (opacity = colored/6, full at 6/6); frame color runs to the paper edge.
- P4 past chapters: a finished chapter shows "The tale of this chapter" (every mission, crests, story line); taps open the read-only sheet.
- P5 revamp polish; checked iPhone SE (375×667) + Pro Max (430×932) on web preview.

## Local stand-ins (one-line swaps, listed in REQUESTS.md)
- `components/storybook/useStoryData.ts` → EV's `usePages` / `useCompletions` (on feat/engine, compatible).
- `components/coloring/sage.tsx` (`Sage` placeholder + AD's `SageSays`) → AB's `components/wizard/Sage.tsx` (on feat/shell, compatible).
- `components/coloring/sfx.ts` (no-op) → AB's `components/shell/sfx.ts` (on feat/shell, compatible).

## Next
- After the merge agent lands EV/AB on main: do the three swaps, re-test page flip + scribble on a real phone (Expo Go).
- Montage music; share a finished page as an image.

## Known issues
- AB's wizard FAB covers the Storybook reader's "next" arrow until AB's A10 (auto-hide on reader/montage) lands. Swipe still works.
- Commit 9bfbcbe has the message "x" (pushed by mistake from my push script); its contents are described in 842903d. Not rewritten (no force-push).
- Web preview tip: run Metro WITHOUT `CI=1` (CI mode disables file watching → stale bundles). react-native-svg logs harmless
  "Unknown event handler" errors on web.
