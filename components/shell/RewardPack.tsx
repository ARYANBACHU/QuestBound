// Owner: AB. U4 — the mission-complete reward, opened like a trading-card pack (~2.5 s, tap anywhere to skip):
//   1. a sealed card pops in and shakes harder and harder (light → medium haptic ticks)
//   2. it bursts open: gold light rays + sparkles + a flash (heavy haptic + success, sfx 'reward')
//   3. the card flips to its face: YOUR page with the region you just earned filling with YOUR crayon (sfx 'crayon')
//   4. points count up (+ selection ticks), a gold seal stamps the corner, and Sage's story line types out.
// Calm everywhere else: every motion is one-shot, nothing loops. Then AD's coloring animation plays on the page.
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring,
  withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { PAGE_ART } from '@/assets/pages';
import { useTypewriter } from '@/components/wizard/useTypewriter';
import type { TemplateId } from '@/shared/templates';
import { CRAYONS, accent, fonts, ink, panel, radius, realm, shadow, space } from '@/shared/theme';
import { playSfx } from './sfx';
import { T } from './T';
import { WaxSeal } from './WaxSeal';

// timeline (ms)
const SHAKE = 750;
const BURST = SHAKE;
const FLIP_AT = BURST + 120;
const FLIP_MS = 460;
const FILL_AT = FLIP_AT + FLIP_MS - 80;
const COUNT_AT = FILL_AT + 120;
const COUNT_MS = 700;
const DONE_AT = 2500;

export interface RewardPackProps {
  templateId: TemplateId | null | undefined;
  regionId: string;
  regionLabel: string;
  /** hex of the painter's crayon */
  color: string;
  points: number;
  storyLine: string;
  /** called once when the reveal finishes (or is skipped) */
  onDone?: () => void;
}

export function RewardPack({ templateId, regionId, regionLabel, color, points, storyLine, onDone }: RewardPackProps) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(230, Math.round(width * 0.58));
  const cardH = Math.round(cardW * 1.4);

  const pop = useSharedValue(0); // card appears
  const shake = useSharedValue(0); // rotation degrees
  const burst = useSharedValue(0); // 0 → 1 rays / sparkles / flash
  const flip = useSharedValue(0); // 0 = back, 1 = face
  const fill = useSharedValue(0); // region fill
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState<'sealed' | 'open' | 'done'>('sealed');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  const { shown, skip: skipTyping } = useTypewriter(storyLine, 24, stage !== 'sealed');

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setStage('done');
    onDone?.();
  }, [onDone]);

  useEffect(() => {
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    const hap = (s: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(s).catch(() => {});

    pop.value = withSpring(1, { damping: 12, stiffness: 200 });
    // shake: growing wobble, then still for the burst
    shake.value = withDelay(160, withSequence(
      withTiming(-3, { duration: 70 }), withTiming(3, { duration: 70 }),
      withTiming(-5, { duration: 60 }), withTiming(5, { duration: 60 }),
      withTiming(-7, { duration: 50 }), withTiming(7, { duration: 50 }),
      withTiming(-9, { duration: 45 }), withTiming(9, { duration: 45 }),
      withTiming(0, { duration: 60 }),
    ));
    at(200, () => hap(Haptics.ImpactFeedbackStyle.Light));
    at(340, () => hap(Haptics.ImpactFeedbackStyle.Light));
    at(460, () => hap(Haptics.ImpactFeedbackStyle.Medium));
    at(570, () => hap(Haptics.ImpactFeedbackStyle.Medium));
    at(BURST, () => {
      hap(Haptics.ImpactFeedbackStyle.Heavy);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      playSfx('reward');
      setStage('open');
    });
    burst.value = withDelay(BURST, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    flip.value = withDelay(FLIP_AT, withTiming(1, { duration: FLIP_MS, easing: Easing.inOut(Easing.cubic) }));
    at(FLIP_AT + FLIP_MS, () => hap(Haptics.ImpactFeedbackStyle.Medium));
    at(FILL_AT, () => playSfx('crayon'));
    fill.value = withDelay(FILL_AT, withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }));
    // points count-up with a few selection ticks
    const steps = Math.min(points, 14);
    for (let i = 1; i <= steps; i++) {
      at(COUNT_AT + (COUNT_MS * i) / steps, () => {
        setCount(Math.round((points * i) / steps));
        if (i % 3 === 0 || i === steps) Haptics.selectionAsync().catch(() => {});
      });
    }
    at(DONE_AT, finish);
    const all = timers.current;
    return () => { all.forEach(clearTimeout); };
    // run once per reward
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipAll = () => {
    if (finished.current) { skipTyping(); return; }
    timers.current.forEach(clearTimeout);
    [pop, shake, burst, flip, fill].forEach((v) => cancelAnimation(v));
    pop.value = 1; shake.value = 0; burst.value = 1; flip.value = 1; fill.value = 1;
    setCount(points);
    skipTyping();
    if (stage === 'sealed') playSfx('reward');
    finish();
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + 0.4 * pop.value }, { rotate: `${shake.value}deg` }],
    opacity: pop.value,
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${flip.value * 180}deg` }],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${flip.value * 180 - 180}deg` }],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : 0.9 - 0.74 * burst.value, // settles at a faint glow
    transform: [{ scale: 0.3 + 1.1 * burst.value }, { rotate: `${burst.value * 28}deg` }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : Math.max(0, 0.85 - burst.value * 2.2),
    transform: [{ scale: 0.4 + 1.6 * burst.value }],
  }));

  const stageSize = cardH + space.xl * 2;
  return (
    <Pressable onPress={skipAll} accessibilityRole="button" accessibilityLabel={`Reward: ${regionLabel} colored, ${points} points. Tap to skip`}
      style={styles.wrap}>
      <View style={[styles.stage, { width: stageSize, height: stageSize }]}>
        <Animated.View pointerEvents="none" style={[styles.center, raysStyle]}>
          <Rays size={stageSize * 1.15} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.flash, { width: cardW, height: cardW, borderRadius: cardW / 2 }, flashStyle]} />
        {SPARKS.map((s, i) => <Spark key={i} spec={s} burst={burst} color={i % 3 === 0 ? color : ink.gold} radius={stageSize * 0.48} />)}

        <Animated.View style={[{ width: cardW, height: cardH }, cardStyle]}>
          {/* back: sealed */}
          <Animated.View style={[styles.card, styles.back, backStyle]}>
            <View style={styles.backInner}>
              <T style={styles.backMark} color={ink.gold}>✦</T>
              <T variant="smallBold" color={accent.goldSoft} center>Sealed by Sage</T>
            </View>
          </Animated.View>
          {/* face: your page, your region, your crayon */}
          <Animated.View style={[styles.card, styles.face, faceStyle]}>
            <MiniPage templateId={templateId} regionId={regionId} color={color} fill={fill} />
            <View style={styles.faceFoot}>
              <T variant="smallBold" numberOfLines={1} style={styles.fill}>{regionLabel}</T>
              <View style={styles.points}>
                <T style={styles.pointsText} color={ink.ink}>+{count}</T>
              </View>
            </View>
            {stage === 'done' ? (
              <View style={styles.seal} pointerEvents="none"><WaxSeal size={52} /></View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
      <View style={styles.storyBox}>
        <T variant="story" center color={ink.ink}>{stage === 'sealed' ? ' ' : shown || ' '}</T>
      </View>
    </Pressable>
  );
}

// ---------- the page on the card ----------
// V3: the fill is a separate layer whose opacity is an animated VIEW style. It used to be `fillOpacity` via SVG
// animatedProps — react-native-svg re-sends fillOpacity=1 on every re-render, and the points count-up re-renders the
// card ~14×, so the region flickered blank→color→blank→color. Now: starts uncolored, fills once, never re-renders.
const MiniPage = memo(function MiniPage({ templateId, regionId, color, fill }: {
  templateId: TemplateId | null | undefined; regionId: string; color: string; fill: SharedValue<number>;
}) {
  const art = templateId ? PAGE_ART[templateId] : null;
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const region = art?.regions[regionId];
  if (!art || !region) {
    // unknown art: a big crayon swatch still says "this is yours"
    const d = 'M20 30 Q50 10 80 30 L80 110 Q50 130 20 110 Z';
    return (
      <View style={styles.mini}>
        <Svg width="100%" height="100%" viewBox="0 0 100 140">
          <Path d={d} fill={ink.page} stroke={ink.ink} strokeWidth={3} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, fillStyle]} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 100 140">
            <Path d={d} fill={color} stroke={ink.ink} strokeWidth={3} />
          </Svg>
        </Animated.View>
      </View>
    );
  }
  return (
    <View style={styles.mini}>
      <Svg width="100%" height="100%" viewBox={art.viewBox}>
        <G opacity={0.35}>
          {(art.background ?? []).map((d, i) => <Path key={`b${i}`} d={d} stroke={ink.ink} strokeWidth={4} fill="none" />)}
          {Object.entries(art.regions).map(([id, r]) => id === regionId ? null
            : <Path key={id} d={r.d} fill={ink.page} stroke={ink.ink} strokeWidth={6} fillRule="nonzero" />)}
          {art.ink.map((d, i) => <Path key={`i${i}`} d={d} stroke={ink.ink} strokeWidth={4} fill="none" />)}
        </G>
        <Path d={region.d} fill={ink.page} stroke={ink.ink} strokeWidth={10} fillRule="nonzero" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, fillStyle]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={art.viewBox}>
          <Path d={region.d} fill={color} stroke={ink.ink} strokeWidth={10} fillRule="nonzero" />
        </Svg>
      </Animated.View>
    </View>
  );
});

// ---------- burst bits ----------
function Rays({ size }: { size: number }) {
  const n = 14;
  const c = size / 2;
  const d = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n * 0.7;
    return `M${c} ${c} L${c + c * Math.cos(a0)} ${c + c * Math.sin(a0)} L${c + c * Math.cos(a1)} ${c + c * Math.sin(a1)} Z`;
  }).join(' '), [c]);
  return (
    <Svg width={size} height={size}>
      <Path d={d} fill={ink.gold} opacity={0.55} />
    </Svg>
  );
}

type SparkSpec = { a: number; r: number; s: number; glyph: string };
const SPARKS: SparkSpec[] = Array.from({ length: 12 }, (_, i) => ({
  a: (i / 12) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1),
  r: 0.55 + ((i * 37) % 10) / 22,
  s: 0.8 + ((i * 13) % 5) / 8,
  glyph: i % 4 === 0 ? '✦' : '✧',
}));

function Spark({ spec, burst, color, radius: rad }: { spec: SparkSpec; burst: SharedValue<number>; color: string; radius: number }) {
  const style = useAnimatedStyle(() => {
    const k = burst.value;
    return {
      opacity: k === 0 ? 0 : Math.max(0, 1 - k * 1.1),
      transform: [
        { translateX: Math.cos(spec.a) * rad * spec.r * k },
        { translateY: Math.sin(spec.a) * rad * spec.r * k },
        { scale: spec.s * (0.5 + k) },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.spark, style]}>
      <T style={styles.sparkGlyph} color={color}>{spec.glyph}</T>
    </Animated.View>
  );
}

/** Crayon hex for a player color name (falls back to violet). */
export function crayonHex(name: string | null | undefined): string {
  return (name && (CRAYONS as Record<string, string>)[name]) || CRAYONS.violet;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  stage: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  flash: { position: 'absolute', backgroundColor: ink.page },
  card: {
    ...StyleSheet.absoluteFill, borderRadius: radius.lg, borderWidth: 3, borderColor: ink.ink, overflow: 'hidden',
    backfaceVisibility: 'hidden', ...shadow.md,
  },
  back: { backgroundColor: realm.royalPurple, padding: space.sm },
  backInner: {
    flex: 1, borderRadius: radius.md, borderWidth: 2.5, borderColor: ink.gold, alignItems: 'center', justifyContent: 'center',
    gap: space.sm,
  },
  backMark: { fontSize: 64, lineHeight: 76 },
  face: { backgroundColor: panel.parchment },
  mini: { flex: 1, margin: space.sm, marginBottom: 0, borderRadius: radius.md, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page, overflow: 'hidden' },
  faceFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm },
  fill: { flex: 1 },
  points: {
    paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: accent.goldSoft,
    borderWidth: 2, borderColor: ink.ink, minWidth: 52, alignItems: 'center',
  },
  pointsText: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22 },
  seal: { position: 'absolute', right: -6, top: -6, transform: [{ rotate: '12deg' }] },
  spark: { position: 'absolute' },
  sparkGlyph: { fontSize: 20, lineHeight: 24 },
  storyBox: { minHeight: 72, paddingHorizontal: space.lg, justifyContent: 'center', maxWidth: 420 },
});

export const REWARD_MS = DONE_AT;
