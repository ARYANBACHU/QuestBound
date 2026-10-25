// Owner: AB. Tiny sound-effect helper for everyone: playSfx(name). Preloaded expo-audio players, low volume, respects
// Settings → "Sound effects", never throws. Sounds are original and CC0 (see assets/audio/README.md).
//
// One sound per action: 'tap' / 'toggle' are "soft" — they wait one frame and are dropped if the same action plays a
// real sound (e.g. a Button's tap + the 'send' its onPress plays → only 'send' is heard).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getSoundSettings, loadSoundSettings } from './soundSettings';

export type SfxName =
  | 'tap' | 'toggle' | 'open' | 'close' | 'send' | 'success' | 'error' | 'reward'
  | 'page' | 'pageBack' | 'crayon' | 'seal' | 'ping';

const SOURCES: Record<SfxName, number> = {
  tap: require('@/assets/audio/sfx/tap.wav'),
  toggle: require('@/assets/audio/sfx/toggle.wav'),
  open: require('@/assets/audio/sfx/open.wav'),
  close: require('@/assets/audio/sfx/close.wav'),
  send: require('@/assets/audio/sfx/send.wav'),
  success: require('@/assets/audio/sfx/success.wav'),
  error: require('@/assets/audio/sfx/error.wav'),
  reward: require('@/assets/audio/sfx/reward.wav'),
  pageBack: require('@/assets/audio/sfx/pageBack.wav'),
  ping: require('@/assets/audio/sfx/ping.wav'),
  crayon: require('@/assets/audio/sfx/crayon.wav'),
  page: require('@/assets/audio/sfx/page.wav'),
  seal: require('@/assets/audio/sfx/seal.wav'),
};
const VOLUME: Record<SfxName, number> = {
  tap: 0.16, toggle: 0.2, open: 0.24, close: 0.2, send: 0.28, success: 0.36, error: 0.3, reward: 0.5,
  page: 0.5, pageBack: 0.45, crayon: 0.45, seal: 0.5, ping: 0.28,
};
const SOFT = new Set<SfxName>(['tap', 'toggle']);
/** A soft sound waits this long and is dropped if a real one plays meanwhile (or just played). */
const SOFT_WAIT_MS = 24;
/** Ignore repeats of the same sound closer together than this (re-renders, double events). */
const MIN_GAP_MS = 120;

const players: Partial<Record<SfxName, AudioPlayer>> = {};
const lastPlayed: Partial<Record<SfxName, number>> = {};
let lastReal = 0;
let pendingSoft: ReturnType<typeof setTimeout> | null = null;
let modeSet = false;

/** Shared audio mode: mix with the user's own audio, respect the silent switch. Safe to call often. */
export function ensureAudioMode() {
  if (modeSet) return;
  modeSet = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
}

function player(name: SfxName): AudioPlayer | null {
  try {
    players[name] ??= createAudioPlayer(SOURCES[name]);
    return players[name] ?? null;
  } catch {
    return null;
  }
}

/** Call once at startup (root layout) so the first sound has no delay. */
export function preloadSfx() {
  ensureAudioMode();
  loadSoundSettings().catch(() => {});
  (Object.keys(SOURCES) as SfxName[]).forEach((n) => player(n));
}

/** Plays a short sound effect. No-op when "Sound effects" is off or audio is unavailable. */
export function playSfx(name: SfxName) {
  try {
    if (!getSoundSettings().sfx) return;
    const now = Date.now();
    if (SOFT.has(name)) {
      if (now - lastReal < 80) return; // the action already made its sound
      if (pendingSoft) clearTimeout(pendingSoft);
      pendingSoft = setTimeout(() => { pendingSoft = null; if (Date.now() - lastReal >= SOFT_WAIT_MS) fire(name); }, SOFT_WAIT_MS);
      return;
    }
    if (pendingSoft) { clearTimeout(pendingSoft); pendingSoft = null; }
    lastReal = now;
    fire(name);
  } catch {
    // sound is a garnish — never break the app over it
  }
}

function fire(name: SfxName) {
  try {
    const now = Date.now();
    if (now - (lastPlayed[name] ?? 0) < MIN_GAP_MS) return;
    lastPlayed[name] = now;
    ensureAudioMode();
    const p = player(name);
    if (!p) return;
    p.volume = VOLUME[name];
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // never throw from a sound
  }
}
