// Owner: MP. In-app banner for proclamations (and friends' messages) that arrive while you're on another tab.
// Mount ONCE inside app/(tabs)/_layout.tsx (AB):  <ProclamationToast />
// Tap → the mission / page / storybook (or the chat for a text). Hides itself after a few seconds.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, { Easing, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SAGE_CREDIT, fonts, ink, panel, radius, shadow, space, type } from '@/shared/theme';
import type { Message } from '@/shared/types';
import { useChat } from '@/lib/chat';
import { heroName, profileOf, useFellowship } from '@/lib/fellowship';
import { useSession } from '@/lib/session';
import Crest, { crestEmoji } from './Crest';
import { crayonHex } from './color';
import { haptic } from './haptics';
import { Sage } from './sage';
import { openProclamation } from './ProclamationCard';

const SHOW_MS = 5000;

// Calm, standard motion (V7): a short fade + slide from just above, no spring, no overshoot.
// Bezier easings run on native and translate to CSS cubic-bezier on web. Reduced motion is respected by default.
const ENTER = FadeInUp.duration(220).easing(Easing.bezier(0.2, 0, 0, 1));
const EXIT = FadeOutUp.duration(160).easing(Easing.bezier(0.4, 0, 1, 1));

export default function ProclamationToast() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { userId } = useSession();
  const { fellowship, members } = useFellowship();
  const { messages } = useChat(fellowship?.id ?? null);
  const [current, setCurrent] = useState<Message | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFriends = pathname === '/friends' || pathname.startsWith('/friends');

  useEffect(() => {
    // First batch (history) is never toasted.
    if (seen.current === null) {
      if (messages.length) seen.current = new Set(messages.map((m) => m.id));
      return;
    }
    const fresh = messages.filter((m) => !seen.current!.has(m.id));
    fresh.forEach((m) => seen.current!.add(m.id));
    if (onFriends) return;
    const pick = [...fresh].reverse().find((m) => {
      if (m.id.startsWith('temp-')) return false;
      if (m.kind === 'proclamation') return !(m.payload?.event === 'mission_complete' && m.payload.user_id === userId);
      if (m.kind === 'text' || m.kind === 'wizard') return m.user_id !== userId;
      return false;
    });
    if (!pick) return;
    setCurrent(pick);
    haptic.tap();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCurrent(null), SHOW_MS);
  }, [messages, onFriends, userId]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Never cover the chat itself.
  useEffect(() => {
    if (onFriends) setCurrent(null);
  }, [onFriends]);

  if (!current) return null;

  const isProc = current.kind === 'proclamation';
  const actor = profileOf(members, current.payload?.user_id ?? current.user_id);
  const stripe = current.payload?.color ? crayonHex(current.payload.color) : actor ? crayonHex(actor.color) : ink.gold;

  const open = () => {
    setCurrent(null);
    if (isProc) openProclamation(current, () => router.navigate('/(tabs)/friends'));
    else router.navigate('/(tabs)/friends');
  };

  return (
    <Animated.View
      key={current.id}
      entering={ENTER}
      exiting={EXIT}
      style={[styles.wrap, { top: insets.top + space.sm }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={open} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
        <View style={[styles.stripe, { backgroundColor: isProc ? stripe : ink.lavenderMist }]} />
        {isProc ? (
          <View style={styles.seal}>
            <Text style={styles.sealEmoji} allowFontScaling={false}>
              {actor ? crestEmoji(actor.crest) : '📜'}
            </Text>
          </View>
        ) : current.kind === 'wizard' ? (
          <Sage expression="happy" size="sm" />
        ) : (
          <Crest crest={actor?.crest} color={actor?.color} size={40} />
        )}
        <View style={styles.text}>
          <Text style={styles.label} numberOfLines={1}>
            {isProc ? 'Hear ye!' : current.kind === 'wizard' ? 'Sage' : heroName(actor)}
            {current.kind === 'wizard' ? <Text style={styles.credit}>{`  ${SAGE_CREDIT}`}</Text> : null}
          </Text>
          <Text style={isProc ? styles.bodyProc : styles.body} numberOfLines={2}>
            {current.body}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Shadow on the wrapper: the card clips its stripe with overflow:hidden, which would hide an iOS shadow.
  wrap: { position: 'absolute', left: space.md, right: space.md, zIndex: 100, borderRadius: radius.md, ...shadow.lg, elevation: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: panel.parchment,
    borderWidth: 3,
    borderColor: ink.ink,
    borderRadius: radius.md,
    padding: space.md,
    paddingLeft: space.md + 6,
    overflow: 'hidden',
  },
  pressed: { transform: [{ scale: 0.985 }] },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, borderRightWidth: 2, borderRightColor: ink.ink },
  seal: { width: 40, height: 40, borderRadius: 20, backgroundColor: ink.gold, borderWidth: 2.5, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
  sealEmoji: { fontSize: 19 },
  text: { flex: 1 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.inkSoft, letterSpacing: 0.5 },
  credit: { fontFamily: fonts.body, fontSize: 11, color: ink.muted, letterSpacing: 0 },
  body: { fontFamily: fonts.body, fontSize: type.body - 1, color: ink.ink, marginTop: 1 },
  bodyProc: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.ink, marginTop: 1 },
});
