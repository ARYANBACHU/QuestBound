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

## Done — Round 3 (all pushed to feat/coloring, typecheck clean)
- B6 page-back sound: every flip (forward AND back) plays; page turns use a fresh one-shot player (AB's reused player
  goes silent on replay — root cause written up in REQUESTS). Back = 'pageBack' (page.wav at 0.86×) until AB's U7.
- B2 shelf labels from pages: "Chapter N of M · X colored" / "Finished ✦" / "Set aside · Chapter N of M"
  (`bookProgress()` in components/storybook/bookData.ts). Set-aside books end on Sage's bookmark recap (no sequel button,
  montage end card says "A bookmark, for now"). Coloring tab's "book done" also derives from pages.
- B3 montage: one clock (shared value = index + progress) drives timer AND bars; token-guarded advance (no double timers);
  5 s photos / 3 s titles; hold pauses (release never skips), tap left/right, swipe, swipe-down close, Play again.
  Crossfade without exiting animations.
- U1 coloring moment: crayon tip rides the scribble → waxy grain fill + darker pressed rim → gold ring + sparkles →
  light shimmer; mood wash + scenery deepen. Plaid hatch textures removed. Fills/page turns/book party wait until the
  Coloring tab is focused again (`paused` prop on ColoringPage), so you watch your color land after AB's reward.
- U3 Storybook: one chapter view — Muse painting hero (on-demand via `components/storybook/paint.ts`, "Sage is
  painting…"), colored-page thumbnail row (tap for full size), tale entries. "Illustration" toggle gone. New
  `MontageButton` / `MontageIcon` (reel from a book, italic label) in the reader header + recap.
- U2 art: redrew castle_gate, enchanted_forest, dragon_peak, royal_feast; new mermaid_lagoon, witch_cottage,
  beanstalk_sky, fairy_glen, ice_palace, pirate_cove, candy_village, starlit_tower. PageArt gained optional `scenery`
  (mood-tinted closed shapes under the regions). `validatePageArt()` = no problems for all 20 ids.
- U8: sheet, quote cards, locked pill moved off white to parchment; only the coloring page itself is white.

## Round 3 — open
- MP's 8 set-mp pages (troll_bridge, cloud_kingdom, crystal_cave, owl_library, rose_garden, lantern_festival,
  swamp_hollow, unicorn_meadow) are on feat/friends, NOT on main yet → still placeholder frames here. After they reach
  main: add one import per file to `assets/pages/index.ts` and the `DRAWN` map (see REQUESTS [AD → MERGE]).
- EV's `paintChapter` (G3) not landed: real mode shows the coloring page as hero until then (no AD change needed).
- Not yet tested on a physical phone in Expo Go (web preview only): check 60fps of the reveal on a low-end Android.

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
