// Owner: AD. Full-screen montage, Snapchat-stories style: segmented progress bars, auto-advance, HOLD = pause,
// tap right = next, tap left = previous, swipe down = close. Photos get a slow Ken Burns; chapter title cards between.
'use no memo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation, Easing, FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { ink, radius, realm, scrim, space } from '@/shared/theme';
import { Txt } from '@/components/coloring/ui';
import type { Slide } from './bookData';
import { webFrameOffsetX } from '@/lib/webFrame';

export const SLIDE_MS = 5000; // B3: 5 s per photo
export const TITLE_MS = 3000; // 3 s per title card
const FADE_MS = 420;
const HOLD_MS = 220; // press longer than this = hold-to-pause, not a tap
const TAP_MS = 350;
const CLOSE_DY = 110;

const durationOf = (s: Slide | undefined) => (s?.kind === 'title' ? TITLE_MS : SLIDE_MS);

/**
 * B3 — ONE clock drives everything. `clock` is a single shared value = slide index + progress through it
 * (2.4 = 40% into slide 2). Each bar's width is clamp(clock − i, 0, 1), computed on the UI thread, so bars can never
 * drift from the timer or flicker on a slide change. Every start bumps `token`; a finished timing only advances if
 * its token is still current, so re-renders, pauses and taps can never stack a second timer.
 */
export function Montage({ visible, slides, onClose }: { visible: boolean; slides: Slide[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const [under, setUnder] = useState<number | null>(null); // previous slide, kept beneath while the new one fades in
  const [run, setRun] = useState(0); // bump = restart the current slide from 0
  const [held, setHeld] = useState(false);
  const [ended, setEnded] = useState(false);
  const clock = useSharedValue(0);
  const dragY = useSharedValue(0);
  const token = useRef(0);
  const segment = useRef(''); // `${idx}:${run}` the clock currently belongs to
  const live = useRef({ idx, count: slides.length, slides });
  live.current = { idx, count: slides.length, slides };

  const goTo = (i: number) => {
    const { idx: cur, count } = live.current;
    if (!count) return;
    if (i >= count) { setEnded(true); return; }
    const to = Math.max(0, i);
    setEnded(false);
    if (to === cur) { setRun((r) => r + 1); return; }
    setUnder(cur);
    setIdx(to);
  };

  useEffect(() => {
    if (!visible) return;
    token.current++;
    segment.current = '';
    setIdx(0); setUnder(null); setHeld(false); setEnded(false); setRun((r) => r + 1);
    dragY.value = 0;
  }, [visible, dragY]);

  const onSegmentDone = (t: number) => {
    if (t !== token.current) return; // a stale timer (paused, skipped, re-rendered) — ignore
    goTo(live.current.idx + 1);
  };

  const running = visible && !held && !ended && slides.length > 0;
  useEffect(() => {
    const seg = `${idx}:${run}`;
    const t = ++token.current;
    let from = 0;
    if (segment.current !== seg) {
      segment.current = seg;
      cancelAnimation(clock);
      clock.value = idx;
    } else {
      from = Math.min(Math.max(clock.value - idx, 0), 0.999); // resume where the hold paused it
    }
    if (!running) { cancelAnimation(clock); return; }
    const ms = durationOf(live.current.slides[idx]) * (1 - from);
    clock.value = withTiming(idx + 1, { duration: Math.max(ms, 16), easing: Easing.linear }, (done) => {
      if (done) runOnJS(onSegmentDone)(t);
    });
    return () => { cancelAnimation(clock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx, run]);

  // the slide underneath only needs to outlive the fade
  useEffect(() => {
    if (under == null) return;
    const t = setTimeout(() => setUnder(null), FADE_MS + 60);
    return () => clearTimeout(t);
  }, [under, idx]);

  const nav = useRef({ next: () => {}, prev: () => {}, hold: (_h: boolean) => {}, close: () => {} });
  nav.current = {
    next: () => goTo(live.current.idx + 1),
    prev: () => goTo(live.current.idx - 1),
    hold: (h: boolean) => setHeld(h),
    close: onClose,
  };

  const pan = useMemo(() => {
    let t0 = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let holding = false;
    const endHold = () => {
      clearTimeout(holdTimer);
      if (holding) nav.current.hold(false);
      holding = false;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 || Math.abs(g.dx) > 8,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        t0 = Date.now();
        holding = false;
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => { holding = true; nav.current.hold(true); }, HOLD_MS);
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dy) > 10 || Math.abs(g.dx) > 10) clearTimeout(holdTimer);
        dragY.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (e, g) => {
        const wasHolding = holding;
        endHold();
        if (g.dy > CLOSE_DY && Math.abs(g.dx) < g.dy) { nav.current.close(); return; }
        dragY.value = withTiming(0, { duration: 180 });
        if (wasHolding) return; // a hold only pauses — releasing it never skips
        const tap = Date.now() - t0 < TAP_MS && Math.abs(g.dx) < 12 && Math.abs(g.dy) < 12;
        if (tap) {
          if (e.nativeEvent.pageX - webFrameOffsetX() < width / 3) nav.current.prev();
          else nav.current.next();
        } else if (g.dx < -60 && Math.abs(g.dy) < 80) nav.current.next();
        else if (g.dx > 60 && Math.abs(g.dy) < 80) nav.current.prev();
      },
      onPanResponderTerminate: () => {
        endHold();
        dragY.value = withTiming(0, { duration: 180 });
      },
    });
  }, [width, dragY]);

  const stageStyle = useAnimatedStyle(() => {
    const d = dragY.value;
    return {
      transform: [{ translateY: d }, { scale: 1 - Math.min(d / height, 0.25) * 0.4 }],
      borderRadius: Math.min(d / 4, radius.lg),
    };
  });

  const slide = slides[idx];
  const below = under != null ? slides[under] : undefined;
  const paused = !running;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.stage, stageStyle]} {...pan.panHandlers}>
          {below && below.key !== slide?.key && (
            <View key={`u-${below.key}`} style={StyleSheet.absoluteFill} pointerEvents="none">
              <SlideView slide={below} paused bottom={insets.bottom} />
            </View>
          )}
          {slide && (
            <Animated.View key={`${slide.key}:${run}`} entering={FadeIn.duration(FADE_MS)} style={StyleSheet.absoluteFill} pointerEvents="none">
              <SlideView slide={slide} paused={paused} bottom={insets.bottom} />
            </Animated.View>
          )}

          <LinearGradient colors={[scrim.heavy, scrim.paperFade]} style={[styles.topShade, { height: insets.top + 90 }]} pointerEvents="none" />
          <View style={[styles.chrome, { top: insets.top + space.sm }]} pointerEvents="box-none">
            <View style={styles.bars} pointerEvents="none">
              {slides.map((s, i) => <Segment key={s.key} i={i} clock={clock} />)}
            </View>
            <Pressable onPress={onClose} hitSlop={14} style={styles.close} accessibilityRole="button" accessibilityLabel="Close montage">
              <Txt v="heading" color={ink.page}>✕</Txt>
            </Pressable>
          </View>

          {held && (
            <View style={styles.center} pointerEvents="none">
              <View style={styles.pill}><Txt v="smallBold" color={ink.page}>❚❚ Paused</Txt></View>
            </View>
          )}
          {ended && (
            <View style={[styles.center, { justifyContent: 'flex-end', paddingBottom: insets.bottom + space.xxl }]} pointerEvents="box-none">
              <View style={styles.endRow}>
                <Pressable onPress={() => { setUnder(null); setEnded(false); if (live.current.idx === 0) setRun((r) => r + 1); else setIdx(0); }} style={styles.replay} accessibilityRole="button">
                  <Txt v="bodyBold" color={ink.ink}>Play again</Txt>
                </Pressable>
                <Pressable onPress={onClose} style={[styles.replay, styles.replayGhost]} accessibilityRole="button">
                  <Txt v="bodyBold" color={ink.page}>Close</Txt>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function Segment({ i, clock }: { i: number; clock: SharedValue<number> }) {
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(Math.max(clock.value - i, 0), 1) * 100}%` }));
  return (
    <View style={styles.bar}>
      <View style={styles.barTrack} />
      <Animated.View style={[styles.barFill, fill]} />
    </View>
  );
}

function SlideView({ slide, paused, bottom }: { slide: Slide; paused: boolean; bottom: number }) {
  return slide.kind === 'photo' ? <PhotoSlide slide={slide} paused={paused} bottom={bottom} /> : <TitleSlide slide={slide} />;
}

function PhotoSlide({ slide, paused, bottom }: { slide: Extract<Slide, { kind: 'photo' }>; paused: boolean; bottom: number }) {
  const t = useSharedValue(0);
  const dir = slide.key.length % 2 ? 1 : -1;
  useEffect(() => {
    if (paused) { cancelAnimation(t); return; }
    t.value = withTiming(1, { duration: (SLIDE_MS + FADE_MS) * (1 - t.value), easing: Easing.linear });
    return () => cancelAnimation(t);
  }, [paused, t]);
  const kb = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.08 * t.value }, { translateX: dir * 14 * t.value }, { translateY: -10 * t.value }],
  }));
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, kb]}>
        <Image source={{ uri: slide.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      {slide.caption ? (
        <LinearGradient colors={[scrim.paperFade, scrim.heavy]} style={[styles.caption, { paddingBottom: bottom + space.xxl * 1.5 }]}>
          <Txt v="story" color={ink.page} style={styles.captionText}>{slide.caption}</Txt>
        </LinearGradient>
      ) : null}
    </View>
  );
}

function TitleSlide({ slide }: { slide: Extract<Slide, { kind: 'title' }> }) {
  return (
    <LinearGradient colors={[realm.nightIndigo, realm.royalPurple]} style={styles.title}>
      <Txt v="smallBold" color={realm.warmGold} center>{slide.eyebrow.toUpperCase()}</Txt>
      <Txt v="hero" color={ink.page} center>{slide.title}</Txt>
      {slide.line ? <Txt v="story" color={ink.lavenderMist} center>{slide.line}</Txt> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: scrim.black },
  stage: { flex: 1, backgroundColor: realm.nightIndigo, overflow: 'hidden' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  chrome: { position: 'absolute', left: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  barTrack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: ink.page, opacity: 0.35 },
  barFill: { height: 3, borderRadius: 2, backgroundColor: ink.page },
  close: { padding: space.xs },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.xxl * 2, paddingHorizontal: space.xl },
  captionText: { fontSize: 20, lineHeight: 28 },
  title: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { backgroundColor: scrim.heavy, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm, overflow: 'hidden' },
  endRow: { flexDirection: 'row', gap: space.md },
  replay: { backgroundColor: ink.page, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md, overflow: 'hidden' },
  replayGhost: { backgroundColor: scrim.heavy, borderWidth: 1.5, borderColor: ink.page },
});
