# AB — Wizard & Shell · branch `feat/shell`

## Paste this into Claude Code to start
> Read `CLAUDE.md` and `handoffs/AB.md` completely. You are the Wizard & Shell agent for Questbound and you have
> full authority over the paths AB owns — make decisions without asking me. Follow the git protocol in CLAUDE.md
> §3 exactly: switch to `feat/shell`, merge `origin/main`, and **commit + push to `feat/shell` after every task and
> at least every 20 minutes**. Work through the tasks in AB.md in order. Keep `handoffs/notes/AB-status.md`
> updated. Never edit files you don't own; put cross-team needs in `handoffs/notes/REQUESTS.md`. Start now with Task 1.

---

## Your role
You build the **frame everyone lives in** and the **guide who explains it**: app shell + fonts + navigation gate,
Muse-guided onboarding, the **Missions dashboard**, the **mission detail + proof submission** flow, Settings, and
**Muse the Wizard** — a floating assistant on every screen that answers questions and pushes the group forward.
You turn the engine (EV), the social layer (MP) and the art (AD) into one product a judge can pick up cold.

**You own:** `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/missions.tsx`,
`app/(tabs)/settings.tsx`, `app/onboarding.tsx`, `app/mission/**`, `components/shell/**`, `components/wizard/**`,
`supabase/functions/wizard-chat/**`.

**You consume (don't edit):** `useSession` (MP), `useFellowship`, `profileOf` (MP), `Crest`, `CrestRow`,
`QrScanner`, `InviteSheet` (MP, `components/friends/`), `useStoryline`, `useMissions`, `useMission` (EV),
`generateStoryline`, `submitProof`, `uploadProof`, `wizardChat` (EV, `lib/api.ts`), `MissionTypeIcon`,
`ColoringPage` (AD), `_shared/llm.ts`, `_shared/db.ts` (EV, inside your edge function). Until a teammate's
component exists, use a tiny local fallback and swap later (note it in `AB-status.md`).

---

## Task 1 — Shell (`app/_layout.tsx`, `app/index.tsx`)
- Load fonts with `useFonts` from `@expo-google-fonts/fraunces` (`Fraunces_400Regular_Italic`,
  `Fraunces_700Bold`) and `@expo-google-fonts/nunito` (`Nunito_400Regular`, `Nunito_700Bold`); keep the splash
  (`expo-splash-screen`) until loaded. Set a default `Text` font via a small `components/shell/T.tsx` wrapper
  (`<T variant="title|heading|body|small|story">`) and use it everywhere you own; tell teammates in status notes.
- Wrap providers (gesture handler root, safe area, and any provider MP adds via REQUESTS).
- `app/index.tsx` gate (show a parchment loading screen while deciding):
  1. `await ensureSignedIn()`
  2. profile not `onboarded` → `/onboarding`
  3. no fellowship → `/onboarding?step=fellowship`
  4. else → `/(tabs)/coloring`

## Task 2 — Tabs + Wizard FAB (`app/(tabs)/_layout.tsx`, `components/shell/TabBar.tsx`)
- Custom `tabBar` component: white bar with a 2 px ink top border; icons drawn with `react-native-svg` in ink:
  Friends (two heads), Missions (scroll with checks), Page (crayon), Storybook (open book), Settings (gear made of a
  sun). Active tab: icon filled + a short wavy crayon underline in the **user's crayon color**. Labels Nunito small.
  Badge on Friends when unread proclamations (track last-seen message id in AsyncStorage).
- **Muse FAB** (`components/wizard/WizardFab.tsx`) rendered once in the tabs layout, absolutely positioned
  bottom-right above the tab bar on every tab: a round lavender button with 🧙 and a soft gold ring. Long-press
  opens Demo Tools (Task 6). Tap opens the Wizard sheet (Task 7).

## Task 3 — Onboarding (`app/onboarding.tsx`) — Muse guides it
One screen with steps (local state + `?step=` param); each step has **Muse's speech bubble** at the top
(`components/wizard/MuseBubble.tsx`: 🧙 + lavender bubble + typewriter text reveal ~25 ms/char, tap to skip),
content in the middle, a big primary button at the bottom. Progress = small quill dots.
1. **Welcome:** "Greetings, traveler. I'm Muse. I write fairy tales about real friends — and you're about to be in one."
   Button "Begin".
2. **Name + crest:** text input "What do bards call you?"; grid of 8 crests (`CRESTS`), selected one bounces.
3. **Crayon:** "Pick your crayon. Everything you do will be painted in it." 8 crayon swatches drawn as crayon
   shapes (SVG); colors already taken by fellow members show their crest on them (allowed but discouraged).
4. **Interests:** chips grouped by `INTERESTS[].group`; min 3, max 8; Muse reacts to picks ("Board games AND
   hiking? A strategist with strong calves.") — use a small local dictionary of quips, not an LLM call.
5. **Budget + time:** budget segmented (Free / $ / $$ / $$$); availability toggles (Weekday evenings, Weekends,
   Spontaneous). Then `updateProfile({ display_name, crest, color, interests, budget, availability, onboarded: true })`.
6. **Fellowship:** two big choices — "Found a fellowship" (name input, placeholder "The Lantern Fellowship") →
   `createFellowship(name)` → shows `InviteSheet` ("Summon your friends") with a "Continue" button; or "Join one"
   → `QrScanner` or 6-letter code input → `joinByCode(code)`.
7. **Summon the story** (founder, or anyone if the fellowship has no storyline): "Shall I write your first book?"
   Button "Summon our story" → `generateStoryline({ fellowship_id, mode:'first' })` with a full-screen **ritual**:
   ink quill writing across a blank page + rotating Muse lines ("Gathering your interests…", "Consulting the maps
   of Austin…" (SerpApi), "Inking the first chapter…"). On success → `router.replace('/(tabs)/coloring')`.
   If the fellowship already has a storyline (joiners), skip to tabs.

## Task 4 — Missions dashboard (`app/(tabs)/missions.tsx`)
- Data: `useFellowship`, `useStoryline`, `useMissions(storyline.id)`, `useSession`.
- Header: book title (Fraunces) + active chapter title; progress bar for the active page = 6 segments colored by
  completers; points leaderboard strip (crest + points total per member, sorted; points = sum of `mission.points`
  for missions where they're in `completed_by`).
- Filter chips: All · Mine (assignee_ids includes me OR empty) · Open · Needs friends (required_members ≥ 2) · Done.
- Sections for the active page: **"Whole fellowship"** (large/gathering), **"Pairs"** (duet/gift/co-op trial),
  **"Solo"** (relic/bard/trial). Then collapsed "Coming in Chapter N" with locked missions blurred/greyed.
- Mission card (`components/shell/MissionCard.tsx`): `MissionTypeIcon`, title (Nunito bold), story_hook (italic,
  1 line), place chip (if any), "Needs 2 heroes" / "Everyone" badge, assigned crests, status pill:
  open (ink outline) · pending (hourglass) · complete (filled with completer's crayon + their crest). Tap →
  `/mission/<id>`.
- Pull-to-refresh; empty state: "No missions yet — summon a story." + button.

## Task 5 — Mission detail + proof (`app/mission/[id].tsx`) — the core loop's action
- Data: `useMission(id)`, `useFellowship`, `useSession`.
- Layout: region label + MissionTypeIcon, title (Fraunces), story_hook (italic), description, place card
  (thumbnail, rating, address, "Open in Maps"), required members, trial question (for trials).
- **Proof UI by `proof_type`:**
  - `photo` / `group_photo`: "Take photo" (`ImagePicker.launchCameraAsync({ quality: 0.6 })`) or "Choose photo"
    (library); preview with a "magic circle" frame overlay; for group/duet: **participant picker** — member crests
    multi-select, must reach `required_members` (pre-select me).
  - `text`: multiline input ("Write your verse…"), 280 chars.
  - `answer`: single input + "Speak the answer".
  - `voice`: Round 1 → falls back to text input with label "Speak or type your verse".
  - `confirm` (gift): giver picks the recipient friend → submit with `confirm_for`; if mission is `pending` and I am
    the recipient → big "Seal it — I received the gift" button.
- **Submit:** if photo → `uploadProof(uri, fellowship.id)` then `submitProof({ mission_id, participant_ids,
  proof_url | proof_text, confirm_for })`. While waiting: **Magic Mirror** animation (oval mirror with shimmer,
  text "The Mirror ponders…"). Show `verdict.lens_titles` as "The Mirror sees: <first 3 titles>" — this makes the
  SerpApi Lens check visible to judges.
- **Result:** pass → royal wax seal stamps down (scale 1.4→1 with bounce, gold), `story_line` revealed with typewriter
  effect, success haptic, buttons "See it on the page" (→ coloring tab) and "Back to missions". If
  `page_completed` → "Chapter complete!" banner and go to coloring (AD plays the page turn). Fail → Muse bubble with
  `flavor_text`, warning haptic, "Try again".
- Errors from API → readable message + retry; never lose the selected photo on error.

## Task 6 — Settings (`app/(tabs)/settings.tsx`)
- Profile: crest, name, crayon, interests (reuse onboarding step components — build them as reusable components in
  `components/shell/` from the start).
- Fellowship: name, invite code (+ `InviteSheet`), members count, "Leave fellowship" (confirm dialog).
- "Replay the tour" (resets coach marks), notifications toggle (stub), About ("Made at HackTX 2026").
- **Demo Tools** (hidden; long-press the Muse FAB or tap the version label 5×): "Summon instant demo book"
  (`generateStoryline({ ..., demo: true })` once EV lands it), toggle mock mode note, show SerpApi live/cached counts
  if EV exposes them. These save us during judging.

## Task 7 — Muse the Wizard (`components/wizard/*`, `supabase/functions/wizard-chat/index.ts`)
**Client:** `WizardSheet` — bottom sheet chat (lavender, Muse avatar), suggestion chips that change per screen:
- missions: "What should we do next?", "Which missions need friends?", "Explain mission types"
- coloring: "Explain this page", "How do I color a region?"
- friends: "How do I invite friends?", "Plan our next meetup"
- storybook: "What's a sequel?", "Play the montage"
Send `wizardChat({ fellowship_id, screen, messages })`; render replies; perform `actions`: `navigate` →
`router.navigate('/(tabs)/<target>')`, `open_mission` → `/mission/<id>`, `summon_storyline` → onboarding step 7 ritual.
**Coach marks:** first visit to each tab, Muse bubble pops up once explaining that tab in one sentence (seen flags
in AsyncStorage `qb.coach.<tab>`). "Replay the tour" clears them.

**Server (`wizard-chat`):**
1. Auth caller; load (if `fellowship_id`): fellowship, members (names/crests/colors), current storyline + active
   page + its missions (title/type/status/assignees/place), last 15 chat messages, caller's profile.
2. System prompt = `MUSE_PERSONA` (import from `_shared/prompts.ts` once EV adds it; until then inline a copy) +
   **app guide** (write it: what each tab does, the 6 mission types and proof rules, region sizes → group rules,
   how pages turn, sequels, how to invite) + **live context** JSON + the current `screen`.
3. Ask for JSON `{ "reply": string (≤ 70 words, warm, specific, names real missions/places/people),
   "actions": WizardAction[] (0-2) }` via `chatJSON`. Validate actions (only known types/targets, mission ids that
   exist). On any failure return a friendly canned reply + no actions.
4. Deploy: `npx supabase functions deploy wizard-chat`.
Muse should be *useful*: "Bram and Cleo are both free on weekends and the Drawbridge needs a pair — want to plan
the bridge walk Saturday?" That's the Meta "AI strengthens connection" moment.

## Acceptance checklist
- [ ] Fresh install → onboarding → create fellowship → summon story → lands on coloring page (mock + real).
- [ ] Second phone joins via QR during onboarding.
- [ ] Missions dashboard groups/filter correctly; tapping a card opens detail; submitting proof colors the region.
- [ ] Wizard answers context-aware questions and its navigate actions work; coach marks show once per tab.
- [ ] Fonts load everywhere you own; no layout breaks on small phones.

## Round 2 backlog
1. Wizard "Plan our meetup": proposes a time from members' availability + posts a poll message in chat.
2. Reroll a mission via EV's `reroll-mission`.
3. Voice input for Bard missions + Wizard (Muse Voice Transcribe via an EV function).
4. Sequel flow polish: "Muse noticed you love Duets…" adaptation card before the new book.
5. App icon + splash art (crest-and-crayon logo).

## Git reminder
`npm run typecheck && git add -A && git commit -m "[AB] …" && git push origin HEAD:feat/shell` — after every task.
