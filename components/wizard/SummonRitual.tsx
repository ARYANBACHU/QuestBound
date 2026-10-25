// Owner: AB. Full-screen "Sage writes your book" ritual: an ink quill scribbles across a blank page while
// Sage (thinking) narrates what's happening (interests → SerpApi maps/events → chapters).
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeOut, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { SAGE_CREDIT, SCREEN_GRADIENTS, ink, shadow, space } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { Sage } from './Sage';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LINES = 6;
const W = 300;
const H = 380;
const X0 = 36;
const X1 = 264;
const lineY = (i: number) => 70 + i * 50;
const DASH = 420;

function scribble(y: number, seed: number) {
  let d = `M${X0} ${y}`;
  const end = seed === LINES - 1 ? X0 + (X1 - X0) * 0.6 : X1;
  for (let x = X0; x < end; x += 19) {
    const up = ((x + seed * 7) % 3) - 1;
    d += ` q 5 ${-7 - up * 3} 10 0 t 9 ${up}`;
  }
  return d;
}
const PATHS = Array.from({ length: LINES }, (_, i) => scribble(lineY(i), i));

export function SummonRitual({ lines, title = 'Sage is writing…' }: { lines: string[]; title?: string }) {
  const progress = useSharedValue(0);
  const [lineIdx, setLineIdx] = useState(0);
  const { width, height } = useWindowDimensions();
  const compact = height < 720;
  const scale = Math.min(1, (width - 48) / W, (height - (compact ? 330 : 400)) / H); // fit small phones

  useEffect(() => {
    progress.value = withRepeat(withTiming(LINES, { duration: LINES * 1800, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [progress]);

  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => Math.min(i + 1, lines.length - 1)), 2600);
    return () => clearInterval(id);
  }, [lines.length]);

  const quill = useAnimatedStyle(() => {
    const i = Math.min(Math.floor(progress.value), LINES - 1);
    const f = progress.value - i;
    const end = i === LINES - 1 ? X0 + (X1 - X0) * 0.6 : X1;
    return {
      transform: [
        { translateX: X0 + (end - X0) * f - 4 },
        { translateY: lineY(i) - 34 + Math.sin(f * 40) * 2 },
      ],
    };
  });

  return (
    <LinearGradient colors={SCREEN_GRADIENTS.castle} style={styles.wrap}>
      <View style={styles.sage}>
        <Sage expression="thinking" size={compact ? 64 : 88} />
        <View>
          <T variant="title">{title}</T>
          <T variant="small">{SAGE_CREDIT}</T>
        </View>
      </View>
      <View style={[styles.page, { transform: [{ scale }], marginVertical: (H * (scale - 1)) / 2 }]}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {PATHS.map((d, i) => <InkLine key={i} d={d} i={i} progress={progress} />)}
        </Svg>
        <Animated.View style={[styles.quill, quill]} pointerEvents="none">
          <T style={styles.quillEmoji}>🪶</T>
        </Animated.View>
      </View>
      <Animated.View key={lineIdx} entering={FadeIn.duration(350)} exiting={FadeOut.duration(200)} style={styles.lineBox}>
        <T variant="story" center>{lines[lineIdx]}</T>
      </Animated.View>
    </LinearGradient>
  );
}

function InkLine({ d, i, progress }: { d: string; i: number; progress: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const local = Math.max(0, Math.min(1, progress.value - i));
    return { strokeDashoffset: DASH * (1 - local) };
  });
  return (
    <AnimatedPath d={d} stroke={ink.ink} strokeWidth={2.6} strokeLinecap="round" fill="none"
      strokeDasharray={[DASH, DASH]} animatedProps={props} />
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.xl },
  sage: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  page: {
    width: W, height: H, backgroundColor: ink.page, borderWidth: 3, borderColor: ink.ink, borderRadius: 6,
    ...shadow.md,
  },
  quill: { position: 'absolute', left: 0, top: 0 },
  quillEmoji: { fontSize: 34, lineHeight: 42 },
  lineBox: { minHeight: 52, justifyContent: 'center', paddingHorizontal: space.lg },
});
