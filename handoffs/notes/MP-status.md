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

## In progress
- Task 3 `lib/chat.ts`

## Next
- Task 4 friends tab, Task 5 invites/join

## Components for AB/AD (props)
_(filled in as they land)_

## Known bugs / notes
- Supabase dashboard: enable Anonymous sign-ins (Authentication → Providers).
