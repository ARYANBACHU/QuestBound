// Owner: AB. U5 — Sage's spotlight tour, once per tab (seen flags in coachMarks.ts; "Replay the tour" resets).
// Everything dims + blurs except the highlighted element and Sage's bubble; tap anywhere to continue.
// Calm by design: waits for the tab to settle, never shows over Sage's sheet or while a book is being written,
// one short line per step, and the panes fade in/out — nothing loops.
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useNewBook } from '@/components/shell/NewBook';
import { playSfx } from '@/components/shell/sfx';
import { T } from '@/components/shell/T';
import { ink, panel, radius, scrim, shadow, space, ui } from '@/shared/theme';
import { hasSeenCoach, markCoachSeen, onCoachReset } from './coachMarks';
import { measureCoachTarget, type Rect } from './coachTargets';
import { SageBubble } from './SageBubble';
import { COACH_TOURS, type CoachStep, type WizardScreen } from './screens';
import { useWizard } from './WizardProvider';

const PAD = 8;
const SETTLE_MS = 900;

export function CoachMark({ screen }: { screen: WizardScreen; bottom?: number }) {
  const [step, setStep] = useState(-1); // -1 = hidden
  const [hole, setHole] = useState<Rect | null>(null);
  const [resets, setResets] = useState(0);
  const { mode, demoOpen } = useWizard();
  const { writing } = useNewBook();
  const tour: CoachStep[] = COACH_TOURS[screen];
  const busy = mode !== 'closed' || demoOpen || writing;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => onCoachReset(() => setResets((n) => n + 1)), []);

  // First visit to a tab: wait for it to settle (and for Sage's sheet / the ritual to be gone), then start.
  useEffect(() => {
    let alive = true;
    setStep(-1);
    setHole(null);
    const t = setTimeout(() => {
      hasSeenCoach(screen).then((seen) => { if (alive && !seen && !busyRef.current) setStep(0); });
    }, SETTLE_MS);
    return () => { alive = false; clearTimeout(t); };
  }, [screen, resets, busy]);

  // Measure the current step's target.
  useEffect(() => {
    if (step < 0) return;
    let alive = true;
    const target = tour[step]?.target;
    setHole(null);
    if (!target) return;
    measureCoachTarget(target).then((r) => {
      if (alive) setHole(r);
      else return;
      if (!r) setTimeout(() => { measureCoachTarget(target).then((r2) => { if (alive) setHole(r2); }); }, 350);
    });
    return () => { alive = false; };
  }, [step, tour]);

  const next = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (step + 1 < tour.length) { playSfx('tap'); setStep(step + 1); return; }
    playSfx('close');
    setStep(-1);
    markCoachSeen(screen);
  }, [step, tour.length, screen]);

  if (step < 0 || busy || !tour[step]) return null;
  return <Spotlight key={`${screen}-${step}`} hole={hole} text={tour[step].text} index={step} total={tour.length}
    speakKey={`coach-${screen}-${step}-${resets}`} onNext={next} />;
}

function Spotlight({ hole, text, index, total, speakKey, onNext }: {
  hole: Rect | null; text: string; index: number; total: number; speakKey: string; onNext: () => void;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const h = hole ? {
    x: Math.max(0, hole.x - PAD), y: Math.max(0, hole.y - PAD),
    w: Math.min(W, hole.w + PAD * 2), h: Math.min(H, hole.h + PAD * 2),
  } : null;
  // bubble goes on the roomier side of the hole
  const below = h ? h.y + h.h / 2 < H / 2 : false;
  const bubblePos = !h ? { top: H * 0.3 }
    : below ? { top: Math.min(H - 240, h.y + h.h + space.md) }
    : { bottom: Math.min(H - 240, H - h.y + space.md) };
  const last = index + 1 >= total;

  return (
    <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, styles.layer]}>
      {/* panes around the hole (or one full pane) */}
      {h ? (
        <>
          <Pane style={{ left: 0, top: 0, width: W, height: h.y }} />
          <Pane style={{ left: 0, top: h.y + h.h, width: W, height: Math.max(0, H - h.y - h.h) }} />
          <Pane style={{ left: 0, top: h.y, width: h.x, height: h.h }} />
          <Pane style={{ left: h.x + h.w, top: h.y, width: Math.max(0, W - h.x - h.w), height: h.h }} />
          <View pointerEvents="none" style={[styles.ring, { left: h.x - 3, top: h.y - 3, width: h.w + 6, height: h.h + 6 }]} />
        </>
      ) : (
        <Pane style={StyleSheet.absoluteFill} />
      )}
      {/* tap anywhere (the highlighted element included) to continue */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onNext} accessibilityRole="button"
        accessibilityLabel={`${text} Tap to ${last ? 'finish' : 'continue'}`} />
      <View style={[styles.bubbleWrap, bubblePos]} pointerEvents="box-none">
        <View style={styles.card}>
          <SageBubble text={text} sageSize={56} speakKey={speakKey} onPress={onNext} still />
          <View style={styles.foot}>
            <View style={styles.dots}>
              {Array.from({ length: total }, (_, i) => <View key={i} style={[styles.dot, i === index && styles.dotOn]} />)}
            </View>
            <Pressable onPress={onNext} hitSlop={10} style={styles.ok} accessibilityRole="button" accessibilityLabel={last ? 'Got it' : 'Next'}>
              <T variant="smallBold" color={ink.ink}>{last ? 'Got it' : 'Next'}</T>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function Pane({ style }: { style: object }) {
  return (
    <View pointerEvents="none" style={[styles.pane, style]}>
      {Platform.OS === 'ios' ? <BlurView intensity={14} tint="light" style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 40, elevation: 40 },
  pane: { position: 'absolute', overflow: 'hidden' },
  dim: { backgroundColor: scrim.base },
  ring: { position: 'absolute', borderRadius: radius.md, borderWidth: 3, borderColor: ink.gold },
  bubbleWrap: { position: 'absolute', left: space.lg, right: space.lg },
  card: {
    backgroundColor: panel.parchment, borderRadius: ui.cardRadius, borderWidth: panel.borderWidth, borderColor: panel.border,
    padding: space.md, gap: space.sm, ...shadow.lg,
  },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6, paddingLeft: space.xs },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ink.muted, opacity: 0.4 },
  dotOn: { backgroundColor: ink.ink, opacity: 1 },
  ok: {
    paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill,
    backgroundColor: ink.page, borderWidth: 2, borderColor: ink.ink,
  },
});
