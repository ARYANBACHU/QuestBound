# Production preflight — Phase 1 (2026-10-25)

Diagnosis only. Nothing was published or deployed. No code was changed (nothing needed a safe local fix).

| # | Check | Status | Fix needed |
|---|-------|--------|------------|
| 1 | On `main`, working tree clean | ✅ | — |
| 1 | Up to date with `origin/main` (after fetch) | ✅ 0 ahead / 0 behind | — |
| 1 | Round-3 merge on main | ✅ HEAD `0fdf904 [MERGE] round 3 report`; report is at `handoffs/notes/ROUND-3.md` (not repo root) | — |
| 1 | `feat/coloring`, `feat/engine`, `feat/friends`, `feat/shell` (local + origin) | ✅ 0 unmerged commits each | — |
| 1 | `origin/claude/*` branches (4) | ✅ 0 unmerged commits each | Optional: delete stale branches |
| 2 | `npm install` | ✅ (npm audit reports advisories; none blocking) | — |
| 2 | `npm run typecheck` | ✅ 0 errors | — |
| 2 | EV's node tests (`node --test fixtures/*.test.mjs`) | ✅ 2/2 pass | — |
| 2 | `expo export --platform ios` | ✅ 6.5 MB Hermes bundle, no warnings | — |
| 2 | `expo export --platform web` | ✅ 15 bundles, no warnings | — |
| 3 | Edge functions deployed (generate-storyline, paint-chapter, reroll-mission, submit-proof, wizard-chat) | ✅ all 5 answer (CORS preflight 200) | — |
| 3 | Deployed functions match latest repo commit | ⚠️ cannot verify — no `SUPABASE_ACCESS_TOKEN` / `supabase login` on this machine. Latest repo changes: `_shared` 10-25 07:55, paint-chapter 07:52, generate-storyline / reroll-mission / submit-proof 07:49, wizard-chat 05:24 (UTC) | Provide a Supabase access token, then redeploy all 5 in Phase 2 (idempotent) |
| 3 | Secret names (LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, IMAGE_MODEL, SERPAPI_KEY, DEMO_FORCE_PASS, GEO_RADIUS_M) | ⚠️ cannot list (same token issue). Indirect: LLM_* are set — wizard-chat returned a real LLM reply, not the canned fallback | Token needed to list; check `DEMO_FORCE_PASS` is off for production |
| 3 | 0002 `message_reactions` table | ✅ exists (REST select OK) | — |
| 3 | 0003 `profiles.music_enabled`, `storylines.difficulty` | ✅ both columns exist | — |
| 3 | 0004 `pages.template_id` CHECK lists 20 ids | ⚠️ not readable with the publishable key | Run in SQL editor: `select pg_get_constraintdef(oid) from pg_constraint where conname = 'pages_template_id_check';` |
| 3 | Live: anonymous sign-in | ✅ | — |
| 3 | Live: wizard-chat replies as Sage | ✅ 2.5 s, in-character LLM reply ("Hear ye! I am Sage…") | — |
| 4 | `.env` `EXPO_PUBLIC_SUPABASE_URL` | ✅ `https://jhqkjfhtekermlbnqtxe.supabase.co` | — |
| 4 | `.env` publishable key | ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…` | — |
| 4 | `.env` `EXPO_PUBLIC_USE_MOCKS` | ✅ `0` | — |
| 4 | `.env` git-ignored | ✅ | Note: EAS Hosting builds locally, so `.env` is baked into the web export — fine |
| 4 | `app.json` `web.output` | ⚠️ `"single"` (SPA) | OK for EAS Hosting; keep unless static rendering is wanted |
| 4 | `app.json` scheme / plugins | ✅ `questbound`; plugins: router, splash, sharing, font, status-bar, camera, image-picker, location, audio | Splash bg is still template blue `#208AEF` (cosmetic) |
| 5 | `eas-cli whoami` with EXPO_TOKEN | ✅ robot `questbound`, account `hacktx` (role: Developer) | — |
| 5 | EAS project | ⚠️ `@hacktx/questbound` exists (id `ff35324e-0d1e-4e9a-a353-5a9cc0f9a591`) but `app.json` has no `owner` / `extra.eas.projectId` | Add `owner: "hacktx"` + projectId in Phase 2 |
| 5 | `eas.json` | ❌ missing | Create in Phase 2 (needed for APK preview build only) |
| 5 | Existing hosting deployment / URL | — none (0 deployments, 0 aliases, 0 builds) | First `eas deploy --prod` will claim the URL |
| 6 | Image picker on web | ✅ uses file input; upload path does `fetch(uri).arrayBuffer()` which works with blob URIs | Camera option opens a file chooser on desktop (acceptable) |
| 6 | Haptics on web | ✅ every call wrapped in `.catch` / `safe()`; expo-haptics ships a web impl | — |
| 6 | expo-audio music autoplay | ⚠️ music starts on mount; browsers block audio before a user gesture (silently fails, try/catch present) | Start/resume music on first tap on web |
| 6 | Geolocation | ✅ `reverseGeocodeAsync` is in try/catch → falls back to coords + default label; web needs HTTPS (hosting provides it) | — |
| 6 | expo-blur (CoachMark) | ✅ web supported (backdrop-filter) | — |
| 6 | expo-camera QR scanner in onboarding | ⚠️ web barcode scanning is unreliable; web users will normally arrive via the link anyway | On web, hide "Scan QR" or default to typing the code |
| 6 | `Share.share` on desktop browsers | ⚠️ `navigator.share` missing on desktop → error is swallowed, nothing happens | Fallback: copy the link to clipboard + toast |
| 6 | Reanimated `useAnimatedKeyboard` (KeyboardSafe) | ⚠️ console warning on web, no crash | Skip the hook on web |
| 6 | Native-only modules (`expo-glass-effect`, `@expo/ui`, `expo-symbols`) | ✅ installed but not imported by app code | — |
| 6 | Invite QR / share link | ❌ `questbound://join/CODE` (`components/friends/InviteSheet.tsx:17`) — useless to anyone without the app | Switch to `https://<public-url>/join/CODE` (Phase 2 item 2) |
| 6 | Web `/join/[code]` route | ✅ works in the web export: signs in anonymously, looks up the code, shows "The gate stayed shut" for a bad code | — |
| 6 | `parseInviteCode` accepts https links | ✅ regex matches `join/CODE` in any URL | — |
| 6 | PWA manifest / installable icon | ❌ none | Add in Phase 2 |
| 6 | Desktop-width layout | ⚠️ app stretches to full browser width | Center in a ~480 px column on wide screens |

## Side effects of this check
- One anonymous user was created in Supabase by the live sign-in probe (and a few more by the web smoke test of `/join/ABCDEF`).
- Build outputs went to a scratch directory, not the repo. The only repo change is this file (uncommitted).

---

# Phase 2 — results (2026-10-25)

**Public URL: https://questbound.expo.app** (EAS Hosting, project `@hacktx/questbound`)

| Item | Status | Notes |
|------|--------|-------|
| Deployed edge functions vs repo | ✅ | All 5 were deployed 09:33 UTC (after the last repo change, 07:55). Redeployed all 5 anyway. |
| Secret names | ✅ | All 7 present: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, IMAGE_MODEL, SERPAPI_KEY, DEMO_FORCE_PASS, GEO_RADIUS_M |
| DEMO_FORCE_PASS / GEO_RADIUS_M | ✅ | Were already `0` / `400`; set again explicitly |
| `pages_template_id_check` | ✅ | Lists all 20 ids; 0004 did not need re-applying |
| Invite QR + share link | ✅ | `https://questbound.expo.app/join/CODE` (`PUBLIC_APP_URL` in `lib/env.ts`, overridable with `EXPO_PUBLIC_APP_URL`; web uses its own origin). `questbound://` still routes to `/join/[code]`. |
| Share on desktop | ✅ | Uses `navigator.share` when present, otherwise copies the link ("Link copied!") |
| Music on web | ✅ | Retries on the first tap / key press; verified the bards loop playing in production |
| QR scanning on web | ✅ | Onboarding hides "Scan a QR code" on web; typing the code (or opening the link) is the path. Native unchanged. |
| Desktop layout | ✅ | 480 px centered column (`public/index.html` CSS + `lib/webFrame.ts` clamps the window width the app measures; coach marks and montage taps offset for the column) |
| Keyboard warning | ✅ | `KeyboardSafe` skips Reanimated's keyboard tracker on web |
| Location prompt hang (found during testing) | ✅ | An unanswered browser location prompt blocked "Found the fellowship" forever. Permission request now times out after 12 s and falls back to the default location. |
| PWA | ✅ | `public/manifest.json`, icons 192/512/maskable/apple-touch (new Sage icon; also replaces the Expo template app icon, Android adaptive icon and splash) |
| `app.json` / `eas.json` | ✅ | `owner: hacktx`, `extra.eas.projectId`, `android.package` / `ios.bundleIdentifier` = `com.hacktx.questbound`; eas.json `preview` (APK) + `production` profiles with the public build env |
| End-to-end on production | ✅ | Founder: onboarding → found fellowship → summon book ("The Borrowed Crown of Austin") → coloring page. Joiner (separate origin, own session): `/join/CODE` → anonymous sign-in → join → onboarding → lands on the same Chapter I page. Founder's Friends tab shows "2 here now". |
| `assets/qr-web.png` | ✅ | QR of https://questbound.expo.app; README updated |
