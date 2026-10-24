# AB status (Wizard & Shell)

## Done
- Task 1: fonts + splash + providers (`app/_layout.tsx`), gate (`app/index.tsx`).
  Gate: ensureSignedIn → !onboarded → `/onboarding` · no fellowship → `/onboarding?step=fellowship` ·
  no storyline → `/onboarding?step=summon` · else `/(tabs)/coloring`.

## For teammates
- **`<T variant="hero|title|heading|body|bodyBold|small|smallBold|story">` in `components/shell/T.tsx`** — use it
  instead of `<Text>` so Fraunces/Nunito apply. Props: `color`, `center`, plus all Text props.
- `components/shell/Button.tsx` — `<Button label variant="primary|secondary|ghost|danger" small icon loading />`.
- `components/shell/ParchmentLoading.tsx` — full-screen loader.

- Task 2: custom `TabBar` (inked SVG icons, crayon squiggle, Friends unread badge), Muse FAB (tap = sheet,
  long-press = Demo Tools), coach marks once per tab, `WizardSheet` chat client (Task 7 client side).
  `TAB_CONTENT_BOTTOM_PAD` (from `components/shell/TabBar.tsx`) — pad your tab's scroll content so the FAB
  doesn't cover it. `useWizard().open('question')` from any tab opens Muse and asks it.

- Task 3: onboarding (`app/onboarding.tsx`) with Muse bubble + typewriter, quill dots, crest/crayon/interest
  (with quips)/budget+availability pickers (reusable in `components/shell/`), fellowship found/join (QR + code),
  summon ritual (`components/wizard/SummonRitual.tsx`) with error → "write a quick demo book" fallback.
- Local fallbacks for teammates' components live in **`components/shell/teammates.tsx`** (Crest, CrestRow,
  InviteSheet, QrScanner, MissionTypeIcon). Swap to re-exports once MP/AD land on main.

- Task 4: Missions dashboard (header, 6-segment page progress in completers' crayons, points leaderboard,
  filters, Whole fellowship / Pairs / Solo sections, collapsed locked chapters), `MissionCard`, `StatusPill`.

- Task 5: mission detail (`app/mission/[id].tsx`): place card + Open in Maps, riddle, proof UI per proof_type,
  participant picker (gathering allows required−1 when fellowship ≥ 4, mirroring EV's rule), gift give/seal,
  photo upload cached across retries, Magic Mirror while verifying, "The Mirror sees: …" Lens titles, wax seal +
  typewriter story_line, Chapter complete banner → auto-navigates to coloring after ~3 s.

- Task 6: Settings — hero card, edit sheets reusing onboarding pickers, fellowship (invite sheet, leave w/ confirm),
  replay tour, alerts toggle (local stub), about, version label ×5 → Demo Tools.

- Task 7: `supabase/functions/wizard-chat/index.ts` — auth, membership check, loads profile/fellowship/members/
  latest book/active page missions/last 15 messages, system prompt = persona (inline copy) + app guide + reply
  rules + live context JSON + screen; `chatJSON` (works with both the old and EV's new `llm.ts` signature);
  validates actions (known tabs, mission ids on the active page, summon only when no book); canned context-aware
  reply on any failure or when `LLM_API_KEY` is unset. `deno check` passes.
  **NOT DEPLOYED** — no `SUPABASE_ACCESS_TOKEN` in this container. Whoever has it:
  `npx supabase functions deploy wizard-chat`.

## In progress / next
- Swap `components/shell/teammates.tsx` fallbacks for MP/AD components after merge round 1.
- Swap inline `MUSE_PERSONA` for `_shared/prompts.ts` once EV's branch is on main.
- Round 2 #1 done: "Plan our next meetup" → `components/wizard/planMeetup.ts` picks the slot most members share,
  the best open mission for that many people, proposes a concrete time + place, and offers "📜 Post to the
  fellowship" (sends a chat message as the user via `useChat().send`).
- Round 2 next: sequel adaptation card + Demo Tools SerpApi counts (both via EV's `useGenerationInfo`, after merge);
  reroll (waits on EV's `reroll-mission`); voice (waits on EV transcribe fn); icon/splash need `assets/` + `app.json`
  (merge agent).

## Integration check (local throwaway merge, not pushed)
- main + feat/engine + feat/friends + feat/coloring + feat/shell: only `handoffs/notes/REQUESTS.md` conflicts
  (append-only → take both sides). `tsc --noEmit` passes on the result. Mock mode runs on web: coloring page,
  friends chat, missions, riddle proof → wax seal all work together.
- Fixed from that run: Muse FAB covered MP's chat Send button → FAB floats above the composer on Friends.

## Known bugs
- none yet
