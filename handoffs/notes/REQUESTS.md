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
