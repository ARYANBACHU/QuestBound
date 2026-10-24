# MP decisions

- **No SessionProvider.** session/fellowship/chat each use a module-level store + `useSyncExternalStore`, so every
  component shares state without touching `app/_layout.tsx`.
- **Mock hooks opt out of the React Compiler** (`'use no memo'`) and return fresh objects each render, because the
  mock store mutates in place and `reactCompiler: true` would otherwise cache stale reads.
- **Deferred join announcement.** Joining via deep link happens before onboarding, so "X joined the fellowship!"
  waits until `updateProfile({ onboarded: true })` (stored in AsyncStorage `qb.pendingJoinAnnounce`) — otherwise
  the whole group sees "Wanderer the Owl joined".
- **Member list refreshes when chat sees a system line** (or a message from an unknown user). Covers profile changes
  until `profiles` is added to the realtime publication (REQUESTS.md).
- **System messages name heroes as "Name the Crest"** (`heroName()`), e.g. "Dax the Wolf joined the fellowship!".
- **Proclamation seal** shows the actor's crest for mission/member events and an event glyph otherwise
  (📜 new tale, 📖 page done, 👑 book done). It stamps in (spring zoom) only for proclamations that arrive while
  the chat is open — no looping motion.
- **Area label** is "City, ST" — US state names are mapped to postal codes (Android returns full names).
- **Haptics never throw** (`components/friends/haptics.ts`); calls run after the action so a missing haptics API
  can't swallow a send.
- **Invite code input** accepts a full `questbound://join/CODE` link, spaces, lowercase.
