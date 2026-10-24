# MP status (Fellowship & Friends · feat/friends)

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

## In progress
- Task 4 Friends tab + Crest/CrestRow

## Next
- Task 4 friends tab, Task 5 invites/join

## Components for AB/AD (props) — all in `components/friends/`, default exports
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
