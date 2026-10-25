// Owner: AB. "Shall the bards play?" — a gentle looping lute tune (original, CC0; see assets/audio/README.md).
// <MusicController /> lives once in the root layout: plays while Music is on and the app is in the foreground.
// <MuteToggle /> is the small speaker button that sits on the tab bar.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSession } from '@/lib/session';
import { ink, shadow } from '@/shared/theme';
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

/** Small round mute button for the tab bar. */
export function MuteToggle({ style }: { style?: StyleProp<ViewStyle> }) {
  const { music, setMusic } = useMusicToggle();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: music }}
      accessibilityLabel={music ? 'Music on. Tap to mute the bards' : 'Music off. Tap to let the bards play'}
      hitSlop={10}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); setMusic(!music); }}
      style={({ pressed }) => [styles.mute, !music && styles.muteOff, pressed && styles.pressed, style]}
    >
      <SpeakerIcon on={music} size={16} color={music ? ink.ink : ink.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mute: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.page,
    borderWidth: 2, borderColor: ink.ink, ...shadow.sm,
  },
  muteOff: { borderColor: ink.muted },
  pressed: { transform: [{ scale: 0.92 }] },
});
