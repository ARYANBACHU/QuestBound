// Owner: EV. Round 3 G2: choose a book's chapter templates from all 20 by mood fit with the fellowship.
// Pure TypeScript with NO imports: used by generate-storyline (Deno) and the app's mock engine (lib/api.ts).
//
// Rules: no repeats within a book; never reuse a template from the fellowship's previous book unless there is no
// other choice (then the least recently used one); chapter 1 feels welcoming, the last chapter like a finale.
// Only templates in `allowed` are picked (the ones that have real art in the app; see ART_READY in generate-storyline).

export type Slot = 'open' | 'middle' | 'finale';

/** Interest ids (shared/theme.ts INTERESTS) each scene fits, and the chapter slots it suits. */
export const TEMPLATE_FIT: Record<string, { tags: string[]; slots: Slot[] }> = {
  castle_gate: { tags: ['coffee', 'board_games', 'museums', 'study_spots'], slots: ['open'] },
  enchanted_forest: { tags: ['hiking', 'parks', 'photography', 'swimming'], slots: ['open', 'middle'] },
  dragon_peak: { tags: ['climbing', 'hiking', 'gym', 'pickup_sports', 'escape_rooms'], slots: ['middle', 'finale'] },
  royal_feast: { tags: ['brunch', 'food_trucks', 'cooking', 'desserts', 'karaoke'], slots: ['finale'] },
  mermaid_lagoon: { tags: ['swimming', 'karaoke', 'live_music', 'sunsets'], slots: ['middle'] },
  witch_cottage: { tags: ['cooking', 'coffee', 'thrifting', 'art'], slots: ['open', 'middle'] },
  beanstalk_sky: { tags: ['climbing', 'hiking', 'sunsets', 'live_music'], slots: ['middle'] },
  fairy_glen: { tags: ['parks', 'volunteering', 'art', 'photography'], slots: ['open'] },
  ice_palace: { tags: ['desserts', 'coffee', 'photography', 'study_spots'], slots: ['middle'] },
  pirate_cove: { tags: ['escape_rooms', 'thrifting', 'board_games', 'swimming'], slots: ['middle'] },
  candy_village: { tags: ['desserts', 'brunch', 'food_trucks', 'cooking'], slots: ['middle', 'finale'] },
  starlit_tower: { tags: ['sunsets', 'photography', 'study_spots', 'bookstores'], slots: ['middle', 'finale'] },
  troll_bridge: { tags: ['escape_rooms', 'board_games', 'comedy', 'hiking'], slots: ['middle'] },
  cloud_kingdom: { tags: ['sunsets', 'hiking', 'photography', 'parks'], slots: ['middle'] },
  crystal_cave: { tags: ['museums', 'escape_rooms', 'video_games', 'arcades'], slots: ['middle'] },
  owl_library: { tags: ['bookstores', 'study_spots', 'museums', 'board_games'], slots: ['open', 'middle'] },
  rose_garden: { tags: ['parks', 'volunteering', 'photography', 'brunch'], slots: ['open', 'middle'] },
  lantern_festival: { tags: ['live_music', 'art', 'karaoke', 'food_trucks', 'comedy'], slots: ['finale'] },
  swamp_hollow: { tags: ['comedy', 'arcades', 'video_games', 'pickup_sports'], slots: ['middle'] },
  unicorn_meadow: { tags: ['parks', 'pickup_sports', 'gym', 'art'], slots: ['open', 'middle'] },
};

export const CLASSICS = ['castle_gate', 'enchanted_forest', 'dragon_peak', 'royal_feast'];

export interface PickOptions {
  count: number; // chapters in the book (3–4)
  interestCounts: Record<string, number>; // interest id -> how many members picked it
  allowed: string[]; // templates with real art (always include the classics as a safety net)
  previous?: string[]; // templates of the fellowship's previous book: avoided
  older?: string[]; // templates of any earlier book: mildly avoided
  seed: number; // variety between books with the same interests
}

function rand(seed: number, k: number): number {
  // tiny deterministic hash -> [0, 1)
  let h = (seed ^ (k * 2654435761)) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Mood fit of one template with the fellowship's interests (members who share an interest count more). */
export function fitScore(templateId: string, interestCounts: Record<string, number>): number {
  const fit = TEMPLATE_FIT[templateId];
  if (!fit) return 0;
  return fit.tags.reduce((s, t) => s + Math.min(3, interestCounts[t] ?? 0), 0);
}

/** Chapter slots for a book of `count` chapters: open, middle…, finale. */
export function slotsFor(count: number): Slot[] {
  if (count <= 1) return ['open'];
  return ['open', ...Array.from({ length: count - 2 }, () => 'middle' as const), 'finale'];
}

/** Pick `count` distinct templates in chapter order. Deterministic for the same inputs. */
export function pickChapterTemplates(o: PickOptions): string[] {
  const allowed = [...new Set([...o.allowed.filter((t) => TEMPLATE_FIT[t]), ...CLASSICS])];
  const previous = new Set(o.previous ?? []);
  const older = new Set(o.older ?? []);
  const slots = slotsFor(o.count);
  const chosen: (string | null)[] = slots.map(() => null);
  const used = new Set<string>();
  const score = (t: string, slot: Slot, k: number) =>
    fitScore(t, o.interestCounts) * 2 +
    (TEMPLATE_FIT[t].slots.includes(slot) ? 6 : 0) +
    (previous.has(t) ? -100 : 0) +
    (older.has(t) ? -3 : 0) +
    rand(o.seed, k * 31 + allowed.indexOf(t)) * 4; // variety: different books lean different ways
  // Fill the most constrained slots first: the opener and the finale, then the middles.
  const order = slots.map((s, i) => i).sort((a, b) => (slots[a] === 'middle' ? 1 : 0) - (slots[b] === 'middle' ? 1 : 0));
  for (const i of order) {
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const t of allowed) {
      if (used.has(t)) continue;
      const s = score(t, slots[i], i);
      if (s > bestScore) { best = t; bestScore = s; }
    }
    if (best) { chosen[i] = best; used.add(best); }
  }
  // Fewer allowed templates than chapters can't happen (4 classics ≥ 4 chapters), but never return holes.
  return chosen.map((t, i) => t ?? CLASSICS[i % CLASSICS.length]);
}
