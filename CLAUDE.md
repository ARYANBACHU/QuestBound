# CLAUDE.md — Questbound (HackTX 2026)

You are one of five Claude Code agents building **Questbound** in parallel during a 24-hour hackathon
(hacking ends **Sun Oct 25, 11:30 AM CST**; we submit by 11:00). Four agents each own one slice of the app on
their own branch. A fifth agent (the **Merge Agent**) merges branches into `main` and integrates.

**You have full authority inside the paths you own.** Make decisions, don't ask permission, don't stop to ask
clarifying questions. If something is ambiguous, pick the option that makes the demo better and record the
decision in `handoffs/notes/<YOUR-INITIALS>-decisions.md`. Read your handoff file (`handoffs/<INITIALS>.md`) fully
before writing code.

---

## 1. What we're building (keep this in your head)

A mobile app (Expo / React Native) where a friend group — a **Fellowship** — lives inside a fairy-tale
**coloring book** that the AI writes for them.

**The core loop (must work end-to-end before anything else):**
1. Friends join a Fellowship and each pick **interests**, a **crest** (avatar) and a **crayon color**.
2. **Muse the Wizard** (Meta's Muse Spark LLM) blends everyone's interests + real local places/events
   (**SerpApi** Google Maps + Google Events) into a **Storyline** (a "book") with 3–4 chapters.
3. Each chapter is a **coloring page** (an SVG with named regions). Each region = one **mission**.
4. Doing a mission in real life → submit proof (photo / group photo / text / riddle answer / friend confirms)
   → Muse verifies (photos also checked with **SerpApi Google Lens**) → the region **fills with your crayon color**
   → a **proclamation** posts in the group chat.
5. All regions colored → **page turns** → next chapter unlocks. Muse Image paints an illustration of the chapter.
6. Book finished → **album + montage + recap** → Muse writes the **sequel**, tailored to what the group actually
   did (completed, skipped, photos, chat).

**Social design rule:** big regions need the whole fellowship (Gathering), medium regions need two people (Duet,
Gift, co-op Trial), small regions are solo (Relic, Bard, Trial). You literally cannot finish a page alone.

**Hackathon tracks we're judged on:** Meta "Bringing People Closer Together with AI" · Best Use of SerpApi ·
Most Entertaining. Every feature should make at least one of these judges smile. Judges will play the app on
their own phones at the table via Expo Go.

### Vocabulary (use these words in UI copy, consistently)
| Term | Means |
|---|---|
| Fellowship | the friend group |
| Book / Storyline | one generated story arc (3–4 chapters) |
| Chapter / Page | one coloring page |
| Mission | one task, tied to one region of a page |
| Proclamation | automatic chat message announcing progress ("Hear ye! …") |
| Sage / the Wizard | the in-app guide and narrator (always "Sage"); shown with "✦ powered by Muse" — Muse is Meta's model, the AI credit only |
| Crest | a player's avatar (emoji for now) |
| Crayon / color | a player's color; it paints the regions they complete |
| Magic Mirror | photo verification moment |

Tone: warm, playful, a little theatrical, never cringe. Short sentences. Sentence case. Buttons say exactly what
happens ("Submit proof", "Turn the page"). Errors explain what to do next.

---

## 2. Ownership map — EDIT ONLY YOUR PATHS

| Owner | Branch | Owns (create/edit freely) |
|---|---|---|
| **EV** Story Engine | `feat/engine` | `supabase/functions/**` (except `wizard-chat/`), `lib/api.ts`, `lib/game.ts`, `lib/mockStore.ts`, `fixtures/**` |
| **MP** Fellowship | `feat/friends` | `lib/session.ts`, `lib/fellowship.ts`, `lib/chat.ts`, `app/(tabs)/friends.tsx`, `app/join/**`, `components/friends/**`, **Round 3:** `assets/pages/set-mp/**` |
| **AD** Artist | `feat/coloring` | `app/(tabs)/coloring.tsx`, `app/(tabs)/storybook.tsx`, `components/coloring/**`, `components/storybook/**`, `assets/pages/**` (except `assets/pages/set-mp/**` in Round 3) |
| **AB** Wizard & Shell | `feat/shell` | `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/missions.tsx`, `app/(tabs)/settings.tsx`, `app/onboarding.tsx`, `app/mission/**`, `components/shell/**`, `components/wizard/**`, `supabase/functions/wizard-chat/**` |
| **Merge Agent** | `main` | `shared/**`, `supabase/migrations/**`, `lib/env.ts`, `lib/supabase.ts`, `lib/maps.ts`, `app.json`, `package.json`, `tsconfig.json`, `CLAUDE.md`, `scripts/**` |

- **Round 3 art split:** MP owns `assets/pages/set-mp/**` (8 pages, AD's `PageArt` format, see
  `handoffs/notes/ROUND-3-PLAN.md` U2). AD keeps the rest of `assets/pages/**`, including `index.ts`, and adds the
  imports for MP's pages. Round 3 plan: `handoffs/notes/ROUND-3-PLAN.md`.
- **FROZEN for feature branches:** `shared/**`, `supabase/migrations/**`, `CLAUDE.md`, `lib/env.ts`, `lib/supabase.ts`.
  Need a change? Append it to `handoffs/notes/REQUESTS.md` (who / what / why / exact proposed diff), push, and
  code against your proposal behind a local adapter until the merge agent lands it.
- **Using another owner's code:** import it, never edit it. If their hook isn't ready, the mock version already
  works (see §4). If you need a new export from someone else, write it in `REQUESTS.md`.
- **New files:** only inside your owned folders. Name components `PascalCase.tsx`, hooks `useThing`.
- **Dependencies:** prefer what's installed (see §5). If you truly need a package, run `npx expo install <pkg>`
  and put `DEP: <pkg> — reason` in the commit message. Never hand-edit lockfiles.

---

## 3. Git protocol — ALWAYS PUSH

1. **Session start (every time):**
   ```bash
   git fetch origin
   git checkout -B feat/<yours> origin/feat/<yours>   # cloud sessions may start on another branch — switch
   git merge origin/main --no-edit                     # pick up the latest integration
   [ -d node_modules ] || npm install
   ```
2. **Commit + push after EVERY completed task, and at least every 20 minutes** even if mid-task (code must
   typecheck before pushing):
   ```bash
   npm run typecheck && git add -A && git commit -m "[EV] storyline generator: validation + fallback" && git push origin HEAD:feat/<yours>
   ```
   Commit prefix = your initials in brackets: `[EV]`, `[MP]`, `[AD]`, `[AB]`, `[MERGE]`.
3. **Never** push to `main`. **Never** force-push. **Never** rebase a pushed branch. Never commit `.env`.
4. When the team announces "merge round N done", run step 1 again (`git merge origin/main`) before continuing.
5. Before you end a session or your context gets long: commit, push, and update
   `handoffs/notes/<INITIALS>-status.md` with: done / in progress / next / known bugs. The next session reads it.

---

## 4. Mock mode (so nobody waits on anybody)

- `EXPO_PUBLIC_USE_MOCKS=1` → every hook in `lib/` returns data from `fixtures/demo.ts` through `lib/mockStore.ts`,
  and writes (send message, submit proof) mutate the mock store and re-render listeners. You can build and demo
  your entire slice with zero backend.
- Real implementations go in the same functions behind `if (USE_MOCKS) { …mock… } else { …real… }`.
  **Never delete the mock branch** — it's our demo safety net.
- Hook contracts are fixed: names, params and return shapes in `lib/*.ts` are the API between teammates.

---

## 5. Tech stack & conventions

- **Expo SDK (latest) + Expo Router** (file routes in `app/`), TypeScript strict, path alias `@/` = repo root.
- **Supabase**: Auth (anonymous sign-in), Postgres (schema = `supabase/migrations/0001_init.sql`), Realtime
  (`postgres_changes` on messages/missions/pages/storylines/fellowship_members/memories + Presence),
  Storage (`proofs` public bucket for photos, `art` public bucket for Muse Image output), Edge Functions (Deno).
- **The app NEVER calls Meta or SerpApi directly.** All AI + search goes through edge functions (keys are
  Supabase secrets). Client → `lib/api.ts` → `supabase.functions.invoke`.
- Installed UI libs: `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`,
  `expo-haptics`, `expo-linear-gradient`, `expo-blur`, `expo-image-picker`, `expo-camera` (QR scanning via
  `CameraView`), `expo-location`, `expo-sharing`, `expo-clipboard`, `react-native-qrcode-svg`,
  `@expo-google-fonts/fraunces`, `@expo-google-fonts/nunito`.
- Styling: `StyleSheet.create` + tokens from `shared/theme.ts` only. No hard-coded hex colors outside theme.
- Every screen handles: loading, empty (an invitation to act, in Muse's voice), and error (what to do next).
- Must run in **Expo Go** (no custom native modules).
- Edge functions: Deno, import shared helpers from `supabase/functions/_shared/*`. Deno can't import `/shared`
  — use the mirror in `_shared/types.ts`.

## 6. Design direction (everyone follows this — Round 2 "UI upgrade" + "UI revamp"; SIMPLIFY wins on conflicts)

A fairy-tale **coloring book** that looks like a **shipped storybook game**, not a generic card app or a prototype.
Patterns to study (never their assets): Duolingo (mascot everywhere, celebrations, chunky press-depth buttons),
Finch / Pokémon GO (a character you bond with, place energy), Monument Valley / Alto (cohesive painterly palettes),
storybook-fantasy films for **vibe only** (whimsical, cheeky, lush swamps/castles/forests). Never use or draw any
existing characters, names, logos or artwork — everything is original.

- **Simplify first.** One focal point per screen and one clear primary action. Fewer chips/badges/lines of text;
  secondary actions go behind a "…" menu. Fill empty space with useful content (the next mission, a friend's
  progress) before decoration.
- **Ink style stays.** Text and outlines `ink.ink` (deep indigo ink), thick ink strokes, base background `ink.paper`.
- **Color, with meaning.** Screen backgrounds use the chapter mood (`moodFor(template_id)`, `SCREEN_GRADIENTS`,
  `MOODS[*].tint`). Chrome uses the `realm` palette (enchanted green, swamp teal, royal purple, warm gold, lantern
  orange). Controls use `accent` / `chips` / `gameButton`. **Crayons (`CRAYONS`) still mean "a player did this"** —
  use them for player fills, crests, confetti, not decoration. Gold (`ink.gold`) = royal seal / completion.
- **Chunky game buttons:** `ui.buttonRadius` (18), a `ui.buttonDepth` (4 px) darker bottom edge from
  `gameButton[tone].edge` that compresses to `buttonDepthPressed` on press, bold Nunito label.
- **Parchment panels:** cards/sheets use `panel` (parchment fill, ink border, `shadow.sm|md`), one radius
  (`ui.cardRadius`). Pop-ups/sheets/modals: the outer container and every edge-touching child share the same
  borderRadius with `overflow: 'hidden'` — no jagged corners.
- **Decorative layer:** at most ONE per screen — original SVG flourishes (stars, fireflies, vines, castle/forest
  silhouettes, `decor` tokens), low opacity, never behind text or competing with content. Useful content first.
- **Celebrations:** crayon-shaving confetti + gold sparkles (`celebration`) on mission complete, page turn, book
  complete. The signature moment is still a region **filling with crayon color** — celebrations frame it.
- **Sage is our mascot.** The in-app wizard is **Sage** (`components/wizard/Sage.tsx`, owner AB; original SVG
  character, expressions idle | happy | thinking | surprised | proud | sleepy, sizes sm/md/lg). Sage appears in
  onboarding, empty states, loading/rituals ("thinking"), mission pass ("proud") / fail ("surprised"), page turn and
  book complete ("happy"), the FAB, the wizard sheet header, chat, and coach marks — as the single character focal
  point where present (not competing with other decoration). Under Sage's name always show
  `SAGE_CREDIT` ("✦ powered by Muse"). "Muse" is only the AI credit, never the character.
- **Type:** **Fraunces** (display: book titles, chapter titles, big moments; italic for narrated story lines) +
  **Nunito** (everything else; bold for buttons). Sizes from `type` in theme.
- **No hard-coded colors or rgba()** outside theme/art files — overlays use `scrim.*`.
- **Motion:** respond to events (fill, page turn, seal stamp, press, celebrations) using `motion` timings. At most ONE
  animation plays at a time, except Sage's subtle idle (blink, hat-star twinkle, gentle bob) — the only loop, and it
  stops under reduced motion. 60fps, no layout jank.
- **Quality bar:** one radius/shadow/spacing scale (`ui`, `shadow`, `space`), WCAG AA contrast (pairings are noted in
  theme.ts), test on iPhone SE and Pro Max.
- Haptics on: mission complete (success), page turn (heavy), errors (warning).

## 7. Definition of done for Round 1 (the base product)

With `EXPO_PUBLIC_USE_MOCKS=1` AND with real Supabase:
onboard → create/join fellowship → summon storyline → see coloring page → open a mission → submit proof →
region fills + proclamation appears in chat → finish page → page turns. All five tabs render real data.
`npm run typecheck` passes on `main`. Then Round 2 features (see each handoff).
