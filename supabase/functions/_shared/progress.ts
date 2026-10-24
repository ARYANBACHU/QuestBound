// Owner: EV. What happens after a proof passes: answer matching, story lines, page/book progression helpers,
// chapter illustrations (Muse Image -> 'art' bucket), recap, montage frames.
import { admin, proclaim } from './db.ts';
import { chatJSON, generateImage, HAS_LLM, withTimeout } from './llm.ts';
import { illustrationPrompt, montagePrompt, recapSystem, recapUser } from './prompts.ts';
import type { BookRecap, MemberCtx, Mission, Page } from './types.ts';

/** Run work after the response is sent (Supabase Edge Runtime), or fire-and-forget locally. */
export function background(p: Promise<unknown>) {
  const guarded = p.catch((e) => console.error('[background]', String(e)));
  // deno-lint-ignore no-explicit-any
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(guarded);
}

export function roman(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n);
}

/** How many participants a mission really needs right now (never more than the fellowship has). */
export function effectiveRequired(m: Pick<Mission, 'required_members' | 'type'>, memberCount: number): number {
  let need = Math.min(m.required_members, Math.max(1, memberCount));
  if (m.type === 'gathering' && memberCount >= 4) need -= 1; // people are busy; one may be taking the photo
  return Math.max(1, need);
}

const ARTICLES = /\b(a|an|the)\b/g;
export function normalizeAnswer(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ')
    .replace(ARTICLES, ' ').replace(/\s+/g, ' ').trim();
}

/** Exact-ish match against "answer|alt|alt". Also accepts plural/singular and the answer inside a short phrase. */
export function answerMatches(given: string, answer: string): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  return answer.split('|').map(normalizeAnswer).filter(Boolean).some((a) => {
    if (g === a || g === `${a}s` || `${g}s` === a || g.replace(/es$/, '') === a) return true;
    // "it's a piano!" -> contains the whole answer as words, and the guess is short
    return g.split(' ').length <= a.split(' ').length + 3 && ` ${g} `.includes(` ${a} `);
  });
}

export function heroName(m: MemberCtx): string {
  return `${m.name} the ${m.crest_title}`;
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'A brave wanderer';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function fallbackStoryLine(mission: Pick<Mission, 'title' | 'place' | 'type'>, heroes: MemberCtx[]): string {
  const who = joinNames(heroes.map(heroName));
  const where = mission.place ? ` at ${mission.place.title}` : '';
  switch (mission.type) {
    case 'gathering': return `${who} gathered${where} for "${mission.title}", and the whole page leaned in to listen.`;
    case 'duet': return `${who} set out side by side${where} and completed "${mission.title}", and the ink sang.`;
    case 'gift': return `${who} traded a small kindness, and "${mission.title}" glowed with it.`;
    case 'trial': return `${who} solved the riddle of "${mission.title}", and the lock clicked open.`;
    case 'bard': return `${who} wrote verses for "${mission.title}", and the words danced onto the page.`;
    default: return `${who} completed "${mission.title}"${where}, and the page drank in the color.`;
  }
}

// ---------------------------------------------------------------- illustration

async function uploadArt(path: string, bytes: Uint8Array, contentType: string): Promise<string | null> {
  const { error } = await admin.storage.from('art').upload(path, bytes, { contentType, upsert: true });
  if (error) { console.error('[art upload]', error.message); return null; }
  return admin.storage.from('art').getPublicUrl(path).data.publicUrl;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Generate an image and store it in the public 'art' bucket. Signed URLs expire, so we always re-host. */
export async function paintToBucket(prompt: string, path: string): Promise<string | null> {
  const img = await generateImage(prompt);
  if (!img) return null;
  if (img.b64) return uploadArt(path, b64ToBytes(img.b64), img.mime);
  if (img.url) {
    const res = await fetch(img.url);
    if (!res.ok) return null;
    return uploadArt(path, new Uint8Array(await res.arrayBuffer()), res.headers.get('content-type') ?? img.mime);
  }
  return null;
}

export async function paintChapter(page: Page, fellowshipId: string, members: MemberCtx[]) {
  const { data: missions } = await admin.from('missions').select('story_line').eq('page_id', page.id);
  const lines = (missions ?? []).map((m) => m.story_line).filter((x): x is string => !!x);
  const crests = members.map((m) => `${m.crest_title.toLowerCase()} ${m.crest_emoji}`);
  const url = await paintToBucket(illustrationPrompt(page, lines, crests), `${page.storyline_id}/${page.id}.png`);
  if (!url) return;
  await admin.from('pages').update({ illustration_url: url }).eq('id', page.id);
  await admin.from('memories').insert({
    fellowship_id: fellowshipId, storyline_id: page.storyline_id, page_id: page.id, image_url: url,
    caption: page.title, kind: 'illustration',
  });
}

/** Round 2: 3-5 storybook frames of the best moments, for AD's montage player. */
export async function paintMontage(storylineId: string, fellowshipId: string, members: MemberCtx[], max = 4) {
  const { data: missions } = await admin.from('missions').select('id, page_id, story_line, type, points')
    .eq('storyline_id', storylineId).eq('status', 'complete');
  const { count } = await admin.from('memories').select('id', { count: 'exact', head: true })
    .eq('storyline_id', storylineId).eq('kind', 'montage_frame');
  if ((count ?? 0) > 0) return; // already painted
  // Big moments first: gatherings and duets, then highest points.
  const ranked = (missions ?? []).filter((m) => m.story_line)
    .sort((a, b) => (b.type === 'gathering' ? 2 : b.type === 'duet' ? 1 : 0) - (a.type === 'gathering' ? 2 : a.type === 'duet' ? 1 : 0) || b.points - a.points)
    .slice(0, max);
  const crests = members.map((m) => `${m.crest_title.toLowerCase()} ${m.crest_emoji}`);
  await Promise.all(ranked.map(async (m, i) => {
    const url = await paintToBucket(montagePrompt(m.story_line!, crests), `${storylineId}/montage-${i}.png`);
    if (!url) return;
    await admin.from('memories').insert({
      fellowship_id: fellowshipId, storyline_id: storylineId, page_id: m.page_id, mission_id: m.id, image_url: url,
      caption: m.story_line, kind: 'montage_frame',
    });
  }));
}

// ---------------------------------------------------------------- recap

export async function buildRecap(
  storyline: { id: string; title: string; synopsis: string; generation_context?: Record<string, unknown> | null },
  members: MemberCtx[],
  timeoutMs: number,
): Promise<BookRecap & { serp?: unknown }> {
  const [{ data: missions }, { count: photos }] = await Promise.all([
    admin.from('missions').select('title, type, story_line, completed_by, place, status, completed_at')
      .eq('storyline_id', storyline.id).order('completed_at', { ascending: true }),
    admin.from('memories').select('id', { count: 'exact', head: true }).eq('storyline_id', storyline.id).eq('kind', 'photo'),
  ]);
  const done = (missions ?? []).filter((m) => m.status === 'complete') as Mission[];
  const stats = {
    missions_completed: done.length,
    photos: photos ?? 0,
    places_visited: new Set(done.filter((m) => m.place).map((m) => m.place!.title)).size,
    members_active: new Set(done.flatMap((m) => m.completed_by)).size,
  };
  const fallback = fallbackRecap(storyline.title, members, done, stats);
  const serp = (storyline.generation_context as { serp?: unknown } | null)?.serp;
  if (!HAS_LLM) return { ...fallback, serp };
  const raw = await withTimeout(
    chatJSON<Partial<BookRecap>>([
      { role: 'system', content: recapSystem },
      { role: 'user', content: recapUser({ title: storyline.title, synopsis: storyline.synopsis, members, missions: done, stats }) },
    ], { temperature: 0.8, timeoutMs }),
    timeoutMs + 500, null, 'recap',
  );
  if (!raw) return { ...fallback, serp };
  const ok = (s: unknown) => typeof s === 'string' && s.trim().length > 0;
  const per = Array.isArray(raw.per_member) ? raw.per_member.filter((p) => p && members.some((m) => m.user_id === p.user_id) && ok(p.title)) : [];
  return {
    summary: ok(raw.summary) ? raw.summary!.trim() : fallback.summary,
    stats,
    highlights: Array.isArray(raw.highlights) && raw.highlights.filter(ok).length >= 2 ? raw.highlights.filter(ok).slice(0, 5) : fallback.highlights,
    per_member: members.map((m) => per.find((p) => p.user_id === m.user_id) ?? fallback.per_member.find((p) => p.user_id === m.user_id)!),
    next_book_hint: ok(raw.next_book_hint) ? raw.next_book_hint!.trim() : fallback.next_book_hint,
    serp,
  };
}

function fallbackRecap(title: string, members: MemberCtx[], done: Mission[], stats: BookRecap['stats']): BookRecap {
  const names = joinNames(members.map((m) => m.name));
  const lines = done.map((m) => m.story_line).filter((x): x is string => !!x);
  const pick = (k: number) => lines[Math.floor((k * Math.max(0, lines.length - 1)) / 2)];
  return {
    summary: `And so "${title}" was written, one real adventure at a time. ${names} colored ${stats.missions_completed} regions` +
      `${stats.places_visited ? ` across ${stats.places_visited} real places` : ''}${stats.photos ? `, and caught ${stats.photos} moments in the Magic Mirror` : ''}. ` +
      'The last page is full of color, and the book closes with a happy sigh.',
    stats,
    highlights: [...new Set([pick(0), pick(1), pick(2)].filter(Boolean))],
    per_member: members.map((m) => {
      const n = done.filter((d) => d.completed_by.includes(m.user_id)).length;
      return { user_id: m.user_id, title: heroName(m), contribution: n ? `Colored ${n} region${n === 1 ? '' : 's'} with ${m.color}.` : 'Cheered the fellowship on from the margins.' };
    }),
    next_book_hint: 'But far beyond the last page, something new is stirring. Muse is already sharpening the quill.',
  };
}

export async function announceBook(fellowshipId: string, storylineId: string, title: string, recap: BookRecap) {
  await proclaim(fellowshipId, `Hear ye! "${title}" is complete! ${recap.summary}`, { event: 'book_complete', storyline_id: storylineId });
}
