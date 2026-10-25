// Owner: AD. Chapter ribbon, blank book, "Sage is writing", and "The End" banner.
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing, FadeOut, SlideInUp, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { INK_STROKE, MOODS, ink, radius, space } from '@/shared/theme';
import { frameBand, storybookFrame } from '@/assets/pages/shapes';
import { MissionTypeGlyph } from './MissionTypeIcon';
import { InkButton, Txt } from './ui';
import { Sage, SageSays } from './sage';

/** "Chapter II · Whispers in the Wood" ribbon. Parent mounts it for ~2 s. */
export function ChapterRibbon({ text }: { text: string }) {
  return (
    <Animated.View entering={SlideInUp.duration(450)} exiting={FadeOut.duration(300)} style={styles.ribbonWrap} pointerEvents="none">
      <View style={styles.ribbon}>
        <Sage expression="happy" size="sm" />
        <Txt v="heading" color={ink.page} style={{ flex: 1 }}>{text}</Txt>
      </View>
    </Animated.View>
  );
}

/** An empty storybook frame used by the blank / writing states. */
function BlankFrame({ width, children }: { width: number; children?: ReactNode }) {
  return (
    <Svg width={width} height={(width * 1400) / 1000} viewBox="0 0 1000 1400">
      <Defs>
        <LinearGradient id="blankFrame" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={MOODS.castle.gradient[0]} />
          <Stop offset="1" stopColor={MOODS.castle.gradient[1]} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={1000} height={1400} fill={ink.page} />
      <Path d={frameBand()} fill="url(#blankFrame)" />
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
          <Sage expression="idle" size="lg" />
          <Txt v="title" center>Your book is blank.</Txt>
          <Txt v="story" center>Summon a story to begin. I’ll weave your interests and real places nearby into a tale.</Txt>
          <InkButton label="Summon a story" onPress={onSummon} loading={loading} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
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
        <View style={[StyleSheet.absoluteFill, styles.writingTop]} pointerEvents="none">
          <Sage expression="thinking" size="lg" />
        </View>
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
      <SageSays expression="happy" size="md" title="The End… for now" line="Every page is colored. I’m already dreaming up what comes next." />
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
  writingTop: { alignItems: 'center', paddingTop: '22%' },
  writingText: { justifyContent: 'flex-end', alignItems: 'center', padding: space.xxl, paddingBottom: '30%', gap: space.sm },
  quill: { position: 'absolute', left: 0, top: 0 },
  ribbonWrap: { position: 'absolute', top: space.md, left: space.lg, right: space.lg, zIndex: 10 },
  ribbon: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: ink.ink, borderRadius: radius.md, overflow: 'hidden',
    paddingVertical: space.sm, paddingHorizontal: space.md, borderWidth: 2, borderColor: ink.gold,
  },
  end: { margin: space.lg, gap: space.md },
});
