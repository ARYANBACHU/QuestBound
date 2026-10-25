// Owner: AB. ONE place that writes a new book (B1 → V1). Mounted once in app/(tabs)/_layout.tsx, so the flow survives
// the Missions/Settings screens re-rendering (or switching to their "Sage is writing" state) while the book is written.
//
//   const { openNewBook, writeBook, writing } = useNewBook();
//   openNewBook()                         → difficulty sheet → confirm → writeBook({ difficulty })
//   writeBook({ demo: 'ut', lines })      → straight to the writing overlay (Demo Tools)
//
// V1 rules (the Expo Go crash):
// - No active fellowship → never write a book; go to create/join instead.
// - Before writing, close EVERY pop-up (this sheet, Sage's sheet, Demo Tools, the keyboard, coach marks) and wait for
//   their close animation. Only then show the overlay. Never a Modal swapped for a Modal; never stacked on a pop-up.
// - The overlay is ONE full-screen in-tree view (not a Modal): it swallows taps (no double writes), shows progress,
//   and after 45 s offers Retry. Failures stay in the overlay (Retry / Back to my book) — no sheet re-opens on top.
// - No layout entering/exiting animations on the overlay (exit animations on a disappearing host crash natively).
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SageBubble } from '@/components/wizard/SageBubble';
import { SummonRitual } from '@/components/wizard/SummonRitual';
import { useHideWizardFab, useWizard } from '@/components/wizard/WizardProvider';
import { generateStoryline } from '@/lib/api';
import { useFellowship } from '@/lib/fellowship';
import { useStoryline } from '@/lib/game';
import type { Difficulty, GenerateStorylineRequest } from '@/shared/types';
import { panel, space, ui } from '@/shared/theme';
import { Button } from './Button';
import { NewStorylineSheet } from './NewStorylineSheet';
import { playSfx } from './sfx';

export interface WriteBookOptions {
  difficulty?: Difficulty;
  demo?: GenerateStorylineRequest['demo'];
  lines?: string[];
  title?: string;
}

interface NewBookCtx {
  openNewBook: () => void;
  writeBook: (opts?: WriteBookOptions) => Promise<boolean>;
  /** true from the moment a write starts (incl. closing pop-ups) until the overlay is gone */
  writing: boolean;
}

/** Sheet slide-down / Modal fade-out on iOS is ~300 ms; wait a little longer before showing anything new. */
export const POPUP_CLOSE_MS = 420;
const TIMEOUT_MS = 45_000;

const DEFAULT_LINES = [
  'Closing the old book gently…', 'Gathering everyone’s interests…', 'Consulting the maps…',
  'Asking the town criers what’s on…', 'Inking a brand-new first chapter…', 'Almost there…',
];

type Phase = 'closing' | 'writing' | 'slow' | 'failed';
interface Ritual { phase: Phase; title: string; lines: string[]; error?: string; tries: number }

const Ctx = createContext<NewBookCtx | null>(null);

/** Friendly copy for whatever the server / network threw. */
function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/reach|network|fetch|timeout/i.test(m)) return 'Sage can’t reach the kingdom right now. Check your connection, then try again.';
  if (/non-2xx|500|internal/i.test(m)) return 'Sage’s quill slipped. Your current book is safe — try again.';
  return `${m.replace(/\.$/, '')}. Your current book is safe — try again.`;
}
const isFellowshipError = (e: unknown) =>
  /fellowship (not found|first)|only members|not a member|no fellowship/i.test(e instanceof Error ? e.message : String(e));

export function NewBookProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const wizard = useWizard();
  const { fellowship, loading: fellowshipLoading } = useFellowship();
  const { storyline } = useStoryline(fellowship?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const inFlight = useRef(false);
  const attemptRef = useRef(0); // bump to invalidate any in-flight attempt
  const optsRef = useRef<WriteBookOptions>({});
  const startedFrom = useRef<string | null>(null); // storyline id when the write began
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const alive = useRef(true);
  const succeeded = useRef(false); // this write already succeeded (promise + realtime may both report it)
  // keep the latest values for the async flow without re-creating callbacks
  const live = useRef({ fellowship, storyline, wizard });
  live.current = { fellowship, storyline, wizard };

  useHideWizardFab(sheetOpen || !!ritual);

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { alive.current = false; clearTimers(); attemptRef.current++; }, []);

  /** Close every pop-up we know about. Returns after their close animation. */
  const closeAll = useCallback(() => {
    setSheetOpen(false);
    Keyboard.dismiss();
    live.current.wizard.close();
    live.current.wizard.closeDemoTools();
  }, []);

  const toFellowshipStep = useCallback(() => {
    closeAll();
    setTimeout(() => router.replace({ pathname: '/onboarding', params: { step: 'fellowship' } }), POPUP_CLOSE_MS);
  }, [closeAll, router]);

  const finish = useCallback((ok: boolean) => {
    clearTimers();
    attemptRef.current++;
    inFlight.current = false;
    if (alive.current) setRitual(null);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const succeed = useCallback(() => {
    if (succeeded.current) return;
    succeeded.current = true;
    attemptRef.current++; // the promise and the realtime watcher may both report success — handle it once
    clearTimers();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    playSfx('success');
    router.navigate('/(tabs)/coloring');
    // let the page render underneath before lifting the overlay (no exit animation — see header)
    setTimeout(() => finish(true), 300);
  }, [finish, router]);

  const attempt = useCallback(() => {
    const f = live.current.fellowship;
    if (!f) { finish(false); toFellowshipStep(); return; }
    const n = ++attemptRef.current;
    clearTimers();
    setRitual((r) => (r ? { ...r, phase: 'writing', error: undefined, tries: r.tries + 1 } : r));
    later(() => {
      if (attemptRef.current === n) setRitual((r) => (r && r.phase === 'writing' ? { ...r, phase: 'slow' } : r));
    }, TIMEOUT_MS);
    const o = optsRef.current;
    generateStoryline({
      fellowship_id: f.id, mode: 'first', difficulty: o.difficulty, demo: o.demo, replace_active: !!live.current.storyline,
    }).then(
      () => { if (attemptRef.current === n) succeed(); },
      (e) => {
        if (attemptRef.current !== n) return;
        clearTimers();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        playSfx('error');
        if (isFellowshipError(e)) { finish(false); toFellowshipStep(); return; }
        setRitual((r) => (r ? { ...r, phase: 'failed', error: friendly(e) } : r));
      },
    );
  }, [finish, succeed, toFellowshipStep]);

  const writeBook = useCallback((opts: WriteBookOptions = {}) => {
    if (inFlight.current) return Promise.resolve(false);
    if (!live.current.fellowship) { toFellowshipStep(); return Promise.resolve(false); }
    inFlight.current = true;
    succeeded.current = false;
    optsRef.current = opts;
    startedFrom.current = live.current.storyline?.id ?? null;
    closeAll();
    setRitual({ phase: 'closing', title: opts.title ?? 'Sage is writing your book…', lines: opts.lines ?? DEFAULT_LINES, tries: 0 });
    later(attempt, POPUP_CLOSE_MS);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, [attempt, closeAll, toFellowshipStep]);

  const openNewBook = useCallback(() => {
    if (inFlight.current) return; // the overlay is already up and swallowing taps
    if (!live.current.fellowship) { toFellowshipStep(); return; }
    setSheetOpen(true);
  }, [toFellowshipStep]);

  // Realtime may deliver the new book before (or instead of, after a timeout) the HTTP response.
  useEffect(() => {
    if (!ritual || (ritual.phase !== 'writing' && ritual.phase !== 'slow')) return;
    if (storyline && storyline.id !== startedFrom.current && storyline.status === 'active') succeed();
  }, [ritual, storyline, succeed]);

  // Left the fellowship mid-write → stop; the tabs' fellowship guard takes the player to create/join.
  useEffect(() => {
    if (ritual && !fellowshipLoading && !fellowship) finish(false);
  }, [ritual, fellowship, fellowshipLoading, finish]);

  const value = useMemo(() => ({ openNewBook, writeBook, writing: !!ritual }), [openNewBook, writeBook, ritual]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <NewStorylineSheet
        visible={sheetOpen && !ritual}
        onClose={() => setSheetOpen(false)}
        onWrite={(difficulty) => { writeBook({ difficulty }).catch(() => {}); }}
        storyline={storyline}
        error={null}
        disabled={!fellowship}
      />
      {ritual ? (
        ritual.phase === 'closing'
          ? <View style={StyleSheet.absoluteFill} /> /* swallow taps while pop-ups animate away */
          : <WritingOverlay ritual={ritual} onRetry={attempt} onClose={() => { playSfx('close'); finish(false); }} />
      ) : null}
    </Ctx.Provider>
  );
}

function WritingOverlay({ ritual, onRetry, onClose }: { ritual: Ritual; onRetry: () => void; onClose: () => void }) {
  const opacity = useSharedValue(0);
  useEffect(() => { opacity.value = withTiming(1, { duration: 220 }); }, [opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  let footer: ReactNode = null;
  if (ritual.phase === 'slow') {
    footer = (
      <View style={styles.card}>
        <SageBubble expression="thinking" sageSize={44} text="The ink is thick tonight. I can keep writing, or start this page over." />
        <Button label="Try again" small sfx="open" onPress={onRetry} />
        <Button label="Keep exploring — I’ll keep writing" variant="ghost" small sfx="close" onPress={onClose} />
      </View>
    );
  } else if (ritual.phase === 'failed') {
    footer = (
      <View style={styles.card}>
        <SageBubble expression="surprised" sageSize={44} text={ritual.error ?? 'Sage’s quill slipped. Try again.'} />
        <Button label="Try again" small tone="gold" sfx="open" onPress={onRetry} />
        <Button label="Back to my book" variant="ghost" small sfx="close" onPress={onClose} />
      </View>
    );
  }

  return (
    // Full-screen, in-tree, and it takes every touch: nothing underneath can be tapped twice.
    <Animated.View style={[StyleSheet.absoluteFill, fade]} accessibilityViewIsModal>
      <SummonRitual
        // re-key per attempt so the progress bar restarts on Retry
        key={ritual.phase === 'failed' ? 'failed' : `try-${ritual.tries}`}
        title={ritual.phase === 'failed' ? 'The ink ran dry' : ritual.title}
        lines={ritual.lines}
        progressMs={ritual.phase === 'failed' ? undefined : TIMEOUT_MS}
        footer={footer}
      />
    </Animated.View>
  );
}

const noop = () => {};
/** Safe outside the provider (e.g. the mission modal): opening is a no-op there. */
export function useNewBook(): NewBookCtx {
  return useContext(Ctx) ?? { openNewBook: noop, writeBook: async () => false, writing: false };
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm, padding: space.md, backgroundColor: panel.parchment, borderRadius: ui.cardRadius,
    borderWidth: panel.borderWidth, borderColor: panel.border,
  },
});
