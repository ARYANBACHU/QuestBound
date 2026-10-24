// Owner: AB. Holds Muse's chat + which sheet is open. Mounted once in app/(tabs)/_layout.tsx.
// Anything under the tabs can call useWizard().open('a question') or .openDemoTools().
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { WizardAction } from '@/shared/types';

export interface WizardMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: WizardAction[];
  post?: string; // a chat message Muse offers to post for the user (meetup plan)
}

interface WizardCtx {
  sheetOpen: boolean;
  demoOpen: boolean;
  pendingQuestion: string | null;
  messages: WizardMsg[];
  setMessages: React.Dispatch<React.SetStateAction<WizardMsg[]>>;
  open: (question?: string) => void;
  close: () => void;
  openDemoTools: () => void;
  closeDemoTools: () => void;
  consumePending: () => string | null;
}

const Ctx = createContext<WizardCtx | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [pendingQuestion, setPending] = useState<string | null>(null);
  const [messages, setMessages] = useState<WizardMsg[]>([]);

  const open = useCallback((question?: string) => { setPending(question ?? null); setSheetOpen(true); }, []);
  const close = useCallback(() => setSheetOpen(false), []);
  const openDemoTools = useCallback(() => setDemoOpen(true), []);
  const closeDemoTools = useCallback(() => setDemoOpen(false), []);
  const consumePending = useCallback(() => {
    const q = pendingQuestion;
    setPending(null);
    return q;
  }, [pendingQuestion]);

  const value = useMemo(
    () => ({ sheetOpen, demoOpen, pendingQuestion, messages, setMessages, open, close, openDemoTools, closeDemoTools, consumePending }),
    [sheetOpen, demoOpen, pendingQuestion, messages, open, close, openDemoTools, closeDemoTools, consumePending],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const noop = () => {};
/** Safe outside the provider (e.g. on the mission modal): calls become no-ops. */
export function useWizard(): WizardCtx {
  return useContext(Ctx) ?? {
    sheetOpen: false, demoOpen: false, pendingQuestion: null, messages: [], setMessages: noop as never,
    open: noop, close: noop, openDemoTools: noop, closeDemoTools: noop, consumePending: () => null,
  };
}
