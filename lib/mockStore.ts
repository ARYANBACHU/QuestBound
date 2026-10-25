// Owner: EV. In-memory store used ONLY in mock mode so UI branches see live-feeling updates
// (e.g. submitting a proof colors the region and posts a proclamation) without any backend.
//
// Writes are IMMUTABLE: helpers below replace arrays and rows instead of mutating them, so memoized components
// (and the React Compiler) see new references and re-render. Prefer the helpers over editing `mock.*` directly.
import { COMPLETIONS, FELLOWSHIP, MEMBERS, MEMORIES, MESSAGES, MISSIONS, MOCK_RECAP, PAGES, PROFILES, STORYLINE } from '@/fixtures/demo';
import type { Completion, Memory, Message, Mission, Page, Profile, Storyline } from '@/shared/types';

type Listener = () => void;
const listeners = new Set<Listener>();

// EXPO_PUBLIC_MOCK_NO_STORY=1 starts mock mode with NO book yet (the "friend joined before the founder summoned the
// story" state). Summoning (generateStoryline) then writes the demo book. Same as calling mockDev.clearStory().
const START_EMPTY = process.env.EXPO_PUBLIC_MOCK_NO_STORY === '1';

export const mock = {
  fellowship: { ...FELLOWSHIP },
  members: MEMBERS.map((m) => ({ ...m })),
  profiles: PROFILES.map((p) => ({ ...p })) as Profile[],
  storyline: (START_EMPTY ? null : { ...STORYLINE }) as Storyline | null, // the current (latest) book; null = none yet
  books: (START_EMPTY ? [] : [{ ...STORYLINE }]) as Storyline[], // every book, newest first (books[0] === current)
  pages: (START_EMPTY ? [] : PAGES.map((p) => ({ ...p }))) as Page[], // pages of every book
  missions: (START_EMPTY ? [] : MISSIONS.map((m) => ({ ...m }))) as Mission[], // missions of every book
  messages: MESSAGES.filter((m) => !START_EMPTY || m.kind === 'text').map((m) => ({ ...m })) as Message[],
  memories: (START_EMPTY ? [] : MEMORIES.map((m) => ({ ...m }))) as Memory[],
  completions: (START_EMPTY ? [] : COMPLETIONS.map((c) => ({ ...c }))) as Completion[],
};
if (mock.storyline) mock.books[0] = mock.storyline;

let version = 0;
/** Bumps on every write. Handy as a dependency for memoized consumers. */
export function mockVersion() {
  return version;
}

export function subscribeMock(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitMock() {
  version++;
  listeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------- immutable write helpers

export function patchMission(id: string, patch: Partial<Mission>): Mission | undefined {
  let out: Mission | undefined;
  mock.missions = mock.missions.map((m) => (m.id === id ? (out = { ...m, ...patch }) : m));
  return out;
}

export function patchPage(id: string, patch: Partial<Page>): Page | undefined {
  let out: Page | undefined;
  mock.pages = mock.pages.map((p) => (p.id === id ? (out = { ...p, ...patch }) : p));
  return out;
}

export function patchStoryline(id: string, patch: Partial<Storyline>): Storyline | undefined {
  let out: Storyline | undefined;
  mock.books = mock.books.map((b) => (b.id === id ? (out = { ...b, ...patch }) : b));
  if (out && mock.storyline?.id === id) mock.storyline = out;
  return out;
}

export function addMessage(msg: Omit<Message, 'id' | 'created_at'> & Partial<Pick<Message, 'id' | 'created_at'>>): Message {
  const full: Message = { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, created_at: new Date().toISOString(), ...msg };
  mock.messages = [...mock.messages, full];
  return full;
}

export function addMemory(mem: Omit<Memory, 'id' | 'created_at'>): Memory {
  const full: Memory = { id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, created_at: new Date().toISOString(), ...mem };
  mock.memories = [...mock.memories, full];
  return full;
}

export function addCompletion(c: Omit<Completion, 'id' | 'created_at'>): Completion {
  const full: Completion = { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, created_at: new Date().toISOString(), ...c };
  mock.completions = [...mock.completions, full];
  return full;
}

/** Fresh copy of the fixture book (used when summoning from the empty state). */
export function restoreDemoBook() {
  const book: Storyline = { ...STORYLINE, created_at: new Date().toISOString() };
  mock.books = [book, ...mock.books.filter((b) => b.id !== book.id)];
  mock.storyline = book;
  mock.pages = [...mock.pages.filter((p) => p.storyline_id !== book.id), ...PAGES.map((p) => ({ ...p }))];
  mock.missions = [...mock.missions.filter((m) => m.storyline_id !== book.id), ...MISSIONS.map((m) => ({ ...m }))];
  mock.memories = [...mock.memories.filter((m) => m.storyline_id !== book.id), ...MEMORIES.map((m) => ({ ...m }))];
  mock.completions = [...mock.completions.filter((c) => !c.mission_id.startsWith('m-')), ...COMPLETIONS.map((c) => ({ ...c }))];
}

/** Add a whole new book (mock sequel) and make it current. */
export function addBook(book: Storyline, pages: Page[], missions: Mission[]) {
  mock.books = [book, ...mock.books];
  mock.storyline = book;
  mock.pages = [...mock.pages, ...pages];
  mock.missions = [...mock.missions, ...missions];
}

// ---------------------------------------------------------------- progression (shared by mock submitProof + dev tools)

/** After a mission completes: turn the page / finish the book like the real engine does. */
export function advanceIfPageDone(pageId: string): { pageCompleted: boolean; bookCompleted: boolean } {
  const page = mock.pages.find((p) => p.id === pageId);
  if (!page || page.status !== 'active') return { pageCompleted: false, bookCompleted: false };
  const done = mock.missions.filter((m) => m.page_id === pageId).every((m) => m.status === 'complete');
  if (!done) return { pageCompleted: false, bookCompleted: false };
  const now = new Date().toISOString();
  patchPage(pageId, { status: 'complete', completed_at: now });
  const next = mock.pages.find((p) => p.storyline_id === page.storyline_id && p.chapter_number === page.chapter_number + 1);
  const roman = ['', 'I', 'II', 'III', 'IV', 'V'];
  if (next) {
    patchPage(next.id, { status: 'active' });
    mock.missions = mock.missions.map((m) => (m.page_id === next.id && m.status === 'locked' ? { ...m, status: 'open' } : m));
    addMessage({ fellowship_id: mock.fellowship.id, user_id: null, kind: 'proclamation',
      body: `Chapter ${roman[page.chapter_number]} is fully colored, not a single white gap! The page turns… Chapter ${roman[next.chapter_number]}: ${next.title} begins.`,
      payload: { event: 'page_complete', page_id: page.id, storyline_id: page.storyline_id } });
    return { pageCompleted: true, bookCompleted: false };
  }
  const book = patchStoryline(page.storyline_id, { status: 'complete', recap: MOCK_RECAP });
  addMessage({ fellowship_id: mock.fellowship.id, user_id: null, kind: 'proclamation',
    body: `Hear ye! "${book?.title ?? 'The book'}" is complete! ${MOCK_RECAP.summary}`,
    payload: { event: 'book_complete', storyline_id: page.storyline_id } });
  return { pageCompleted: true, bookCompleted: true };
}

/** Dev helpers for UI work in mock mode (e.g. wire to a hidden button). */
export const mockDev = {
  /** Color every open mission on the active page (as the first member) and turn the page. */
  completeActivePage() {
    const page = mock.pages.find((p) => p.storyline_id === mock.storyline?.id && p.status === 'active');
    if (!page) return;
    const me = mock.profiles[0];
    for (const m of mock.missions.filter((x) => x.page_id === page.id && x.status !== 'complete')) {
      const verse = m.type === 'bard' ? SAMPLE_VERSE : null;
      const story_line = verse
        ? `${me.display_name} the ${me.crest} sang for "${m.title}": “${verse.split('\n')[0]}”`
        : `${me.display_name} completed "${m.title}", and the page drank in the color.`;
      patchMission(m.id, { status: 'complete', completed_by: [me.id], completed_at: new Date().toISOString(), story_line });
      addCompletion({ mission_id: m.id, user_id: me.id, participant_ids: [me.id], proof_url: null, proof_text: verse,
        verdict: { pass: true, confidence: 1, reason: 'dev', flavor_text: 'Sage nods. The page drinks in the color.' }, story_line });
    }
    advanceIfPageDone(page.id);
    emitMock();
  },
  /** Finish the whole current book (recap included). */
  completeBook() {
    for (let i = 0; i < 6 && mock.storyline && mock.storyline.status !== 'complete'; i++) mockDev.completeActivePage();
  },
  /** Join-race preview: the fellowship has NO book yet (summoning writes the demo book again). */
  clearStory() {
    mock.storyline = null;
    mock.books = [];
    mock.pages = [];
    mock.missions = [];
    mock.memories = [];
    mock.completions = [];
    emitMock();
  },
};

const SAMPLE_VERSE = 'Four crayons met beneath the moon,\nand colored in the night too soon.';
