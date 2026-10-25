// Owner: AB. "Shall the bards play?" — a gentle looping lute tune (original, CC0; see assets/audio/README.md).
// <MusicController /> lives once in the root layout: plays while Music is on and the app is in the foreground.
// useMusicDuck(active) — lowers the same track (montage); there is only ever ONE bards player (V8).
// U6: the music toggle lives at the TOP of screens:
//   <HeaderMusicToggle />   — 40 px header icon, same look as the "…" button; put it header-right (left of "…").
//   <FloatingMusicToggle /> — top-right fallback the tabs layout shows on tabs whose header doesn't have one yet;
//                             it hides itself while the focused screen renders a <HeaderMusicToggle />.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useIsFocused } from 'expo-router';
import { AppState, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useSession } from '@/lib/session';
import { ink, shadow, space } from '@/shared/theme';
import { CoachTarget } from '@/components/wizard/coachTargets';
import { useWizard } from '@/components/wizard/WizardProvider';
import { playSfx } from './sfx';
import { ensureAudioMode } from './sfx';
import { hasStoredMusicChoice, loadSoundSettings, setSoundSetting, useSoundSettings } from './soundSettings';

const VOLUME = 0.16;
const DUCKED = 0.35; // V8: montage & friends lower the bards to 35 % — same track, never a second one

// ONE bards player for the whole app (V8): module-level, so a remount (error-boundary reset, fast refresh, a screen
// that thinks it needs music) can never start a second, overlapping track.
let bards: AudioPlayer | null = null;
function getBards(): AudioPlayer | null {
  try {
    if (!bards) {
      bards = createAudioPlayer(require('@/assets/audio/bards-loop.mp3'));
      bards.loop = true;
      bards.volume = targetVolume();
    }
    return bards;
  } catch {
    return null; // no audio on this device — the tale goes on in silence
  }
}

let duckers = 0;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
const targetVolume = () => (duckers > 0 ? VOLUME * DUCKED : VOLUME);
/** Glide the bards' volume to the current target over ~300 ms (no jump, no restart). */
function glideVolume() {
  if (fadeTimer) clearInterval(fadeTimer);
  const p = bards;
  if (!p) return;
  const from = p.volume;
  const to = targetVolume();
  let step = 0;
  fadeTimer = setInterval(() => {
    step++;
    try { p.volume = from + ((to - from) * step) / 6; } catch {}
    if (step >= 6 && fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  }, 50);
}

/**
 * V8: lower the bards while `active` (e.g. the Storybook montage) and restore them after. Same track keeps playing —
 *   useMusicDuck(montageOpen);
 */
export function useMusicDuck(active: boolean) {
  useEffect(() => {
    if (!active) return;
    duckers++;
    glideVolume();
    return () => { duckers = Math.max(0, duckers - 1); glideVolume(); };
  }, [active]);
}

/** Turn the bards on/off everywhere: local setting (instant) + profile.music_enabled (best effort). */
export function useMusicToggle() {
  const { music } = useSoundSettings();
  const { profile, updateProfile } = useSession();
  return {
    music,
    setMusic: (on: boolean) => {
      setSoundSetting('music', on);
      if (profile && profile.music_enabled !== on) updateProfile({ music_enabled: on }).catch(() => {});
    },
  };
}

export function MusicController() {
  const { music, ready } = useSoundSettings();
  const { profile } = useSession();
  const [active, setActive] = useState(AppState.currentState === 'active');

  // A fresh install adopts the profile's choice (e.g. reinstall, second device).
  useEffect(() => {
    if (!profile) return;
    loadSoundSettings().then(() => {
      if (!hasStoredMusicChoice() && typeof profile.music_enabled === 'boolean') setSoundSetting('music', profile.music_enabled);
    });
  }, [profile]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (music && active) {
        ensureAudioMode();
        const p = getBards();
        if (p && !p.playing) p.play(); // already playing → leave it alone (no restart, no second track)
      } else {
        bards?.pause();
      }
    } catch {
      // no audio on this device — the tale goes on in silence
    }
  }, [music, active, ready]);

  // Web: browsers block sound until the visitor interacts, so the play() above is refused on first load.
  // Retry on the first tap / key press after music is on.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !ready || !music || !active) return;
    const kick = () => {
      try {
        const p = getBards();
        // `playing` flips true as soon as play() is called, even if the browser then refuses it, so ask the media.
        if (p && !p.currentStatus?.playing) p.play();
      } catch {
        // no audio in this browser
      }
    };
    const opts = { capture: true } as const;
    document.addEventListener('pointerdown', kick, opts);
    document.addEventListener('keydown', kick, opts);
    return () => {
      document.removeEventListener('pointerdown', kick, opts);
      document.removeEventListener('keydown', kick, opts);
    };
  }, [music, active, ready]);

  // Unmount (app teardown / error-boundary reset): pause only. The one player stays, so a remount resumes it.
  useEffect(() => () => { try { bards?.pause(); } catch {} }, []);
  return null;
}

export function SpeakerIcon({ on, size = 18, color = ink.ink }: { on: boolean; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 9h4l5-4v14l-5-4H4z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {on ? (
        <Path d="M16 8.5c1.2 1 1.8 2.2 1.8 3.5s-.6 2.5-1.8 3.5M18.5 6c2 1.6 3 3.6 3 6s-1 4.4-3 6" stroke={color}
          strokeWidth={2} strokeLinecap="round" fill="none" />
      ) : (
        <Path d="M16.5 9.5l5 5m0-5l-5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      )}
    </Svg>
  );
}

/** Small round music button (kept for anyone still importing it). */
export function MuteToggle({ style, size = 30 }: { style?: StyleProp<ViewStyle>; size?: number }) {
  const { music, setMusic } = useMusicToggle();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: music }}
      accessibilityLabel={music ? 'Music on. Tap to mute the bards' : 'Music off. Tap to let the bards play'}
      hitSlop={10}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('toggle'); setMusic(!music); }}
      style={({ pressed }) => [
        styles.mute, { width: size, height: size, borderRadius: size / 2 }, !music && styles.muteOff, pressed && styles.pressed, style,
      ]}
    >
      <SpeakerIcon on={music} size={Math.round(size * 0.5)} color={music ? ink.ink : ink.muted} />
    </Pressable>
  );
}

// ---- which focused screen already shows a header toggle (so the floating fallback can step aside) ----
let headerCount = 0;
const headerSubs = new Set<() => void>();
const subscribeHeader = (f: () => void) => { headerSubs.add(f); return () => { headerSubs.delete(f); }; };
const bump = (d: number) => { headerCount = Math.max(0, headerCount + d); headerSubs.forEach((f) => f()); };

/** Header-right music icon (40 px, matches the "…" button). */
export function HeaderMusicToggle({ style }: { style?: StyleProp<ViewStyle> }) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    bump(1);
    return () => bump(-1);
  }, [focused]);
  return <CoachTarget id="music.header"><MuteToggle size={40} style={style} /></CoachTarget>;
}

/** Top-right fallback for tabs whose header has no <HeaderMusicToggle /> yet. Rendered by the tabs layout. */
export function FloatingMusicToggle({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const headers = useSyncExternalStore(subscribeHeader, () => headerCount, () => headerCount);
  // V5: a focused screen that hides Sage's button (Storybook reader, montage, full-screen viewers) has its own top bar
  // (e.g. the reader's Montage button sits top-right) — the floating fallback steps aside so nothing overlaps.
  const { fabHidden } = useWizard();
  if (!visible || headers > 0 || fabHidden) return null;
  return (
    <View style={[styles.floating, { top: insets.top + space.sm }]} pointerEvents="box-none">
      <MuteToggle size={34} />
    </View>
  );
}

const styles = StyleSheet.create({
  mute: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: ink.page, borderWidth: 2, borderColor: ink.ink, ...shadow.sm,
  },
  floating: { position: 'absolute', right: space.lg, zIndex: 15 },
  muteOff: { borderColor: ink.muted },
  pressed: { transform: [{ scale: 0.92 }] },
});
