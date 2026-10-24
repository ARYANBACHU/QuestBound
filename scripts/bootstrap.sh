#!/usr/bin/env bash
# ONE-TIME infra setup (repo owner runs this locally, ~5 min).
# Usage:  bash questbound-kit/scripts/bootstrap.sh questbound git@github.com:<you>/questbound.git
set -euo pipefail
APP="${1:-questbound}"
REMOTE="${2:-}"
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "==> Kit: $KIT   App dir: $APP"

npx --yes create-expo-app@latest "$APP" --template default
cd "$APP"

# Remove template demo code; our kit replaces it.
rm -rf app components hooks constants app-example scripts/reset-project.js

# Layer the kit on top.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude '.git' "$KIT"/ ./
else
  cp -R "$KIT"/. ./
fi

echo "==> Installing dependencies (expo picks SDK-compatible versions)"
npx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage \
  react-native-svg expo-image-picker expo-camera expo-location expo-haptics expo-linear-gradient \
  expo-clipboard expo-sharing expo-font expo-blur expo-status-bar \
  @expo-google-fonts/fraunces @expo-google-fonts/nunito
npm install react-native-qrcode-svg

node scripts/patch-config.js
cp -n .env.example .env || true

echo "==> Typecheck"
npx tsc --noEmit || echo "!! typecheck failed — fix before pushing"

git init -b main >/dev/null 2>&1 || true
git add -A
git commit -m "chore(infra): Questbound skeleton — contracts, schema, mocks, handoffs" >/dev/null
for b in feat/engine feat/friends feat/coloring feat/shell; do git branch "$b"; done

if [ -n "$REMOTE" ]; then
  git remote add origin "$REMOTE"
  git push -u origin main feat/engine feat/friends feat/coloring feat/shell
  echo "==> Pushed main + 4 feature branches to $REMOTE"
else
  echo "==> Add a remote and push:  git remote add origin <url> && git push -u origin --all"
fi
echo "==> Done. Next: handoffs/SETUP.md steps 3-6."
