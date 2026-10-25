// Owner: EV. E6: build "The Legend of the Forty Acres" (generate-storyline demo: 'ut'). No LLM: instant and the
// riddles are hand-checked. Every landmark is looked up on SerpApi google_maps (cached like every Serp call);
// when SerpApi's pin agrees with ours (within UT_VERIFY_MAX_M) we use its exact coordinates + place_id.
import { type DraftBook, type DraftMission, ensureCoverage } from './book.ts';
import { withTimeout } from './llm.ts';
import { haversineM, isCoord } from './geo.ts';
import { crewOf, missionPoints, type PointsDifficulty } from './points.ts';
import { crewFor, crewWord } from './fallbacks.ts';
import { googleMapsLink, mapsSearch } from './serp.ts';
import { UT_BOOK, UT_CENTER, UT_PLACES, UT_VERIFY_MAX_M, type UTPlace } from './ut-campus.ts';
import type { MemberCtx, Place } from './types.ts';
import { TEMPLATE_REGIONS } from './types.ts';

export interface UTVerify {
  key: string;
  fixture: { lat: number; lng: number };
  serp: { title: string; lat: number; lng: number; place_id?: string } | null;
  delta_m: number | null;
  used: 'serpapi' | 'fixture';
}

function fixturePlace(u: UTPlace): Place {
  const p: Place = {
    title: u.title, address: u.address, lat: u.lat, lng: u.lng, category: u.category,
    ...(u.verified?.place_id ? { source: 'google_maps' as const, source_id: u.verified.place_id } : { source: 'manual' as const }),
  };
  p.maps_url = googleMapsLink(p);
  p.link = p.maps_url;
  return p;
}

/** Look every landmark up on Google Maps (SerpApi) in parallel; never slower than `timeoutMs`. */
export async function verifyUTPlaces(timeoutMs = 5_000): Promise<{ places: Record<string, Place>; verify: UTVerify[] }> {
  const keys = Object.keys(UT_PLACES);
  const results = await Promise.all(keys.map(async (key) => {
    const u = UT_PLACES[key];
    const hits = await withTimeout(mapsSearch(u.query, UT_CENTER.lat, UT_CENTER.lng, 3, 16), timeoutMs, [] as Place[], `ut:${key}`)
      .catch(() => [] as Place[]);
    // Closest of the top 3 results to our pin.
    let best: Place | null = null;
    let bestD = Infinity;
    for (const h of hits) {
      if (!isCoord(h.lat, h.lng)) continue;
      const d = haversineM(u.lat, u.lng, h.lat, h.lng!);
      if (d < bestD) { best = h; bestD = d; }
    }
    const agree = best && bestD <= UT_VERIFY_MAX_M;
    const v: UTVerify = {
      key, fixture: { lat: u.lat, lng: u.lng },
      serp: best ? { title: best.title, lat: best.lat!, lng: best.lng!, place_id: best.source_id } : null,
      delta_m: best ? Math.round(bestD) : null,
      used: agree ? 'serpapi' : 'fixture',
    };
    let place = fixturePlace(u);
    if (agree && best) {
      place = { ...place, lat: best.lat, lng: best.lng, rating: best.rating, thumbnail: best.thumbnail, website: best.website, source: 'google_maps', source_id: best.source_id };
      place.maps_url = googleMapsLink(place);
      place.link = place.maps_url;
    }
    return [key, place, v] as const;
  }));
  return {
    places: Object.fromEntries(results.map(([k, p]) => [k, p])),
    verify: results.map(([, , v]) => v),
  };
}

export function buildUTBook(places: Record<string, Place>, difficulty: PointsDifficulty, members: MemberCtx[]): { book: DraftBook; secrets: number } {
  let secrets = 0;
  const chapters = UT_BOOK.chapters.map((c, i) => {
    const missions: DraftMission[] = c.missions.map((m) => {
      const size = TEMPLATE_REGIONS[c.template_id].find((r) => r.id === m.region_id)!.size;
      if (m.type === 'trial') secrets++;
      const crew = crewFor(size, m.crew, members.length, m.type);
      return {
        region_id: m.region_id, type: m.type, title: m.title, description: m.description.replace('{Crew}', crewWord(crew)),
        story_hook: m.story_hook, place: m.place ? places[m.place] ?? null : null, assignee_ids: [],
        trial_question: m.trial_question ?? null, trial_answer: m.trial_answer ?? null,
        verification_hint: m.verification_hint, points: missionPoints(crewOf({ type: m.type, required_members: crew }), difficulty),
        crew, source: 'fallback',
      };
    });
    ensureCoverage(missions, members, {});
    return { chapter_number: i + 1, template_id: c.template_id, title: c.title, narrative: c.narrative, missions };
  });
  return { book: { title: UT_BOOK.title, synopsis: UT_BOOK.synopsis, theme_tags: UT_BOOK.theme_tags, chapters }, secrets };
}
