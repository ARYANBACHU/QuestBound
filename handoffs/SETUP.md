# SETUP — infra in ~30 minutes (repo owner does steps 1–5; everyone does 6–7)

## 1. Create the repo (5 min, owner's laptop: Node 20+, git, gh optional)
```bash
unzip questbound-kit.zip            # -> questbound-kit/
gh repo create questbound --private --clone=false   # or create on github.com
bash questbound-kit/scripts/bootstrap.sh questbound git@github.com:<you>/questbound.git
```
This creates the Expo app, layers the kit, installs deps, typechecks, commits, creates
`feat/engine feat/friends feat/coloring feat/shell`, and pushes everything. Add the 3 teammates as collaborators.

## 2. Supabase (10 min) — one project for the team
1. supabase.com → New project (region: US East/Central). Save the DB password.
2. **SQL Editor** → paste `supabase/migrations/0001_init.sql` → Run. (If "publication already has table" errors
   appear on re-run, ignore them.)
3. **Authentication → Providers → Anonymous sign-ins: ON.**
4. **Project Settings → API**: copy Project URL + anon key into `.env` (`EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Share them in the team chat (anon key is public-safe).
5. **Secrets** (from the repo folder):
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase secrets set LLM_API_KEY=<meta key> LLM_BASE_URL=https://api.meta.ai/v1 \
     LLM_MODEL=muse-spark-1.1 IMAGE_MODEL=muse-image-1.0 SERPAPI_KEY=<serpapi key> DEMO_FORCE_PASS=0
   npx supabase functions deploy generate-storyline submit-proof wizard-chat
   ```
   Verify the Meta base URL/model ids on dev.meta.ai first. Get SerpApi credits at the SerpApi table.

## 3. Keys checklist
- [ ] Meta Model API key (dev.meta.ai) — ask Meta's table about hackathon credits
- [ ] SerpApi key (+ hackathon credits)
- [ ] Supabase URL + anon key (+ service role stays server-side only, auto-injected into functions)

## 4. Claude Code on the web (cloud) — each teammate, 5 min
Each person uses their own Claude account at claude.ai/code:
1. Connect GitHub (authorize the Claude GitHub App, or run `/web-setup` from the Claude Code CLI) and grant access
   to the `questbound` repo.
2. Create an **environment** named `questbound`:
   - **Network access:** Trusted is enough to `npm install` and push. **EV** needs a custom allowlist or Full access
     to also reach `api.supabase.com`, `*.supabase.co`, `serpapi.com`, `api.meta.ai` (to deploy/curl functions).
   - **Environment variables** (.env format): `EXPO_PUBLIC_USE_MOCKS=1` and, for EV only,
     `SUPABASE_ACCESS_TOKEN=…`, `LLM_API_KEY=…`, `LLM_BASE_URL=…`, `LLM_MODEL=…`, `SERPAPI_KEY=…`.
     These values are visible to anyone who can edit that environment.
   - **Setup script:** `npm install -g npm@latest >/dev/null 2>&1 || true` (deps are installed by the agent per
     CLAUDE.md §3 since node_modules isn't committed).
3. Start a session on the repo, paste the kickoff prompt from your handoff file (`handoffs/<INITIALS>.md`).
4. Cloud sessions write code, typecheck and **push**. They can't run the app on your phone — testing happens locally
   (step 6).

Using the VS Code Claude extension locally instead is identical: open the repo, `git checkout feat/<yours>`, paste the
kickoff prompt.

## 5. Merge Agent
A separate Claude Code session (cloud or local) on `main`. When the team calls a round, paste the MERGER.md kickoff
prompt with the round number.

## 6. Run on your phone (anyone, local laptop)
```bash
git checkout main && git pull && npm install
npm run mock     # no backend, fixtures only (EXPO_PUBLIC_USE_MOCKS=1)
npm run dev      # real Supabase (set EXPO_PUBLIC_USE_MOCKS=0 in .env)
```
Install **Expo Go** from the App Store / Play Store, scan the QR. `--tunnel` works across hackathon Wi-Fi.
To test your own branch: `git checkout feat/<yours> && git pull`.

## 7. Team roles
| Initials | Agent | Branch | Handoff |
|---|---|---|---|
| EV | Story Engine | feat/engine | handoffs/EV.md |
| MP | Fellowship & Friends | feat/friends | handoffs/MP.md |
| AD | Artist: Coloring & Storybook | feat/coloring | handoffs/AD.md |
| AB | Wizard & Shell | feat/shell | handoffs/AB.md |
| — | Merge Agent | main | handoffs/MERGER.md |
