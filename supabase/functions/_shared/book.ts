// Owner: EV. Book building blocks shared by generate-storyline and reroll-mission:
// deterministic fallback missions, validate+repair of LLM output, and the DB writer.
// Rule: never trust the model. Everything that reaches the DB passes through repairMission().
import { admin } from './db.ts';
import { missionPoints, type PointsDifficulty } from './points.ts';
import type { Outline, StoryCtx } from './prompts.ts';
import {
  type MemberCtx, type MissionType, type Place, PROOF_FOR_TYPE, type RegionSize, SIZE_RULES, TEMPLATE_META,
  TEMPLATE_REGIONS, type TemplateId,
} from './types.ts';

export interface DraftMission {
  region_id: string;
  type: MissionType;
  title: string;
  description: string;
  story_hook: string;
  place: Place | null;
  assignee_ids: string[];
  trial_question: string | null;
  trial_answer: string | null;
  verification_hint: string;
  points: number;
  source: 'llm' | 'fallback';
}
export interface DraftChapter { chapter_number: number; template_id: TemplateId; title: string; narrative: string; missions: DraftMission[] }
export interface DraftBook { title: string; synopsis: string; theme_tags: string[]; chapters: DraftChapter[] }

// ------------------------------------------------------------------ fallback content

interface FallbackSpec {
  type: MissionType;
  title: string;
  desc: (p: Place | null) => string;
  hook: string;
  hint: string;
  wantsPlace?: boolean;
  trial?: { q: string; a: string }; // a may hold alternates separated by "|"
}

const at = (p: Place | null, fallback: string) => (p ? p.title : fallback);

export const FALLBACK: Record<TemplateId, Record<string, FallbackSpec>> = {
  castle_gate: {
    castle: {
      type: 'gathering', title: 'Council at the Gate', wantsPlace: true,
      desc: (p) => `Meet all together at ${at(p, 'a spot you all love')} and take one group photo with your hands stacked like a pact.`,
      hook: 'Every great fellowship begins with a shared table and a promise.',
      hint: 'Group photo with most of the fellowship visible, hands stacked or drinks raised.',
    },
    drawbridge: {
      type: 'duet', title: 'Cross the Bridge Together', wantsPlace: true,
      desc: (p) => `Two of you walk to ${at(p, 'a bridge or crosswalk nearby')} together and photograph your two pairs of shoes side by side.`,
      hook: 'The drawbridge only lowers for those who cross it side by side.',
      hint: 'Photo showing two people (or two pairs of shoes) together outdoors.',
    },
    banners: {
      type: 'gift', title: 'Stitch the Banner',
      desc: () => 'Make or buy a tiny surprise (under $5) for another member: a doodle, a snack, a note. They confirm when they get it.',
      hook: 'A banner is stitched from small kindnesses.',
      hint: 'The recipient confirms they received it.',
    },
    moon: {
      type: 'relic', title: 'Capture the Moon',
      desc: () => 'Photograph the moon tonight. No moon? The brightest light in the night sky will do.',
      hook: 'The moon keeps the first lantern safe.',
      hint: 'Photo of the moon or a night sky.',
    },
    tower_flag: {
      type: 'trial', title: 'The Riddle of the Tower',
      desc: () => 'Answer the riddle carved into the tower door.',
      hook: 'The flag will not rise for a fool.',
      hint: 'The correct answer.',
      trial: { q: 'I have keys but open no locks, I have space but no room, and you can enter but never go inside. What am I?', a: 'keyboard|a keyboard|computer keyboard' },
    },
    moat: {
      type: 'bard', title: 'Verse of the Moat',
      desc: () => 'Write two lines of a poem about your fellowship. The best lines are written into the book.',
      hook: 'The moat only lets poets pass.',
      hint: 'Two lines of verse about the group.',
    },
  },
  enchanted_forest: {
    great_tree: {
      type: 'gathering', title: 'Beneath the Great Tree', wantsPlace: true,
      desc: (p) => `Gather everyone at ${at(p, 'a nearby park')} and take a group photo under the biggest tree you can find.`,
      hook: 'The Great Tree remembers every friend who has stood beneath it.',
      hint: 'Group photo outdoors with a tree or greenery.',
    },
    mushroom_ring: {
      type: 'duet', title: 'The Mushroom Ring', wantsPlace: true,
      desc: (p) => `Two of you share a snack picnic at ${at(p, 'a patch of grass nearby')} and photograph your spread laid out in a circle.`,
      hook: 'Sit inside the ring and the forest will share its secrets.',
      hint: 'Photo of snacks or food arranged together, ideally outdoors.',
    },
    river: {
      type: 'trial', title: 'The Riddle of the River',
      desc: () => 'Two of you solve the river spirit\'s riddle together.',
      hook: 'The river spirit lets only clever pairs cross.',
      hint: 'The correct answer.',
      trial: { q: 'I run but never walk, I have a mouth but never talk, and a bed but never sleep. What am I?', a: 'river|a river|stream' },
    },
    fireflies: {
      type: 'relic', title: 'Catch a Firefly',
      desc: () => 'Photograph a small glowing light: string lights, a lantern, a candle or a neon sign.',
      hook: 'Each firefly carries a spark of the stolen light.',
      hint: 'Photo of a small glowing light source.',
    },
    owl: {
      type: 'bard', title: 'The Owl\'s Question',
      desc: () => 'Write the wisest thing someone in this fellowship has ever told you, in one or two sentences.',
      hook: 'The Wise Owl trades directions for wisdom.',
      hint: 'A sentence or two of wisdom from a friend.',
    },
    path: {
      type: 'relic', title: 'The Winding Path', wantsPlace: true,
      desc: (p) => `Photograph an interesting path, trail or staircase${p ? ` at ${p.title}` : ' on your way somewhere today'}.`,
      hook: 'The path rearranges itself for the curious.',
      hint: 'Photo of a path, trail or staircase.',
    },
  },
  dragon_peak: {
    dragon: {
      type: 'gathering', title: 'Face the Dragon', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'the most adventurous spot you can agree on')} and takes a group photo in your fiercest dragon pose.`,
      hook: 'Dragons are only defeated by friends who show up together.',
      hint: 'Group photo, people posing dramatically.',
    },
    mountain: {
      type: 'duet', title: 'Climb the Mountain', wantsPlace: true,
      desc: (p) => `Two of you climb to the highest point you can reach${p ? ` near ${p.title}` : ' nearby'} (a hill, a top floor, a rooftop deck) and photograph the view together.`,
      hook: 'From the summit you can see where the thief has gone.',
      hint: 'Photo of a view from up high, two people if possible.',
    },
    treasure: {
      type: 'gift', title: 'Share the Hoard',
      desc: () => 'Give another member a treasure: a sticker, a snack, a book to borrow. They confirm when they get it.',
      hook: 'A dragon hoards. A fellowship shares.',
      hint: 'The recipient confirms they received it.',
    },
    clouds: {
      type: 'trial', title: 'The Storm\'s Riddle',
      desc: () => 'Answer the riddle thundered from the storm clouds.',
      hook: 'The clouds part only for the wise.',
      hint: 'The correct answer.',
      trial: { q: 'The more of me you take, the more you leave behind. What am I?', a: 'footsteps|steps|footprints' },
    },
    shield: {
      type: 'relic', title: 'The Knight\'s Shield',
      desc: () => 'Photograph something round and brave-looking out in the world: a clock, a manhole cover, a round sign.',
      hook: 'Every knight needs a shield, even a borrowed one.',
      hint: 'Photo of a round object.',
    },
    lantern: {
      type: 'bard', title: 'Light the Lantern',
      desc: () => 'Write one sentence about a moment this week when a friend made things brighter.',
      hook: 'The last lantern is lit with a true story.',
      hint: 'One sentence about a friend.',
    },
  },
  royal_feast: {
    feast_table: {
      type: 'gathering', title: 'The Royal Feast', wantsPlace: true,
      desc: (p) => `Share a meal all together at ${at(p, 'someone\'s place or a favorite cheap eat')} and take a group photo with the table full.`,
      hook: 'Every tale worth telling ends at a crowded table.',
      hint: 'Group photo with food on a table.',
    },
    throne: {
      type: 'duet', title: 'Crown a Friend',
      desc: () => 'Two of you crown each other (a paper crown counts) and take a royal portrait together.',
      hook: 'The throne is shared in this kingdom.',
      hint: 'Photo of two people, at least one wearing a crown.',
    },
    chandelier: {
      type: 'trial', title: 'The Chandelier\'s Riddle',
      desc: () => 'Two of you solve the riddle glittering in the chandelier.',
      hook: 'The chandelier lights only when its riddle is answered.',
      hint: 'The correct answer.',
      trial: { q: 'I am tall when I am young and short when I am old. What am I?', a: 'candle|a candle' },
    },
    goblet: {
      type: 'relic', title: 'Raise the Goblet', wantsPlace: true,
      desc: (p) => `Photograph a fancy drink${p ? ` from ${p.title}` : ''}. Any drink in a nice cup counts.`,
      hook: 'Fill the goblet and toast the tale.',
      hint: 'Photo of a drink.',
    },
    cake: {
      type: 'relic', title: 'The Enchanted Cake', wantsPlace: true,
      desc: (p) => `Photograph a dessert worthy of a royal feast${p ? ` at ${p.title}` : ''}.`,
      hook: 'One bite and every curse is lifted.',
      hint: 'Photo of a dessert.',
    },
    lute: {
      type: 'bard', title: 'The Bard\'s Lute',
      desc: () => 'Write a four-word toast to your fellowship.',
      hook: 'The bard needs one last verse to end the song.',
      hint: 'A short toast.',
    },
  },
};

const DEFAULT_HINT: Record<MissionType, string> = {
  gathering: 'Group photo with most of the fellowship visible.',
  duet: 'Photo showing two members together doing the task.',
  relic: 'Photo of the thing described.',
  bard: 'A short piece of writing on the topic.',
  trial: 'The correct answer.',
  gift: 'The recipient confirms they received it.',
};

/** Points are always set server-side: size base × difficulty multiplier (_shared/points.ts). */
export function defaultPoints(size: RegionSize, difficulty: PointsDifficulty = 'normal'): number {
  return missionPoints(size, difficulty);
}

export function requiredMembers(size: RegionSize, memberCount: number): number {
  const rule = SIZE_RULES[size].members;
  return rule === 'all' ? Math.max(2, memberCount) : rule;
}

export function fallbackMission(templateId: TemplateId, regionId: string, _chapterIndex: number, place: Place | null, difficulty: PointsDifficulty = 'normal'): DraftMission {
  const spec = FALLBACK[templateId][regionId];
  const size = TEMPLATE_REGIONS[templateId].find((r) => r.id === regionId)!.size;
  const p = spec.wantsPlace ? place : null;
  return {
    region_id: regionId, type: spec.type, title: spec.title, description: spec.desc(p), story_hook: spec.hook,
    place: p, assignee_ids: [], trial_question: spec.trial?.q ?? null, trial_answer: spec.trial?.a ?? null,
    verification_hint: spec.hint, points: defaultPoints(size, difficulty), source: 'fallback',
  };
}

/** Hands out places across the book so chapters don't all reuse the same café. Events go to group missions only. */
export class PlacePicker {
  private used = new Map<number, number>();
  constructor(private places: Place[]) {}
  pick(type: MissionType, prefer: number[] = []): Place | null {
    if (!this.places.length) return null;
    const ok = (i: number) => type === 'gathering' || type === 'duet' || this.places[i].source !== 'google_events';
    const order = [...prefer, ...this.places.map((_, i) => i)].filter((i, k, a) => a.indexOf(i) === k && ok(i));
    if (!order.length) return null;
    order.sort((a, b) => (this.used.get(a) ?? 0) - (this.used.get(b) ?? 0)); // stable: prefer list wins ties
    const i = order[0];
    this.used.set(i, (this.used.get(i) ?? 0) + 1);
    return this.places[i];
  }
  mark(p: Place | null) {
    if (!p) return;
    const i = this.places.indexOf(p);
    if (i >= 0) this.used.set(i, (this.used.get(i) ?? 0) + 1);
  }
}

/** Places this chapter should lean on (rotating partition of the place list). */
export function preferredPlaces(places: Place[], chapterIndex: number, chapterCount: number): number[] {
  return places.map((_, i) => i).filter((i) => i % chapterCount === chapterIndex);
}

export function fallbackChapterMissions(templateId: TemplateId, chapterIndex: number, picker: PlacePicker, prefer: number[], difficulty: PointsDifficulty = 'normal'): DraftMission[] {
  return TEMPLATE_REGIONS[templateId].map((r) => {
    const spec = FALLBACK[templateId][r.id];
    return fallbackMission(templateId, r.id, chapterIndex, spec.wantsPlace ? picker.pick(spec.type, prefer) : null, difficulty);
  });
}

const FALLBACK_TITLES = ['The Lantern Thief', 'The Stolen Crayons', 'The Sleeping Dragon', 'The Lost Song', 'The Clockwork Crown'];
const FALLBACK_CHAPTER_TEXT: Record<TemplateId, { title: string; narrative: string }> = {
  castle_gate: { title: 'The Gathering at the Gate', narrative: 'The castle gate creaks open. Before any quest can begin, the fellowship must prove they can find each other in a city of a million lights.' },
  enchanted_forest: { title: 'Whispers in the Wood', narrative: 'A trail of dimmed lanterns leads into the green places of the city, where the trees remember everything.' },
  dragon_peak: { title: 'The Thief on the Peak', narrative: 'At the top of the world the thief waits, and so does the last lantern. Only a fellowship that climbs together can reach it.' },
  royal_feast: { title: 'The Feast of Lanterns', narrative: 'The lights are home. The kingdom sets a long table, and every seat is saved for a friend.' },
};

export function fallbackOutline(ctx: StoryCtx, seed: number): Outline {
  const city = ctx.areaLabel.split(',')[0] || 'the City';
  const base = FALLBACK_TITLES[Math.abs(seed) % FALLBACK_TITLES.length];
  const title = ctx.mode === 'sequel' && ctx.sequel ? `The Return of ${base.replace(/^The /, 'the ')}` : `${base} of ${city}`;
  const names = ctx.members.map((m) => m.name);
  const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? 'A brave wanderer';
  return {
    title,
    synopsis: `Something precious has gone missing from ${city}. ${who} must follow the clues across cafés, parks and stages before the Long Night falls.`,
    theme_tags: ctx.themes.slice(0, 3),
    chapters: ctx.chapters.map((t, i) => ({ chapter_number: i + 1, template_id: t, ...FALLBACK_CHAPTER_TEXT[t] })),
  };
}

// ------------------------------------------------------------------ validate + repair

const str = (v: unknown, max: number, dflt = ''): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  return (s || dflt).slice(0, max);
};

export function resolvePlace(ref: unknown, places: Place[]): Place | null {
  if (ref == null) return null;
  if (typeof ref === 'number') return places[ref] ?? null;
  if (typeof ref !== 'string') return null;
  const m = ref.match(/^\s*P?(\d+)\s*$/i);
  if (m) return places[Number(m[1])] ?? null;
  const t = ref.toLowerCase();
  return places.find((p) => p.title.toLowerCase() === t) ?? null;
}

export function resolveAssignees(names: unknown, members: MemberCtx[]): string[] {
  if (!Array.isArray(names)) return [];
  const ids = new Set<string>();
  for (const n of names) {
    if (typeof n !== 'string') continue;
    const k = n.trim().toLowerCase();
    const hit = members.find((m) => m.name.toLowerCase() === k) ??
      members.find((m) => m.name.toLowerCase().split(/\s+/)[0] === k.split(/\s+/)[0]) ??
      members.find((m) => m.user_id === n);
    if (hit) ids.add(hit.user_id);
  }
  return [...ids];
}

/** Coerce one raw LLM mission into a valid DraftMission for (template, region). Returns null if unusable. */
// deno-lint-ignore no-explicit-any
export function repairMission(raw: any, templateId: TemplateId, regionId: string, _chapterIndex: number, ctx: Pick<StoryCtx, 'places' | 'members'> & { difficulty?: PointsDifficulty }): DraftMission | null {
  const size = TEMPLATE_REGIONS[templateId].find((r) => r.id === regionId)?.size;
  if (!size || !raw || typeof raw !== 'object') return null;
  const allowed = SIZE_RULES[size].types;
  let type: MissionType = allowed.includes(raw.type) ? raw.type : allowed[0];
  const title = str(raw.title, 60);
  const description = str(raw.description, 400);
  if (!title || !description) return null;

  let trial_question: string | null = null;
  let trial_answer: string | null = null;
  if (type === 'trial') {
    trial_question = str(raw.trial_question, 400) || null;
    trial_answer = str(raw.trial_answer, 80) || null;
    // A trial without a riddle is useless. Small -> relic (spec); medium -> unusable, use fallback.
    if (!trial_question || !trial_answer) {
      if (size !== 'small') return null;
      type = 'relic';
      trial_question = trial_answer = null;
    }
  }
  if (type === 'relic' && /riddle|answer the/i.test(description)) return null; // converted trial reads as nonsense

  let place = resolvePlace(raw.place_ref ?? raw.place, ctx.places);
  // Events are for groups (a solo relic at a concert is weird); gifts happen wherever.
  if (place?.source === 'google_events' && type !== 'gathering' && type !== 'duet') place = null;
  return {
    region_id: regionId,
    type,
    title,
    description,
    story_hook: str(raw.story_hook, 240, FALLBACK[templateId][regionId].hook),
    place: type === 'gift' ? null : place,
    assignee_ids: type === 'gathering' ? [] : resolveAssignees(raw.assignee_names ?? raw.assignees, ctx.members),
    trial_question,
    trial_answer,
    verification_hint: str(raw.verification_hint, 240, DEFAULT_HINT[type]),
    points: defaultPoints(size, ctx.difficulty), // never trust the model with the score
    source: 'llm',
  };
}

/** Exactly one mission per region: keep valid LLM missions, fill gaps with fallback, drop unknown regions. */
// deno-lint-ignore no-explicit-any
export function repairChapter(rawMissions: any, templateId: TemplateId, chapterIndex: number, ctx: StoryCtx, picker: PlacePicker, prefer: number[]): { missions: DraftMission[]; repaired: number } {
  const list = Array.isArray(rawMissions) ? rawMissions : [];
  let repaired = 0;
  const missions = TEMPLATE_REGIONS[templateId].map((r) => {
    const raw = list.find((m) => m && typeof m === 'object' && m.region_id === r.id);
    const fixed = raw ? repairMission(raw, templateId, r.id, chapterIndex, ctx) : null;
    if (fixed) {
      picker.mark(fixed.place);
      if (raw.type !== fixed.type) repaired++;
      return fixed;
    }
    repaired++;
    const spec = FALLBACK[templateId][r.id];
    return fallbackMission(templateId, r.id, chapterIndex, spec.wantsPlace ? picker.pick(spec.type, prefer) : null, ctx.difficulty);
  });
  return { missions, repaired };
}

/** Make sure every member has at least one mission "for them" on every page (small/medium, round-robin). */
export function ensureCoverage(missions: DraftMission[], members: MemberCtx[], unique: Record<string, string[]>) {
  if (members.length < 2) return;
  const covered = new Set(missions.flatMap((m) => m.assignee_ids));
  const free = missions.filter((m) => m.type !== 'gathering' && m.assignee_ids.length === 0);
  // Members with unique interests first: they're the ones who'd otherwise feel left out.
  const todo = members.filter((m) => !covered.has(m.user_id))
    .sort((a, b) => (unique[b.user_id]?.length ?? 0) - (unique[a.user_id]?.length ?? 0));
  for (const m of todo) {
    const slot = free.shift();
    if (!slot) break;
    slot.assignee_ids = [m.user_id];
  }
}

// ------------------------------------------------------------------ DB

/** Insert pages + missions + secrets for a storyline. Chapter 1 active/open, the rest locked. */
export async function writeBookRows(storylineId: string, fellowshipId: string, book: DraftBook, memberCount: number) {
  const { data: pages, error: pErr } = await admin.from('pages').insert(
    book.chapters.map((c, i) => ({
      storyline_id: storylineId, chapter_number: i + 1, title: c.title, narrative: c.narrative,
      template_id: c.template_id, status: i === 0 ? 'active' : 'locked',
    })),
  ).select('id, chapter_number');
  if (pErr || !pages) throw new Error(`insert pages: ${pErr?.message}`);
  const pageId = new Map(pages.map((p: { id: string; chapter_number: number }) => [p.chapter_number, p.id]));

  const rows = book.chapters.flatMap((c, i) =>
    c.missions.map((m) => {
      const size = TEMPLATE_REGIONS[c.template_id].find((r) => r.id === m.region_id)!.size;
      return {
        page_id: pageId.get(i + 1), storyline_id: storylineId, fellowship_id: fellowshipId, region_id: m.region_id,
        title: m.title, description: m.description, story_hook: m.story_hook, type: m.type,
        proof_type: PROOF_FOR_TYPE[m.type], required_members: requiredMembers(size, memberCount),
        assignee_ids: m.assignee_ids, place: m.place, trial_question: m.trial_question,
        verification_hint: m.verification_hint, points: m.points, status: i === 0 ? 'open' : 'locked',
      };
    })
  );
  const { data: inserted, error: mErr } = await admin.from('missions').insert(rows).select('id, page_id, region_id');
  if (mErr || !inserted) throw new Error(`insert missions: ${mErr?.message}`);

  const secrets: { mission_id: string; trial_answer: string }[] = [];
  book.chapters.forEach((c, i) => {
    for (const m of c.missions) {
      if (m.type !== 'trial' || !m.trial_answer) continue;
      const row = inserted.find((x: { page_id: string; region_id: string }) => x.page_id === pageId.get(i + 1) && x.region_id === m.region_id);
      if (row) secrets.push({ mission_id: row.id, trial_answer: m.trial_answer });
    }
  });
  if (secrets.length) {
    const { error } = await admin.from('mission_secrets').insert(secrets);
    if (error) throw new Error(`insert secrets: ${error.message}`);
  }
}

export function templateTitle(t: TemplateId) {
  return TEMPLATE_META[t].title;
}

// ------------------------------------------------------------------ reroll alternates

/** Extra region-agnostic missions per size, used when a reroll can't reach the LLM. */
export const ALTERNATES: Record<RegionSize, FallbackSpec[]> = {
  large: [
    { type: 'gathering', title: 'The Round Table', wantsPlace: true, desc: (p) => `Everyone meets at ${at(p, 'someone\'s place')} and plays one game together, any game. Take a group photo mid-game.`, hook: 'Even kings settle things over a good game.', hint: 'Group photo of people playing a game.' },
    { type: 'gathering', title: 'The Long Walk', wantsPlace: true, desc: (p) => `Take a 20-minute walk all together${p ? ` around ${p.title}` : ''} and snap a group selfie at the halfway point.`, hook: 'Quests are mostly walking, and the best ones are walked together.', hint: 'Group selfie outdoors.' },
  ],
  medium: [
    { type: 'duet', title: 'Two-Person Feast', wantsPlace: true, desc: (p) => `Two of you split a snack or drink${p ? ` at ${p.title}` : ''} and photograph it before the first bite.`, hook: 'Bread broken in two tastes twice as good.', hint: 'Photo of food or drinks for two.' },
    { type: 'duet', title: 'Mirror Match', desc: () => 'Two of you strike the exact same pose somewhere fun and take one photo of it.', hook: 'Twin knights confuse any dragon.', hint: 'Two people in matching poses.' },
    { type: 'gift', title: 'A Note in the Satchel', desc: () => 'Write a short kind note for another member and give it to them in person. They confirm when they read it.', hook: 'Some magic is just ink and honesty.', hint: 'The recipient confirms.' },
  ],
  small: [
    { type: 'relic', title: 'The Colored Relic', desc: () => 'Photograph something in the wild that matches your crayon color exactly.', hook: 'Your color is hiding everywhere, waiting to be found.', hint: 'Photo of an object in the player\'s color.' },
    { type: 'bard', title: 'Tavern Review', desc: () => 'Write a three-sentence fairy-tale review of the last place you ate.', hook: 'Every inn deserves a ballad, good or bad.', hint: 'A short playful review.' },
    { type: 'relic', title: 'The Sky Today', desc: () => 'Photograph the sky right now, wherever you are.', hook: 'The sky keeps a diary of every quest.', hint: 'Photo of the sky.' },
  ],
};

export function alternateMission(templateId: TemplateId, regionId: string, _chapterIndex: number, currentTitle: string, place: Place | null, seed: number, difficulty: PointsDifficulty = 'normal'): DraftMission {
  const size = TEMPLATE_REGIONS[templateId].find((r) => r.id === regionId)!.size;
  const base = FALLBACK[templateId][regionId];
  const pool = [base, ...ALTERNATES[size]].filter((s) => s.title !== currentTitle);
  const spec = pool[Math.abs(seed) % pool.length];
  const p = spec.wantsPlace ? place : null;
  return {
    region_id: regionId, type: spec.type, title: spec.title, description: spec.desc(p), story_hook: spec.hook, place: p,
    assignee_ids: [], trial_question: spec.trial?.q ?? null, trial_answer: spec.trial?.a ?? null,
    verification_hint: spec.hint, points: defaultPoints(size, difficulty), source: 'fallback',
  };
}
