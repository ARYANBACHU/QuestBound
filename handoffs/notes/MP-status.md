# MP status (Fellowship & Friends · feat/friends)

## Round 3 — done (all MP items: B4, U8, U2)
- **B4 keyboard** (`components/friends/KeyboardSafe.tsx`, default export `{ children, style?, extra?, onKeyboardChange? }` +
  `useKeyboardVisible()`): Reanimated `useAnimatedKeyboard` (UI thread, frame-synced, iOS interactive dismiss) pads the
  view by exactly the part the keyboard covers: `max(0, viewBottom − (screenBottom − kbHeight))`. Tab bar / home
  indicator below the view → smaller lift; tab bar hiding → onLayout re-measures; Android resizing anyway → 0 (no
  double lift). Used by the chat (`ChatView`) and the join-code error screen. Tap the list or the header/Up next area to
  dismiss; ⌄ button while typing. Old `useKeyboardLift.ts` deleted.
  - **Swap when AB's lands on main:** AB's `components/shell/KeyboardSafe.tsx` is on feat/shell (named export
    `KeyboardSafe`, props `offset`, `dismissOnTap`, `enabled`; plus `useKeyboardVisible`). To swap: in ChatView use
    `<KeyboardSafe dismissOnTap={false}>` (the list already dismisses on tap) and replace `onKeyboardChange` with AB's
    `useKeyboardVisible()`; in `app/join/[code].tsx` use `<KeyboardSafe>` (drop my Pressable). Then delete mine.
- **U8 backgrounds**: no plain white in MP UI. Bubbles, day pills, composer input, reactions, toast, crest discs →
  `panel.parchment`; composer bar = chapter mood tint (`ChatView` new optional prop `surface`) over the mood
  gradient. The invite QR stays white (scan contrast).
- **U2 art**: 8 pages in `assets/pages/set-mp/` — troll_bridge, cloud_kingdom, crystal_cave, owl_library, rose_garden,
  lantern_festival, swamp_hollow, unicorn_meadow — AD's PageArt format, region ids exactly `shared/templates.ts`.
  Barrel `set-mp/index.ts` exports `SET_MP`. **AD wires it** (REQUESTS.md): `import { SET_MP } from './set-mp'` and
  spread into DRAWN in `assets/pages/index.ts` (verified: typechecks, validatePageArt passes). Checked: all 48 ids
  match, every labelAt is inside its region (browser isPointInFill), no NaN paths. Contact sheet rendered offline.

## Known bugs / notes (round 3)
- Keyboard fix can't be device-tested from the cloud sandbox; logic mirrors AB's approach (both measure the covered
  part). If Android shows a gap, check `useSafeAreaFrame()` vs `measureInWindow` origin on that device.
- Pages haven't been seen inside AD's ColoringPage yet (not wired on this branch); format is identical to AD's pages.

## Round 2 — done (all MP items + NAMING, SIMPLIFY, MAPS LINKS)
- **NAMING**: every "Muse" in MP copy → "Sage"; Sage messages show "Sage  ✦ powered by Muse" (chat + toast).
  Sheets/modals: outer radius `ui.cardRadius` + `overflow:'hidden'`. `textOn()` uses theme `ON_CRAYON` (AA).
- **M1 chat keyboard**: `components/friends/useKeyboardLift.ts` measures the chat view in window coords vs the keyboard
  top → bottom padding (no KeyboardAvoidingView offset guessing; tab bar/safe area/edge-to-edge all handled). Jumps to
  newest on keyboard open + on my send; tap the list or the ⌄ button to hide the keyboard; interactive dismiss on iOS.
- **M2**: Sage avatar + name + credit on wizard messages.
- **M3**: points via `pointsFor`/`leaderboard` (see adapters below); reactions use the real `message_reactions` table
  only (local-only fallback removed, resync on reconnect, revert on error); profiles + fellowships realtime (row
  catch-up on reconnect).
- **M4**: Friends tab works with no storyline. New `UpNext` strip: blank book → "Waiting for <founder> to summon the
  story… or summon it yourself" (→ Missions tab, AB's gate), "Sage is writing", next mission for me (Go + Open in
  Maps), "Sage is weighing your proof", book finished → Storybook. Null-safe mission arrays everywhere.
- **P9**: new Sage messages in chat do a one-shot ~600 ms talk bob (`SageTalk.tsx`, reduced-motion aware) + `playSfx('ping')`;
  fresh proclamations stamp + `playSfx('seal')`. "Fresh" = not in the id baseline taken when the chat opened/loaded —
  never replays on reopen, re-render or scroll-back.
- **P10 / SIMPLIFY**: chat is the hero. Header = fellowship name + crests ("2 here now ›" → roster) + Invite game button.
  Mood gradient background (`SCREEN_GRADIENTS[moodFor(activePage.template_id)]`). Segment control removed; roster opens
  from the crests (ranked by points, ties share a rank/crown, details in MemberSheet). Proclamation cards: parchment
  panel, crayon left edge, gold crest seal, Fraunces italic, accent CTA (no label/dashes/rotation). Sage in every
  empty/loading/error state (Friends, chat, join, QR denied, invite). `GameButton.tsx` (chunky, press-depth).
- **MAPS LINKS**: every place tap → `openInMaps(place)` (proclamation cards for mission_complete, Up next, MemberSheet
  regions). `place.website` only as a separate small "Website" link on proclamation cards.

## Local adapters to swap when teammates land (one-line changes)
- `components/friends/sage.tsx` → `export { default as Sage } from '@/components/wizard/Sage'` and
  `export { playSfx } from '@/components/shell/sfx'` once AB's files reach main (check the export style: default vs named).
  Placeholder Sage = 🧙 in a round badge sized by `SAGE_SIZES`; playSfx = no-op.
- `components/friends/points.ts` → `export { pointsFor, leaderboard } from '@/lib/game'` once EV's E4 lands
  (REQUESTS.md entry). If EV's leaderboard row shape differs, adapt `MembersView` (uses user_id/points/missions).

## Components for AB/AD (props) — all in `components/friends/`
- Unchanged contracts: `Crest`, `CrestRow`, `InviteSheet`/`InviteCard`, `QrScanner`/`parseInviteCode`, `ProclamationToast`, `color.ts`.
- New: `GameButton` `{ label, onPress?, tone?: GameButtonTone ('primary'), size?: 'md'|'sm', disabled?, loading?, style? }`.
- New: `UpNext` + `nextMissionFor(myId, activePage, missions)`.
- `ProclamationCard` gained optional `mission?` (shows place) and `onPlayed?`. `ChatView` gained optional `missionsById?`.
- Removed: `SegmentControl` (nobody else imported it).

## Known bugs / notes
- Web preview only: the fellowship name truncates (adjustsFontSizeToFit is native-only) and the multiline composer is tall.
- AB's tabs layout lifts the FAB by a fixed 92 px on Friends; with the composer now on the keyboard, AB's A10
  (hide FAB while keyboard is open) covers the rest.
- Supabase dashboard: enable Anonymous sign-ins (Authentication → Providers).

---

# Round 1 status (kept for reference)

## Done
- Task 1: `lib/session.ts` real branch — anonymous sign-in, profile load/upsert, optimistic `updateProfile`.
  Shared module-level store + `useSyncExternalStore` → **no provider needed** in `app/_layout.tsx`.
  Extra export: `sessionStore` (non-hook `get/subscribe/ensureSignedIn/refresh`) for lib code.

- Task 2: `lib/fellowship.ts` real branch — active id in AsyncStorage `qb.activeFellowship` (falls back to first
  membership), create (location → "City, ST" or DEFAULT_LOCATION), joinByCode, leave, live members via Realtime.
  Extra exports: `heroName(profile)` → "Aria the Fox", `normalizeInviteCode(raw)` (accepts `questbound://join/X`
  links too), `fellowshipStore` (non-hook get/subscribe/reloadMembers).
  - If a user joins BEFORE onboarding (deep link), the "X joined the fellowship!" line is deferred until
    `updateProfile({ onboarded: true })` so it shows their real name + crest.

- Task 3: `lib/chat.ts` real branch — last 100 messages, realtime INSERT (dedupe + swaps optimistic), optimistic
  send with `status: 'sending' | 'failed'` on each `ChatMessage`, Presence on `presence:<fellowshipId>`, typing via
  broadcast `typing` (3 s TTL). Backfills on reconnect.
  Extra return fields on `useChat(id)`: `online: Set<string>`, `typingUserIds`, `notifyTyping()`, `retry(id)`,
  `discard(id)`, `error`. Use `useChat(fellowship.id).online` anywhere you want online dots (shared channel).

- Task 4: Friends tab — header (name, area, CrestRow w/ online dots, Invite), Chat | Fellowship segments,
  inverted chat with my crayon bubbles, their crest + name on run start, proclamation scroll cards (gold seal,
  crayon stripe, Fraunces italic, tap → mission/coloring/storybook, seal stamps in when it arrives live),
  system lines, Muse bubbles, day separators, typing line, failed-send retry. Fellowship view: member cards
  with crest, crayon, interests, missions colored + points (via `useStoryline`/`useMissions`), founder badge.
  No-fellowship state routes to `/onboarding?step=fellowship`.

## In progress
- Task 5 `app/join/[code].tsx`

## Next
- Task 4 friends tab, Task 5 invites/join

## Components for AB/AD (props) — all in `components/friends/`, default exports
- `ProclamationToast` — `<ProclamationToast />`, no props; mount once in the tabs layout.
- `Crest` — `<Crest crest={p.crest} color={p.color} size={40} ring? (default true) online? filled? style? />`.
  Also `crestEmoji(crestId)`.
- `CrestRow` — `<CrestRow userIds={ids} members={members} size={24} max={5} online?={Set} style? />` (+N chip).
- `InviteSheet` — `<InviteSheet visible onClose fellowship?={f} title?="Summon your friends" />` (modal; defaults to
  active fellowship). Named export `InviteCard` `{ fellowship?, qrSize?=200, style? }` = same content inline, for
  the onboarding "Summon your friends" step. `inviteLink(code)` → `questbound://join/CODE`.
- `QrScanner` — `<QrScanner onCode={(code) => …} onCancel?={…} onTypeCode?={…} hint?={errorText} />`, full-screen.
  Fires `onCode` once per mount — after a failed `joinByCode`, re-mount with a new `key` and pass the error as
  `hint`. Named export `parseInviteCode(data)`.
- `color.ts` — `crayonHex(color)`, `textOn(color)` (white vs ink text on a crayon), `withAlpha(hex, a)`.

## Known bugs / notes
- Supabase dashboard: enable Anonymous sign-ins (Authentication → Providers).
