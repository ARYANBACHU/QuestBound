/**
 * UT DEMO (E6) — "The Legend of the Forty Acres": 4 chapters on real UT Austin landmarks, coordinates VERIFIED with
 * SerpApi google_maps (see `verified` on each place). The data lives in ONE place, shared with the edge function
 * (supabase/functions/_shared/ut-campus.ts, pure data, no imports); this file re-exports it for the app and builds the
 * mock-mode version of the book. Owner: EV.
 */
import { UT_BOOK, UT_CENTER, UT_GEO_ENFORCED, UT_PLACES, type UTPlace } from '@/supabase/functions/_shared/ut-campus';
import { crewOf, missionPoints } from '@/supabase/functions/_shared/points';
import { crewFor, crewWord } from '@/supabase/functions/_shared/fallbacks';
import { TEMPLATES } from '@/shared/templates';
import type { Difficulty, Mission, MissionType, Page, Place, ProofType, Storyline } from '@/shared/types';

const PROOF_FOR_TYPE: Record<MissionType, ProofType> = {
  gathering: 'group_photo', duet: 'photo', relic: 'photo', bard: 'text', trial: 'answer', gift: 'confirm',
};

export { UT_BOOK, UT_CENTER, UT_GEO_ENFORCED, UT_PLACES, type UTPlace };

/** A UT landmark as a mission Place (Google Maps link included; lib/maps.ts openInMaps opens the native app). */
export function utPlace(key: string): Place | null {
  const u = UT_PLACES[key];
  if (!u) return null;
  const maps_url = u.verified?.place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(u.title)}&query_place_id=${u.verified.place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${u.lat},${u.lng}`;
  return {
    title: u.title, address: u.address, lat: u.lat, lng: u.lng, category: u.category, maps_url, link: maps_url,
    source: u.verified ? 'google_maps' : 'manual', source_id: u.verified?.place_id,
  };
}

/** Mock mode: the whole UT book as rows (chapter I open, the rest locked). Trial answers stay out of the rows. */
export function utMockBook(fellowshipId: string, bookNumber: number, difficulty: Difficulty = 'normal', memberCount = 4): {
  storyline: Storyline; pages: Page[]; missions: Mission[]; answers: Record<string, string>;
} {
  const now = new Date().toISOString();
  const sid = `ut-${Date.now().toString(36)}`;
  const storyline: Storyline = {
    id: sid, fellowship_id: fellowshipId, book_number: bookNumber, title: UT_BOOK.title, synopsis: UT_BOOK.synopsis,
    theme_tags: UT_BOOK.theme_tags, status: 'active', difficulty, geo_enforced: UT_GEO_ENFORCED, recap: null, created_at: now,
  };
  const answers: Record<string, string> = {};
  const pages: Page[] = [];
  const missions: Mission[] = [];
  UT_BOOK.chapters.forEach((c, i) => {
    const pid = `${sid}-p${i + 1}`;
    pages.push({ id: pid, storyline_id: sid, chapter_number: i + 1, title: c.title, narrative: c.narrative, template_id: c.template_id,
      status: i === 0 ? 'active' : 'locked', illustration_url: null, completed_at: null });
    for (const m of c.missions) {
      const size = TEMPLATES[c.template_id].regions.find((r) => r.id === m.region_id)?.size ?? 'small';
      const id = `${pid}-${m.region_id}`;
      if (m.trial_answer) answers[id] = m.trial_answer;
      const crew = crewFor(size, m.crew, memberCount, m.type); // G1, same as the server
      missions.push({
        id, page_id: pid, storyline_id: sid, fellowship_id: fellowshipId, region_id: m.region_id, title: m.title,
        description: m.description.replace('{Crew}', crewWord(crew)), story_hook: m.story_hook, type: m.type, proof_type: PROOF_FOR_TYPE[m.type],
        required_members: crew, assignee_ids: [], place: m.place ? utPlace(m.place) : null,
        trial_question: m.trial_question ?? null, verification_hint: m.verification_hint, points: missionPoints(crewOf({ type: m.type, required_members: crew }), difficulty),
        status: i === 0 ? 'open' : 'locked', completed_by: [], completed_at: null, story_line: null, created_at: now,
      });
    }
  });
  return { storyline, pages, missions, answers };
}
