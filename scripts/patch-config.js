// Infra: patches app.json, tsconfig.json, package.json, .gitignore after create-expo-app. Idempotent.
const fs = require('fs');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');

const app = read('app.json');
app.expo.name = 'Questbound';
app.expo.slug = 'questbound';
app.expo.scheme = 'questbound';
const plugins = (app.expo.plugins || []).filter((p) => !['expo-camera', 'expo-image-picker', 'expo-location'].includes(Array.isArray(p) ? p[0] : p));
plugins.push(
  ['expo-camera', { cameraPermission: 'Questbound uses your camera to capture mission proofs and scan fellowship invites.' }],
  ['expo-image-picker', { photosPermission: 'Questbound uses your photos as mission proofs.', cameraPermission: 'Questbound uses your camera to capture mission proofs.' }],
  ['expo-location', { locationWhenInUsePermission: 'Questbound finds real places near your fellowship for your story.' }],
);
app.expo.plugins = plugins;
write('app.json', app);

const ts = read('tsconfig.json');
ts.compilerOptions = { ...(ts.compilerOptions || {}), strict: true, paths: { '@/*': ['./*'] } };
ts.exclude = Array.from(new Set([...(ts.exclude || []), 'node_modules', 'supabase/functions']));
write('tsconfig.json', ts);

const pkg = read('package.json');
pkg.scripts = { ...pkg.scripts, typecheck: 'tsc --noEmit', mock: 'EXPO_PUBLIC_USE_MOCKS=1 expo start --tunnel', dev: 'expo start --tunnel' };
write('package.json', pkg);

const gi = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
const add = ['.env', '.env.local', 'supabase/.temp', '.DS_Store'].filter((l) => !gi.split('\n').includes(l));
if (add.length) fs.appendFileSync('.gitignore', '\n# questbound\n' + add.join('\n') + '\n');
console.log('patched app.json, tsconfig.json, package.json, .gitignore');
