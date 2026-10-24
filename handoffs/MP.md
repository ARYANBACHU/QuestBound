# MP — Fellowship & Friends · branch `feat/friends`

## Paste this into Claude Code to start
> Read `CLAUDE.md` and `handoffs/MP.md` completely. You are the Fellowship agent for Questbound and you have
> full authority over the paths MP owns — make decisions without asking me. Follow the git protocol in
> CLAUDE.md §3 exactly: switch to `feat/friends`, merge `origin/main`, and **commit + push to `feat/friends`
> after every task and at least every 20 minutes**. Work through the tasks in MP.md in order. Keep
> `handoffs/notes/MP-status.md` updated. Never edit files you don't own; put cross-team needs in
> `handoffs/notes/REQUESTS.md`. Start now with Task 1.

---

## Your role
You make it **social**: identity, the fellowship, inviting friends, and the **group chat** where every mission
completion shows up as a proclamation. This is the heart of our Meta "Bringing People Closer Together" pitch —
the chat should feel like a group chat friends would actually use, with the story woven into it.

**You own:** `lib/session.ts`, `lib/fellowship.ts`, `lib/chat.ts`, `app/(tabs)/friends.tsx`, `app/join/**`,
`components/friends/**`.

**Consumers of your work:** AB (onboarding calls `useSession().ensureSignedIn/updateProfile`,
`useFellowship().createFellowship/joinByCode`; settings shows invite code + leave), AD + AB render crests/colors via
`useFellowship().members` + `profileOf()`, EV's functions insert proclamations you render.

**Contract:** export names and return shapes in `lib/session.ts`, `lib/fellowship.ts`, `lib/chat.ts` are fixed.
Keep the mock branches working; add real branches.

**Export these components for others (put in `components/friends/`):**
- `Crest.tsx` — `<Crest crest={profile.crest} color={profile.color} size={40} ring?: boolean online?: boolean />`
  (emoji inside a circle with a thick crayon-colored ring; small green dot when online). AB and AD will import it.
- `CrestRow.tsx` — `<CrestRow userIds={[...]} members={members} size={24} max={5} />` overlapping crests (+N).
- `InviteSheet.tsx` — QR + code + share/copy buttons.
- `QrScanner.tsx` — full-screen camera scanner that calls `onCode(code: string)`.
Write the props down in `handoffs/notes/MP-status.md` the moment each exists, so AB/AD can import them.

---

## Task 1 — `lib/session.ts` (real auth + profile)
Supabase dashboard must have **Anonymous sign-ins enabled** (Authentication → Providers). Implement:
- On first `useSession()` mount: `supabase.auth.getSession()`; subscribe `onAuthStateChange`.
- `ensureSignedIn()`: if no session → `supabase.auth.signInAnonymously()`; return user id. Profile row is created by
  DB trigger; if it's missing after sign-in, upsert `{ id }`.
- Load `profiles` row for the user; `updateProfile(patch)` → `update ... eq('id', uid)` then refresh local state.
  Optimistic update so onboarding feels instant.
- Share state across components: implement with a tiny module-level store + `useSyncExternalStore` (or a React
  context `SessionProvider` exported from `lib/session.ts` — if you choose a provider, add the request in
  `REQUESTS.md` so AB wraps `app/_layout.tsx` with it).

## Task 2 — `lib/fellowship.ts`
- Active fellowship id persisted in AsyncStorage key `qb.activeFellowship`. If missing, pick the user's first
  membership (`fellowship_members` where `user_id = uid`).
- `createFellowship(name)`: request location permission (`expo-location`, `requestForegroundPermissionsAsync`); if
  granted get coords + `reverseGeocodeAsync` → `area_label` "City, ST"; else `DEFAULT_LOCATION`. Insert
  `fellowships` (`created_by=uid`) → insert `fellowship_members` (`role='founder'`) → store active id → insert system
  message "<name> founded the fellowship." Return the row.
- `joinByCode(code)`: uppercase + trim; select fellowship by `invite_code`; if not found throw
  `Error("No fellowship has that code. Check the letters and try again.")`; insert membership (ignore duplicate);
  set active; insert a `system` message with payload `{event:'member_joined', user_id}` and body
  "<display_name> the <crest> joined the fellowship!". Return it.
- `members`: select memberships + join profiles (`select('*, profile:profiles(*)')`); subscribe to
  `fellowship_members` changes (filter `fellowship_id`) and to `profiles` updates for those ids if cheap — at
  minimum refresh on member join.
- `leave()`: delete own membership, clear active id.

## Task 3 — `lib/chat.ts` (realtime chat)
- Load last 100 messages for the fellowship ordered ascending.
- Subscribe `postgres_changes` INSERT on `messages` with `filter: fellowship_id=eq.<id>`; append (dedupe by id).
- `send(body)`: trim; ignore empty; optimistic append with temp id; insert `{fellowship_id, user_id: uid, kind:'text', body}`;
  replace temp on success, mark failed on error (show retry).
- Presence: channel `presence:<fellowshipId>`; `track({ user_id })`; expose `online: Set<string>` — add it as an
  **extra** field on the return (adding fields is allowed; removing/renaming is not). Same for `typingUserIds` if
  you do typing indicators (broadcast event `typing`, 3 s expiry).

## Task 4 — Friends tab `app/(tabs)/friends.tsx`
Layout (top → bottom):
1. **Fellowship header:** fellowship name in Fraunces (title size), area label, `CrestRow` of members with online
   dots, an **Invite** button (opens `InviteSheet`).
2. **Segment control:** `Chat` | `Fellowship`.
3. **Chat view** (default):
   - Inverted `FlatList`, keyboard-avoiding composer pinned to bottom ("Send a message to the fellowship").
   - `text` from me: right-aligned bubble filled with **my crayon color** (white text if contrast needs it); from
     others: left bubble, white with ink border, their `Crest` beside the first bubble of a run, name above.
   - `proclamation`: a centered **scroll card** — parchment-white card with a thick ink border, a gold wax-seal
     circle on the left showing the actor's crest, a 6 px stripe in the payload's crayon color, body text in
     Fraunces italic. Tappable: `mission_complete` → `router.push('/mission/<mission_id>')`; `page_complete` →
     coloring tab; `book_complete` / `storyline_ready` → storybook tab. If `payload.image_url` exists show a
     thumbnail. This is the visual proof that the story lives in the chat — make it beautiful.
   - `system`: small centered muted text ("Dax the Wolf joined the fellowship!").
   - `wizard`: left bubble with a 🧙 avatar and lavender background (Muse speaking in chat).
   - Day separators ("Today", "Yesterday").
   - Empty state: Muse line "The fellowship is quiet. Say hello, or pick a mission to start the story."
4. **Fellowship view:** list of members — big `Crest`, name, crayon swatch + color name, interest chips, a count of
   missions they've completed (from `useMissions(storyline.id)` via EV's `lib/game.ts` + `useStoryline`), role badge
   for founder. Footer: "Invite friends" button.

## Task 5 — Invites & joining
- `InviteSheet`: `react-native-qrcode-svg` encoding deep link `questbound://join/<CODE>` (scheme is set in
  app.json), code shown huge in Fraunces with letter spacing, buttons "Copy code" (`expo-clipboard`) and "Share
  invite" (`Share.share` with text "Join our fellowship on Questbound: code <CODE>").
- `QrScanner`: `CameraView` from `expo-camera` with `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`,
  `onBarcodeScanned` → parse `questbound://join/XXXXXX` or raw 6-char code → `onCode(code)`; handle permission
  denied with a button to type the code instead.
- `app/join/[code].tsx`: deep-link landing — ensure signed in, `joinByCode(code)`, then if profile not onboarded
  → `router.replace('/onboarding')` else `router.replace('/(tabs)/friends')`. Show a parchment "Joining the
  Lantern Fellowship…" state.
- AB's onboarding will render your `QrScanner` and a code text field and call `joinByCode` — keep both easy to embed.

## Acceptance checklist
- [ ] Two phones: A creates fellowship, B scans QR → B appears in A's member list within ~2 s, system message shows.
- [ ] Chat sends/receives in realtime both ways; optimistic send; failed send can retry.
- [ ] Proclamations render as scroll cards with crayon stripe + crest seal and navigate on tap.
- [ ] Online dots via Presence.
- [ ] Mock mode still works (`EXPO_PUBLIC_USE_MOCKS=1`).

## Round 2 backlog
1. Reactions on proclamations (long-press → 👑🔥😂; store in `messages.payload.reactions` via REQUESTS for a column or a new table).
2. Push notifications for proclamations (`expo-notifications`; Expo Go supports push on device with a project id).
3. "Nudge" a quiet friend (a playful system message from Muse: "The Owl has not been seen in 3 days…").
4. Typing indicators, read receipts.
5. Member profile sheet with their colored regions across all books.

## Git reminder
`npm run typecheck && git add -A && git commit -m "[MP] …" && git push origin HEAD:feat/friends` — after every task.
