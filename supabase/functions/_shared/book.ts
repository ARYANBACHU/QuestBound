// Owner: EV. Book building blocks shared by generate-storyline and reroll-mission:
// deterministic fallback missions, validate+repair of LLM output, and the DB writer.
// Rule: never trust the model. Everything that reaches the DB passes through repairMission().
import { admin } from './db.ts';
import { crewOf, missionPoints, type PointsDifficulty } from './points.ts';
import type { Outline, StoryCtx } from './prompts.ts';
import {
  ALTERNATES, crewFor, crewWord, DEFAULT_HINT, withCrew, FALLBACK, FALLBACK_CHAPTER_TEXT, FALLBACK_TITLES, type FallbackSpec,
} from './fallbacks.ts';
import {
  type MemberCtx, type MissionType, type Place, PROOF_FOR_TYPE, type RegionSize, SIZE_RULES, TEMPLATE_META,
  TEMPLATE_REGIONS, type TemplateId,
} from './types.ts';

export { ALTERNATES, FALLBACK };

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
  crew: number; // required_members (G1): everyone for gatherings, 2–3 for mediums, 1–2 for smalls
  source: 'llm' | 'fallback';
}
export interface DraftChapter { chapter_number: number; template_id: TemplateId; title: string; narrative: string; missions: DraftMission[] }
export interface DraftBook { title: string; synopsis: string; theme_tags: string[]; chapters: DraftChapter[] }

// ------------------------------------------------------------------ fallback content (_shared/fallbacks.ts)

const sizeOf = (t: TemplateId, regionId: string): RegionSize =>
  TEMPLATE_REGIONS[t].find((r) => r.id === regionId)?.size ?? 'small';

/** Required members for a region of a page, for a fellowship of `memberCount` (G1 crew plan). */
export function planCrew(templateId: TemplateId, regionId: string, memberCount: number, type?: MissionType): number {
  return crewFor(sizeOf(templateId, regionId), FALLBACK[templateId]?.[regionId]?.crew, memberCount, type);
}

/** Mission types a region slot allows: a trio can't be a gift (a gift is giver + recipient). */
export function allowedTypes(size: RegionSize, crew: number): MissionType[] {
  return SIZE_RULES[size].types.filter((t) => !(crew >= 3 && t === 'gift'));
}

/** Points are always set server-side: crew base × difficulty multiplier (_shared/points.ts). */
export function defaultPoints(type: MissionType, crew: number, difficulty: PointsDifficulty = 'normal'): number {
  return missionPoints(crewOf({ type, required_members: crew }), difficulty);
}

export function requiredMembers(size: RegionSize, memberCount: number): number {
  const rule = SIZE_RULES[size].members;
  return rule === 'all' ? Math.max(2, memberCount) : rule;
}

export function fallbackMission(templateId: TemplateId, regionId: string, _chapterIndex: number, place: Place | null, difficulty: PointsDifficulty = 'normal', memberCount = 4): DraftMission {
  const spec = FALLBACK[templateId]?.[regionId] ?? ALTERNATES[sizeOf(templateId, regionId)][0];
  return fromSpec(spec, templateId, regionId, place, difficulty, memberCount);
}

function fromSpec(spec: FallbackSpec, templateId: TemplateId, regionId: string, place: Place | null, difficulty: PointsDifficulty, memberCount: number, crewOverride?: number): DraftMission {
  const crew = crewOverride ?? planCrew(templateId, regionId, memberCount, spec.type);
  const p = spec.wantsPlace ? place : null;
  return {
    region_id: regionId, type: spec.type, title: spec.title, description: withCrew(spec.desc(p, crew), spec.type === 'gathering' || spec.type === 'gift' ? 1 : crew), story_hook: spec.hook,
    place: p, assignee_ids: [], trial_question: spec.trial?.q ?? null, trial_answer: spec.trial?.a ?? null,
    verification_hint: spec.hint, points: defaultPoints(spec.type, crew, difficulty), crew, source: 'fallback',
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

export function fallbackChapterMissions(templateId: TemplateId, chapterIndex: number, picker: PlacePicker, prefer: number[], difficulty: PointsDifficulty = 'normal', memberCount = 4): DraftMission[] {
  return TEMPLATE_REGIONS[templateId].map((r) => {
    const spec = FALLBACK[templateId]?.[r.id];
    return fallbackMission(templateId, r.id, chapterIndex, spec?.wantsPlace ? picker.pick(spec.type, prefer) : null, difficulty, memberCount);
  });
}

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
    chapters: ctx.chapters.map((t, i) => ({ chapter_number: i + 1, template_id: t, ...(FALLBACK_CHAPTER_TEXT[t] ?? { title: TEMPLATE_META[t].title, narrative: `The tale turns to ${TEMPLATE_META[t].title.toLowerCase()}.` }) })),
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
export function repairMission(raw: any, templateId: TemplateId, regionId: string, _chapterIndex: number, ctx: Pick<StoryCtx, 'places' | 'members'> & { difficulty?: PointsDifficulty; crew?: number }): DraftMission | null {
  const size = TEMPLATE_REGIONS[templateId].find((r) => r.id === regionId)?.size;
  if (!size || !raw || typeof raw !== 'object') return null;
  const memberCount = Math.max(1, ctx.members.length);
  // G1: the crew of this slot is decided by the page plan (or kept from the old mission on a reroll), not the model.
  const slotCrew = ctx.crew ?? planCrew(templateId, regionId, memberCount);
  const allowed = allowedTypes(size, slotCrew);
  let type: MissionType = allowed.includes(raw.type) ? raw.type : allowed[0];
  // The model sometimes leaks our place indexes ("… Mural (P6)") into player-facing text: drop "(P6)", name bare "P6".
  const deref = (t: string) => t.replace(/\s*\(\s*P\d+\s*\)/g, '')
    .replace(/\bP(\d+)\b/g, (_m, i) => ctx.places[Number(i)]?.title ?? 'a nearby spot');
  for (const k of ['title', 'description', 'story_hook', 'verification_hint', 'trial_question']) {
    if (typeof raw[k] === 'string') raw = { ...raw, [k]: deref(raw[k]) };
  }
  const title = str(raw.title, 60);
  let description = str(raw.description, 400);
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

  const crew = type === 'gift' ? 2 : type === 'gathering' ? Math.max(2, memberCount) : slotCrew;
  // Copy must match the crew: "Two of you…" on a trio slot becomes "Three of you…" (and vice versa).
  if (type !== 'gathering' && type !== 'gift') {
    description = withCrew(description.replace(/^(two|three|four|both|a pair|a duo|a trio) of you\b/i, crewWord(crew)), crew);
  }

  let place = resolvePlace(raw.place_ref ?? raw.place, ctx.places);
  // Events are for groups (a solo relic at a concert is weird); gifts happen wherever.
  if (place?.source === 'google_events' && type !== 'gathering' && type !== 'duet') place = null;
  return {
    region_id: regionId,
    type,
    title,
    description,
    story_hook: str(raw.story_hook, 240, FALLBACK[templateId]?.[regionId]?.hook ?? 'The page waits for its color.'),
    place: type === 'gift' ? null : place,
    assignee_ids: type === 'gathering' ? [] : resolveAssignees(raw.assignee_names ?? raw.assignees, ctx.members),
    trial_question,
    trial_answer,
    verification_hint: str(raw.verification_hint, 240, DEFAULT_HINT[type]),
    points: defaultPoints(type, crew, ctx.difficulty), // never trust the model with the score
    crew,
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
    const spec = FALLBACK[templateId]?.[r.id];
    return fallbackMission(templateId, r.id, chapterIndex, spec?.wantsPlace ? picker.pick(spec.type, prefer) : null, ctx.difficulty, ctx.members.length);
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
      const size = sizeOf(c.template_id, m.region_id);
      return {
        page_id: pageId.get(i + 1), storyline_id: storylineId, fellowship_id: fellowshipId, region_id: m.region_id,
        title: m.title, description: m.description, story_hook: m.story_hook, type: m.type,
        proof_type: PROOF_FOR_TYPE[m.type], required_members: m.crew ?? requiredMembers(size, memberCount),
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

/** A handcrafted replacement for one region (reroll without the LLM). Keeps the old mission's crew. */
export function alternateMission(templateId: TemplateId, regionId: string, _chapterIndex: number, currentTitle: string, place: Place | null, seed: number, difficulty: PointsDifficulty = 'normal', crew?: number): DraftMission {
  const size = sizeOf(templateId, regionId);
  const base = FALLBACK[templateId]?.[regionId];
  const slot = crew ?? planCrew(templateId, regionId, 4);
  const pool = [...(base ? [base] : []), ...ALTERNATES[size]]
    .filter((s) => s.title !== currentTitle && !(slot >= 3 && s.type === 'gift'));
  const spec = pool[Math.abs(seed) % pool.length];
  return fromSpec(spec, templateId, regionId, place, difficulty, 4, spec.type === 'gift' ? 2 : slot);
}
