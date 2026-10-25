// Owner: AD. Derived data for the storybook: tale entries, montage slides, demo photos, fallback recap.
import { USE_MOCKS } from '@/lib/env';
import { profileOf } from '@/lib/fellowship';
import { regionDef } from '@/shared/templates';
import { CRESTS } from '@/shared/theme';
import type { BookRecap, Completion, FellowshipMember, Memory, Mission, Page, Storyline } from '@/shared/types';
import { roman } from '@/components/coloring/pageUtils';

/**
 * B2: a book's state comes from its PAGES, never from storyline.status alone (a replaced book is also 'complete',
 * with recap.abandoned). finished = every page colored; setAside = shelved before that.
 */
export interface BookProgress {
  kind: 'writing' | 'reading' | 'finished' | 'setAside';
  label: string; // shelf chip copy
  chapter: number; // 1-based chapter the fellowship is on (or stopped at)
  chapters: number;
}

export function bookProgress(book: Storyline, pages: Page[], missions: Mission[] = []): BookProgress {
  const chapters = pages.length;
  const colored = pages.filter((p) => p.status === 'complete').length;
  const chapter = Math.min(colored + 1, Math.max(chapters, 1));
  const regions = missions.filter((m) => m.status === 'complete').length;
  if (chapters === 0) return { kind: 'writing', label: book.status === 'generating' ? 'Being written…' : 'Opening the book…', chapter: 1, chapters };
  if (colored === chapters) return { kind: 'finished', label: 'Finished ✦', chapter: chapters, chapters };
  if (book.recap?.abandoned || book.status === 'complete') {
    return { kind: 'setAside', label: `Set aside · Chapter ${chapter} of ${chapters}`, chapter, chapters };
  }
  return { kind: 'reading', label: `Chapter ${chapter} of ${chapters}${regions ? ` · ${regions} colored` : ''}`, chapter, chapters };
}

export interface TaleEntry { mission: Mission; photo: Memory | null; verse: Completion | null }

const byTime = (a: Mission, b: Mission) => (a.completed_at ?? '').localeCompare(b.completed_at ?? '') || a.id.localeCompare(b.id);

export function taleEntries(page: Page, missions: Mission[], memories: Memory[], completions: Completion[] = []): TaleEntry[] {
  return missions
    .filter((m) => m.page_id === page.id && m.status === 'complete')
    .sort(byTime)
    .map((m) => ({
      mission: m,
      photo: memories.find((x) => x.mission_id === m.id && x.kind === 'photo') ?? null,
      verse: m.type === 'bard' ? completions.filter((c) => c.mission_id === m.id && c.proof_text?.trim()).slice(-1)[0] ?? null : null,
    }));
}

/**
 * Mock mode only: photo missions colored without a photo (e.g. the dev button) borrow a stock photo so the
 * scrapbook and montage still have pictures. Real data always wins.
 */
export function withDemoMemories(memories: Memory[], missions: Mission[]): Memory[] {
  if (!USE_MOCKS) return memories;
  const has = new Set(memories.filter((m) => m.kind === 'photo').map((m) => m.mission_id));
  const demo: Memory[] = missions
    .filter((m) => m.status === 'complete' && (m.proof_type === 'photo' || m.proof_type === 'group_photo') && !has.has(m.id))
    .map((m) => ({
      id: `demo-${m.id}`, fellowship_id: m.fellowship_id, storyline_id: m.storyline_id, page_id: m.page_id, mission_id: m.id,
      user_id: m.completed_by[0] ?? null, image_url: `https://picsum.photos/seed/questbound-${m.region_id}/900/1100`,
      caption: m.story_line, kind: 'photo', created_at: m.completed_at ?? new Date().toISOString(),
    }));
  return [...memories, ...demo];
}

export type Slide =
  | { kind: 'title'; key: string; eyebrow: string; title: string; line?: string }
  | { kind: 'photo'; key: string; uri: string; caption: string | null };

export function montageSlides(book: Storyline, pages: Page[], missions: Mission[], memories: Memory[], recap: BookRecap | null): Slide[] {
  const slides: Slide[] = [{ kind: 'title', key: 'book', eyebrow: `Book ${roman(book.book_number)}`, title: book.title, line: book.synopsis }];
  for (const p of pages) {
    const entries = taleEntries(p, missions, memories).filter((e) => e.photo);
    const art = memories.filter((m) => m.page_id === p.id && m.kind === 'illustration');
    if (!entries.length && !art.length && !p.illustration_url) continue;
    slides.push({ kind: 'title', key: `t-${p.id}`, eyebrow: `Chapter ${roman(p.chapter_number)}`, title: p.title });
    if (p.illustration_url) slides.push({ kind: 'photo', key: `i-${p.id}`, uri: p.illustration_url, caption: p.narrative });
    for (const a of art) if (a.image_url !== p.illustration_url) slides.push({ kind: 'photo', key: a.id, uri: a.image_url, caption: a.caption });
    for (const e of entries) slides.push({ kind: 'photo', key: e.photo!.id, uri: e.photo!.image_url, caption: e.mission.story_line ?? e.photo!.caption });
  }
  slides.push({ kind: 'title', key: 'end', eyebrow: 'The End… for now', title: book.title, line: recap?.next_book_hint ?? recap?.summary });
  return slides;
}

const EPITHETS = ['Bold', 'Bright', 'Brave', 'Curious', 'Kind', 'Swift', 'Wise', 'Merry'];
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Client-side recap used until the engine writes `storyline.recap` (or in mock mode). Built from what really happened. */
export function fallbackRecap(book: Storyline, pages: Page[], missions: Mission[], memories: Memory[], members: FellowshipMember[]): BookRecap {
  const done = missions.filter((m) => m.status === 'complete');
  const heroes = new Set(done.flatMap((m) => m.completed_by));
  const places = new Set(done.map((m) => m.place?.title).filter(Boolean));
  const pageOf = (m: Mission) => pages.find((p) => p.id === m.page_id);
  const per_member = members
    .filter((mm) => heroes.has(mm.user_id))
    .map((mm, i) => {
      const p = mm.profile;
      const mine = done.filter((m) => m.completed_by.includes(mm.user_id));
      const regions = mine.map((m) => {
        const pg = pageOf(m);
        return (pg ? regionDef(pg.template_id, m.region_id)?.label : null)?.replace(/^The /, 'the ') ?? m.title;
      });
      return {
        user_id: mm.user_id,
        title: `${p?.display_name ?? 'A hero'} the ${EPITHETS[(i + (p?.crest.length ?? 0)) % EPITHETS.length]}`,
        contribution: `colored ${listJoin(regions.slice(0, 3))}${regions.length > 3 ? ` and ${regions.length - 3} more` : ''}`,
      };
    });
  const names = per_member.map((p) => profileOf(members, p.user_id)?.display_name).filter(Boolean) as string[];
  return {
    summary:
      `${book.synopsis} Page by page, ${listJoin(names) || 'the fellowship'} colored the tale in. ` +
      `${done.length} missions became ${done.length} lines of story, and the book closed with every page bright.`,
    stats: { missions_completed: done.length, photos: memories.filter((m) => m.kind === 'photo').length, places_visited: places.size, members_active: heroes.size },
    highlights: done.filter((m) => m.story_line).slice(-4).map((m) => m.story_line!),
    per_member,
    next_book_hint: 'A new map has appeared on the last page, and one corner of it is still blank…',
  };
}

export const crestEmoji = (members: FellowshipMember[], id: string) => {
  const p = profileOf(members, id);
  return p ? CRESTS[p.crest]?.emoji ?? '✨' : '✨';
};
