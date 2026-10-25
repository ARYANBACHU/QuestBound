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

## Round 2
- Sounds + music are synthesized from scratch (numpy → wav/mp3) so licensing is unambiguous (CC0, ours). Script kept
  in `assets/audio/synth.py`.
- Music respects the iOS silent switch and mixes with other audio (`playsInSilentMode: false`, `mixWithOthers`) —
  polite at a judging table. Default off until the player says yes in onboarding.
- Onboarding gains a `bards` step after `welcome` (`?step=` values: welcome | bards | name | crayon | interests |
  budget | fellowship | summon). Back is allowed until the profile is saved.
- "You're close!" uses 400 m (server default GEO_RADIUS_M) + min(accuracy, 150 m) slack, same as the server rule.
  Distances in ft/mi (Texas judges).
- Wizard sheet is an in-tree overlay (not a Modal) so the minimized pill can float over the app. Tapping outside
  first dismisses the keyboard; with no keyboard it minimizes (conversation kept) instead of closing.
- FAB top corners sit 76 px below the safe area so they never cover screen headers' "…" menus.
- Missions filters trimmed to All · Mine · Open · Done (the sections already group pairs/whole fellowship);
  the locked-chapters list is replaced by the chapter selector.
- Reroll/new-storyline live behind "…" menus per SIMPLIFY; the mission card's place chip opens Maps directly.
