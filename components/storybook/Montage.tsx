// Owner: AD. Full-screen montage, Snapchat-stories style: segmented progress bars, auto-advance, HOLD = pause,
// tap right = next, tap left = previous, swipe down = close. Photos get a slow Ken Burns; chapter title cards between.
'use no memo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation, Easing, FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { ink, radius, realm, scrim, space } from '@/shared/theme';
import { Txt } from '@/components/coloring/ui';
import type { Slide } from './bookData';

const SLIDE_MS = 3000;
const TITLE_MS = 2200;
const FADE_MS = 280;
const HOLD_MS = 180; // press longer than this = hold-to-pause, not a tap
const CLOSE_DY = 110;

const durationOf = (s: Slide | undefined) => (s?.kind === 'title' ? TITLE_MS : SLIDE_MS);

export function Montage({ visible, slides, onClose }: { visible: boolean; slides: Slide[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const [held, setHeld] = useState(false);
  const [ended, setEnded] = useState(false);
  const last = slides.length - 1;
  const progress = useSharedValue(0); // 0..1 of the current slide
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) { setIdx(0); setHeld(false); setEnded(false); dragY.value = 0; }
  }, [visible, dragY]);

  const advance = () => {
    setIdx((i) => {
      if (i >= last) { setEnded(true); return i; }
      return i + 1;
    });
  };

  // run the current segment's bar; resume from where it paused
  const running = visible && !held && !ended;
  useEffect(() => {
    progress.value = 0;
  }, [idx, progress]);
  useEffect(() => {
    if (!running) { cancelAnimation(progress); return; }
    const remaining = durationOf(slides[idx]) * (1 - progress.value);
    progress.value = withTiming(1, { duration: Math.max(remaining, 16), easing: Easing.linear }, (done) => {
      if (done) runOnJS(advance)();
    });
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx]);

  const nav = useRef({ next: () => {}, prev: () => {}, hold: (_h: boolean) => {}, close: () => {} });
  nav.current = {
    next: () => { setEnded(false); advance(); },
    prev: () => { setEnded(false); setIdx((i) => Math.max(i - 1, 0)); progress.value = 0; },
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
      onPanResponderGrant: () => {
        t0 = Date.now();
        holding = false;
        holdTimer = setTimeout(() => { holding = true; nav.current.hold(true); }, HOLD_MS);
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dy) > 8 || Math.abs(g.dx) > 8) clearTimeout(holdTimer);
        dragY.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (e, g) => {
        const wasHolding = holding;
        endHold();
        if (g.dy > CLOSE_DY) { nav.current.close(); return; }
        dragY.value = withTiming(0, { duration: 180 });
        const tap = !wasHolding && Date.now() - t0 < 400 && Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10;
        if (tap) {
          if (e.nativeEvent.pageX < width / 3) nav.current.prev();
          else nav.current.next();
        } else if (g.dx < -60 && Math.abs(g.dy) < 60) nav.current.next();
        else if (g.dx > 60 && Math.abs(g.dy) < 60) nav.current.prev();
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
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.stage, stageStyle]} {...pan.panHandlers}>
          {slide && (
            <Animated.View key={slide.key} entering={FadeIn.duration(FADE_MS)} exiting={FadeOut.duration(FADE_MS)} style={StyleSheet.absoluteFill}>
              {slide.kind === 'photo'
                ? <PhotoSlide slide={slide} paused={!running} bottom={insets.bottom} />
                : <TitleSlide slide={slide} />}
            </Animated.View>
          )}

          <LinearGradient colors={[scrim.heavy, scrim.paperFade]} style={[styles.topShade, { height: insets.top + 90 }]} pointerEvents="none" />
          <View style={[styles.chrome, { top: insets.top + space.sm }]} pointerEvents="box-none">
            <View style={styles.bars} pointerEvents="none">
              {slides.map((s, i) => (
                <Segment key={s.key} state={i < idx ? 'done' : i > idx ? 'todo' : 'now'} progress={progress} />
              ))}
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
                <Pressable onPress={() => { setEnded(false); setIdx(0); }} style={styles.replay} accessibilityRole="button">
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

function Segment({ state, progress }: { state: 'done' | 'now' | 'todo'; progress: SharedValue<number> }) {
  const fill = useAnimatedStyle(() => ({ width: `${(state === 'done' ? 1 : state === 'todo' ? 0 : progress.value) * 100}%` }));
  return (
    <View style={styles.bar}>
      <View style={styles.barTrack} />
      <Animated.View style={[styles.barFill, fill]} />
    </View>
  );
}

function PhotoSlide({ slide, paused, bottom }: { slide: Extract<Slide, { kind: 'photo' }>; paused: boolean; bottom: number }) {
  const t = useSharedValue(0);
  const dir = slide.key.length % 2 ? 1 : -1;
  useEffect(() => {
    if (paused) { cancelAnimation(t); return; }
    t.value = withTiming(1, { duration: (SLIDE_MS + FADE_MS) * (1 - t.value), easing: Easing.linear });
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
  barTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: ink.page, opacity: 0.35 },
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
