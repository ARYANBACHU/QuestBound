// Owner: AD. Derived data for the storybook: tale entries, montage slides, demo photos, fallback recap.
import { USE_MOCKS } from '@/lib/env';
import { profileOf } from '@/lib/fellowship';
import { regionDef } from '@/shared/templates';
import { CRESTS } from '@/shared/theme';
import type { BookRecap, FellowshipMember, Memory, Mission, Page, Storyline } from '@/shared/types';
import { roman } from '@/components/coloring/pageUtils';

export interface TaleEntry { mission: Mission; photo: Memory | null }

const byTime = (a: Mission, b: Mission) => (a.completed_at ?? '').localeCompare(b.completed_at ?? '') || a.id.localeCompare(b.id);

export function taleEntries(page: Page, missions: Mission[], memories: Memory[]): TaleEntry[] {
  return missions
    .filter((m) => m.page_id === page.id && m.status === 'complete')
    .sort(byTime)
    .map((m) => ({ mission: m, photo: memories.find((x) => x.mission_id === m.id && x.kind === 'photo') ?? null }));
}

/**
 * Mock mode ships with no memories, so lend every completed photo mission a stock photo.
 * Real data (or EV's fixtures, once added) always wins.
 */
export function withDemoMemories(memories: Memory[], missions: Mission[]): Memory[] {
  if (!USE_MOCKS || memories.some((m) => m.kind === 'photo')) return memories;
  const demo: Memory[] = missions
    .filter((m) => m.status === 'complete' && (m.proof_type === 'photo' || m.proof_type === 'group_photo'))
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
