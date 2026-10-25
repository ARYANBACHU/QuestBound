// Owner: AB. Holds Sage's chat + sheet state. Mounted once in app/(tabs)/_layout.tsx.
// Anything under the tabs can call useWizard().open('a question'), .openDemoTools(), or useHideWizardFab(true).
//
// Chat history is kept per fellowship in memory + AsyncStorage (`qb.sage.chat.<fellowshipId>`): reopening the sheet
// never regenerates the greeting; only a message the player sends calls the API.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFellowship } from '@/lib/fellowship';
import type { WizardAction } from '@/shared/types';
import { markSpoken } from './Sage';

export interface WizardMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: WizardAction[];
  post?: string; // a chat message Sage offers to post for the user (meetup plan)
}

/** closed = only the FAB · pill = minimized chip · half / full = the sheet. */
export type SheetMode = 'closed' | 'pill' | 'half' | 'full';

interface WizardCtx {
  mode: SheetMode;
  setMode: (m: SheetMode) => void;
  sheetOpen: boolean;
  demoOpen: boolean;
  pendingQuestion: string | null;
  messages: WizardMsg[];
  setMessages: React.Dispatch<React.SetStateAction<WizardMsg[]>>;
  /** ids of assistant messages created this session (typewriter + talk only for these) */
  freshIds: Set<string>;
  open: (question?: string) => void;
  close: () => void;
  minimize: () => void;
  openDemoTools: () => void;
  closeDemoTools: () => void;
  consumePending: () => string | null;
  fabHidden: boolean;
  hideFab: () => () => void;
}

const GREETING = "Hello, I'm Sage. I know your whole tale — who's free, what's left to color, and where the good snacks are. Ask me anything.";
const MAX_SAVED = 40;
const memory = new Map<string, WizardMsg[]>();
const storeKey = (fid: string) => `qb.sage.chat.${fid}`;
const greetingFor = (fid: string): WizardMsg => ({ id: `greet-${fid}`, role: 'assistant', content: GREETING });

const Ctx = createContext<WizardCtx | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const { fellowship } = useFellowship();
  const fid = fellowship?.id ?? 'none';
  const [mode, setMode] = useState<SheetMode>('closed');
  const [demoOpen, setDemoOpen] = useState(false);
  const [pendingQuestion, setPending] = useState<string | null>(null);
  const [messages, setMessagesRaw] = useState<WizardMsg[]>(() => memory.get(fid) ?? []);
  const [hiders, setHiders] = useState(0);
  const freshIds = useRef(new Set<string>()).current;
  const loadedFor = useRef<string | null>(null);

  // Load this fellowship's history once (memory first, then AsyncStorage). Restored lines never ping again.
  useEffect(() => {
    let alive = true;
    loadedFor.current = null;
    const cached = memory.get(fid);
    if (cached) {
      setMessagesRaw(cached);
      loadedFor.current = fid;
      return;
    }
    AsyncStorage.getItem(storeKey(fid))
      .then((raw) => {
        if (!alive) return;
        const saved: WizardMsg[] = raw ? JSON.parse(raw) : [];
        const list = saved.length ? saved : [greetingFor(fid)];
        if (saved.length) markSpoken(saved.map((m) => m.id));
        memory.set(fid, list);
        setMessagesRaw(list);
      })
      .catch(() => { if (alive) setMessagesRaw([greetingFor(fid)]); })
      .finally(() => { if (alive) loadedFor.current = fid; });
    return () => { alive = false; };
  }, [fid]);

  const setMessages: React.Dispatch<React.SetStateAction<WizardMsg[]>> = useCallback((next) => {
    setMessagesRaw((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      value.forEach((m) => { if (m.role === 'assistant' && !prev.some((p) => p.id === m.id)) freshIds.add(m.id); });
      memory.set(fid, value);
      if (loadedFor.current === fid) {
        AsyncStorage.setItem(storeKey(fid), JSON.stringify(value.slice(-MAX_SAVED))).catch(() => {});
      }
      return value;
    });
  }, [fid, freshIds]);

  const open = useCallback((question?: string) => { setPending(question ?? null); setMode('half'); }, []);
  const close = useCallback(() => setMode('closed'), []);
  const minimize = useCallback(() => setMode('pill'), []);
  const openDemoTools = useCallback(() => setDemoOpen(true), []);
  const closeDemoTools = useCallback(() => setDemoOpen(false), []);
  const consumePending = useCallback(() => {
    const q = pendingQuestion;
    setPending(null);
    return q;
  }, [pendingQuestion]);
  const hideFab = useCallback(() => {
    setHiders((n) => n + 1);
    return () => setHiders((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo<WizardCtx>(
    () => ({
      mode, setMode, sheetOpen: mode === 'half' || mode === 'full', demoOpen, pendingQuestion, messages, setMessages, freshIds,
      open, close, minimize, openDemoTools, closeDemoTools, consumePending, fabHidden: hiders > 0, hideFab,
    }),
    [mode, demoOpen, pendingQuestion, messages, setMessages, freshIds, open, close, minimize, openDemoTools, closeDemoTools,
      consumePending, hiders, hideFab],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const noop = () => {};
/** Safe outside the provider (e.g. on the mission modal): calls become no-ops. */
export function useWizard(): WizardCtx {
  return useContext(Ctx) ?? {
    mode: 'closed', setMode: noop, sheetOpen: false, demoOpen: false, pendingQuestion: null, messages: [],
    setMessages: noop as never, freshIds: new Set(), open: noop, close: noop, minimize: noop, openDemoTools: noop,
    closeDemoTools: noop, consumePending: () => null, fabHidden: false, hideFab: () => noop,
  };
}

/**
 * Hide Sage's floating button while `hidden` is true (e.g. AD's Storybook reader / montage):
 *   useHideWizardFab(readerOpen || montageOpen);
 * Only counts while the calling screen is focused — a tab left in the background with its montage open no longer
 * hides Sage on every other tab (B5). Always released on blur/unmount.
 */
export function useHideWizardFab(hidden: boolean) {
  const { hideFab } = useWizard();
  const focused = useIsFocused();
  useEffect(() => (hidden && focused ? hideFab() : undefined), [hidden, focused, hideFab]);
}
