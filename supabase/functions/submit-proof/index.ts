// Owner: EV. POST SubmitProofRequest -> SubmitProofResponse. Spec: handoffs/EV.md Task 3. Budget < 15 s.
// A failed verification is NOT an HTTP error: it returns 200 with verdict.pass=false and Muse's flavor_text.
// HTTP errors are reserved for auth / bad input / missing rows.
//
// Gift flow (proof_type 'confirm'):
//   1. giver submits { mission_id, participant_ids:[giver], confirm_for: <recipient id> }
//      -> mission 'pending', verdict.pass=true (reason 'gift_pending'), completion null, proclamation "awaiting seal".
//   2. recipient submits { mission_id, participant_ids:[recipient], confirm_for: <giver id> }
//      -> mission 'complete', painted in the GIVER's crayon.
import { preflight, json, fail } from '../_shared/cors.ts';
import { admin, callerId, DEMO_FORCE_PASS, proclaim } from '../_shared/db.ts';
import { chatJSON, HAS_LLM, withTimeout } from '../_shared/llm.ts';
import { lensTitles, resetSerpStats } from '../_shared/serp.ts';
import { checkGeo, GEO_DEFAULT_RADIUS_M } from '../_shared/geo.ts';
import { answerJudgeUser, storyLineFor, verifierSystem, verifierUser } from '../_shared/prompts.ts';
import {
  announceBook, answerMatches, background, buildRecap, effectiveRequired, fallbackStoryLine, paintChapter,
  paintMontage, roman,
} from '../_shared/progress.ts';
import {
  type Completion, memberCtx, type MemberCtx, type Mission, type Page, type Profile, type SubmitProofRequest,
  type Verdict,
} from '../_shared/types.ts';

const BUDGET_MS = 14_000;
// E3 GPS gate: a mission whose place has coordinates needs the submitter within this many meters
// (+ their reported GPS accuracy, up to 150 m of slack). Secret GEO_RADIUS_M, default 400.
const GEO_RADIUS_M = Math.max(50, Number(Deno.env.get('GEO_RADIUS_M') ?? '') || GEO_DEFAULT_RADIUS_M);

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const t0 = Date.now();
  const left = () => BUDGET_MS - (Date.now() - t0);
  resetSerpStats();

  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);
  const body = (await req.json().catch(() => ({}))) as Partial<SubmitProofRequest>;
  if (!body.mission_id) return fail('mission_id required');

  // 1. load
  const { data: mission } = await admin.from('missions').select('*').eq('id', body.mission_id).maybeSingle<Mission>();
  if (!mission) return fail('That mission has vanished from the book. Pull to refresh.', 404);
  const [{ data: secret }, { data: page }, { data: storyline }, { data: memberRows }] = await Promise.all([
    admin.from('mission_secrets').select('*').eq('mission_id', mission.id).maybeSingle(),
    admin.from('pages').select('*').eq('id', mission.page_id).single<Page>(),
    admin.from('storylines').select('id, title, synopsis, status, generation_context').eq('id', mission.storyline_id).single(),
    admin.from('fellowship_members').select('user_id, profile:profiles(*)').eq('fellowship_id', mission.fellowship_id),
  ]);
  const members: MemberCtx[] = (memberRows ?? [])
    .map((r: { profile: Profile | Profile[] | null }) => (Array.isArray(r.profile) ? r.profile[0] : r.profile))
    .filter((p: Profile | null): p is Profile => !!p)
    .map(memberCtx);
  const me = members.find((m) => m.user_id === uid);
  if (!me) return fail('Only members of this fellowship can submit proof.', 403);
  if (!page || !storyline) return fail('This page is missing. Pull to refresh.', 404);
  if (storyline.status !== 'active') {
    return json({
      verdict: { pass: false, confidence: 1, reason: 'book_shelved', flavor_text: 'This book is on the shelf now. Its missions rest. Open the current book to keep coloring!' },
      mission, completion: null, page_completed: false, book_completed: false,
    });
  }

  const respond = (verdict: Verdict, m: Mission, completion: Completion | null = null, page_completed = false, book_completed = false) =>
    json({ verdict, mission: m, completion, page_completed, book_completed });
  const nope = (flavor_text: string, reason: string, extra: Partial<Verdict> = {}) =>
    respond({ pass: false, confidence: 1, reason, flavor_text, ...extra }, mission);

  if (mission.status === 'complete') return nope('This region is already colored! Pick another glowing spot on the page.', 'already_complete');
  if (mission.status === 'locked') return nope('This chapter is still sealed. Finish the current page to turn to it.', 'locked');

  // 2. participants (members only, caller always included)
  const memberIds = new Set(members.map((m) => m.user_id));
  const participants = [...new Set([uid, ...(body.participant_ids ?? [])])].filter((id) => memberIds.has(id));
  const proof_text = typeof body.proof_text === 'string' ? body.proof_text.trim().slice(0, 2000) : '';
  const proof_url = typeof body.proof_url === 'string' && /^https?:\/\//.test(body.proof_url) ? body.proof_url : '';

  // ---------------------------------------------------------------- gift
  if (mission.proof_type === 'confirm') {
    const pending = (secret?.pending_payload ?? null) as { giver: string; recipient: string } | null;
    const name = (id: string) => members.find((m) => m.user_id === id)?.name ?? 'a friend';
    if (mission.status === 'open') {
      const recipient = body.confirm_for ?? participants.find((p) => p !== uid);
      if (!recipient || recipient === uid || !memberIds.has(recipient)) {
        return nope('A gift needs a recipient! Choose which friend you surprised.', 'no_recipient');
      }
      const { data: updated } = await admin.from('missions').update({ status: 'pending' })
        .eq('id', mission.id).eq('status', 'open').select('*').maybeSingle<Mission>();
      if (!updated) return nope('Someone else is already sending a gift for this one. Check the chat!', 'race');
      await admin.from('mission_secrets').upsert({ mission_id: mission.id, pending_payload: { giver: uid, recipient } });
      await proclaim(mission.fellowship_id, `${me.name} sent a gift to ${name(recipient)}! Awaiting their seal.`, null, 'system');
      return respond({
        pass: true, confidence: 1, reason: 'gift_pending',
        flavor_text: `Your gift is on its way! The region colors the moment ${name(recipient)} adds their seal.`,
      }, updated);
    }
    // status 'pending': only the recipient can seal it
    if (!pending) return nope('This gift lost its ribbon. Ask the giver to send it again.', 'no_pending');
    if (uid !== pending.recipient) {
      return nope(uid === pending.giver
        ? `Patience! Only ${name(pending.recipient)} can seal this gift.`
        : `This gift is for ${name(pending.recipient)}. Only they can seal it.`, 'not_recipient');
    }
    if (body.confirm_for && body.confirm_for !== pending.giver) return nope(`This gift came from ${name(pending.giver)}. Seal theirs!`, 'wrong_giver');
    const verdict: Verdict = { pass: true, confidence: 1, reason: 'gift_confirmed', flavor_text: `Sealed with gratitude! ${name(pending.giver)}'s kindness colors the page.` };
    return await complete(verdict, [pending.giver, pending.recipient], pending.giver);
  }

  if (mission.status === 'pending') return nope('This mission is waiting on a friend. Check the chat!', 'pending');

  // ---------------------------------------------------------------- headcount
  const need = effectiveRequired(mission, members.length);
  if (participants.length < need) {
    return nope(
      need >= members.length
        ? `This one needs the whole fellowship! Tap everyone's crest who's with you (${participants.length}/${need}).`
        : `This one needs ${need} heroes. Tap the crests of the friends who did it with you (${participants.length}/${need}).`,
      'not_enough_members',
    );
  }

  // ---------------------------------------------------------------- GPS (place missions)
  const geo = checkGeo(mission.place, body, GEO_RADIUS_M, DEMO_FORCE_PASS);
  if (!geo.ok) return nope(geo.flavor, geo.reason, geo.distance_m != null ? { distance_m: geo.distance_m } : {});

  // ---------------------------------------------------------------- verify
  let verdict: Verdict;
  switch (mission.proof_type) {
    case 'answer':
      verdict = await verifyAnswer(mission, secret?.trial_answer ?? null, proof_text);
      break;
    case 'photo':
    case 'group_photo':
      if (!proof_url) return nope('The Magic Mirror needs a photo! Snap one and try again.', 'no_photo');
      verdict = await verifyPhoto(mission, proof_url, mission.proof_type === 'group_photo' ? need : undefined, left);
      break;
    default: // text, voice
      if (!proof_text) return nope('The page is blank! Write a few words and try again.', 'no_text');
      verdict = await verifyText(mission, proof_text, left);
  }
  if (geo.distance_m != null) verdict = { ...verdict, distance_m: geo.distance_m };
  if (!verdict.pass) return respond(verdict, mission);
  return await complete(verdict, participants, uid);

  // ---------------------------------------------------------------- on pass
  async function complete(v: Verdict, credited: string[], painter: string): Promise<Response> {
    const heroes = credited.map((id) => members.find((m) => m.user_id === id)).filter((m): m is MemberCtx => !!m);
    const story_line = await writeStoryLine(mission!, heroes, page!, proof_text, v.lens_titles, left);
    const now = new Date().toISOString();
    // Conditional update = only one submission can color a region, even if two phones race.
    const { data: done } = await admin.from('missions').update({
      status: 'complete', completed_by: credited, completed_at: now, story_line,
    }).eq('id', mission!.id).in('status', ['open', 'pending']).select('*').maybeSingle<Mission>();
    if (!done) return nope('A friend just colored this region a moment before you! Pick another.', 'race');

    const { data: completion } = await admin.from('completions').insert({
      mission_id: mission!.id, user_id: uid, participant_ids: credited, proof_url: proof_url || null,
      proof_text: proof_text || null, verdict: v, story_line,
    }).select('*').single<Completion>();
    if (proof_url) {
      await admin.from('memories').insert({
        fellowship_id: mission!.fellowship_id, storyline_id: mission!.storyline_id, page_id: mission!.page_id,
        mission_id: mission!.id, user_id: uid, image_url: proof_url, caption: story_line, kind: 'photo',
      });
    }
    const color = members.find((m) => m.user_id === painter)?.color ?? me!.color;
    await proclaim(mission!.fellowship_id, `Hear ye! ${story_line}`, {
      event: 'mission_complete', mission_id: mission!.id, region_id: mission!.region_id, color, user_id: painter,
    });

    // page check
    const { count: openLeft } = await admin.from('missions').select('id', { count: 'exact', head: true })
      .eq('page_id', page!.id).neq('status', 'complete');
    let page_completed = false;
    let book_completed = false;
    if ((openLeft ?? 0) === 0) {
      const { data: closed } = await admin.from('pages').update({ status: 'complete', completed_at: now })
        .eq('id', page!.id).eq('status', 'active').select('*').maybeSingle<Page>();
      if (closed) {
        page_completed = true;
        const { data: next } = await admin.from('pages').select('*').eq('storyline_id', page!.storyline_id)
          .eq('chapter_number', page!.chapter_number + 1).maybeSingle<Page>();
        if (next) {
          await admin.from('missions').update({ status: 'open' }).eq('page_id', next.id).eq('status', 'locked');
          await admin.from('pages').update({ status: 'active' }).eq('id', next.id);
          await proclaim(mission!.fellowship_id,
            `Chapter ${roman(page!.chapter_number)} is fully colored! The page turns… Chapter ${roman(next.chapter_number)}: ${next.title} begins.`,
            { event: 'page_complete', page_id: page!.id, storyline_id: page!.storyline_id });
        } else {
          book_completed = true;
          await proclaim(mission!.fellowship_id, `Chapter ${roman(page!.chapter_number)} is fully colored! The final page turns…`,
            { event: 'page_complete', page_id: page!.id, storyline_id: page!.storyline_id });
          const recap = await buildRecap(storyline!, members, Math.max(2_000, left() - 500));
          await admin.from('storylines').update({ status: 'complete', recap }).eq('id', storyline!.id);
          await announceBook(mission!.fellowship_id, storyline!.id, storyline!.title, recap);
          background(paintMontage(storyline!.id, mission!.fellowship_id, members));
        }
        background(paintChapter(closed, mission!.fellowship_id, members));
      }
    }
    console.log('[submit-proof]', JSON.stringify({ mission: mission!.id, type: mission!.type, pass: true, page_completed, book_completed, ms: Date.now() - t0 }));
    return respond(v, done, completion ?? null, page_completed, book_completed);
  }
});

// ---------------------------------------------------------------- verifiers

async function verifyAnswer(mission: Mission, answer: string | null, given: string): Promise<Verdict> {
  if (!given) return { pass: false, confidence: 1, reason: 'empty', flavor_text: 'The riddle waits for an answer. Type your best guess!' };
  if (DEMO_FORCE_PASS) return { pass: true, confidence: 1, reason: 'demo_force_pass', flavor_text: 'Correct! The lock clicks open.' };
  if (!answer) return { pass: true, confidence: 0.5, reason: 'no_answer_on_file', flavor_text: 'The riddle-keeper shrugs and lets you pass. Well argued!' };
  if (answerMatches(given, answer)) return { pass: true, confidence: 1, reason: 'exact', flavor_text: 'Correct! The lock clicks open.' };
  if (HAS_LLM) {
    const r = await withTimeout(
      chatJSON<{ pass?: boolean; flavor_text?: string }>(
        [{ role: 'user', content: answerJudgeUser(mission.trial_question ?? '', answer.split('|')[0], given) }],
        { temperature: 0.2, timeoutMs: 6_000 },
      ),
      6_500, null, 'answer-judge',
    );
    if (r && typeof r.pass === 'boolean') {
      return {
        pass: r.pass, confidence: 0.8, reason: r.pass ? 'llm_accepted' : 'llm_rejected',
        flavor_text: typeof r.flavor_text === 'string' && r.flavor_text ? r.flavor_text : r.pass ? 'Close enough! The lock clicks open.' : 'Not quite. Read the riddle once more, slowly.',
      };
    }
  }
  return { pass: false, confidence: 0.9, reason: 'mismatch', flavor_text: `"${given.slice(0, 40)}"? The lock doesn't budge. Read the riddle once more, slowly.` };
}

async function verifyPhoto(mission: Mission, url: string, expectedPeople: number | undefined, left: () => number): Promise<Verdict> {
  // Lens runs alongside; we give it a head start so the vision call can use its titles.
  let lens: string[] = [];
  const lensP = withTimeout(lensTitles(url, 8, 8_000), DEMO_FORCE_PASS ? 4_000 : 8_000, [] as string[], 'lens')
    .then((t) => (lens = t));
  if (DEMO_FORCE_PASS) {
    await lensP;
    return { pass: true, confidence: 1, reason: 'demo_force_pass', flavor_text: 'The Magic Mirror gleams. Your proof is true!', lens_titles: lens };
  }
  await Promise.race([lensP, new Promise((r) => setTimeout(r, 4_500))]);
  if (!HAS_LLM) {
    await Promise.race([lensP, new Promise((r) => setTimeout(r, Math.max(0, left() - 6_000)))]);
    return { pass: true, confidence: 0.5, reason: 'vision_unavailable', flavor_text: 'The Mirror is foggy today, but it trusts you. Onward!', lens_titles: lens };
  }
  const visionMs = Math.max(4_000, Math.min(8_000, left() - 4_000));
  const v = await withTimeout(
    chatJSON<Partial<Verdict>>([
      { role: 'system', content: verifierSystem },
      { role: 'user', content: verifierUser({ mission, proof_url: url, lens_titles: lens, expected_people: expectedPeople }) },
    ], { temperature: 0.3, timeoutMs: visionMs }),
    visionMs + 500, null, 'vision',
  );
  if (!lens.length) await Promise.race([lensP, new Promise((r) => setTimeout(r, 300))]);
  if (!v || typeof v.pass !== 'boolean') {
    return { pass: true, confidence: 0.5, reason: 'vision_failed', flavor_text: 'The Mirror is foggy today, but it trusts you. Onward!', lens_titles: lens };
  }
  return {
    pass: v.pass,
    confidence: clamp01(v.confidence, v.pass ? 0.8 : 0.3),
    reason: typeof v.reason === 'string' ? v.reason.slice(0, 300) : '',
    flavor_text: typeof v.flavor_text === 'string' && v.flavor_text ? v.flavor_text.slice(0, 300)
      : v.pass ? 'The Magic Mirror gleams. Your proof is true!' : `The Mirror squints… it can't find ${mission.verification_hint.toLowerCase() || 'the mission'} here. Try another photo!`,
    lens_titles: lens,
  };
}

async function verifyText(mission: Mission, text: string, left: () => number): Promise<Verdict> {
  const pass: Verdict = { pass: true, confidence: 0.7, reason: 'generous', flavor_text: 'The ink accepts your words. Beautifully put!' };
  if (DEMO_FORCE_PASS || !HAS_LLM) return pass;
  const ms = Math.max(3_000, Math.min(6_000, left() - 5_000));
  const v = await withTimeout(
    chatJSON<Partial<Verdict>>([
      { role: 'system', content: verifierSystem },
      { role: 'user', content: verifierUser({ mission, proof_text: text }) },
    ], { temperature: 0.3, timeoutMs: ms }),
    ms + 500, null, 'text-check',
  );
  if (!v || typeof v.pass !== 'boolean') return pass;
  return {
    pass: v.pass, confidence: clamp01(v.confidence, 0.7), reason: typeof v.reason === 'string' ? v.reason.slice(0, 300) : '',
    flavor_text: typeof v.flavor_text === 'string' && v.flavor_text ? v.flavor_text.slice(0, 300) : pass.flavor_text,
  };
}

async function writeStoryLine(mission: Mission, heroes: MemberCtx[], page: Page, proofText: string, lens: string[] | undefined, left: () => number): Promise<string> {
  const fallback = fallbackStoryLine(mission, heroes);
  if (!HAS_LLM) return fallback;
  const ms = Math.max(2_000, Math.min(5_000, left() - 2_500));
  const r = await withTimeout(
    chatJSON<{ story_line?: string }>([{ role: 'user', content: storyLineFor({ mission, heroes, proof_text: proofText, lens_titles: lens, chapterTitle: page.title }) }], { temperature: 0.9, timeoutMs: ms }),
    ms + 300, null, 'story-line',
  );
  const s = typeof r?.story_line === 'string' ? r.story_line.trim().replace(/^"|"$/g, '') : '';
  return s.length >= 10 ? s.slice(0, 300) : fallback;
}

function clamp01(v: unknown, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d;
}

