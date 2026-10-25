# Questbound — HackTX 2026

A fairy-tale coloring book written by AI for your friend group. Sage the Wizard (✦ powered by Muse, Meta's model) blends everyone's interests with
real places and events nearby (SerpApi) into a storyline. Every region of every coloring page is a real-world
mission. Complete it together, and it fills with your crayon color. Finish a page, the story turns. Finish the
book, get an album and a montage — and Sage writes the sequel based on what you actually did.

**Tracks:** Meta "Bringing People Closer Together with AI" · Best Use of SerpApi · Most Entertaining.

**Stack:** Expo (React Native, Expo Router) · Supabase (Auth, Postgres, Realtime, Storage, Edge Functions) ·
Meta Model API (Muse Spark, Muse Image) · SerpApi (Google Maps, Google Events, Google Lens).

## Play it now

**https://questbound.expo.app** — open it on any phone (add it to your home screen for the full-screen app).

<img src="assets/qr-web.png" alt="QR code for https://questbound.expo.app" width="180" />

- Invite friends from **Friends → Invite**: the QR and share link are `https://questbound.expo.app/join/CODE`, which
  works in any browser (the native app still opens `questbound://join/CODE`).
- Android APK (internal preview build): see the latest build on the
  [EAS dashboard](https://expo.dev/accounts/hacktx/projects/questbound/builds).

### Deploying

```bash
npx expo export --platform web          # uses .env (EXPO_PUBLIC_USE_MOCKS=0 + Supabase URL / publishable key)
npx eas-cli deploy --prod               # EAS Hosting → https://questbound.expo.app
npx eas-cli build -p android --profile preview   # APK; build env lives in eas.json
```

**Start here:** `CLAUDE.md` (rules for every agent) → `handoffs/SETUP.md` → your `handoffs/<INITIALS>.md`.

**Credits:** Music & sound effects: original, synthesized for Questbound, CC0 — see `assets/audio/README.md`.
