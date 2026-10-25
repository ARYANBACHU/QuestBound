// Owner: AD. Celebration overlay: crayon-shaving confetti + gold sparkles raining over the screen once.
// <Celebration kind="page" | "book" | "mission" onDone? />. Mount it to play; unmount/remount (key) to replay.
'use no memo';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { celebration } from '@/shared/theme';

type Kind = keyof typeof celebration.counts;

interface Piece {
  x: number; // start x (px)
  drift: number; // horizontal drift (px)
  delay: number; // 0..0.35 of the timeline
  fall: number; // fraction of the screen height travelled
  spin: number; // degrees over the timeline
  size: number;
  color: string;
  shape: 'shaving' | 'stub' | 'spark';
}

// a curled crayon shaving (wavy ribbon), a tiny crayon stub, a 4-point sparkle — all in a 24×24 box
const SHAPES = {
  shaving: 'M3 14 Q7 6 12 12 T21 10 L21 14 Q16 18 12 16 T3 18 Z',
  stub: 'M4 9 H15 L20 12 L15 15 H4 Q2 15 2 13 V11 Q2 9 4 9 Z',
  spark: 'M12 2 Q13.5 10.5 22 12 Q13.5 13.5 12 22 Q10.5 13.5 2 12 Q10.5 10.5 12 2 Z',
};

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function Celebration({ kind = 'page', onDone }: { kind?: Kind; onDone?: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const duration = celebration.durationMs[kind];
  const count = celebration.counts[kind];

  const pieces = useMemo<Piece[]>(() => {
    const out: Piece[] = [];
    const seed = Date.now() % 1000;
    for (let i = 0; i < count; i++) {
      const r = (k: number) => rand(seed + i * 7 + k);
      const spark = r(1) < 0.3;
      out.push({
        x: r(2) * width,
        drift: (r(3) - 0.5) * 160,
        delay: r(4) * 0.35,
        fall: 0.75 + r(5) * 0.45,
        spin: (r(6) - 0.5) * 900,
        size: spark ? 12 + r(7) * 12 : 14 + r(7) * 12,
        color: spark ? celebration.sparkle[i % celebration.sparkle.length] : celebration.confetti[i % celebration.confetti.length],
        shape: spark ? 'spark' : r(8) < 0.65 ? 'shaving' : 'stub',
      });
    }
    return out;
  }, [count, width]);

  useEffect(() => {
    if (reduced) { onDone?.(); return; }
    t.value = withTiming(1, { duration, easing: Easing.linear }, (done) => {
      if (done && onDone) runOnJS(onDone)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => <Bit key={i} p={p} t={t} height={height} />)}
    </View>
  );
}

function Bit({ p, t, height }: { p: Piece; t: SharedValue<number>; height: number }) {
  const style = useAnimatedStyle(() => {
    const local = Math.max(0, Math.min(1, (t.value - p.delay) / (1 - p.delay)));
    const fall = local * local * 0.6 + local * 0.4; // a little gravity
    const fade = local > 0.8 ? 1 - (local - 0.8) / 0.2 : local > 0 ? 1 : 0;
    return {
      opacity: fade,
      transform: [
        { translateX: p.x + p.drift * local + Math.sin(local * 9 + p.x) * 12 },
        { translateY: -40 + fall * height * p.fall },
        { rotate: `${p.spin * local}deg` },
        { scale: p.shape === 'spark' ? 0.6 + Math.abs(Math.sin(local * 12)) * 0.6 : 1 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.bit, style]}>
      <Svg width={p.size} height={p.size} viewBox="0 0 24 24">
        <Path d={SHAPES[p.shape]} fill={p.color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bit: { position: 'absolute', left: 0, top: 0 },
});
