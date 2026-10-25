// Owner: AD. The book's cover. <CoverSwing> lays it over the reader and swings it open on its spine.
'use no memo';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ink, realm, scrim, space } from '@/shared/theme';
import type { Storyline } from '@/shared/types';
import { roman } from '@/components/coloring/pageUtils';
import { Txt } from '@/components/coloring/ui';
import { playSfx } from '@/components/coloring/sfx';

const OPEN_MS = 1000;

export function BookCover({ book }: { book: Storyline }) {
  return (
    <LinearGradient colors={[realm.royalPurple, realm.nightIndigo]} style={styles.cover}>
      <View style={styles.inset}>
        <Txt v="smallBold" color={realm.warmGold} center>✦ BOOK {roman(book.book_number)} ✦</Txt>
        <Txt v="hero" color={ink.page} center>{book.title}</Txt>
        <View style={styles.rule} />
        <Txt v="story" color={ink.lavenderMist} center numberOfLines={4}>{book.synopsis}</Txt>
      </View>
      <View style={styles.spine} />
    </LinearGradient>
  );
}

export function CoverSwing({ book, onDone }: { book: Storyline; onDone: () => void }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) { onDone(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    playSfx('page');
    p.value = withDelay(220, withTiming(1, { duration: OPEN_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(onDone)();
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const coverStyle = useAnimatedStyle(() => {
    const deg = -180 * p.value;
    return { opacity: deg < -90 ? 0 : 1, transform: [{ perspective: 1400 }, { rotateY: `${deg}deg` }] };
  });
  const shade = useAnimatedStyle(() => ({ opacity: 1 - p.value }));
  if (reduced) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrim.base }, shade]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.hinge, coverStyle]}>
        <BookCover book={book} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1, padding: space.lg, justifyContent: 'center' },
  inset: {
    flex: 1, justifyContent: 'center', gap: space.lg, padding: space.xl, borderWidth: 3, borderColor: realm.warmGold,
    borderRadius: space.lg, overflow: 'hidden',
  },
  rule: { alignSelf: 'center', width: 80, height: 3, borderRadius: 2, backgroundColor: realm.warmGold },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, backgroundColor: realm.nightIndigo, opacity: 0.6 },
  hinge: { transformOrigin: 'left center', backfaceVisibility: 'hidden' },
});
