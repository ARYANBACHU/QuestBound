// Owner: AD. Page-turn overlay, chapter ribbon, blank book, "Sage is writing", and "The End" banner.
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing, FadeOut, SlideInUp, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { INK_STROKE, ink, radius, space } from '@/shared/theme';
import { storybookFrame } from '@/assets/pages/shapes';
import { MissionTypeGlyph } from './MissionTypeIcon';
import { InkButton, Txt } from './ui';

export const TURN_MS = 1100;

/** The previous page, laid on top of the next one, swinging away around its left edge. */
export function PageTurnOverlay({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  const deg = useSharedValue(0);
  useEffect(() => {
    deg.value = withTiming(-180, { duration: TURN_MS, easing: Easing.inOut(Easing.cubic) });
    const t = setTimeout(onDone, TURN_MS + 30);
    return () => clearTimeout(t);
  }, [deg, onDone]);
  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${deg.value}deg` }],
    opacity: deg.value < -95 ? 0 : 1,
  }));
  const shade = useAnimatedStyle(() => ({ opacity: Math.min(0.35, (-deg.value / 90) * 0.35) }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: 'left center', backfaceVisibility: 'hidden' }, style]}>
      {children}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: ink.ink }, shade]} />
    </Animated.View>
  );
}

/** "Chapter II · Whispers in the Wood" ribbon. Parent mounts it for ~2 s. */
export function ChapterRibbon({ text }: { text: string }) {
  return (
    <Animated.View entering={SlideInUp.duration(450)} exiting={FadeOut.duration(300)} style={styles.ribbonWrap} pointerEvents="none">
      <View style={styles.ribbon}>
        <Txt v="heading" color={ink.page} center>{text}</Txt>
      </View>
    </Animated.View>
  );
}

/** An empty storybook frame used by the blank / writing states. */
function BlankFrame({ width, children }: { width: number; children?: ReactNode }) {
  return (
    <Svg width={width} height={(width * 1400) / 1000} viewBox="0 0 1000 1400">
      <Rect x={0} y={0} width={1000} height={1400} fill={ink.page} />
      {storybookFrame().map((d, i) => (
        <Path key={i} d={d} fill="none" stroke={ink.ink} strokeWidth={INK_STROKE * 0.66} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {children}
    </Svg>
  );
}

export function BlankBook({ width, onSummon, loading, error }: { width: number; onSummon: () => void; loading: boolean; error?: string | null }) {
  return (
    <View style={styles.center}>
      <View>
        <BlankFrame width={width} />
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <Txt v="heading" center>Your book is blank.</Txt>
          <Txt v="story" center>Summon a story to begin. Sage will weave your interests and real places nearby into a tale.</Txt>
          <InkButton label="Summon a story" onPress={onSummon} loading={loading} style={{ marginTop: space.md }} />
          {error ? <Txt v="small" color={ink.danger} center>{error} Check your connection and try again.</Txt> : null}
        </View>
      </View>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LINE = 'M170 700 C300 640 380 760 500 700 S700 640 830 700';
const LINE_LEN = 760;

/** Sage is writing your book… (the one place a looping animation is allowed). */
export function SageWriting({ width }: { width: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [t]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LINE_LEN * (1 - t.value) }));
  const scale = width / 1000;
  const quill = useAnimatedStyle(() => ({
    transform: [
      { translateX: (170 + 660 * t.value) * scale - 30 },
      { translateY: (700 + Math.sin(t.value * Math.PI * 2) * -30) * scale - 58 },
    ],
  }));
  return (
    <View style={styles.center}>
      <View>
        <BlankFrame width={width}>
          <AnimatedPath d={LINE} fill="none" stroke={ink.ink} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${LINE_LEN} ${LINE_LEN}`} animatedProps={lineProps} />
        </BlankFrame>
        <Animated.View style={[styles.quill, quill]} pointerEvents="none">
          <Svg width={60} height={60} viewBox="0 0 24 24">
            <G><MissionTypeGlyph type="bard" strokeWidth={1.6} /></G>
          </Svg>
        </Animated.View>
        <View style={[StyleSheet.absoluteFill, styles.writingText]} pointerEvents="none">
          <Txt v="heading" center>Sage is writing your book…</Txt>
          <Txt v="story" center>Gathering your interests, scouting real places nearby, and inking the first page.</Txt>
        </View>
      </View>
    </View>
  );
}

export function TheEndBanner({ onOpenStorybook, onSequel, loading }: { onOpenStorybook: () => void; onSequel: () => void; loading: boolean }) {
  return (
    <View style={styles.end}>
      <Txt v="title" center>The End… for now</Txt>
      <Txt v="story" center>Every page is colored. Sage is already dreaming up what comes next.</Txt>
      <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
        <InkButton label="Open the Storybook" onPress={onOpenStorybook} />
        <InkButton label="Summon the next book" variant="secondary" onPress={onSequel} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  overlay: { alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.sm },
  writingText: { justifyContent: 'flex-end', alignItems: 'center', padding: space.xxl, paddingBottom: '30%', gap: space.sm },
  quill: { position: 'absolute', left: 0, top: 0 },
  ribbonWrap: { position: 'absolute', top: space.md, left: space.lg, right: space.lg, zIndex: 10 },
  ribbon: {
    backgroundColor: ink.ink, borderRadius: radius.sm, paddingVertical: space.md, paddingHorizontal: space.lg,
    borderWidth: 2, borderColor: ink.gold,
  },
  end: {
    margin: space.lg, padding: space.xl, gap: space.md, alignItems: 'center', borderRadius: radius.lg,
    borderWidth: 2.5, borderColor: ink.gold, backgroundColor: ink.page,
  },
});
