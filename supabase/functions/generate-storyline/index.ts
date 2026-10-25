// Owner: EV. POST { fellowship_id, mode: 'first' | 'sequel', demo?: boolean } -> { storyline_id }
// Also: { fellowship_id, prewarm: true } -> { prewarmed, places_count, serp } (fills the SerpApi cache, writes nothing).
// Spec: handoffs/EV.md Task 2 + Task 6. Budget < 30 s. Never fails the demo: every AI/search step has a
// deterministic fallback, so the only 5xx is a database outage.
//
// Pipeline: auth -> load fellowship + members -> (sequel context) -> insert 'generating' storyline (UI shows the
// loading ritual via realtime) -> [SerpApi grounding || LLM outline] -> LLM chapters in parallel -> validate/repair
// -> write pages/missions/secrets -> flip storyline to 'active' -> proclaim.
import { preflight, json, fail } from '../_shared/cors.ts';
import { admin, callerId, proclaim } from '../_shared/db.ts';
import { chat, HAS_LLM, parseJSON, withTimeout, type ChatMsg } from '../_shared/llm.ts';
import { eventsSearch, geocodeEvent, mapsSearch, resetSerpStats, snapshotSerpStats } from '../_shared/serp.ts';
import { asDifficulty, type PointsDifficulty } from '../_shared/points.ts';
import { archiveBook } from '../_shared/progress.ts';
import { buildUTBook, verifyUTPlaces } from '../_shared/ut.ts';
import { analyzeInterests, INTEREST_INFO } from '../_shared/interests.ts';
import {
  CHAPTER_SCHEMA, chapterTask, OUTLINE_SCHEMA, type Outline, outlineTask, type SequelCtx, sequelAddendum, type StoryCtx,
  storylineSystem, storylineUser,
} from '../_shared/prompts.ts';
import {
  type DraftBook, type DraftChapter, ensureCoverage, fallbackChapterMissions, fallbackOutline, PlacePicker,
  preferredPlaces, repairChapter, writeBookRows,
} from '../_shared/book.ts';
import {
  type BookRecap, memberCtx, type MemberCtx, type MissionType, type Place, type Profile, type TemplateId,
} from '../_shared/types.ts';

const BUDGET_MS = 27_000;
const DEFAULT_LOCATION = { lat: 30.2849, lng: -97.7341, label: 'Austin, TX' };
const TYPE_LABEL: Record<MissionType, string> = {
  gathering: 'Gatherings', duet: 'Duets', relic: 'Relic hunts', bard: 'Bard verses', trial: 'Riddles', gift: 'Gifts',
};

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const t0 = Date.now();
  const left = () => BUDGET_MS - (Date.now() - t0);
  resetSerpStats();

  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);
  const body = await req.json().catch(() => ({}));
  const fellowship_id: string | undefined = body.fellowship_id;
  const mode: 'first' | 'sequel' = body.mode === 'sequel' ? 'sequel' : 'first';
  const utDemo = body.demo === 'ut'; // E6: "The Legend of the Forty Acres" (real UT campus landmarks, GPS-gated)
  const demo = body.demo === true || utDemo;
  const replaceActive = body.replace_active === true;
  if (!fellowship_id) return fail('fellowship_id required');

  // 1. membership
  const { data: me } = await admin.from('fellowship_members').select('user_id')
    .eq('fellowship_id', fellowship_id).eq('user_id', uid).maybeSingle();
  if (!me) return fail('Only members of this fellowship can summon its story.', 403);

  // 2. fellowship + members
  const [{ data: fellowship }, { data: memberRows }, { data: books }] = await Promise.all([
    admin.from('fellowships').select('*').eq('id', fellowship_id).single(),
    admin.from('fellowship_members').select('user_id, joined_at, profile:profiles(*)').eq('fellowship_id', fellowship_id)
      .order('joined_at', { ascending: true }),
    admin.from('storylines').select('id, status, book_number, title, recap, created_at, difficulty').eq('fellowship_id', fellowship_id)
      .order('created_at', { ascending: false }),
  ]);
  if (!fellowship) return fail('Fellowship not found', 404);
  const members: MemberCtx[] = (memberRows ?? [])
    .map((r: { profile: Profile | Profile[] | null }) => (Array.isArray(r.profile) ? r.profile[0] : r.profile))
    .filter((p: Profile | null): p is Profile => !!p)
    .map((p: Profile) => memberCtx(p));

  // Pre-warm (before judging): fill the SerpApi cache for this fellowship's themes + Muse's defaults. Writes no book.
  if (body.prewarm === true) {
    const ia = analyzeInterests(members);
    const themes = [...new Set([...ia.themes, 'coffee', 'parks', 'live_music', 'board_games', 'food_trucks'])];
    const places = await ground(fellowship.lat ?? DEFAULT_LOCATION.lat, fellowship.lng ?? DEFAULT_LOCATION.lng,
      fellowship.area_label ?? DEFAULT_LOCATION.label, themes, 10_000, asDifficulty(body.difficulty));
    return json({ prewarmed: themes, places_count: places.length, serp: snapshotSerpStats() });
  }

  // Idempotency: a double-tap while Muse is writing returns the same book.
  const generating = (books ?? []).find((b) => b.status === 'generating' && Date.now() - new Date(b.created_at).getTime() < 90_000);
  if (generating) return json({ storyline_id: generating.id, reused: true });
  const active = (books ?? []).find((b) => b.status === 'active');
  if (mode === 'first' && !demo && !replaceActive && active) return json({ storyline_id: active.id, reused: true });
  // Sequels keep the last book's difficulty unless the fellowship picks a new one.
  const difficulty: PointsDifficulty = asDifficulty(body.difficulty, mode === 'sequel' ? asDifficulty(books?.[0]?.difficulty) : 'normal');

  const lat = fellowship.lat ?? DEFAULT_LOCATION.lat;
  const lng = fellowship.lng ?? DEFAULT_LOCATION.lng;
  const areaLabel = fellowship.area_label ?? DEFAULT_LOCATION.label;
  const bookNumber = Math.max(0, ...(books ?? []).map((b) => b.book_number ?? 0)) + 1;

  // 3. interest analysis (pure code)
  const interests = analyzeInterests(members);

  // 5. chapters
  const chapters: TemplateId[] = mode === 'sequel' ? sequelChapters(bookNumber) : [
    'castle_gate', 'enchanted_forest', 'dragon_peak', ...(members.length >= 4 ? ['royal_feast' as const] : []),
  ];

  // Sequel context (DB only, fast)
  const priorBook = (books ?? []).find((b) => b.status === 'complete') ?? active ?? null;
  const sequel = mode === 'sequel' && priorBook ? await loadSequel(fellowship_id, priorBook) : undefined;

  // Placeholder row so every phone flips to the "Sage is writing…" ritual immediately.
  const { data: row, error: insErr } = await admin.from('storylines').insert({
    fellowship_id, book_number: bookNumber, status: 'generating', title: 'Sage is writing…', synopsis: '',
    theme_tags: interests.themes, difficulty,
  }).select('id').single();
  if (insErr || !row) return fail(`Could not start the book: ${insErr?.message}`, 500);
  const storyline_id: string = row.id;

  // Join race: two friends can tap "Summon" in the same second. The check above is read-then-insert, so re-check
  // AFTER inserting: the oldest fresh 'generating' row wins and every other caller deletes its own row and reuses it.
  const winner = await raceWinner(fellowship_id, storyline_id);
  if (winner !== storyline_id) {
    await admin.from('storylines').delete().eq('id', storyline_id);
    return json({ storyline_id: winner, reused: true });
  }

  try {
    if (utDemo) {
      const tUT = Date.now();
      const { places: utPlaces, verify } = await verifyUTPlaces(5_000);
      const { book: utBook } = buildUTBook(utPlaces, difficulty, members);
      await writeBookRows(storyline_id, fellowship_id, utBook, members.length);
      const serp = snapshotSerpStats();
      const generation_context = {
        mode, demo: 'ut', difficulty, replace_active: replaceActive, book_number: bookNumber,
        interests: { counts: interests.counts, shared: interests.shared, unique: interests.unique, themes: interests.themes },
        places: Object.values(utPlaces), serp, ut_verify: verify, prior_recap: null, adaptation: null,
        source: { outline: 'ut_demo', chapters: utBook.chapters.map(() => 'ut_demo'), repaired: 0, llm_available: HAS_LLM },
        timings_ms: { ut_verify: Date.now() - tUT, total: Date.now() - t0 },
      };
      await activateAndProclaim(storyline_id, fellowship_id, utBook, generation_context, members, null);
      console.log('[generate-storyline] ut demo', JSON.stringify({ storyline_id, serp, verified: verify.filter((v) => v.used === 'serpapi').length, ms: Date.now() - t0 }));
      return json({ storyline_id, serp, adaptation: null, difficulty });
    }

    const ctx: StoryCtx = {
      mode, fellowshipName: fellowship.name, areaLabel, members, shared: interests.shared, themes: interests.themes,
      unique: interests.unique, places: [], chapters, preferFree: interests.preferFree, difficulty, sequel,
    };
    const timings: Record<string, number> = {};
    const seed = demo ? 0 : hashSeed(`${fellowship_id}:${bookNumber}`);
    const useLLM = HAS_LLM && !demo;

    // 4 + 6a. SerpApi grounding in parallel with the outline (the outline doesn't need places).
    const groundP = ground(lat, lng, areaLabel, interests.themes, demo ? 4_000 : 7_000, difficulty).then((p) => {
      timings.serp = Date.now() - t0;
      return p;
    });
    const outlineP: Promise<Outline | null> = useLLM
      ? askJSON<Outline>(
        [
          { role: 'system', content: storylineSystem(mode) },
          { role: 'user', content: storylineUser(ctx, false) + (sequel ? sequelAddendum(sequel.recap, sequel) : '') + '\n\n' + outlineTask(ctx) },
        ],
        { temperature: 0.9, timeoutMs: Math.min(11_000, left() - 12_000), schema: OUTLINE_SCHEMA, schemaName: 'outline', left },
      ).then((o) => {
        timings.outline = Date.now() - t0;
        return o;
      })
      : Promise.resolve(null);
    const [places, rawOutline] = await Promise.all([groundP, outlineP]);
    ctx.places = places;

    const outline = normalizeOutline(rawOutline, ctx, seed);
    const outlineSource = rawOutline ? 'llm' : 'fallback';

    // 6b. chapters in parallel
    const picker = new PlacePicker(places);
    const prefer = chapters.map((_, i) => preferredPlaces(places, i, chapters.length));
    let rawChapters: (unknown | null)[] = chapters.map(() => null);
    if (useLLM && rawOutline && left() > 6_000) {
      const sys: ChatMsg = { role: 'system', content: storylineSystem(mode) };
      const shared = storylineUser(ctx, true) + (sequel ? sequelAddendum(sequel.recap, sequel) : '');
      rawChapters = await Promise.all(chapters.map((_, i) =>
        askJSON<{ missions: unknown[] }>(
          [sys, { role: 'user', content: `${shared}\n\n${chapterTask(ctx, outline, i, prefer[i])}` }],
          { temperature: 0.9, timeoutMs: left() - 1_500, schema: CHAPTER_SCHEMA, schemaName: 'chapter', left },
        ).then((r) => r?.missions ?? null)
      ));
      timings.chapters = Date.now() - t0;
    }

    // 7. validate + repair (sequential so the place picker spreads places deterministically)
    let repaired = 0;
    const chapterSources: string[] = [];
    const draftChapters: DraftChapter[] = outline.chapters.map((c, i) => {
      let missions;
      if (rawChapters[i]) {
        const r = repairChapter(rawChapters[i], c.template_id, i, ctx, picker, prefer[i]);
        missions = r.missions;
        repaired += r.repaired;
        chapterSources.push(r.repaired >= 4 ? 'fallback' : 'llm');
      } else {
        missions = fallbackChapterMissions(c.template_id, i, picker, prefer[i], difficulty);
        chapterSources.push('fallback');
      }
      ensureCoverage(missions, members, interests.unique);
      return { ...c, missions };
    });
    const book: DraftBook = { title: outline.title, synopsis: outline.synopsis, theme_tags: outline.theme_tags, chapters: draftChapters };

    // 8. write
    await writeBookRows(storyline_id, fellowship_id, book, members.length);
    const adaptation = sequel ? buildAdaptation(sequel, priorBook!.id, book) : null;
    const serp = snapshotSerpStats();
    const generation_context = {
      mode, demo, difficulty, replace_active: replaceActive, book_number: bookNumber,
      interests: { counts: interests.counts, shared: interests.shared, unique: interests.unique, themes: interests.themes },
      places, serp, prior_recap: sequel?.recap ?? null, adaptation,
      source: { outline: outlineSource, chapters: chapterSources, repaired, llm_available: HAS_LLM },
      timings_ms: { ...timings, total: Date.now() - t0 },
    };
    // 9. activate + shelve the old book + proclaim
    await activateAndProclaim(storyline_id, fellowship_id, book, generation_context, members, adaptation?.note ?? null);
    console.log('[generate-storyline]', JSON.stringify({ storyline_id, ...generation_context.source, serp, ms: Date.now() - t0 }));
    return json({ storyline_id, serp, adaptation, difficulty });
  } catch (e) {
    console.error('[generate-storyline] failed, rolling back', String(e));
    await admin.from('storylines').delete().eq('id', storyline_id);
    return fail('Sage dropped the quill. Try summoning the story again.', 500);
  }
});

// ---------------------------------------------------------------- helpers

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const READY_FLOURISH = [
  'Sharpen your crayons.',
  'Snacks are strongly encouraged.',
  'Sage has already spilled ink on page one.',
  'Bring friends. Dragons hate crowds.',
];

/** Flip the 'generating' row to active, shelve any other active book (recap.abandoned), proclaim in chat. */
async function activateAndProclaim(
  storylineId: string, fellowshipId: string, book: DraftBook, generation_context: Record<string, unknown>,
  members: MemberCtx[], note: string | null,
) {
  const { error: upErr } = await admin.from('storylines').update({
    title: book.title, synopsis: book.synopsis, theme_tags: book.theme_tags, status: 'active', generation_context,
  }).eq('id', storylineId);
  if (upErr) throw new Error(`activate storyline: ${upErr.message}`);
  // Only one active book per fellowship: shelve the old one (unfinished -> recap marked abandoned).
  const { data: others } = await admin.from('storylines').select('id, title')
    .eq('fellowship_id', fellowshipId).eq('status', 'active').neq('id', storylineId);
  await Promise.all((others ?? []).map((b: { id: string; title: string }) => archiveBook(b.id, b.title, members)));
  const first = book.chapters[0];
  const flourish = READY_FLOURISH[Math.abs(hashSeed(storylineId)) % READY_FLOURISH.length];
  await proclaim(
    fellowshipId,
    `Hear ye! Sage has written a new tale: "${book.title}". Chapter ${ROMAN[1]}: ${first.title} awaits. ` +
      (note ? note : flourish),
    { event: 'storyline_ready', storyline_id: storylineId },
  );
}

function stripVenue(p: Place): Place {
  const { venue: _v, ...clean } = p as Place & { venue?: string };
  return clean;
}

/** The oldest fresh 'generating' storyline of this fellowship (ties broken by id). */
async function raceWinner(fellowshipId: string, mine: string): Promise<string> {
  const since = new Date(Date.now() - 90_000).toISOString();
  const { data } = await admin.from('storylines').select('id, created_at').eq('fellowship_id', fellowshipId)
    .eq('status', 'generating').gte('created_at', since)
    .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1);
  return data?.[0]?.id ?? mine;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function sequelChapters(bookNumber: number): TemplateId[] {
  const pool: TemplateId[] = ['castle_gate', 'enchanted_forest', 'dragon_peak'];
  const k = bookNumber % pool.length;
  const rotated = [...pool.slice(k), ...pool.slice(0, k)];
  return [rotated[0], rotated[1], 'royal_feast'];
}

/** Ask for JSON; on parse failure retry once with the error appended (if time allows). Null on failure. */
async function askJSON<T>(
  messages: ChatMsg[],
  opts: { temperature: number; timeoutMs: number; schema: Record<string, unknown>; schemaName: string; left: () => number },
): Promise<T | null> {
  if (opts.timeoutMs < 3_000) return null;
  let raw = '';
  try {
    raw = await chat(messages, { temperature: opts.temperature, timeoutMs: opts.timeoutMs, schema: opts.schema, schemaName: opts.schemaName, reasoning: 'minimal' });
    return parseJSON<T>(raw);
  } catch (e) {
    const err = String(e);
    console.warn(`[askJSON ${opts.schemaName}] first attempt failed:`, err.slice(0, 300));
    // Only retry on bad JSON, not on timeouts/HTTP errors (those would just burn the budget again).
    if (!raw || opts.left() < 8_000) return null;
    try {
      const retry = await chat(
        [...messages, { role: 'assistant', content: raw.slice(0, 4000) }, {
          role: 'user', content: `That was not valid JSON (${err.slice(0, 200)}). Reply again with ONLY the JSON object.`,
        }],
        { temperature: 0.5, timeoutMs: opts.left() - 2_000, schema: opts.schema, schemaName: opts.schemaName, reasoning: 'minimal' },
      );
      return parseJSON<T>(retry);
    } catch (e2) {
      console.warn(`[askJSON ${opts.schemaName}] retry failed:`, String(e2).slice(0, 300));
      return null;
    }
  }
}

/** Force the outline onto our chapter plan; fill anything missing from the fallback outline. */
function normalizeOutline(raw: Outline | null, ctx: StoryCtx, seed: number): Outline {
  const fb = fallbackOutline(ctx, seed);
  if (!raw || typeof raw !== 'object') return fb;
  const s = (v: unknown, max: number, d: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d);
  const rawChapters = Array.isArray(raw.chapters) ? raw.chapters : [];
  return {
    title: s(raw.title, 80, fb.title),
    synopsis: s(raw.synopsis, 600, fb.synopsis),
    theme_tags: Array.isArray(raw.theme_tags)
      ? raw.theme_tags.filter((t) => typeof t === 'string' && INTEREST_INFO[t]).slice(0, 4)
      : fb.theme_tags,
    chapters: ctx.chapters.map((t, i) => {
      const rc = rawChapters.find((c) => c?.template_id === t) ?? rawChapters[i];
      return {
        chapter_number: i + 1,
        template_id: t,
        title: s(rc?.title, 80, fb.chapters[i].title),
        narrative: s(rc?.narrative, 600, fb.chapters[i].narrative),
      };
    }),
  };
}

/** SerpApi: one Maps search per theme + one Events search, each with its own timeout. Interleaved + deduped. */
async function ground(lat: number, lng: number, area: string, themes: string[], timeoutMs: number, difficulty: PointsDifficulty = 'normal'): Promise<Place[]> {
  // Easy books search a tighter map (closer places), hard books a wider one (across town).
  const zoom = difficulty === 'easy' ? 15 : difficulty === 'hard' ? 12 : 14;
  const tasks: Promise<Place[]>[] = themes.map((t) =>
    withTimeout(mapsSearch(INTEREST_INFO[t]?.query ?? t.replace(/_/g, ' '), lat, lng, 4, zoom), timeoutMs, [], `maps:${t}`)
  );
  // Events are geocoded (venue lookup on Google Maps) so GPS-gated missions work for them too.
  tasks.push(
    withTimeout(eventsSearch(`events in ${area}`, 6), timeoutMs, [], 'events').then((evs) =>
      Promise.all(evs.map((e) => withTimeout(geocodeEvent(e, lat, lng), 4_000, stripVenue(e), `geocode:${e.title}`)))
    ),
  );
  const lists = await Promise.all(tasks);
  const out: Place[] = [];
  const seen = new Set<string>();
  // Round-robin so every theme (and events) is represented near the top of the list.
  for (let k = 0; out.length < 16 && lists.some((l) => l.length > k); k++) {
    for (const l of lists) {
      const p = l[k];
      if (!p) continue;
      const key = p.title.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
      if (out.length >= 16) break;
    }
  }
  return out;
}

interface PriorBook { id: string; title: string; recap: BookRecap | null; created_at: string }

/** What the fellowship actually did last book: loved/skipped mission types, photos, chat, callbacks. */
async function loadSequel(fellowshipId: string, prior: PriorBook): Promise<SequelCtx> {
  const [{ data: missions }, { data: pages }, { count: photos }, { data: chats }] = await Promise.all([
    admin.from('missions').select('type, status, completed_at, page_id, story_line, title').eq('storyline_id', prior.id),
    admin.from('pages').select('id, chapter_number, completed_at').eq('storyline_id', prior.id),
    admin.from('memories').select('id', { count: 'exact', head: true }).eq('storyline_id', prior.id).eq('kind', 'photo'),
    admin.from('messages').select('body').eq('fellowship_id', fellowshipId).eq('kind', 'text')
      .order('created_at', { ascending: false }).limit(40),
  ]);
  const ps = (pages ?? []).sort((a, b) => a.chapter_number - b.chapter_number);
  // A page "opens" when the previous one completes (or when the book was created).
  const openedAt = new Map<string, number>();
  ps.forEach((p, i) => {
    const prev = ps[i - 1];
    openedAt.set(p.id, new Date(prev?.completed_at ?? prior.created_at).getTime());
  });
  const stat: Record<string, { offered: number; done: number; hours: number[] }> = {};
  for (const m of missions ?? []) {
    const s = (stat[m.type] ??= { offered: 0, done: 0, hours: [] });
    s.offered++;
    if (m.status === 'complete') {
      s.done++;
      if (m.completed_at) s.hours.push(Math.max(0, (new Date(m.completed_at).getTime() - (openedAt.get(m.page_id) ?? 0)) / 3600_000));
    }
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : Infinity);
  const rate = (t: string) => stat[t].done / Math.max(1, stat[t].offered);
  const types = Object.keys(stat);
  const loved = types.filter((t) => stat[t].done > 0 && t !== 'gathering')
    .sort((a, b) => rate(b) - rate(a) || avg(stat[a].hours) - avg(stat[b].hours)).slice(0, 2);
  let skipped = types.filter((t) => t !== 'gathering' && rate(t) < 0.5 && !loved.includes(t));
  if (!skipped.length) {
    const slowest = types.filter((t) => t !== 'gathering' && !loved.includes(t) && stat[t].done > 0)
      .sort((a, b) => avg(stat[b].hours) - avg(stat[a].hours))[0];
    if (slowest && types.length > 2) skipped = [slowest];
  }
  const lines = (missions ?? []).map((m) => m.story_line).filter((x): x is string => !!x);
  return {
    prior_title: prior.title,
    recap: prior.recap,
    loved_types: loved,
    skipped_types: skipped,
    photo_count: photos ?? 0,
    chat_snippets: (chats ?? []).map((c) => c.body).reverse(),
    callbacks: [...(prior.recap?.highlights ?? []), ...lines].slice(0, 6),
  };
}

function buildAdaptation(seq: SequelCtx, priorId: string, book: DraftBook) {
  const after: Record<string, number> = {};
  for (const c of book.chapters) for (const m of c.missions) after[m.type] = (after[m.type] ?? 0) + 1;
  const label = (t: string) => TYPE_LABEL[t as MissionType] ?? t;
  const [a, b] = seq.loved_types;
  const wove = a && (after[a] ?? 0) >= 3;
  const note = a
    ? `Muse noticed you love ${label(a)}${b ? ` and ${label(b)}` : ''}${wove ? ', so this book has more of them' : ''}.` +
      (seq.skipped_types[0] && (after[seq.skipped_types[0]] ?? 0) <= 2 ? ` Fewer ${label(seq.skipped_types[0])} this time.` : '')
    : 'Muse remembered everything you did last time.';
  return {
    prior_storyline_id: priorId,
    loved_types: seq.loved_types,
    skipped_types: seq.skipped_types,
    callbacks: seq.callbacks.slice(0, 2),
    photo_count: seq.photo_count,
    type_counts: after,
    note,
  };
}

