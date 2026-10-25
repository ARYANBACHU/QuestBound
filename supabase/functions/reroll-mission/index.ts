// Owner: EV. POST { mission_id, reason?, difficulty? } -> { mission, source: 'llm' | 'fallback' }
// difficulty is RELATIVE to the old mission: easy = easier, normal = similar, hard = harder (default easy: most
// rerolls are "this is too much today"). Points follow it: crew base × multiplier (_shared/points.ts).
// Sage swaps one OPEN mission for a fresh one on the same region (same size rules, same crew). Used by AB's wizard.
// Budget < 12 s; falls back to a handcrafted alternate if the LLM is slow, down or returns junk.
import { preflight, json, fail } from '../_shared/cors.ts';
import { admin, callerId, proclaim } from '../_shared/db.ts';
import { chatJSON, HAS_LLM, withTimeout } from '../_shared/llm.ts';
import { CHAPTER_SCHEMA, memberLines, placeLines, rerollTask, storylineSystem } from '../_shared/prompts.ts';
import { allowedTypes, alternateMission, PlacePicker, repairMission } from '../_shared/book.ts';
import { analyzeInterests } from '../_shared/interests.ts';
import { asDifficulty, crewOf, missionPoints } from '../_shared/points.ts';
import {
  memberCtx, type MemberCtx, type Mission, type Page, type Place, PROOF_FOR_TYPE, type Profile, TEMPLATE_REGIONS,
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);
  const body = await req.json().catch(() => ({}));
  if (!body.mission_id) return fail('mission_id required');
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 300) : undefined;
  const difficulty = asDifficulty(body.difficulty, 'easy');

  const { data: mission } = await admin.from('missions').select('*').eq('id', body.mission_id).maybeSingle<Mission>();
  if (!mission) return fail('That mission has vanished from the book. Pull to refresh.', 404);
  const [{ data: page }, { data: storyline }, { data: memberRows }] = await Promise.all([
    admin.from('pages').select('*').eq('id', mission.page_id).single<Page>(),
    admin.from('storylines').select('id, title, status, generation_context').eq('id', mission.storyline_id).single(),
    admin.from('fellowship_members').select('user_id, profile:profiles(*)').eq('fellowship_id', mission.fellowship_id),
  ]);
  const members: MemberCtx[] = (memberRows ?? [])
    .map((r: { profile: Profile | Profile[] | null }) => (Array.isArray(r.profile) ? r.profile[0] : r.profile))
    .filter((p: Profile | null): p is Profile => !!p)
    .map(memberCtx);
  if (!members.some((m) => m.user_id === uid)) return fail('Only members of this fellowship can ask Sage for a new mission.', 403);
  if (!page || !storyline) return fail('This page is missing. Pull to refresh.', 404);
  if (storyline.status !== 'active') return fail('That book is on the shelf now. Open the current one!', 409);
  if (mission.status !== 'open') {
    return fail(mission.status === 'complete' ? 'That region is already colored!' : mission.status === 'pending' ? 'A friend is mid-way through this one. Let them finish!' : 'That chapter is still sealed.', 409);
  }

  const size = TEMPLATE_REGIONS[page.template_id].find((r) => r.id === mission.region_id)?.size ?? 'small';
  // G1: a reroll keeps the region's crew (a trio stays a trio, a duet small stays a duet).
  const crew = mission.type === 'gathering' ? mission.required_members : Math.max(1, mission.required_members);
  const places: Place[] = Array.isArray(storyline.generation_context?.places) ? storyline.generation_context.places : [];
  const chapterIndex = page.chapter_number - 1;
  const interests = analyzeInterests(members);
  let draft = null;
  let source: 'llm' | 'fallback' = 'fallback';
  if (HAS_LLM) {
    const raw = await withTimeout(
      chatJSON<Record<string, unknown>>([
        { role: 'system', content: storylineSystem('first') },
        {
          role: 'user',
          content: `FELLOWSHIP:\n${memberLines(members, interests.unique)}\n\nREAL PLACES:\n${placeLines(places)}\n\n` +
            rerollTask({
              templateId: page.template_id, regionId: mission.region_id, size, allowedTypes: allowedTypes(size, crew), crew,
              old: mission, chapterTitle: page.title, bookTitle: storyline.title, reason, difficulty,
            }),
        },
      ], { temperature: 1.0, timeoutMs: 9_000, schema: CHAPTER_SCHEMA.properties.missions.items, schemaName: 'mission' }),
      9_500, null, 'reroll',
    );
    // Accept {missions:[...]} too, models love wrapping.
    const m = raw && Array.isArray((raw as { missions?: unknown[] }).missions) ? (raw as { missions: unknown[] }).missions[0] : raw;
    draft = m ? repairMission({ ...(m as object), region_id: mission.region_id }, page.template_id, mission.region_id, chapterIndex, { places, members, difficulty, crew: mission.type === 'gathering' ? undefined : crew }) : null;
    if (draft && draft.title.toLowerCase() === mission.title.toLowerCase()) draft = null;
    if (draft) source = 'llm';
  }
  if (!draft) {
    const picker = new PlacePicker(places);
    draft = alternateMission(page.template_id, mission.region_id, chapterIndex, mission.title, picker.pick('gathering'), Date.now(), difficulty, crew);
  }

  const { data: updated, error } = await admin.from('missions').update({
    title: draft.title, description: draft.description, story_hook: draft.story_hook, type: draft.type,
    proof_type: PROOF_FOR_TYPE[draft.type], required_members: draft.crew,
    assignee_ids: draft.type === 'gathering' ? [] : draft.assignee_ids.length ? draft.assignee_ids : mission.assignee_ids,
    place: draft.place, trial_question: draft.trial_question, verification_hint: draft.verification_hint, points: missionPoints(crewOf({ type: draft.type, required_members: draft.crew }), difficulty),
  }).eq('id', mission.id).eq('status', 'open').select('*').maybeSingle<Mission>();
  if (error || !updated) return fail('Sage tried, but the ink smudged. Try again in a moment.', 409);
  if (draft.type === 'trial' && draft.trial_answer) {
    await admin.from('mission_secrets').upsert({ mission_id: mission.id, trial_answer: draft.trial_answer, pending_payload: null });
  } else {
    await admin.from('mission_secrets').delete().eq('mission_id', mission.id);
  }
  const who = members.find((m) => m.user_id === uid)?.name ?? 'Someone';
  const how = difficulty === 'hard' ? 'a braver' : difficulty === 'normal' ? 'a different' : 'a gentler';
  await proclaim(mission.fellowship_id, `${who} asked Sage for ${how} quest. With a flick of the quill, "${mission.title}" became "${updated.title}".`, null, 'wizard');
  return json({ mission: updated, source });
});
