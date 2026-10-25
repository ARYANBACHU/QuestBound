// Owner: AB. "Shall the bards play?" — a gentle looping lute tune (original, CC0; see assets/audio/README.md).
// <MusicController /> lives once in the root layout: plays while Music is on and the app is in the foreground.
// U6: the music toggle lives at the TOP of screens:
//   <HeaderMusicToggle />   — 40 px header icon, same look as the "…" button; put it header-right (left of "…").
//   <FloatingMusicToggle /> — top-right fallback the tabs layout shows on tabs whose header doesn't have one yet;
//                             it hides itself while the focused screen renders a <HeaderMusicToggle />.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useIsFocused } from 'expo-router';
import { AppState, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useSession } from '@/lib/session';
import { ink, shadow, space } from '@/shared/theme';
import { CoachTarget } from '@/components/wizard/coachTargets';
import { playSfx } from './sfx';
import { ensureAudioMode } from './sfx';
import { hasStoredMusicChoice, loadSoundSettings, setSoundSetting, useSoundSettings } from './soundSettings';

const VOLUME = 0.16;

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
  const player = useRef<AudioPlayer | null>(null);

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
        if (!player.current) {
          player.current = createAudioPlayer(require('@/assets/audio/bards-loop.mp3'));
          player.current.loop = true;
        }
        player.current.volume = VOLUME;
        player.current.play();
      } else {
        player.current?.pause();
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
        if (!player.current) {
          player.current = createAudioPlayer(require('@/assets/audio/bards-loop.mp3'));
          player.current.loop = true;
          player.current.volume = VOLUME;
        }
        // `playing` flips true as soon as play() is called, even if the browser then refuses it, so ask the media.
        if (!player.current.currentStatus?.playing) player.current.play();
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

  useEffect(() => () => { try { player.current?.remove(); } catch {} player.current = null; }, []);
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
  if (!visible || headers > 0) return null;
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
