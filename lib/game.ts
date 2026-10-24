// Owner: EV. Read-side hooks for the story (storylines, pages, missions, memories), realtime.
// CONTRACT: keep these export names/signatures. UI branches (AD, AB) depend on them.
//
// Mock mode: reads the in-memory store (lib/mockStore.ts) and re-renders on every mock write.
// Real mode: loads from Supabase, then re-loads on postgres_changes for the relevant rows (debounced),
// and once more whenever the channel (re)subscribes so nothing is missed after a reconnect.
'use no memo'; // mock reads come from module state the React Compiler can't track — never memoize these hooks.
import { useEffect, useState } from 'react';
import { USE_MOCKS } from './env';
import { supabase } from './supabase';
import { mock, subscribeMock } from './mockStore';
import { MOCK_GENERATION_INFO } from '@/fixtures/demo';
import type { Memory, Mission, Page, Storyline } from '@/shared/types';

function useMockTick() {
  const [, force] = useState(0);
  useEffect(() => (USE_MOCKS ? subscribeMock(() => force((n) => n + 1)) : undefined), []);
}

// ---------------------------------------------------------------- realtime query helper

type Watch = { table: 'storylines' | 'pages' | 'missions' | 'memories'; filter?: string };
const suffix = () => Math.random().toString(36).slice(2, 8);

/**
 * Load `loader(key)` and keep it fresh via realtime. `key === null` means "nothing to load".
 * `empty` must be a stable (module-level) value.
 */
function useLive<T>(key: string | null, empty: T, loader: (key: string) => Promise<T>, watches: (key: string) => Watch[]) {
  const [state, setState] = useState<{ key: string | null; data: T; loading: boolean }>({ key, data: empty, loading: !USE_MOCKS && !!key });

  useEffect(() => {
    if (USE_MOCKS || !key) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const data = await loader(key);
        if (alive) setState({ key, data, loading: false });
      } catch (e) {
        console.warn('[game] load failed', key, String(e));
        if (alive) setState((s) => ({ key, data: s.key === key ? s.data : empty, loading: false }));
      }
    };
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 150); // a page turn touches ~8 rows; load once
    };
    setState((s) => ({ key, data: s.key === key ? s.data : empty, loading: true }));
    load();
    let ch = supabase.channel(`game:${key}:${suffix()}`);
    for (const w of watches(key)) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: w.table, ...(w.filter ? { filter: w.filter } : {}) }, reload);
    }
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') reload(); // catch anything that changed between load() and subscribe
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (USE_MOCKS || !key) return { data: empty, loading: false };
  return state.key === key ? state : { data: empty, loading: true };
}

const NO_PAGES: Page[] = [];
const NO_MISSIONS: Mission[] = [];
const NO_BOOKS: Storyline[] = [];
const NO_MEMORIES: Memory[] = [];

async function rows<T>(q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function pickActivePage(pages: Page[]): Page | null {
  return pages.find((p) => p.status === 'active') ?? pages.filter((p) => p.status === 'complete').slice(-1)[0] ?? null;
}

// ---------------------------------------------------------------- hooks

export interface StorylineState {
  storyline: Storyline | null; // the fellowship's current (latest) book
  pages: Page[]; // ordered by chapter_number
  activePage: Page | null; // status 'active' (or last complete page if the book is done)
  loading: boolean;
}
export function useStoryline(fellowshipId: string | null): StorylineState {
  useMockTick();
  const book = useLive<Storyline | null>(
    fellowshipId,
    null,
    async (fid) => (await rows<Storyline>(
      supabase.from('storylines').select('id, fellowship_id, book_number, title, synopsis, theme_tags, status, recap, created_at')
        .eq('fellowship_id', fid).order('created_at', { ascending: false }).limit(1),
    ))[0] ?? null,
    (fid) => [{ table: 'storylines', filter: `fellowship_id=eq.${fid}` }],
  );
  const sid = book.data?.id ?? null;
  const pages = useLive<Page[]>(
    sid,
    NO_PAGES,
    (id) => rows<Page>(supabase.from('pages').select('*').eq('storyline_id', id).order('chapter_number')),
    (id) => [{ table: 'pages', filter: `storyline_id=eq.${id}` }],
  );

  if (USE_MOCKS) {
    const sorted = mock.pages.filter((p) => p.storyline_id === mock.storyline.id).sort((a, b) => a.chapter_number - b.chapter_number);
    return { storyline: fellowshipId ? mock.storyline : null, pages: fellowshipId ? sorted : NO_PAGES, activePage: fellowshipId ? pickActivePage(sorted) : null, loading: false };
  }
  return { storyline: book.data, pages: pages.data, activePage: pickActivePage(pages.data), loading: book.loading || (!!sid && pages.loading) };
}

/** All missions of a storyline (filter by page_id client-side). */
export function useMissions(storylineId: string | null): { missions: Mission[]; loading: boolean } {
  useMockTick();
  const live = useLive<Mission[]>(
    storylineId,
    NO_MISSIONS,
    (sid) => rows<Mission>(supabase.from('missions').select('*').eq('storyline_id', sid).order('created_at')),
    (sid) => [{ table: 'missions', filter: `storyline_id=eq.${sid}` }],
  );
  if (USE_MOCKS) return { missions: storylineId ? mock.missions.filter((m) => m.storyline_id === storylineId) : NO_MISSIONS, loading: false };
  return { missions: live.data, loading: live.loading };
}

export function useMission(missionId: string | null): { mission: Mission | null; loading: boolean } {
  useMockTick();
  const live = useLive<Mission | null>(
    missionId,
    null,
    async (id) => (await rows<Mission>(supabase.from('missions').select('*').eq('id', id).limit(1)))[0] ?? null,
    (id) => [{ table: 'missions', filter: `id=eq.${id}` }],
  );
  if (USE_MOCKS) return { mission: mock.missions.find((m) => m.id === missionId) ?? null, loading: false };
  return { mission: live.data, loading: live.loading };
}

// TODO(EV): add `usePages(storylineId: string | null): { pages: Page[]; loading: boolean }` (ordered by chapter_number,
// + its missions) so AD's Storybook can render older books after a sequel. Requested by AD in REQUESTS.md (round 1).
/** Every book this fellowship has written (Storybook shelf), newest first. */
export function useBooks(fellowshipId: string | null): { books: Storyline[]; loading: boolean } {
  useMockTick();
  const live = useLive<Storyline[]>(
    fellowshipId,
    NO_BOOKS,
    (fid) => rows<Storyline>(
      supabase.from('storylines').select('id, fellowship_id, book_number, title, synopsis, theme_tags, status, recap, created_at')
        .eq('fellowship_id', fid).order('created_at', { ascending: false }),
    ),
    (fid) => [{ table: 'storylines', filter: `fellowship_id=eq.${fid}` }],
  );
  if (USE_MOCKS) return { books: fellowshipId ? mock.books : NO_BOOKS, loading: false };
  return { books: live.data, loading: live.loading };
}

export function useMemories(fellowshipId: string | null, storylineId?: string | null): { memories: Memory[]; loading: boolean } {
  useMockTick();
  const key = fellowshipId ? `${fellowshipId}|${storylineId ?? ''}` : null;
  const live = useLive<Memory[]>(
    key,
    NO_MEMORIES,
    (k) => {
      const [fid, sid] = k.split('|');
      let q = supabase.from('memories').select('*').eq('fellowship_id', fid);
      if (sid) q = q.eq('storyline_id', sid);
      return rows<Memory>(q.order('created_at'));
    },
    (k) => [{ table: 'memories', filter: `fellowship_id=eq.${k.split('|')[0]}` }],
  );
  if (USE_MOCKS) {
    const all = mock.memories.filter((m) => m.fellowship_id === fellowshipId);
    return { memories: storylineId ? all.filter((m) => m.storyline_id === storylineId) : all, loading: false };
  }
  return { memories: live.data, loading: live.loading };
}

// ---------------------------------------------------------------- extras (new exports, additive)

/** What Muse used to write a book: SerpApi live/cached counts, how many real places, and (sequels) the adaptation note. */
export interface GenerationInfo {
  serp: { live: number; cached: number; stale: number; failed: number } | null;
  places_count: number;
  themes: string[];
  adaptation: { note: string; loved_types: string[]; skipped_types: string[]; callbacks: string[] } | null;
}
const NO_INFO: GenerationInfo | null = null;

/** For Demo tools ("SerpApi: 3 live / 1 cached") and the sequel card ("Muse noticed you love Duets…"). */
export function useGenerationInfo(storylineId: string | null): { info: GenerationInfo | null; loading: boolean } {
  useMockTick();
  const live = useLive<GenerationInfo | null>(
    storylineId,
    NO_INFO,
    async (sid) => {
      const r = await rows<{ generation_context: Record<string, any> | null }>(
        supabase.from('storylines').select('generation_context').eq('id', sid).limit(1),
      );
      const g = r[0]?.generation_context;
      if (!g) return null;
      return {
        serp: g.serp ?? null,
        places_count: Array.isArray(g.places) ? g.places.length : 0,
        themes: g.interests?.themes ?? [],
        adaptation: g.adaptation ?? null,
      };
    },
    (sid) => [{ table: 'storylines', filter: `id=eq.${sid}` }],
  );
  if (USE_MOCKS) return { info: storylineId ? (mock.storyline.id === storylineId && mock.storyline.book_number > 1 ? { ...MOCK_GENERATION_INFO, adaptation: MOCK_ADAPTATION } : MOCK_GENERATION_INFO) : null, loading: false };
  return { info: live.data, loading: live.loading };
}

const MOCK_ADAPTATION = {
  note: 'Muse noticed you love Duets and Riddles, so this book has more of them.',
  loved_types: ['duet', 'trial'],
  skipped_types: ['bard'],
  callbacks: ['Sir Bram and Lady Cleo crossed the drawbridge as the sun sank.', 'Aria the Fox caught the moon in a glass jar of pixels.'],
};
