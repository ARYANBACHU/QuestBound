// Owner: EV (wizardChat request shape agreed with AB). Write-side calls -> Supabase Edge Functions.
// CONTRACT: keep these export names/signatures. Mock versions behave like the real engine so UI can be built now.
//
// Behaviour both modes share (build UI against this):
// - A failed verification is NOT a thrown error: submitProof resolves with verdict.pass=false + Sage's flavor_text.
//   Thrown errors mean auth/network/server trouble; their message is readable ("Sage dropped the quill…").
// - Gift missions are a handshake: the giver's submit (confirm_for = recipient) resolves with verdict.pass=true,
//   verdict.reason='gift_pending', mission.status='pending'. The region colors when the recipient submits with
//   confirm_for = giver. (Mock mode auto-confirms as the recipient after ~3 s so you can watch it happen.)
// - Mock only: proof_text 'dev' passes any mission (for dev buttons).
// - Photo verdicts may carry verdict.lens_titles (SerpApi Google Lens) → show as "The Mirror sees: …".
import { USE_MOCKS } from './env';
import { supabase } from './supabase';
import { addBook, addCompletion, addMemory, addMessage, advanceIfPageDone, emitMock, mock, patchMission, restoreDemoBook } from './mockStore';
import { ME, MOCK_RECAP } from '@/fixtures/demo';
import { utMockBook } from '@/fixtures/ut-campus';
import { asDifficulty, missionPoints } from '@/supabase/functions/_shared/points';
import { checkGeo, type GeoResult } from '@/supabase/functions/_shared/geo';
import { TEMPLATES } from '@/shared/templates';
import type {
  BookRecap, Difficulty, GenerateStorylineRequest, GenerateStorylineResponse, Mission, Page, Storyline, SubmitProofRequest,
  SubmitProofResponse, Verdict, WizardChatRequest, WizardChatResponse,
} from '@/shared/types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls an edge function with the user's JWT. Throws Error(<server's `error` text>) on failure. */
async function invoke<T>(fn: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body: body as Record<string, unknown> });
  if (error) {
    let message = error.message;
    // FunctionsHttpError carries the Response: surface the server's friendly { error } text.
    const ctx = (error as { context?: unknown }).context;
    if (ctx && typeof (ctx as Response).json === 'function') {
      try {
        const j = await (ctx as Response).clone().json();
        if (j?.error) message = String(j.error);
      } catch {
        /* not JSON */
      }
    } else if (/Failed to send|fetch/i.test(message)) {
      message = "Can't reach Sage right now. Check your connection and try again.";
    }
    throw new Error(message);
  }
  return data as T;
}

/**
 * Summon a book. Safe to call from ANY member, any time (two phones at once get the same storyline_id).
 * - `demo: true` = instant handcrafted book (no LLM); `demo: 'ut'` = "The Legend of the Forty Acres" (UT campus).
 * - `difficulty`: 'easy' | 'normal' | 'hard' (points ×0.75 / ×1 / ×1.5). Sequels inherit the last book's by default.
 * - `replace_active: true` shelves the current book (status 'complete', recap.abandoned = true) and writes a new one.
 * - mode 'first' without replace_active returns the active book (`reused: true`) if there is one.
 */
export async function generateStoryline(req: GenerateStorylineRequest): Promise<GenerateStorylineResponse> {
  if (USE_MOCKS) {
    await wait(req.demo ? 600 : 2500);
    if (req.demo === 'ut') return { storyline_id: mockUTBook(asDifficulty(req.difficulty)) };
    if (!mock.storyline) return { storyline_id: mockFirstBook() }; // join race: nobody had summoned yet
    const difficulty = asDifficulty(req.difficulty, req.mode === 'sequel' ? asDifficulty(mock.storyline.difficulty) : 'normal');
    if (req.mode === 'sequel' || req.replace_active || req.demo) {
      return { storyline_id: mockSequel(difficulty, mock.storyline.status !== 'complete'), difficulty } as GenerateStorylineResponse;
    }
    return { storyline_id: mock.storyline.id, reused: true };
  }
  return invoke('generate-storyline', req);
}

export async function submitProof(req: SubmitProofRequest): Promise<SubmitProofResponse> {
  if (USE_MOCKS) return mockSubmit(req);
  return invoke('submit-proof', req);
}

export async function wizardChat(req: WizardChatRequest): Promise<WizardChatResponse> {
  if (USE_MOCKS) {
    await wait(900);
    return { reply: 'Ah, a curious traveler! Tap a glowing region on your page to see its mission. Group missions color the biggest pieces.', actions: [{ type: 'navigate', target: 'coloring' }] };
  }
  return invoke('wizard-chat', req);
}

/** Round 2: Sage swaps one OPEN mission for a fresh one on the same region. Throws a readable Error if it can't. */
export interface RerollMissionResponse { mission: Mission; source: 'llm' | 'fallback' }
/** `difficulty` is relative to the old mission: 'easy' = easier (default), 'normal' = similar, 'hard' = harder. */
export async function rerollMission(missionId: string, reason?: string, difficulty?: Difficulty): Promise<RerollMissionResponse> {
  if (USE_MOCKS) {
    await wait(1200);
    const m = mock.missions.find((x) => x.id === missionId);
    if (!m) throw new Error('That mission has vanished from the book. Pull to refresh.');
    if (m.status !== 'open') throw new Error(m.status === 'complete' ? 'That region is already colored!' : 'That chapter is still sealed.');
    const alt = MOCK_REROLLS[m.type] ?? MOCK_REROLLS.relic;
    const page = mock.pages.find((p) => p.id === m.page_id);
    const size = TEMPLATES[page?.template_id ?? 'castle_gate'].regions.find((r) => r.id === m.region_id)?.size ?? 'small';
    const d = asDifficulty(difficulty, 'easy');
    const next = patchMission(m.id, { ...alt, title: m.title === alt.title ? `${alt.title} II` : alt.title, place: null, trial_question: null, points: missionPoints(size, d) })!;
    const how = d === 'hard' ? 'a braver' : d === 'normal' ? 'a different' : 'a gentler';
    addMessage({ fellowship_id: m.fellowship_id, user_id: null, kind: 'wizard', body: `${mock.profiles.find((p) => p.id === ME)?.display_name ?? 'Someone'} asked Sage for ${how} quest. With a flick of the quill, "${m.title}" became "${next.title}".`, payload: null });
    emitMock();
    return { mission: next, source: 'fallback' };
  }
  return invoke('reroll-mission', { mission_id: missionId, ...(reason ? { reason } : {}), ...(difficulty ? { difficulty } : {}) });
}

const MOCK_REROLLS: Record<string, Pick<Mission, 'title' | 'description' | 'story_hook' | 'type' | 'proof_type' | 'verification_hint'>> = {
  gathering: { title: 'The Round Table', description: 'Everyone meets and plays one game together, any game. Take a group photo mid-game.', story_hook: 'Even kings settle things over a good game.', type: 'gathering', proof_type: 'group_photo', verification_hint: 'Group photo of people playing a game.' },
  duet: { title: 'Mirror Match', description: 'Two of you strike the exact same pose somewhere fun and take one photo of it.', story_hook: 'Twin knights confuse any dragon.', type: 'duet', proof_type: 'photo', verification_hint: 'Two people in matching poses.' },
  gift: { title: 'A Note in the Satchel', description: 'Write a short kind note for another member and give it to them in person. They confirm when they read it.', story_hook: 'Some magic is just ink and honesty.', type: 'gift', proof_type: 'confirm', verification_hint: 'The recipient confirms.' },
  trial: { title: 'The Sky Today', description: 'Photograph the sky right now, wherever you are.', story_hook: 'The sky keeps a diary of every quest.', type: 'relic', proof_type: 'photo', verification_hint: 'Photo of the sky.' },
  relic: { title: 'The Colored Relic', description: 'Photograph something in the wild that matches your crayon color exactly.', story_hook: 'Your color is hiding everywhere.', type: 'relic', proof_type: 'photo', verification_hint: 'An object in the player\'s color.' },
  bard: { title: 'Tavern Review', description: 'Write a three-sentence fairy-tale review of the last place you ate.', story_hook: 'Every inn deserves a ballad.', type: 'bard', proof_type: 'text', verification_hint: 'A short playful review.' },
};

/**
 * Upload a local photo (file:// uri from expo-image-picker) to bucket 'proofs'; returns PUBLIC url (needed by SerpApi Lens).
 * Tip: pick with `quality: 0.6` so uploads stay small on hackathon Wi-Fi.
 */
export async function uploadProof(localUri: string, fellowshipId: string): Promise<string> {
  if (USE_MOCKS) { await wait(600); return localUri; }
  const ext = (localUri.split('?')[0].match(/\.(\w{3,4})$/)?.[1] ?? 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
  const res = await fetch(localUri);
  const buf = await res.arrayBuffer();
  const path = `${fellowshipId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const { error } = await supabase.storage.from('proofs').upload(path, buf, { contentType, upsert: false });
  if (error) throw new Error(`The Magic Mirror couldn't receive your photo (${error.message}). Try again.`);
  return supabase.storage.from('proofs').getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------- mock engine

const MOCK_LENS = ['Full moon over the Austin skyline', 'Lamar pedestrian bridge at dusk', 'Friends raising coffee cups'];

function respond(verdict: Verdict, mission: Mission, extra: Partial<SubmitProofResponse> = {}): SubmitProofResponse {
  return { verdict, mission, completion: null, page_completed: false, book_completed: false, ...extra };
}

async function mockSubmit(req: SubmitProofRequest): Promise<SubmitProofResponse> {
  await wait(1800);
  const mission = mock.missions.find((m) => m.id === req.mission_id);
  if (!mission) throw new Error('That mission has vanished from the book. Pull to refresh.');
  const nope = (flavor_text: string, reason: string) => respond({ pass: false, confidence: 1, reason, flavor_text }, mission);
  if (mission.status === 'complete') return nope('This region is already colored! Sage admires the enthusiasm. Pick another glowing spot on the page.', 'already_complete');
  if (mission.status === 'locked') return nope('No peeking! This chapter is still sealed. Finish the current page to turn to it.', 'locked');

  const me = mock.profiles.find((p) => p.id === ME)!;
  const name = (id: string) => mock.profiles.find((p) => p.id === id)?.display_name ?? 'a friend';
  const participants = [...new Set([ME, ...req.participant_ids])];

  // gift handshake
  if (mission.proof_type === 'confirm') {
    if (mission.status === 'pending') return nope('This gift is waiting on its recipient’s seal.', 'pending');
    const recipient = req.confirm_for ?? participants.find((p) => p !== ME);
    if (!recipient || recipient === ME) return nope('A gift needs a recipient! Choose which friend you surprised.', 'no_recipient');
    const pending = patchMission(mission.id, { status: 'pending' })!;
    addMessage({ fellowship_id: mission.fellowship_id, user_id: null, kind: 'system', body: `${me.display_name} sent a gift to ${name(recipient)}! Awaiting their seal.`, payload: null });
    emitMock();
    setTimeout(() => { // the recipient "confirms" on their phone
      const gl = `${me.display_name} the ${me.crest} surprised ${name(recipient)} with a gift, and the banner glowed with it.`;
      addCompletion({ mission_id: mission.id, user_id: recipient, participant_ids: [ME, recipient], proof_url: null, proof_text: null,
        verdict: { pass: true, confidence: 1, reason: 'gift_confirmed', flavor_text: 'Sealed with gratitude!' }, story_line: gl });
      complete(mission, [ME, recipient], gl);
      emitMock();
    }, 3000);
    return respond({ pass: true, confidence: 1, reason: 'gift_pending', flavor_text: `Your gift is on its way! The region colors the moment ${name(recipient)} adds their seal.` }, pending);
  }

  // headcount (same rule as the server: capped at fellowship size, gatherings forgive one absentee in groups of 4+)
  const size = mock.members.length;
  let need = Math.min(mission.required_members, size);
  if (mission.type === 'gathering' && size >= 4) need -= 1;
  if (participants.length < Math.max(1, need)) {
    return nope(`This one needs ${need} heroes. Tap the crests of the friends who did it with you (${participants.length}/${need}).`, 'not_enough_members');
  }

  // GPS gate, same rule as the server (missions whose place has lat/lng need you within ~400 m). 'dev' skips it.
  const geo: GeoResult = req.proof_text === 'dev' ? { ok: true } : checkGeo(mission.place, req);
  if (!geo.ok) return respond({ pass: false, confidence: 1, reason: geo.reason, flavor_text: geo.flavor, ...(geo.distance_m != null ? { distance_m: geo.distance_m } : {}) }, mission);

  let verdict: Verdict;
  if (req.proof_text === 'dev') {
    // Mock-only escape hatch for dev buttons: always passes, whatever the proof type.
    verdict = { pass: true, confidence: 1, reason: 'dev', flavor_text: 'The Magic Mirror nods. Your proof is true!', lens_titles: mission.proof_type.includes('photo') ? MOCK_LENS : undefined };
  } else if (mission.proof_type === 'answer') {
    const given = (req.proof_text ?? '').trim();
    if (!given) return nope('The riddle taps its foot, waiting. Type your best guess!', 'empty');
    // Fixture riddle (m-5) is the UT Tower; UT demo riddles use their real answers; others accept anything 3+ letters.
    const norm = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\b(a|an|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
    const ok = mission.id === 'm-5' ? /tower/i.test(given)
      : mockAnswers[mission.id] ? mockAnswers[mission.id].split('|').some((a) => norm(a) === norm(given))
      : given.length >= 3;
    if (!ok) return nope(`"${given.slice(0, 40)}"? The lock doesn't budge. ${mission.id === 'm-5' ? 'Hint: it glows orange after victories.' : 'Read the riddle once more, slowly. The answer is nearby.'}`, 'mismatch');
    verdict = { pass: true, confidence: 1, reason: 'exact', flavor_text: 'Correct! The lock clicks open and looks a little embarrassed.' };
  } else if (mission.proof_type === 'photo' || mission.proof_type === 'group_photo') {
    if (!req.proof_url) return nope('The Magic Mirror needs a photo. It is a mirror, after all! Snap one and try again.', 'no_photo');
    verdict = { pass: true, confidence: 0.92, reason: 'mock', flavor_text: 'The Magic Mirror nods. Your proof is true!', lens_titles: MOCK_LENS };
  } else {
    if (!req.proof_text?.trim()) return nope('The page is blank! Even Sage needs a few words to work with. Try again.', 'no_text');
    verdict = { pass: true, confidence: 0.8, reason: 'mock', flavor_text: 'The ink accepts your words. Sage may borrow them for a sequel.' };
  }

  if (geo.ok && geo.distance_m != null) verdict = { ...verdict, distance_m: geo.distance_m };
  const heroes = participants.map((id) => mock.profiles.find((p) => p.id === id)).filter(Boolean).map((p) => `${p!.display_name} the ${p!.crest}`);
  const who = heroes.length > 1 ? `${heroes.slice(0, -1).join(', ')} and ${heroes[heroes.length - 1]}` : heroes[0];
  const firstLine = mission.type === 'bard' ? (req.proof_text ?? '').split('\n').map((l) => l.trim()).find(Boolean) : undefined;
  const line = firstLine
    ? `${who} sang for "${mission.title}": “${firstLine.slice(0, 110)}”`
    : `${who} completed "${mission.title}"${mission.place ? ` at ${mission.place.title}` : ''}, and the page drank in the color.`;
  if (req.proof_url) {
    addMemory({ fellowship_id: mission.fellowship_id, storyline_id: mission.storyline_id, page_id: mission.page_id, mission_id: mission.id, user_id: ME, image_url: req.proof_url, caption: line, kind: 'photo' });
  }
  const completion = addCompletion({ mission_id: mission.id, user_id: ME, participant_ids: participants, proof_url: req.proof_url ?? null, proof_text: req.proof_text ?? null, verdict, story_line: line });
  const { done, pageCompleted, bookCompleted } = complete(mission, participants, line);
  emitMock();
  return respond(verdict, done, { page_completed: pageCompleted, book_completed: bookCompleted, completion });
}

function complete(mission: Mission, credited: string[], line: string) {
  const painter = mock.profiles.find((p) => p.id === credited[0]) ?? mock.profiles[0];
  const done = patchMission(mission.id, { status: 'complete', completed_by: credited, completed_at: new Date().toISOString(), story_line: line })!;
  addMessage({ fellowship_id: mission.fellowship_id, user_id: null, kind: 'proclamation', body: `Hear ye! ${line}`,
    payload: { event: 'mission_complete', mission_id: mission.id, region_id: mission.region_id, color: painter.color, user_id: painter.id } });
  const { pageCompleted, bookCompleted } = advanceIfPageDone(mission.page_id);
  return { done, pageCompleted, bookCompleted };
}

/** Mock trial answers for books built in mock mode (the UT demo). Server keeps these in mission_secrets. */
const mockAnswers: Record<string, string> = {};

/** Mock UT demo: "The Legend of the Forty Acres" with the same verified places (GPS gate applies in mock too). */
function mockUTBook(difficulty: Difficulty): string {
  const prev = mock.storyline;
  if (prev && prev.status !== 'complete') {
    const done = mock.missions.filter((m) => m.storyline_id === prev.id && m.status === 'complete').length;
    const total = mock.missions.filter((m) => m.storyline_id === prev.id).length;
    const recap = { ...MOCK_RECAP, summary: `"${prev.title}" was set aside with ${done} of ${total} regions colored. Sage tucked a bookmark in it, just in case.`, abandoned: true };
    mock.books = mock.books.map((b) => (b.id === prev.id ? { ...b, status: 'complete', recap } : b));
  }
  const { storyline, pages, missions, answers } = utMockBook(mock.fellowship.id, (prev?.book_number ?? 0) + 1, difficulty);
  Object.assign(mockAnswers, answers);
  addBook(storyline, pages, missions);
  addMessage({ fellowship_id: mock.fellowship.id, user_id: null, kind: 'proclamation',
    body: `Hear ye! Sage has written a new tale: "${storyline.title}". Chapter I: ${pages[0].title} awaits. Hook ’em, heroes.`,
    payload: { event: 'storyline_ready', storyline_id: storyline.id } });
  emitMock();
  return storyline.id;
}

/** Mock first summon (from the empty state): the fixture book, as if any member had just summoned it. */
function mockFirstBook(): string {
  restoreDemoBook();
  const book = mock.storyline!;
  addMessage({ fellowship_id: mock.fellowship.id, user_id: null, kind: 'proclamation',
    body: `Hear ye! Sage has written a new tale: "${book.title}". Chapter I awaits.`, payload: { event: 'storyline_ready', storyline_id: book.id } });
  emitMock();
  return book.id;
}

/**
 * Mock sequel / replacement: a fresh copy of the current book's pages/missions, all reset, as Book N+1.
 * `abandonCurrent` shelves the current book unfinished (recap.abandoned), like the server's replace_active.
 */
function mockSequel(difficulty: Difficulty = 'normal', abandonCurrent = false): string {
  const prev = mock.storyline!;
  const n = prev.book_number + 1;
  const sid = `s-${n}-${Date.now().toString(36)}`;
  const book: Storyline = { ...prev, id: sid, book_number: n, status: 'active', recap: null, difficulty, created_at: new Date().toISOString(),
    title: 'The Clockwork Owl of Austin',
    synopsis: 'A clockwork owl is stealing the songs of Austin, one by one. The fellowship that once lit the lanterns must win the music back.' };
  const prevPages = mock.pages.filter((p) => p.storyline_id === prev.id).sort((a, b) => a.chapter_number - b.chapter_number);
  const pages: Page[] = prevPages.map((p, i) => ({ ...p, id: `${sid}-p${i + 1}`, storyline_id: sid, status: i === 0 ? 'active' : 'locked', illustration_url: null, completed_at: null }));
  const pageId = new Map(prevPages.map((p, i) => [p.id, pages[i].id]));
  const missions: Mission[] = mock.missions.filter((m) => m.storyline_id === prev.id).map((m) => {
    const pid = pageId.get(m.page_id)!;
    const tpl = prevPages.find((p) => p.id === m.page_id)?.template_id ?? 'castle_gate';
    const size = TEMPLATES[tpl].regions.find((r) => r.id === m.region_id)?.size ?? 'small';
    return { ...m, id: `${sid}-${m.id}`, page_id: pid, storyline_id: sid, status: pid === pages[0].id ? 'open' : 'locked', completed_by: [], completed_at: null, story_line: null, points: missionPoints(size, difficulty) };
  });
  if (prev.status !== 'complete') {
    const done = mock.missions.filter((m) => m.storyline_id === prev.id && m.status === 'complete').length;
    const total = mock.missions.filter((m) => m.storyline_id === prev.id).length;
    const recap: BookRecap & { abandoned?: boolean } = abandonCurrent
      ? { ...MOCK_RECAP, summary: `"${prev.title}" was set aside with ${done} of ${total} regions colored. Sage tucked a bookmark in it, just in case.`, abandoned: true }
      : MOCK_RECAP;
    mock.books = mock.books.map((b) => (b.id === prev.id ? { ...b, status: 'complete', recap } : b));
  }
  addBook(book, pages, missions);
  addMessage({ fellowship_id: mock.fellowship.id, user_id: null, kind: 'proclamation',
    body: `Hear ye! Sage has written a new tale: "${book.title}". Chapter I: ${pages[0]?.title ?? ''} awaits. Sage noticed you love Duets and Riddles, so this book has more of them.`,
    payload: { event: 'storyline_ready', storyline_id: sid } });
  emitMock();
  return sid;
}
