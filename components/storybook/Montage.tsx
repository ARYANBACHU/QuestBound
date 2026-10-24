// Owner: AD. Full-screen montage: every memory of the book, 3 s each, Ken Burns + crossfade, chapter title cards.
'use no memo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ink, radius, space } from '@/shared/theme';
import { Txt } from '@/components/coloring/ui';
import type { Slide } from './bookData';

const SLIDE_MS = 3000;
const FADE_MS = 600;

export function Montage({ visible, slides, onClose }: { visible: boolean; slides: Slide[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = slides.length - 1;

  useEffect(() => {
    if (visible) { setIdx(0); setPaused(false); }
  }, [visible]);

  useEffect(() => {
    if (!visible || paused || idx >= last) return;
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, last)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [visible, paused, idx, last]);

  const nav = useRef({ next: () => {}, prev: () => {}, toggle: () => {} });
  nav.current = {
    next: () => setIdx((i) => Math.min(i + 1, last)),
    prev: () => setIdx((i) => Math.max(i - 1, 0)),
    toggle: () => setPaused((p) => !p),
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) nav.current.next();
          else if (g.dx > 50) nav.current.prev();
          else if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) nav.current.toggle();
        },
      }),
    [],
  );

  const slide = slides[idx];
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.stage} {...pan.panHandlers}>
        {slide && (
          <Animated.View key={slide.key} entering={FadeIn.duration(FADE_MS)} exiting={FadeOut.duration(FADE_MS)} style={StyleSheet.absoluteFill}>
            {slide.kind === 'photo' ? <PhotoSlide slide={slide} paused={paused} bottom={insets.bottom} /> : <TitleSlide slide={slide} />}
          </Animated.View>
        )}

        <View style={[styles.chrome, { top: insets.top + space.sm }]} pointerEvents="box-none">
          <View style={styles.bars}>
            {slides.map((s, i) => <View key={s.key} style={[styles.bar, i <= idx && styles.barOn]} />)}
          </View>
          <Pressable onPress={onClose} hitSlop={14} style={styles.close} accessibilityRole="button" accessibilityLabel="Close montage">
            <Txt v="heading" color={ink.page}>✕</Txt>
          </Pressable>
        </View>

        {paused && (
          <View style={styles.pausedWrap} pointerEvents="none">
            <View style={styles.paused}><Txt v="smallBold" color={ink.page}>Paused · tap to play</Txt></View>
          </View>
        )}
        {idx === last && !paused && slides.length > 1 && (
          <View style={[styles.pausedWrap, { justifyContent: 'flex-end', paddingBottom: insets.bottom + space.xxl }]} pointerEvents="box-none">
            <Pressable onPress={() => setIdx(0)} style={styles.replay} accessibilityRole="button">
              <Txt v="bodyBold" color={ink.ink}>Play again</Txt>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
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
        <LinearGradient colors={[`${ink.ink}00`, `${ink.ink}E6`]} style={[styles.caption, { paddingBottom: bottom + space.xxl * 1.5 }]}>
          <Txt v="story" color={ink.page} style={styles.captionText}>{slide.caption}</Txt>
        </LinearGradient>
      ) : null}
    </View>
  );
}

function TitleSlide({ slide }: { slide: Extract<Slide, { kind: 'title' }> }) {
  return (
    <View style={styles.title}>
      <Txt v="smallBold" color={ink.gold} center>{slide.eyebrow.toUpperCase()}</Txt>
      <Txt v="hero" color={ink.page} center>{slide.title}</Txt>
      {slide.line ? <Txt v="story" color={ink.lavenderMist} center>{slide.line}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: ink.ink, overflow: 'hidden' },
  chrome: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  bars: { flex: 1, flexDirection: 'row', gap: 3 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: ink.page, opacity: 0.3 },
  barOn: { opacity: 0.95 },
  close: { padding: space.xs },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.xxl * 2, paddingHorizontal: space.xl },
  captionText: { fontSize: 20, lineHeight: 28 },
  title: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  pausedWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  paused: { backgroundColor: ink.ink, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm, borderWidth: 1.5, borderColor: ink.gold },
  replay: { backgroundColor: ink.page, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md },
});
