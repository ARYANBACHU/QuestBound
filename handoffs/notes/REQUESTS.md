# Cross-team requests (append only; the Merge Agent applies or rejects each round)

Format:
## [INITIALS] short title
- What: exact change (file + diff or new export)
- Why: which feature needs it
- Status: open

## [AD] lib/game.ts + lib/fellowship.ts: opt hooks out of React Compiler (mock staleness)
- What: add `'use no memo';` as the first statement of `lib/game.ts` (and `lib/fellowship.ts`, `lib/chat.ts`), OR make
  `mockStore` writes immutable (replace `mock.missions`/`mock.pages` arrays + row objects instead of `Object.assign`).
- Why: `app.json` has `experiments.reactCompiler: true`. The compiler memoizes `useStoryline`'s derived values
  (`[...mock.pages].sort(...)`, `activePage`) because they don't depend on props/state, so after `submitProof` completes a
  page in mock mode `activePage` stays on Chapter I forever. Rows mutated in place also skip re-renders in memoized children.
  AD works around it locally (recomputes activePage from `pages` + `'use no memo'` in AD files), but AB's Missions tab will
  hit the same bug.
- Status: open

## [AD] fixtures: 3–4 mock Memory rows + a recap for the Storybook demo
- What: in `fixtures/demo.ts` fill `MEMORIES` with photo memories for completed missions, e.g.
  `{ id: 'mem-1', fellowship_id: 'f-lantern', storyline_id: 's-1', page_id: 'p-1', mission_id: 'm-2', user_id: 'u-bram',
     image_url: 'https://picsum.photos/seed/questbound-bridge/900/1100', caption: null, kind: 'photo', created_at: now }`
  (also m-4 moon, m-1 coffeehouse once complete). Optionally have mock `submitProof` push a photo Memory when `proof_url` is set.
  Also: missions for p-2/p-3 so later chapters have regions to tap after the page turn.
- Why: Storybook tale entries + montage. AD already lends stock photos in mock mode when MEMORIES is empty
  (`components/storybook/bookData.ts#withDemoMemories`), so this is polish, not a blocker.
- Status: open

## [AD] lib/game.ts: `usePages(storylineId)` (+ missions) for older books
- What: `export function usePages(storylineId: string | null): { pages: Page[]; loading: boolean }` (ordered by chapter_number).
- Why: Storybook shelf/reader can only show pages of the CURRENT book today (`useStoryline` returns the latest one).
  After a sequel, Book I needs its pages + missions to render its cover and reader. AD falls back to a "shelved" note.
- Status: open
