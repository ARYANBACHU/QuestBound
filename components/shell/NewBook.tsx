// Owner: AB. ONE place that writes a new book (B1). Mounted once in app/(tabs)/_layout.tsx, so the flow survives the
// Missions/Settings screens re-rendering (or switching to their "Sage is writing" state) while the book is written.
//
//   const { openNewBook, writeBook, writing } = useNewBook();
//   openNewBook()                         → difficulty sheet → confirm → writeBook({ difficulty })
//   writeBook({ demo: 'ut', lines })      → straight to the ritual (Demo Tools)
//
// Why it crashed before: the sheet's <Modal> was swapped for a second ritual <Modal> in the same frame (iOS can't
// present while dismissing), and the sheet lived inside a screen branch that unmounted when the book flipped to
// `generating`, so the in-flight flow lost its host. Now: never two Modals at once (the ritual is an in-tree overlay),
// one in-flight guard, and the host never unmounts.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SummonRitual } from '@/components/wizard/SummonRitual';
import { useHideWizardFab } from '@/components/wizard/WizardProvider';
import { generateStoryline } from '@/lib/api';
import { useFellowship } from '@/lib/fellowship';
import { useStoryline } from '@/lib/game';
import type { Difficulty, GenerateStorylineRequest } from '@/shared/types';
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
  writing: boolean;
}

const DEFAULT_LINES = [
  'Closing the old book gently…', 'Gathering everyone’s interests…', 'Consulting the maps…',
  'Inking a brand-new first chapter…', 'Almost there…',
];

const Ctx = createContext<NewBookCtx | null>(null);

export function NewBookProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { fellowship } = useFellowship();
  const { storyline } = useStoryline(fellowship?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ritual, setRitual] = useState<{ title: string; lines: string[] } | null>(null);
  const [hidden, setHidden] = useState(false); // player tapped "Keep exploring" — book still being written
  const inFlight = useRef(false);
  // keep the latest values for the async flow without re-creating callbacks
  const live = useRef({ fellowship, storyline });
  live.current = { fellowship, storyline };

  useHideWizardFab(sheetOpen || (!!ritual && !hidden));

  const openNewBook = useCallback(() => {
    if (inFlight.current) { setHidden(false); return; } // already writing → show the ritual again
    setError(null);
    setSheetOpen(true);
  }, []);

  const writeBook = useCallback(async (opts: WriteBookOptions = {}) => {
    const { fellowship: f, storyline: s } = live.current;
    if (inFlight.current) return false;
    if (!f) { setError('Join a fellowship first.'); return false; }
    inFlight.current = true;
    setSheetOpen(false);
    setError(null);
    setHidden(false);
    setRitual({ title: opts.title ?? 'Sage is writing…', lines: opts.lines ?? DEFAULT_LINES });
    try {
      await generateStoryline({
        fellowship_id: f.id, mode: 'first', difficulty: opts.difficulty, demo: opts.demo, replace_active: !!s,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      playSfx('success');
      router.navigate('/(tabs)/coloring');
      return true;
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      playSfx('error');
      setError(`The ink ran dry: ${e instanceof Error ? e.message : String(e)}. Your current book is safe — try again.`);
      if (!opts.demo) setSheetOpen(true);
      return false;
    } finally {
      inFlight.current = false;
      setRitual(null);
      setHidden(false);
    }
  }, [router]);

  const value = useMemo(() => ({ openNewBook, writeBook, writing: !!ritual }), [openNewBook, writeBook, ritual]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <NewStorylineSheet
        visible={sheetOpen && !ritual}
        onClose={() => setSheetOpen(false)}
        onWrite={(difficulty) => { writeBook({ difficulty }).catch(() => {}); }}
        storyline={storyline}
        error={error}
        disabled={!fellowship}
      />
      {ritual && !hidden ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
          <View style={styles.fill}>
            <SummonRitual title={ritual.title} lines={ritual.lines} onHide={() => setHidden(true)} />
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const noop = () => {};
/** Safe outside the provider (e.g. the mission modal): opening is a no-op there. */
export function useNewBook(): NewBookCtx {
  return useContext(Ctx) ?? { openNewBook: noop, writeBook: async () => false, writing: false };
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
