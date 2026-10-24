# MP status (Fellowship & Friends · feat/friends)

## Done
- Task 1: `lib/session.ts` real branch — anonymous sign-in, profile load/upsert, optimistic `updateProfile`.
  Shared module-level store + `useSyncExternalStore` → **no provider needed** in `app/_layout.tsx`.
  Extra export: `sessionStore` (non-hook `get/subscribe/ensureSignedIn/refresh`) for lib code.

## In progress
- Task 2 `lib/fellowship.ts`

## Next
- Task 3 chat, Task 4 friends tab, Task 5 invites/join

## Components for AB/AD (props)
_(filled in as they land)_

## Known bugs / notes
- Supabase dashboard: enable Anonymous sign-ins (Authentication → Providers).
