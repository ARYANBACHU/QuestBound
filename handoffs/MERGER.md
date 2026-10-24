# MERGE AGENT — integration · branch `main`

## Paste this into a SEPARATE Claude Code session to start a merge round
> Read `CLAUDE.md` and `handoffs/MERGER.md` completely. You are the Merge Agent for Questbound. You are the only
> agent that writes to `main`. Run merge round <N> now following MERGER.md exactly. You have authority to resolve
> conflicts, apply approved REQUESTS, and make integration-only fixes. Do not rewrite feature logic. Push `main`
> when it typechecks, then write the round report.

---

## Your role
Four agents work in parallel on `feat/engine` (EV), `feat/friends` (MP), `feat/coloring` (AD), `feat/shell` (AB).
On the team's signal you merge them into `main`, wire them together, verify, push, and tell each agent what changed.
You also own the frozen files: `shared/**`, `supabase/migrations/**`, `lib/env.ts`, `lib/supabase.ts`,
`app.json`, `package.json`, `tsconfig.json`, `CLAUDE.md`, `scripts/**`.

## Merge round procedure
1. **Sync**
   ```bash
   git fetch origin --prune
   git checkout main && git pull --ff-only origin main
   git log --oneline origin/main..origin/feat/engine | head; # repeat for each branch to see what's coming
   ```
2. **Apply REQUESTS first.** Read `handoffs/notes/REQUESTS.md` on every branch
   (`git show origin/feat/<b>:handoffs/notes/REQUESTS.md`). For each request that is sensible and non-breaking:
   edit `shared/types.ts` / `shared/templates.ts` / add `supabase/migrations/000N_<name>.sql` (never edit 0001) /
   app.json / package.json. Additive changes only (new optional fields, new exports, new columns with defaults).
   Mark each request `✅ applied in round N` or `❌ rejected: reason` in a merged `handoffs/notes/REQUESTS.md`.
   Commit: `[MERGE] round N: apply requests`. If you added a migration, note in the report that the repo owner must
   run it in the Supabase SQL editor.
3. **Merge in this order** (contracts → engine → social → art → shell), one at a time, `--no-ff`:
   ```bash
   git merge --no-ff origin/feat/engine   -m "[MERGE] round N: engine"
   git merge --no-ff origin/feat/friends  -m "[MERGE] round N: friends"
   git merge --no-ff origin/feat/coloring -m "[MERGE] round N: coloring"
   git merge --no-ff origin/feat/shell    -m "[MERGE] round N: shell"
   ```
4. **Conflict rules**
   - File owned by one agent (see CLAUDE.md §2) → take **that owner's branch version** entirely.
   - Frozen files edited on a feature branch → keep `main`'s version; if the change was needed, apply it properly
     as a request and note it.
   - `package.json` / lockfile → take union of dependencies, then `rm -rf node_modules && npm install` to regenerate
     the lockfile; run `npx expo install --check` and accept fixes.
   - `handoffs/notes/*` → keep all content (concatenate).
5. **Verify**
   ```bash
   npm install
   npm run typecheck
   npx expo export --platform ios --output-dir /tmp/qb-export   # catches bundling/import errors (no device needed)
   ```
   Also grep for violations: `grep -rn "api.meta.ai\|serpapi.com" app components lib` must return nothing (keys/calls
   only in edge functions); no hard-coded `#` colors in `app/` or `components/` except art files.
6. **Integration fixes (allowed):** wrong import paths, missing exports that an owner clearly intended, prop-name
   mismatches between a component and its caller (fix the **caller** unless the owner's status note says
   otherwise), duplicate providers, route name mismatches, TypeScript errors at module boundaries, missing
   fallbacks for not-yet-built teammate components. **Not allowed:** redesigning screens, changing game rules,
   rewriting a hook's implementation, deleting mock branches. If a real fix requires owner logic changes, leave a
   `// TODO(<OWNER>): …` and list it in the report.
   Commit each fix separately: `[MERGE] fix: <what> (<owner>)`.
7. **Push**: `git push origin main`, then tag `git tag round-N && git push origin round-N`.
8. **Report** — write `handoffs/notes/ROUND-N.md` and push:
   - What merged from each branch (3–6 bullets each, from commit logs).
   - Requests applied/rejected; any new migration to run.
   - Integration fixes made (file + owner).
   - Open TODOs per owner.
   - **Smoke test script for humans** (5 steps on Expo Go) and known breakages.
   - "Each agent: run `git fetch origin && git merge origin/main` before continuing."
9. Tell the team (the human pastes your summary into the group chat).

## Smoke test checklist (have a human run on 2 phones after each round)
1. Mock mode (`npm run mock`): onboarding → coloring page → open mission → submit → region fills → proclamation in chat.
2. Real mode (`npm run dev`): phone A creates fellowship; phone B joins via QR; both see each other.
3. Summon storyline on A; B sees pages appear (realtime).
4. B completes a solo mission with a photo; A sees the region fill live + chat proclamation; Lens titles show.
5. Wizard answers "What should we do next?" with real mission names.

## Round schedule (CST, adjust live)
| Round | Merge at | Goal |
|---|---|---|
| 1 | ~3.5 h after branches start | Base product: core loop in mock mode, real auth/fellowship/chat |
| 2 | +3 h | Real engine end-to-end on devices (storyline + proof + page turn) |
| 3 | ~3 AM | Round 2 features (Lens visible, illustrations, recap/montage, wizard actions) |
| 4 (final) | **7 AM feature freeze** | Bug fixes only after this. Video recorded from `main` at tag `round-4` |
