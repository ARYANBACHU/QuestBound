// Owner: AB. Tiny sound-effect helper for everyone: playSfx('ping' | 'crayon' | 'page' | 'seal').
// Preloaded expo-audio players, low volume, respects Settings → "Sound effects", never throws.
// Sounds are original and CC0 (see assets/audio/README.md).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getSoundSettings, loadSoundSettings } from './soundSettings';

export type SfxName = 'ping' | 'crayon' | 'page' | 'seal';

const SOURCES: Record<SfxName, number> = {
  ping: require('@/assets/audio/sfx/ping.wav'),
  crayon: require('@/assets/audio/sfx/crayon.wav'),
  page: require('@/assets/audio/sfx/page.wav'),
  seal: require('@/assets/audio/sfx/seal.wav'),
};
const VOLUME: Record<SfxName, number> = { ping: 0.28, crayon: 0.45, page: 0.5, seal: 0.5 };
/** Ignore repeats of the same sound closer together than this (re-renders, double events). */
const MIN_GAP_MS = 120;

const players: Partial<Record<SfxName, AudioPlayer>> = {};
const lastPlayed: Partial<Record<SfxName, number>> = {};
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
    if (now - (lastPlayed[name] ?? 0) < MIN_GAP_MS) return;
    lastPlayed[name] = now;
    ensureAudioMode();
    const p = player(name);
    if (!p) return;
    p.volume = VOLUME[name];
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // sound is a garnish — never break the app over it
  }
}
