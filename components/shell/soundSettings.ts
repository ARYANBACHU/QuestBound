// Owner: AB. Sound settings (AsyncStorage): "Sound effects" (default on) and "Music" (the bards, default off until
// the player says yes in onboarding). Tiny store with listeners so the toggles, sfx and music stay in sync.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export interface SoundSettings {
  sfx: boolean;
  music: boolean;
}

const KEYS = { sfx: 'qb.sound.sfx', music: 'qb.sound.music' } as const;
let state: SoundSettings = { sfx: true, music: false };
let loaded = false;
let musicStored = false; // has this device ever saved a music choice?
let loading: Promise<SoundSettings> | null = null;
const listeners = new Set<(s: SoundSettings) => void>();

/** Reads saved settings once (later calls reuse the result). */
export function loadSoundSettings(): Promise<SoundSettings> {
  if (loaded) return Promise.resolve(state);
  loading ??= (async () => {
    try {
      const [[, sfx], [, music]] = await AsyncStorage.multiGet([KEYS.sfx, KEYS.music]);
      state = { sfx: sfx == null ? true : sfx === '1', music: music === '1' };
      musicStored = music != null;
    } catch {}
    loaded = true;
    listeners.forEach((fn) => fn(state));
    return state;
  })();
  return loading;
}

export function getSoundSettings(): SoundSettings {
  return state;
}

/** True once this device has a saved music choice (otherwise the profile's music_enabled is adopted). */
export function hasStoredMusicChoice() {
  return musicStored;
}

export function setSoundSetting(key: keyof SoundSettings, value: boolean) {
  if (key === 'music') musicStored = true;
  state = { ...state, [key]: value };
  loaded = true;
  listeners.forEach((fn) => fn(state));
  AsyncStorage.setItem(KEYS[key], value ? '1' : '0').catch(() => {});
}

export function onSoundSettings(fn: (s: SoundSettings) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useSoundSettings(): SoundSettings & { ready: boolean } {
  const [s, setS] = useState(state);
  const [ready, setReady] = useState(loaded);
  useEffect(() => {
    const off = onSoundSettings((next) => { setS(next); setReady(true); });
    loadSoundSettings().then((next) => { setS(next); setReady(true); });
    return off;
  }, []);
  return { ...s, ready };
}
