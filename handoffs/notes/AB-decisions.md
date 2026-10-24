# AB decisions

- Gate adds a 4th branch: fellowship but no storyline → `/onboarding?step=summon` (so nobody lands on an empty page).
- Onboarding `?step=` values: `welcome | name | crayon | interests | budget | fellowship | summon`.
- Wizard actions are rendered as tappable chips under Muse's reply instead of auto-running (auto-navigation while
  the user is still reading felt jarring). Tapping closes the sheet and runs it.
- In mock mode, and whenever `wizard-chat` errors, the sheet answers with `components/wizard/localMuse.ts` — a small
  rules-based Muse that reads live hooks (missions, members' availability). Muse is never silent at the judging table.
- Friends badge counts proclamations after the last-seen message id (`qb.lastSeenMsg`). With no stored id, every
  proclamation counts as unread (first launch shows a badge — nudges judges to Friends).
- Demo Tools also has "Replay the summoning ritual" and "Restart onboarding" (sets `onboarded:false`).
- Muse FAB + coach marks only live on the tab screens (mission detail is a modal with its own Muse bubble).
