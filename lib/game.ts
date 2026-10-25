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
import { TEMPLATES } from '@/shared/templates';
import type { Completion, Memory, Mission, Page, Storyline } from '@/shared/types';

function useMockTick() {
  const [, force] = useState(0);
  useEffect(() => (USE_MOCKS ? subscribeMock(() => force((n) => n + 1)) : undefined), []);
}

// ---------------------------------------------------------------- realtime query helper

type Watch = { table: 'storylines' | 'pages' | 'missions' | 'memories'; filter?: string; event?: '*' | 'DELETE' };
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
    // AD's V3 request: loads can resolve out of order — only the latest one may write, so a stale refetch can never
    // flip a just-completed mission back to open (and replay its fill).
    let seq = 0;
    const load = async () => {
      const mine = ++seq;
      try {
        const data = await loader(key);
        if (alive && mine === seq) setState({ key, data, loading: false });
      } catch (e) {
        console.warn('[game] load failed', key, String(e));
        if (alive && mine === seq) setState((s) => ({ key, data: s.key === key ? s.data : empty, loading: false }));
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
      ch = ch.on('postgres_changes', { event: w.event ?? '*', schema: 'public', table: w.table, ...(w.filter ? { filter: w.filter } : {}) }, reload);
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

/**
 * A 'generating' row older than this is a crashed summon (the server gives up after ~30 s and deletes it).
 * Hooks skip such rows so nobody is stuck on the loading ritual; the server ignores them too, so anyone can re-summon.
 */
export const GENERATING_STALE_MS = 90_000;
export function isStaleGenerating(b: Pick<Storyline, 'status' | 'created_at'>): boolean {
  return b.status === 'generating' && Date.now() - new Date(b.created_at).getTime() > GENERATING_STALE_MS;
}

// ---------------------------------------------------------------- book status (B2)

/**
 * What a book really is, derived from its pages (status alone is ambiguous: a shelved book is also 'complete').
 * - 'writing'   Sage is still writing it (status 'generating')
 * - 'reading'   in progress (some chapter still open)
 * - 'finished'  every page colored
 * - 'set_aside' shelved unfinished by "New storyline" (recap.abandoned) or any complete book with uncolored pages
 */
export type BookState = 'writing' | 'reading' | 'finished' | 'set_aside';
export interface BookStatus {
  state: BookState;
  label: string; // shelf label: "Sage is writing…" | "Chapter 2 of 3" | "Finished" | "Set aside"
  chapter: number; // current chapter (reading), chapters colored + 1 capped (others)
  chapters: number; // total chapters (0 while unknown)
  colored: number; // pages fully colored
}

/**
 * Pass the book's pages when you have them (usePages); without pages the label falls back to the storyline row.
 * Never says "Finished" unless every page is complete.
 */
export function bookStatus(book: Pick<Storyline, 'status' | 'recap'> | null | undefined, pages?: readonly Pick<Page, 'status' | 'chapter_number'>[]): BookStatus {
  const chapters = pages?.length ?? 0;
  const colored = pages?.filter((p) => p.status === 'complete').length ?? 0;
  const active = pages?.find((p) => p.status === 'active');
  const chapter = active?.chapter_number ?? Math.min(colored + 1, Math.max(1, chapters));
  if (!book || book.status === 'generating') return { state: 'writing', label: 'Sage is writing…', chapter: 0, chapters, colored };
  const allColored = chapters > 0 && colored === chapters;
  if (book.status === 'complete') {
    if (book.recap?.abandoned || (pages && !allColored)) {
      return { state: 'set_aside', label: chapters ? `Set aside · ${colored} of ${chapters} chapters` : 'Set aside', chapter, chapters, colored };
    }
    return { state: 'finished', label: 'Finished', chapter: chapters, chapters, colored };
  }
  return { state: 'reading', label: chapters ? `Chapter ${chapter} of ${chapters}` : 'In progress', chapter, chapters, colored };
}

/** bookStatus() for any storyline id, kept live (loads its pages). */
export function useBookStatus(book: Pick<Storyline, 'id' | 'status' | 'recap'> | null | undefined): BookStatus & { loading: boolean } {
  const { pages, loading } = usePages(book?.id ?? null);
  return { ...bookStatus(book, pages), loading };
}

const STORYLINE_COLS ='id, fellowship_id, book_number, title, synopsis, theme_tags, status, difficulty, geo_enforced, recap, created_at';

/**
 * V2: does this book block proofs on location? false for the UT Campus Demo (show the distance, never block).
 * Missing (older rows, mocks) means true, like the db default. The server applies the same rule in submit-proof.
 */
export function isGeoEnforced(book: Pick<Storyline, 'geo_enforced'> | null | undefined): boolean {
  return book?.geo_enforced !== false;
}

/** Region order of a template (for sorting a page's missions the way the page draws them). */
type PageKey = Pick<Page, 'id' | 'chapter_number' | 'template_id'>;
function regionIndex(page: PageKey | undefined, regionId: string): number {
  const i = page ? (TEMPLATES[page.template_id]?.regions ?? []).findIndex((r) => r.id === regionId) : -1;
  return i < 0 ? 99 : i;
}

/** Missions of a storyline ordered by chapter, then by the region order of each page's template. */
function sortMissions(missions: Mission[], pages: PageKey[]): Mission[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  return [...missions].sort((a, b) => {
    const pa = byId.get(a.page_id);
    const pb = byId.get(b.page_id);
    return (pa?.chapter_number ?? 99) - (pb?.chapter_number ?? 99) || regionIndex(pa, a.region_id) - regionIndex(pb, b.region_id);
  });
}

// ---------------------------------------------------------------- hooks

export interface StorylineState {
  storyline: Storyline | null; // the fellowship's current (latest) book; null = nobody has summoned one yet
  pages: Page[]; // ordered by chapter_number
  activePage: Page | null; // status 'active' (or last complete page if the book is done)
  loading: boolean;
}
/**
 * Join race safe: a fellowship with no book returns { storyline: null, pages: [], activePage: null }, then flips to
 * the 'generating' row (show the ritual) and to 'active' over realtime when anyone summons. Never throws.
 */
export function useStoryline(fellowshipId: string | null): StorylineState {
  useMockTick();
  const book = useLive<Storyline | null>(
    fellowshipId,
    null,
    async (fid) => (await rows<Storyline>(
      supabase.from('storylines').select(STORYLINE_COLS).eq('fellowship_id', fid).order('created_at', { ascending: false }).limit(5),
    )).find((b) => !isStaleGenerating(b)) ?? null,
    (fid) => [
      { table: 'storylines', filter: `fellowship_id=eq.${fid}` },
      // Realtime can't filter DELETEs; a summon that fails deletes its 'generating' row, so listen unfiltered.
      { table: 'storylines', event: 'DELETE' },
    ],
  );
  const sid = book.data?.id ?? null;
  const pages = useLive<Page[]>(
    sid,
    NO_PAGES,
    (id) => rows<Page>(supabase.from('pages').select('*').eq('storyline_id', id).order('chapter_number')),
    (id) => [{ table: 'pages', filter: `storyline_id=eq.${id}` }],
  );

  if (USE_MOCKS) {
    const story = fellowshipId ? mock.storyline : null;
    if (!story) return { storyline: null, pages: NO_PAGES, activePage: null, loading: false };
    const sorted = mockPages(story.id);
    return { storyline: story, pages: sorted, activePage: pickActivePage(sorted), loading: false };
  }
  return { storyline: book.data, pages: pages.data, activePage: pickActivePage(pages.data), loading: book.loading || (!!sid && pages.loading) };
}

function mockPages(storylineId: string): Page[] {
  return mock.pages.filter((p) => p.storyline_id === storylineId).sort((a, b) => a.chapter_number - b.chapter_number);
}
function mockMissions(storylineId: string): Mission[] {
  return sortMissions(mock.missions.filter((m) => m.storyline_id === storylineId), mockPages(storylineId));
}

/** Pages of ANY storyline (current or an older book on the shelf), ordered by chapter_number. */
export function usePages(storylineId: string | null): { pages: Page[]; loading: boolean } {
  useMockTick();
  const live = useLive<Page[]>(
    storylineId,
    NO_PAGES,
    (id) => rows<Page>(supabase.from('pages').select('*').eq('storyline_id', id).order('chapter_number')),
    (id) => [{ table: 'pages', filter: `storyline_id=eq.${id}` }],
  );
  if (USE_MOCKS) return { pages: storylineId ? mockPages(storylineId) : NO_PAGES, loading: false };
  return { pages: live.data, loading: live.loading };
}

/**
 * ALL missions of a storyline, every chapter (locked, open, complete), ordered by chapter then region.
 * Filter by page_id client-side, or use useChapters() for them grouped per page.
 */
export function useMissions(storylineId: string | null): { missions: Mission[]; loading: boolean } {
  useMockTick();
  const live = useLive<Mission[]>(
    storylineId,
    NO_MISSIONS,
    async (sid) => {
      const [missions, pages] = await Promise.all([
        rows<Mission>(supabase.from('missions').select('*').eq('storyline_id', sid)),
        rows<PageKey>(supabase.from('pages').select('id, chapter_number, template_id').eq('storyline_id', sid)),
      ]);
      return sortMissions(missions, pages);
    },
    (sid) => [{ table: 'missions', filter: `storyline_id=eq.${sid}` }],
  );
  if (USE_MOCKS) return { missions: storylineId ? mockMissions(storylineId) : NO_MISSIONS, loading: false };
  return { missions: live.data, loading: live.loading };
}

/** One chapter of a book: its page + its missions (template region order) + progress. */
export interface Chapter {
  page: Page;
  missions: Mission[];
  completed: number; // missions complete on this page
  total: number;
}
const NO_CHAPTERS: Chapter[] = [];

/** Every chapter of a storyline (past, active and locked) with its missions — for chapter selectors and readers. */
export function useChapters(storylineId: string | null): { chapters: Chapter[]; loading: boolean } {
  const { pages, loading: lp } = usePages(storylineId);
  const { missions, loading: lm } = useMissions(storylineId);
  if (!storylineId || !pages.length) return { chapters: NO_CHAPTERS, loading: lp || lm };
  const chapters = pages.map((page) => {
    const ms = missions.filter((m) => m.page_id === page.id);
    return { page, missions: ms, completed: ms.filter((m) => m.status === 'complete').length, total: ms.length };
  });
  return { chapters, loading: lp || lm };
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

/** Every book this fellowship has written (Storybook shelf), newest first. */
export function useBooks(fellowshipId: string | null): { books: Storyline[]; loading: boolean } {
  useMockTick();
  const live = useLive<Storyline[]>(
    fellowshipId,
    NO_BOOKS,
    async (fid) => (await rows<Storyline>(
      supabase.from('storylines').select(STORYLINE_COLS).eq('fellowship_id', fid).order('created_at', { ascending: false }),
    )).filter((b) => !isStaleGenerating(b)),
    (fid) => [{ table: 'storylines', filter: `fellowship_id=eq.${fid}` }, { table: 'storylines', event: 'DELETE' }],
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

// ---------------------------------------------------------------- completions (E5: poems in the book)

/** A proof that colored a region, with its mission. For bard missions `verse` is the full poem the hero wrote. */
export interface CompletionEntry extends Completion {
  mission: Pick<Mission, 'id' | 'title' | 'type' | 'region_id' | 'page_id' | 'proof_type'>;
  verse: string | null; // proof_text of a bard mission (the whole verse; mission.story_line quotes its first line)
}
const NO_COMPLETIONS: CompletionEntry[] = [];
const MISSION_COLS = 'id, title, type, region_id, page_id, proof_type';

function toEntry(c: Completion, m: CompletionEntry['mission']): CompletionEntry {
  return { ...c, mission: m, verse: m.type === 'bard' && c.proof_text ? c.proof_text : null };
}

/**
 * Every completion of a storyline, oldest first: proof_text (bard verses), participant_ids, verdict (lens_titles,
 * distance_m), story_line. Refreshes whenever a mission of the book changes (completions ride on mission updates).
 */
export function useCompletions(storylineId: string | null): { completions: CompletionEntry[]; loading: boolean } {
  useMockTick();
  const live = useLive<CompletionEntry[]>(
    storylineId,
    NO_COMPLETIONS,
    async (sid) => {
      const data = await rows<Completion & { mission: CompletionEntry['mission'] | CompletionEntry['mission'][] }>(
        supabase.from('completions').select(`*, mission:missions!inner(${MISSION_COLS})`).eq('mission.storyline_id', sid).order('created_at'),
      );
      return data.map(({ mission, ...c }) => toEntry(c, Array.isArray(mission) ? mission[0] : mission));
    },
    (sid) => [{ table: 'missions', filter: `storyline_id=eq.${sid}` }],
  );
  if (USE_MOCKS) {
    if (!storylineId) return { completions: NO_COMPLETIONS, loading: false };
    const byId = new Map(mock.missions.filter((m) => m.storyline_id === storylineId).map((m) => [m.id, m]));
    const out = mock.completions.filter((c) => byId.has(c.mission_id)).map((c) => {
      const m = byId.get(c.mission_id)!;
      return toEntry(c, { id: m.id, title: m.title, type: m.type, region_id: m.region_id, page_id: m.page_id, proof_type: m.proof_type });
    });
    return { completions: out, loading: false };
  }
  return { completions: live.data, loading: live.loading };
}

// ---------------------------------------------------------------- points (E4: the ONE source of truth)
// Pure functions shared with the edge functions (supabase/functions/_shared/points.ts). AB + MP: use these, never
// re-add points by hand. Each participant in a complete mission's completed_by earns mission.points.
//   pointsFor(userId, missions) -> number
//   leaderboard(members, missions) -> { member, user_id, points, missions, rank }[] (desc, ties share a rank)
//   crewOf(mission) -> 'solo' | 'duet' | 'trio' | 'fellowship'; CREW_LABEL[crew] -> "Trio" (G1: label missions by crew,
//   NOT by type — a 3-person mission still has type 'duet'). Points: solo 10 / duet 20 / trio 30 / fellowship 40 × difficulty.
export {
  asDifficulty, CREW_LABEL, CREW_POINTS, crewOf, DIFFICULTY_MULTIPLIER, leaderboard, missionPoints, missionsCompletedBy,
  pointsFor, pointsForMission, SIZE_POINTS, type Crew, type LeaderboardEntry,
} from '@/supabase/functions/_shared/points';

// ---------------------------------------------------------------- extras (new exports, additive)

/** What Sage used to write a book: SerpApi live/cached counts, how many real places, and (sequels) the adaptation note. */
export interface GenerationInfo {
  serp: { live: number; cached: number; stale: number; failed: number } | null;
  places_count: number;
  themes: string[];
  adaptation: { note: string; loved_types: string[]; skipped_types: string[]; callbacks: string[] } | null;
}
const NO_INFO: GenerationInfo | null = null;

/** For Demo tools ("SerpApi: 3 live / 1 cached") and the sequel card ("Sage noticed you love Duets…"). */
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
  if (USE_MOCKS) {
    const b = storylineId ? mock.books.find((x) => x.id === storylineId) : undefined;
    return { info: b ? (b.book_number > 1 ? { ...MOCK_GENERATION_INFO, adaptation: MOCK_ADAPTATION } : MOCK_GENERATION_INFO) : null, loading: false };
  }
  return { info: live.data, loading: live.loading };
}

const MOCK_ADAPTATION = {
  note: 'Sage noticed you love Duets and Riddles, so this book has more of them.',
  loved_types: ['duet', 'trial'],
  skipped_types: ['bard'],
  callbacks: ['Sir Bram and Lady Cleo crossed the drawbridge as the sun sank.', 'Aria the Fox caught the moon in a glass jar of pixels.'],
};
