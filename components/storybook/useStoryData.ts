// Owner: AD. Local adapters for EV's planned lib/game.ts hooks (ROUND-2-PLAN E5 / E7 / P11), same signatures:
//   usePages(storylineId)        → { pages, loading }        (ordered by chapter_number)
//   useCompletions(storylineId)  → { completions, loading }  (proof_text, participants, verdict)
// When EV's versions reach main, replace this file's body with:
//   export { usePages, useCompletions } from '@/lib/game';
'use no memo';
import { useEffect, useState } from 'react';
import { USE_MOCKS } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { mock, subscribeMock } from '@/lib/mockStore';
import type { Completion, Mission, Page } from '@/shared/types';

function useMockTick() {
  const [, force] = useState(0);
  useEffect(() => (USE_MOCKS ? subscribeMock(() => force((n) => n + 1)) : undefined), []);
}

/** Load `loader(key)` and reload on realtime changes to `table` (filtered by `filter(key)`). Real mode only. */
function useLiveRows<T>(key: string | null, table: string, filter: (key: string) => string | undefined, loader: (key: string) => Promise<T[]>) {
  const [state, setState] = useState<{ key: string | null; rows: T[]; loading: boolean }>({ key: null, rows: [], loading: false });
  useEffect(() => {
    if (USE_MOCKS || !key) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      loader(key)
        .then((rows) => alive && setState({ key, rows, loading: false }))
        .catch((e) => {
          console.warn('[storybook] load failed', table, String(e));
          if (alive) setState((s) => ({ key, rows: s.key === key ? s.rows : [], loading: false }));
        });
    setState((s) => ({ key, rows: s.key === key ? s.rows : [], loading: true }));
    load();
    const f = filter(key);
    const ch = supabase
      .channel(`ad:${table}:${key}:${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(f ? { filter: f } : {}) }, () => {
        clearTimeout(timer);
        timer = setTimeout(load, 200);
      })
      .subscribe();
    return () => {
      alive = false;
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (USE_MOCKS || !key) return { rows: [] as T[], loading: false };
  return state.key === key ? state : { rows: [] as T[], loading: true };
}

async function select<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as T[] | null) ?? [];
}

/** Pages of ANY book (current or shelved), ordered by chapter. */
export function usePages(storylineId: string | null): { pages: Page[]; loading: boolean } {
  useMockTick();
  const live = useLiveRows<Page>(
    storylineId,
    'pages',
    (sid) => `storyline_id=eq.${sid}`,
    (sid) => select<Page>(supabase.from('pages').select('*').eq('storyline_id', sid).order('chapter_number')),
  );
  if (USE_MOCKS) {
    const pages = storylineId ? mock.pages.filter((p) => p.storyline_id === storylineId).sort((a, b) => a.chapter_number - b.chapter_number) : [];
    return { pages, loading: false };
  }
  return { pages: live.rows, loading: live.loading };
}

/** Accepted proofs for a book's missions (newest last). Used for full bard verses in the Storybook. */
export function useCompletions(storylineId: string | null): { completions: Completion[]; loading: boolean } {
  useMockTick();
  const live = useLiveRows<Completion>(
    storylineId,
    'completions',
    () => undefined, // completions has no storyline column; RLS limits rows to my fellowships
    (sid) =>
      select<Completion & { missions?: unknown }>(
        supabase.from('completions').select('*, missions!inner(storyline_id)').eq('missions.storyline_id', sid).order('created_at'),
      ).then((rows) => rows.map(({ missions: _m, ...c }) => c as Completion)),
  );
  if (USE_MOCKS) {
    const done = storylineId ? mock.missions.filter((m) => m.storyline_id === storylineId && m.status === 'complete') : [];
    return { completions: done.filter((m) => m.type === 'bard').map(demoVerse), loading: false };
  }
  return { completions: live.rows, loading: live.loading };
}

// Mock mode keeps no completions, so give every colored bard region a verse to show off the quote card.
const DEMO_VERSES = [
  'Four friends, one map, a city made of light,\nwe got a little lost and found the night.',
  'We sang off-key beneath the castle wall;\nthe moat forgave us, laughing at it all.',
  'The owl asked who; we answered, all of us,\nand rode home singing on the midnight bus.',
  'A lantern lit by jokes and borrowed fries\nstill glows the brightest under Austin skies.',
];
function demoVerse(m: Mission, i: number): Completion {
  const author = m.completed_by[0] ?? m.assignee_ids[0] ?? '';
  return {
    id: `demo-c-${m.id}`, mission_id: m.id, user_id: author, participant_ids: m.completed_by, proof_url: null,
    proof_text: DEMO_VERSES[i % DEMO_VERSES.length],
    verdict: null, story_line: m.story_line, created_at: m.completed_at ?? new Date().toISOString(),
  };
}
