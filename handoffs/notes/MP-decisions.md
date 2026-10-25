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

## Round 2
- **Keyboard: measure, don't guess.** `useKeyboardLift` pads by (view bottom in window − keyboard top). Works for any
  tab bar height, safe area, edge-to-edge Android, and adjustResize (overlap → 0). Chosen over KeyboardAvoidingView
  (offset depends on layout above it) and over reanimated `useAnimatedKeyboard` (deprecated in Reanimated 4).
- **No segment control.** SIMPLIFY: one focal point. The roster opens from the crests in the header; a "‹ Back to the
  chat" link returns. Chat stays the default.
- **Up next strip** is the "useful content before decoration": it is also the no-storyline state (M4), so a friend who
  joins early sees who they're waiting on and can summon.
- **Fresh = id baseline, not clock.** Device clocks drift from server `created_at`; baseline ids taken when the chat
  settles decide what animates/pings, and a `played` set stops replays when FlatList re-mounts rows.
- **One sound per batch.** A backfill of several messages plays one ping (Sage) or one seal (proclamations), not N.
- **Leaderboard ties share a rank and the crown.**
- **No overflow:hidden on cards with shadows** (it clips iOS shadows); only sheets/modals and clipped children use it.
- **Proclamation place** comes from the current book's missions (`missionsById`); older books' cards just don't show it.
