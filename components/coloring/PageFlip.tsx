// Owner: AD. A real book page flip. The page is hinged on its left edge (the spine) and lifts from the right edge,
// with light sliding across the turning paper and a shadow cast on the page beneath.
//   mode 'next': `over` (the old page) turns away to the left, revealing `under` (the new page).
//   mode 'prev': `over` (the previous page) turns back in from the left, landing on top of `under` (the current page).
// The parent renders <PageFlip> in place of the page while it plays, then swaps in the real page on onDone.
'use no memo';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ink, motion, scrim } from '@/shared/theme';
import { playSfx } from './sfx';

export const FLIP_MS = Math.max(motion.pageTurn, 1000); // 900–1100 ms per the plan

export function PageFlip({ under, over, mode = 'next', onDone, haptic = true }: {
  under: ReactNode; over: ReactNode; mode?: 'next' | 'prev'; onDone: () => void; haptic?: boolean;
}) {
  const p = useSharedValue(0); // 0 → 1 over the flip
  useEffect(() => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    playSfx('page');
    p.value = withTiming(1, { duration: FLIP_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(onDone)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // angle of the moving page: next 0 → -180, prev -180 → 0
  const pageStyle = useAnimatedStyle(() => {
    const deg = mode === 'next' ? -180 * p.value : -180 * (1 - p.value);
    return {
      opacity: deg < -90 ? 0 : 1, // past the spine the back of the page is hidden
      transform: [{ perspective: 1400 }, { rotateY: `${deg}deg` }, { scale: interpolate(Math.abs(deg + 90), [0, 90], [1.03, 1]) }],
    };
  });
  // light: the lifted page darkens toward its right edge as it rises
  const lightStyle = useAnimatedStyle(() => {
    const lift = mode === 'next' ? p.value : 1 - p.value; // 0 flat → 1 at the spine
    return { opacity: Math.min(1, lift * 2) * 0.35 };
  });
  // cast shadow on the page beneath, strongest when the turning page stands upright
  // (it covers the strip the turning page has uncovered, darkest right next to it)
  const castStyle = useAnimatedStyle(() => {
    const theta = (mode === 'next' ? p.value : 1 - p.value) * Math.PI;
    const covered = Math.max(0, Math.cos(theta)); // projected width of the turning page
    return { opacity: Math.sin(theta) * 0.45, width: `${(1 - covered) * 100}%` };
  });

  return (
    <View>
      <View>{under}</View>
      <Animated.View pointerEvents="none" style={[styles.cast, castStyle]}>
        <LinearGradient colors={[scrim.heavy, scrim.paperFade]} locations={[0, 0.6]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hinge, pageStyle]}>
        {over}
        <Animated.View style={[StyleSheet.absoluteFill, lightStyle]}>
          <LinearGradient colors={[scrim.paperFade, scrim.base, ink.ink]} locations={[0, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hinge: { transformOrigin: 'left center', backfaceVisibility: 'hidden' },
  cast: { position: 'absolute', top: 0, bottom: 0, right: 0, overflow: 'hidden' },
});
