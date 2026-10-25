# Merge round 2 — report

**main = `9aa904c` + this report.** All four branches merged (engine → friends → coloring → shell), only
`handoffs/notes/REQUESTS.md` conflicted (unioned). No frozen files were touched on feature branches. No new migration.

**Each agent: run `git fetch origin && git merge origin/main` before continuing.**

## Verify
| Check | Result |
|---|---|
| `npm install` | ✅ (no dependency changes this round) |
| `npm run typecheck` | ✅ clean |
| `node fixtures/points.test.mjs` | ✅ |
| `npx expo export --platform ios` | ✅ 6.2 MB Hermes bundle |
| Mock-mode web build smoke (Playwright, 390×844) | ✅ `/coloring /missions /friends /storybook /settings /mission/m-1` all render real mock data, **0 page/console errors**; real Sage renders; FAB hidden in the Storybook reader |
| `api.meta.ai` / `serpapi.com` in app/components/lib | ✅ none |
| Hard-coded hex / rgba in app/components | ✅ none |
| `npx expo install --check` | ⚠️ couldn't reach the registry from the merge sandbox (no deps changed, so low risk) |

## Requests
- ✅ `shared/types.ts` → `BookRecap.abandoned?: boolean` (EV). Deno mirror was already on feat/engine.
- ✅ README.md → audio credit line (AB) + narrator renamed to Sage in the blurb.
- ✅ MP → EV `pointsFor`/`leaderboard`; AD stand-ins; AB `useHideWizardFab`, Sage/sfx, reroll difficulty — all landed
  (details below). Full statuses in `REQUESTS.md`.

## What merged
**EV (feat/engine)** — E1 join race (any member summons; concurrent summons → one book; stale `generating` skipped) ·
E2 difficulty + `replace_active` (shelved book gets `recap.abandoned`) · E3 GPS gate in submit-proof (`GEO_RADIUS_M`,
`too_far`/`no_location`, `distance_m`) · E4 points source of truth (`_shared/points.ts`, 40/20/10 × difficulty) ·
E5 `useCompletions` (+ `verse`) / `usePages` / `useChapters` · E6 UT demo "The Legend of the Forty Acres" (`demo:'ut'`,
11 SerpApi-verified landmarks) · Sage naming in all engine copy · `place.link` = maps link (website in `place.website`).

**MP (feat/friends)** — chat keyboard lift (no KAV guessing) · Sage in chat (talk bob + ping once, seal sfx on fresh
proclamations) · Friends revamp: chat is the hero, crests → ranked roster, Up next strip, parchment proclamation cards ·
no-storyline-safe Friends tab · reactions on the real table · every place tap → `openInMaps`.

**AD (feat/coloring)** — PageFlip (spine hinge, shadow, heavy haptic) + CoverSwing · crayon scribble reveal + sfx ·
100% coloring (mood wash behind regions) · past chapters "The tale of this chapter" · montage as stories · bard
VerseCards · mood frames/backgrounds · Celebration confetti · `openInMaps` + separate Website link.

**AB (feat/shell)** — `playSfx` + Sage mascot (6 expressions, speakOnce) · bards music + mute toggle · onboarding
revamp (bards step, crayon preview, waiting-for-founder) · reroll sheet (easier/similar/harder) + New storyline sheet ·
GPS proximity + lat/lng on submit · Missions chapter selector · Sage sheet (pill/half/full, persisted history) +
draggable FAB · Demo Tools "Start UT campus demo" · Settings revamp · wizard-chat Sage persona.

## Integration fixes (callers only)
| Commit | File(s) | Owner |
|---|---|---|
| Sage stand-ins → `components/wizard/Sage` | `components/friends/sage.tsx` (re-export Sage + playSfx), `components/coloring/sage.tsx` (Sage re-export, AD's `SageSays` kept) | MP, AD |
| no-op playSfx → `components/shell/sfx` | `components/coloring/sfx.ts` | AD |
| points → EV's `pointsFor`/`leaderboard` | `components/friends/points.ts`, `components/shell/engine.ts` (also dropped the reroll cast) | MP, AB |
| local storybook hooks → EV's | `components/storybook/useStoryData.ts` re-exports `usePages`/`useCompletions` (`CompletionEntry extends Completion`, so AD's callers type-check unchanged) | AD |
| Hide Sage FAB on reader + montage | `app/(tabs)/storybook.tsx`: `useHideWizardFab(!!openId \|\| montage)` | AD (AB's request) |

Also confirmed: no place tap uses `place.link`; all six place-tap sites call `openInMaps(place)`, websites open via a
separate "Website" link. No user-facing "Muse" left except the `✦ powered by Muse` credit and Settings' "Sage is
powered by Meta's Muse Spark" credit line (identifiers like `localMuse` are code only). CLAUDE.md §2 already lists
`lib/maps.ts` under the Merge Agent.

## ⚠️ Not done from the merge session (needs someone with Supabase access)
The merge sandbox has **no `SUPABASE_ACCESS_TOKEN`** and its network policy **blocks `jhqkjfhtekermlbnqtxe.supabase.co`**,
so none of the live steps could run. Do these from a laptop:
```bash
npx supabase functions deploy wizard-chat --project-ref jhqkjfhtekermlbnqtxe --use-api   # only function changed since EV's deploy
npx supabase secrets list --project-ref jhqkjfhtekermlbnqtxe   # expect DEMO_FORCE_PASS=0; GEO_RADIUS_M unset (=400) or 400
npx supabase secrets set GEO_RADIUS_M=400 DEMO_FORCE_PASS=0 --project-ref jhqkjfhtekermlbnqtxe   # if either is off
git tag round-2 origin/main && git push origin round-2   # the sandbox git proxy refused tag pushes
```
Live smoke to run after the deploy (same as the 5-step test below, real mode): UT demo + GPS-gated riddle at the Tower,
wizard-chat says it's Sage, reroll with difficulty, a bard poem appears in the Storybook via `useCompletions`.
EV already ran the engine-side versions of these live this morning (see EV-status.md); wizard-chat's Sage persona is
the only unverified piece.

## Open TODOs per owner
- **EV** — mock fixtures have no bard completion, so the Storybook VerseCard only shows in mock mode after someone
  submits a bard proof (AD's old stand-in faked verses). Consider one bard `COMPLETIONS` entry with a verse. Hard LLM
  books run ~26 s (27 s budget) — use `demo:'ut'` / `demo:true` at the table. Reroll LLM sometimes falls back.
- **MP** — `MembersView` recomputes `rank`/`member` on top of EV's rows (same result; could just use `row.rank`).
  Web-only: fellowship name truncation, tall composer.
- **AD** — show shelved books as "set aside" using `recap.abandoned` (field is on main now; nothing reads it yet).
  `TaleEntry` can use `entry.verse` directly. Re-test PageFlip + scribble on a real phone (Expo Go).
- **AB** — get wizard-chat deployed (above). `components/shell/engine.ts` now just re-exports EV's points;
  `pointsByMember` rows are EV's `{ member, user_id, points, missions, rank }`.
- **Merge / repo owner** — deploy + secrets + tag (above). `npx expo install --check` from a networked machine.

## 5-step phone test (Expo Go)
1. **Mock** (`npm run mock`): onboarding (bards step, crayon preview) → Page tab → tap a region → Submit proof →
   region scribbles in your crayon + proclamation in Friends chat with Sage's ping.
2. **Real, two phones** (`npm run dev`): A creates a fellowship, B joins via QR; both crests show; either one taps
   Summon — both land on the same book.
3. **UT demo**: Settings → Demo Tools → "Start UT campus demo". Open a Tower riddle away from campus → "too far" with
   the distance; at the Tower (or within 400 m) the right answer colors the region on both phones.
4. **Reroll + points**: mission "…" → Ask Sage for a different mission → Easier; the new mission shows lower points.
   Missions + Friends roster show the same totals.
5. **Sage + Storybook**: tap the Sage FAB → "Who are you?" → it answers as Sage (needs the wizard-chat deploy).
   Complete a bard mission, open Storybook → the book → the verse card appears; Sage's FAB is hidden in the reader.

Known breakages: none found in mock mode; wizard-chat still runs the pre-Sage persona until deployed.
