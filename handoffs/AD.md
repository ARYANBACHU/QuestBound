# AD — Artist: Coloring Page & Storybook · branch `feat/coloring`

## Paste this into Claude Code to start
> Read `CLAUDE.md` and `handoffs/AD.md` completely. You are the Artist agent for Questbound and you have full
> authority over the paths AD owns — make decisions without asking me. Follow the git protocol in CLAUDE.md §3
> exactly: switch to `feat/coloring`, merge `origin/main`, and **commit + push to `feat/coloring` after every task
> and at least every 20 minutes**. Work through the tasks in AD.md in order. Keep `handoffs/notes/AD-status.md`
> updated. Never edit files you don't own; put cross-team needs in `handoffs/notes/REQUESTS.md`. Start now with Task 1.

---

## Your role
You own the **signature moment** of the whole app: a fairy-tale coloring page where every region is a mission,
and completing it fills that region with the player's crayon color. You also own the **Storybook**: finished pages,
photos merged with story art, the recap, and the montage. Judges should go "ohhh" when a region fills and when a
page turns. Most Entertaining lives or dies on your screens.

**You own:** `app/(tabs)/coloring.tsx`, `app/(tabs)/storybook.tsx`, `components/coloring/**`,
`components/storybook/**`, `assets/pages/**`.

**You consume (don't edit):** `useStoryline`, `useMissions`, `useMemories`, `useBooks` from `lib/game.ts` (EV);
`useFellowship`, `profileOf` from `lib/fellowship.ts` (MP); `Crest` from `components/friends/Crest.tsx` (MP —
until it exists, render `CRESTS[id].emoji` in a circle locally); `TEMPLATES` from `shared/templates.ts`;
tokens from `shared/theme.ts`. Everything works in mock mode right now: `EXPO_PUBLIC_USE_MOCKS=1`.

**You export for others:**
- `components/coloring/MissionTypeIcon.tsx` — `<MissionTypeIcon type={mission.type} size={24} />` (AB uses it on
  the Missions dashboard). One consistent hand-drawn-ink icon per type: gathering (round table / three figures),
  duet (two linked rings), relic (gem), bard (quill), trial (scroll with ?), gift (wrapped box). Draw with
  `react-native-svg` paths in ink color. Build this FIRST (15 min) and note it in `AD-status.md`.
- `components/coloring/ColoringPage.tsx` (AB may embed a mini version on onboarding's last step).

---

## Task 1 — Page art: 4 SVG coloring pages (`assets/pages/`)
Format (create `assets/pages/types.ts`):
```ts
import type { TemplateId } from '@/shared/templates';
export interface RegionArt { d: string; labelAt: [number, number] } // closed SVG path(s) in viewBox units
export interface PageArt {
  viewBox: '0 0 1000 1400';           // portrait, phone-shaped
  regions: Record<string, RegionArt>;  // keys MUST equal TEMPLATES[id].regions[].id — every one, no extras
  ink: string[];                       // decorative, non-interactive line art drawn ON TOP (outlines, details, border)
  background?: string[];               // optional faint paper texture / ground lines (drawn under regions)
}
```
Files: `castle_gate.ts`, `enchanted_forest.ts`, `dragon_peak.ts`, `royal_feast.ts`, and `index.ts` exporting
`PAGE_ART: Record<TemplateId, PageArt>`. Add a dev-only assertion in `index.ts` that every template's region ids
exist in its art (throw in `__DEV__` if not) — EV's engine only uses region ids from `shared/templates.ts`.

**Art direction:** classic coloring-book line art. Bold, rounded shapes; thick ink outlines (`INK_STROKE` = 9);
no tiny fiddly regions (smallest region ≥ ~120×120 viewBox units so it's tappable); large regions are big and
central (castle, great tree, dragon, feast table ≈ 25–35% of the page); medium ≈ 10–15%; small ≈ 4–8%.
Compose each page as a scene with a decorative frame border in `ink` (a storybook frame with corner flourishes).
Regions should not overlap (touching is fine). Author paths using simple primitives converted to path commands
(rects with rounded corners, arcs, quadratic curves). Iterate visually: render the page in the app with region
fills set to random crayons + labels, run `npx expo start --web` locally (or check on phone), screenshot, fix.
Spend at most ~75 min total on art in Round 1 — good enough beats perfect; polish in Round 2.

## Task 2 — `ColoringPage` component
`<ColoringPage templateId missions members onRegionPress(missionId, regionId) highlightRegionId? interactive? />`
- `Svg` with `viewBox` from art, width = screen width − 2×lg, aspect 1000:1400.
- Draw order: `background` → regions → `ink` (ink on top so lines stay crisp over color).
- Region states (from the mission at that region):
  - `locked` (future page) — paper white, ink outline, 40% opacity overall.
  - `open` — white with a faint **dotted ink stroke** inside the edge + a tiny type glyph at `labelAt`
    (MissionTypeIcon at 36 units). Tappable.
  - `pending` (gift waiting) — 25% wash of the giver's color + small hourglass at `labelAt`.
  - `complete` — **crayon fill**: base fill = completer's crayon at 85% opacity + an SVG `<Pattern>` of diagonal
    strokes (same color, darker, 35% opacity, slightly irregular stroke widths) laid over it to read as crayon
    texture. If multiple participants, use the first participant's color for the fill and draw 4 px stripes of the
    others' colors along the inner edge (it shows teamwork at a glance).
- **Fill animation (THE moment):** when a mission transitions to `complete` while mounted, animate a circular
  `ClipPath` growing from the region's `labelAt` (or last tap point) to cover the region over 900 ms with
  `Easing.out(Easing.cubic)` (`react-native-reanimated` + `Animated.createAnimatedComponent(Circle)`), then a quick
  gold sparkle burst (6–8 small star paths scaling out and fading, 500 ms), plus `Haptics.notificationAsync(Success)`.
  Detect transitions by keeping the previous missions' statuses in a ref.
- Tap feedback: pressed region scales 0.98 / brightens; `onRegionPress`.
- Accessibility: each region has `accessibilityLabel` = "<region label>: <mission title>, <status>".

## Task 3 — Coloring tab `app/(tabs)/coloring.tsx`
- Data: `const { fellowship, members } = useFellowship(); const { storyline, pages, activePage } = useStoryline(fellowship?.id ?? null); const { missions } = useMissions(storyline?.id ?? null);`
- Header: book title (small, muted) → **chapter title** in Fraunces title size → narrative in Fraunces italic
  (max 3 lines, tap to expand) → progress: a row of 6 small crayon-stub pills, filled with the completer's color per
  completed region ("4 of 6 colored").
- The `ColoringPage` for `activePage`.
- Tapping a region opens a **bottom sheet** (simple `Modal` w/ slide or reanimated sheet): MissionTypeIcon + type
  name, mission title (Fraunces), story_hook (italic), description, place chip (title + address; tap → open
  `https://maps.google.com/?q=<encoded title address>` with `Linking`), required members ("Needs 2 heroes"), who's
  assigned (CrestRow), status. Primary button "Open mission" → `router.push('/mission/' + id)` (AB's screen).
  Completed: show the `story_line` in italic + completers' crests instead of the button.
- **Chapter navigation:** small arrows/dots to view previous complete pages (read-only) and locked future pages
  (silhouette + "Unlocks when Chapter N is colored").
- **Page turn:** when `activePage.id` changes because the previous page completed, play a page-turn: current page
  rotates on the Y axis around its left edge (perspective 1200, 0→−180°, 1100 ms) revealing the next page beneath;
  heavy haptic; then a ribbon banner "Chapter II · Whispers in the Wood" slides in for 2 s.
- States: no storyline → empty page frame with Muse line "Your book is blank. Summon a story to begin." and a button
  that calls `generateStoryline({ fellowship_id, mode: 'first' })` (from `lib/api.ts`); storyline `generating` → a
  "Muse is writing your book…" ritual (quill drawing an ink line across the page, looping is OK here only);
  book complete → banner "The End… for now" with buttons "Open the Storybook" and "Summon the next book"
  (`mode: 'sequel'`).

## Task 4 — Storybook tab `app/(tabs)/storybook.tsx`
1. **Shelf:** `useBooks(fid)` → each book as a spine/cover card: title in Fraunces, book number ("Book II"),
   cover = the first page rendered small with its colors (reuse `ColoringPage` non-interactive), progress or
   "Complete". Tap → reader.
2. **Reader** (`components/storybook/BookReader.tsx`): horizontal paging `FlatList`, one page per chapter:
   - Top: chapter title + narrative.
   - The colored page (non-interactive) OR, when `illustration_url` exists, a toggle "Coloring | Illustration"
     showing Muse Image's painting of the chapter.
   - **Your photos merged with the story:** for each completed mission in order, a "tale entry": photo (from
     `useMemories` matched by `mission_id`) in a deckled-edge frame (SVG mask or border image) rotated ±2°, with the
     `story_line` underneath in Fraunces italic, and completers' crests. Text-only missions show the text in a quote
     style. This is the "pictures merged with the fairy tale" tab — make it feel like a scrapbook storybook.
3. **Recap** (last page when `storyline.status === 'complete'`): `recap.summary`, stats row (missions, photos,
   places, heroes), `per_member` titles ("Aria the Bold — colored the moon and the castle"), highlights list, and
   `next_book_hint` teaser with "Summon the next book" button.
4. **Montage** (`components/storybook/Montage.tsx`): full-screen player — a sequence of all memories (photos +
   illustrations) for the book, 3 s each, slow Ken Burns (scale 1→1.08 + small translate), crossfade, caption =
   story_line at the bottom in Fraunces italic over a soft gradient, chapter title cards between chapters, ends on
   the recap title card. Tap to pause, swipe to skip, close button. Button "Play montage" on the reader + recap.

## Acceptance checklist
- [ ] All 4 pages render cleanly on a small phone (iPhone SE width) and large phone; regions tappable.
- [ ] In mock mode, submitting a proof (AB's screen or temporarily calling `submitProof` from a dev button) animates
      the region fill + sparkle + haptic; finishing all 6 turns the page.
- [ ] Storybook shows shelf → reader with photos + story lines → recap → montage (use mock memories: add 3–4
      `Memory` entries with Unsplash-like public image URLs via REQUESTS to EV, or local placeholder images).
- [ ] No hard-coded colors outside `shared/theme.ts` (except per-art grays defined in your art files).

## Round 2 backlog
1. Art polish + 2 more templates (requires a `shared/templates.ts` change via REQUESTS).
2. "Paint with friends": while a region is being verified, show the submitter's crayon scribbling on it (pending shimmer).
3. Share a finished page as an image (`react-native-view-shot` is not in Expo Go — use `Svg.toDataURL` → `expo-sharing`).
4. Segment Anything stretch: let Muse Image generate custom line art and segment it into regions (only if everything else is done).
5. Montage music (`expo-av` soft lute loop) + export.

## Git reminder
`npm run typecheck && git add -A && git commit -m "[AD] …" && git push origin HEAD:feat/coloring` — after every task.
