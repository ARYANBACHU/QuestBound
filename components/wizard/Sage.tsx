// Owner: AB. SAGE — Questbound's original wizard mascot, drawn in react-native-svg in our ink + crayon style.
// Round and friendly: big starry hat, cloud beard, staff with a glowing tip.
//
//   <Sage expression="happy" size="lg" />                 // idle loop: blink, hat-star twinkle, gentle bob
//   <Sage speakKey={message.id} />                        // talks (~600 ms mouth + bob) + soft ping, ONCE per new key
//   <Sage size="sm" variant="face" still />               // just the face (FAB, chat avatars, lists)
//   <SageTitle />                                         // "Sage" + "✦ powered by Muse"
//
// Idle motion stops under reduced motion. Talk/ping fire once per speakKey for the whole app session (re-renders,
// remounts and reopening a sheet never repeat them).
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat,
  withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { motion, SAGE_CREDIT, SAGE_SIZES, sageColors as C, space, type SageExpression, type SageSize } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { playSfx } from '@/components/shell/sfx';

const AnimatedG = Animated.createAnimatedComponent(G);

export interface SageProps {
  expression?: SageExpression;
  size?: SageSize | number;
  /** 'face' = head + hat only (default for sm). 'full' = with robe and staff. */
  variant?: 'full' | 'face';
  /** No idle loop (use in long lists). Talking still works. */
  still?: boolean;
  /** When this changes to a key Sage hasn't said yet, Sage talks and pings once. */
  speakKey?: string | number | null;
  /** Talk without the ping. */
  silent?: boolean;
  style?: StyleProp<ViewStyle>;
}

// ------------------------------------------------------------------ "once per new message" bookkeeping

const spoken = new Set<string>();

/**
 * Claims a speech key. Returns true the first time a key is seen this session (and plays the ping unless
 * `sound: false`). Use it where a new Sage line appears without a visible <Sage speakKey>.
 */
export function speakOnce(key: string | number, opts: { sound?: boolean } = {}): boolean {
  const k = String(key);
  if (spoken.has(k)) return false;
  spoken.add(k);
  if (opts.sound !== false) playSfx('ping');
  return true;
}

/** Mark keys as already spoken (e.g. restored chat history) so they never ping. */
export function markSpoken(keys: (string | number)[]) {
  keys.forEach((k) => spoken.add(String(k)));
}

// ------------------------------------------------------------------ component

export function Sage({ expression = 'idle', size = 'md', variant, still, speakKey, silent, style }: SageProps) {
  const px = typeof size === 'number' ? size : SAGE_SIZES[size];
  const kind = variant ?? (px <= SAGE_SIZES.sm ? 'face' : 'full');
  const reduced = useReducedMotion();
  const idle = !still && !reduced;

  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const bob = useSharedValue(0);
  const talkY = useSharedValue(0);
  const twinkle = useSharedValue(1);

  // Gentle bob + hat-star twinkle (the only looping motion in the app).
  useEffect(() => {
    if (!idle) { bob.value = 0; twinkle.value = 1; return; }
    const ease = Easing.inOut(Easing.sin);
    bob.value = withRepeat(withTiming(1, { duration: motion.sageBobMs / 2, easing: ease }), -1, true);
    twinkle.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 700, easing: ease }), withTiming(1, { duration: 900, easing: ease })),
      -1,
    );
    return () => { cancelAnimation(bob); cancelAnimation(twinkle); };
  }, [idle, bob, twinkle]);

  // Blink every few seconds.
  useEffect(() => {
    if (!idle) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        t = setTimeout(() => { if (alive) { setBlink(false); loop(); } }, 130);
      }, motion.sageBlinkEveryMs * (0.7 + Math.random() * 0.6));
    };
    loop();
    return () => { alive = false; clearTimeout(t); };
  }, [idle]);

  // Talk once per new speakKey.
  const talkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (speakKey == null || speakKey === '') return;
    if (!speakOnce(speakKey, { sound: !silent })) return;
    if (!reduced) {
      talkY.value = withSequence(
        withTiming(-1, { duration: 110 }), withTiming(0, { duration: 110 }),
        withTiming(-1, { duration: 110 }), withTiming(0, { duration: 170 }),
      );
    }
    let ticks = 0;
    setMouthOpen(true);
    if (talkTimer.current) clearInterval(talkTimer.current);
    talkTimer.current = setInterval(() => {
      ticks += 1;
      if (ticks >= 6) {
        if (talkTimer.current) clearInterval(talkTimer.current);
        talkTimer.current = null;
        setMouthOpen(false);
        return;
      }
      setMouthOpen((o) => !o);
    }, 100);
  }, [speakKey, silent, reduced, talkY]);
  useEffect(() => () => { if (talkTimer.current) clearInterval(talkTimer.current); }, []);

  const amp = Math.max(1.5, px * 0.025);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * amp + talkY.value * amp * 1.6 }],
  }));
  const starProps = useAnimatedProps(() => ({ opacity: twinkle.value }));

  const viewBox = kind === 'face' ? '28 -4 144 176' : '0 0 200 200';

  return (
    <View
      style={[{ width: px, height: px }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Sage the wizard, ${expression}`}
    >
      <Animated.View style={[StyleSheet.absoluteFill, bobStyle]}>
        <Svg width={px} height={px} viewBox={viewBox}>
          {kind === 'full' ? <Body expression={expression} /> : null}
          <Head expression={expression} blink={blink} talking={mouthOpen} />
          <Hat />
          <AnimatedG animatedProps={starProps}>
            <Star cx={94} cy={46} r={6} />
            <Star cx={112} cy={24} r={4.5} />
            <Star cx={120} cy={54} r={3.5} />
          </AnimatedG>
          <Extras expression={expression} full={kind === 'full'} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** "Sage" with the "powered by Muse" credit line underneath. Use wherever Sage's name is shown. */
export function SageTitle({ size = 'heading', color, style }: {
  size?: 'heading' | 'bodyBold'; color?: string; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.title, style]}>
      <T variant={size} color={color}>Sage</T>
      <T variant="small" style={styles.credit} color={color}>{SAGE_CREDIT}</T>
    </View>
  );
}

// ------------------------------------------------------------------ drawing (viewBox 0 0 200 200)

const INK = C.outline;
const SW = 3.5;

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return <Path d={`${d}Z`} fill={C.hatStar} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />;
}

function Body({ expression }: { expression: SageExpression }) {
  const bright = expression === 'thinking' || expression === 'happy' || expression === 'proud';
  return (
    <G>
      {/* staff + glowing tip */}
      <Circle cx={164} cy={34} r={bright ? 24 : 19} fill={C.staffGlow} opacity={bright ? 0.75 : 0.5} />
      <Path d="M164 44 L164 197" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <Path d="M164 44 L164 197" stroke={C.staff} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={164} cy={34} r={11} fill={C.staffGlow} stroke={INK} strokeWidth={3} />
      <Circle cx={160} cy={30} r={3} fill={C.beard} />
      {/* robe */}
      <Path d="M48 198 C52 152 70 128 100 124 C130 128 148 152 152 198 Z" fill={C.robe} stroke={INK} strokeWidth={SW}
        strokeLinejoin="round" />
      <Path d="M84 150 C81 168 83 184 86 197" stroke={C.robeShade} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M52 192 C82 184 118 184 148 192" stroke={C.trim} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Star cx={68} cy={170} r={5} />
      {/* sleeve + hand on the staff */}
      <Path d="M124 134 C140 137 152 144 160 152 L151 164 C143 156 133 152 122 150 Z" fill={C.robe} stroke={INK}
        strokeWidth={SW} strokeLinejoin="round" />
      <Circle cx={160} cy={156} r={9} fill={C.skin} stroke={INK} strokeWidth={3} />
    </G>
  );
}

function Head({ expression, blink, talking }: { expression: SageExpression; blink: boolean; talking: boolean }) {
  return (
    <G>
      <Circle cx={100} cy={98} r={32} fill={C.skin} stroke={INK} strokeWidth={SW} />
      <Ellipse cx={80} cy={108} rx={6.5} ry={4.5} fill={C.cheek} opacity={0.75} />
      <Ellipse cx={120} cy={108} rx={6.5} ry={4.5} fill={C.cheek} opacity={0.75} />
      {/* cloud beard */}
      <Path
        d="M67 102 C62 120 66 136 74 146 C78 158 90 166 100 169 C110 166 122 158 126 146 C134 136 138 120 133 102 C124 114 112 118 100 117 C88 118 76 114 67 102 Z"
        fill={C.beard} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M84 140 C88 148 94 152 100 154 M116 140 C112 148 106 152 100 154" stroke={C.beardShade} strokeWidth={3}
        strokeLinecap="round" fill="none" />
      <Mouth expression={expression} talking={talking} />
      {/* mustache */}
      <Path d="M100 116 C93 111 83 112 78 121 C86 119 94 122 100 120 C106 122 114 119 122 121 C117 112 107 111 100 116 Z"
        fill={C.beard} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <Circle cx={100} cy={107} r={6.5} fill={C.skin} stroke={INK} strokeWidth={2.6} />
      <Eyes expression={expression} blink={blink} />
      <Brows expression={expression} />
    </G>
  );
}

function Mouth({ expression, talking }: { expression: SageExpression; talking: boolean }) {
  if (talking) return <Ellipse cx={100} cy={129} rx={5.5} ry={5} fill={INK} />;
  switch (expression) {
    case 'happy':
      return <Path d="M90 125 Q100 140 110 125 Z" fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />;
    case 'proud':
      return <Path d="M88 126 Q100 136 112 126" stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none" />;
    case 'thinking':
      return <Path d="M95 130 Q99 127 106 130" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />;
    case 'surprised':
      return <Ellipse cx={100} cy={130} rx={4.5} ry={6} fill={INK} />;
    case 'sleepy':
      return <Path d="M96 130 L104 130" stroke={INK} strokeWidth={3} strokeLinecap="round" />;
    default:
      return <Path d="M93 127 Q100 133 107 127" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />;
  }
}

function Eyes({ expression, blink }: { expression: SageExpression; blink: boolean }) {
  const xs = [88, 112];
  const y = 96;
  const arc = (dir: 1 | -1) =>
    xs.map((x) => (
      <Path key={x} d={`M${x - 5} ${y + dir * -1} Q${x} ${y + dir * 5} ${x + 5} ${y + dir * -1}`} stroke={INK}
        strokeWidth={3.2} strokeLinecap="round" fill="none" />
    ));
  if (expression === 'happy') return <G>{arc(-1)}</G>; // ∩ smiling eyes
  if (expression === 'proud') return <G>{arc(1)}</G>; // ∪ content, eyes closed
  if (blink || expression === 'sleepy') {
    return (
      <G>
        {xs.map((x) => (
          <Path key={x} d={`M${x - 5} ${y + 1} Q${x} ${y + 3} ${x + 5} ${y + 1}`} stroke={INK} strokeWidth={3}
            strokeLinecap="round" fill="none" />
        ))}
      </G>
    );
  }
  const big = expression === 'surprised';
  const look = expression === 'thinking' ? { dx: 1.6, dy: -1.6 } : { dx: 0, dy: 0 };
  return (
    <G>
      {xs.map((x) => (
        <G key={x}>
          <Ellipse cx={x + look.dx} cy={y + look.dy} rx={big ? 4.8 : 3.9} ry={big ? 6.2 : 5} fill={INK} />
          <Circle cx={x + look.dx + 1.3} cy={y + look.dy - 1.8} r={1.4} fill={C.beard} />
        </G>
      ))}
    </G>
  );
}

function Brows({ expression }: { expression: SageExpression }) {
  const lift = expression === 'surprised' ? -5 : expression === 'proud' ? -2 : 0;
  const rightLift = expression === 'thinking' ? -4 : 0;
  const droop = expression === 'sleepy' ? 3 : 0;
  const left = `M80 ${86 + lift + droop} Q87 ${80 + lift} 95 ${85 + lift}`;
  const right = `M105 ${85 + lift + rightLift} Q113 ${80 + lift + rightLift} 120 ${86 + lift + rightLift + droop}`;
  return (
    <G>
      {[left, right].map((d) => (
        <G key={d}>
          <Path d={d} stroke={INK} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d={d} stroke={C.beard} strokeWidth={3.6} strokeLinecap="round" fill="none" />
        </G>
      ))}
    </G>
  );
}

function Hat() {
  return (
    <G>
      <Ellipse cx={100} cy={70} rx={50} ry={11} fill={C.hat} stroke={INK} strokeWidth={SW} />
      <Path d="M62 69 C70 50 82 32 92 18 C98 9 112 2 128 8 C116 12 108 20 110 31 C116 46 126 58 138 69 C120 75 80 75 62 69 Z"
        fill={C.hat} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M66 62 C86 69 114 69 134 62" stroke={C.trim} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Circle cx={129} cy={8} r={4} fill={C.trim} stroke={INK} strokeWidth={2} />
    </G>
  );
}

function Extras({ expression, full }: { expression: SageExpression; full: boolean }) {
  switch (expression) {
    case 'sleepy':
      return (
        <G>
          <Path d="M142 46 L152 46 L142 56 L152 56" stroke={INK} strokeWidth={2.6} strokeLinecap="round"
            strokeLinejoin="round" fill="none" />
          <Path d="M154 28 L161 28 L154 35 L161 35" stroke={INK} strokeWidth={2.2} strokeLinecap="round"
            strokeLinejoin="round" fill="none" />
        </G>
      );
    case 'thinking':
      return (
        <G>
          <Circle cx={138} cy={92} r={3} fill={INK} />
          <Circle cx={146} cy={82} r={4} fill={INK} />
          <Circle cx={full ? 140 : 152} cy={full ? 68 : 70} r={5} fill={INK} />
        </G>
      );
    case 'surprised':
      return (
        <G>
          <Path d="M56 74 L48 66 M54 88 L44 87 M60 60 L56 50" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'happy':
    case 'proud':
      return (
        <G>
          <Star cx={46} cy={92} r={6} />
          <Star cx={54} cy={122} r={4} />
        </G>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  title: { gap: 0 },
  credit: { marginTop: -2, letterSpacing: 0.2, paddingTop: space.xs / 2 },
});
