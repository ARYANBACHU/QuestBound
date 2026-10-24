// Owner: EV. SerpApi client with a Postgres cache (table serp_cache). Secret: SERPAPI_KEY.
import { admin } from './db.ts';
import type { Place } from './types.ts';

const KEY = Deno.env.get('SERPAPI_KEY') ?? '';
const TTL_HOURS = 12;

async function hashKey(params: Record<string, string>): Promise<string> {
  const s = JSON.stringify(Object.keys(params).sort().map((k) => [k, params[k]]));
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const serpStats = { live: 0, cached: 0 };

export async function serp(params: Record<string, string>, opts: { cache?: boolean } = { cache: true }) {
  const key = await hashKey(params);
  if (opts.cache !== false) {
    const { data } = await admin.from('serp_cache').select('response, created_at, hits').eq('key', key).maybeSingle();
    if (data && Date.now() - new Date(data.created_at).getTime() < TTL_HOURS * 3600_000) {
      serpStats.cached++;
      admin.from('serp_cache').update({ hits: (data.hits ?? 0) + 1 }).eq('key', key).then(() => {});
      return data.response;
    }
  }
  const url = new URL('https://serpapi.com/search.json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('api_key', KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi ${res.status}: ${await res.text()}`);
  const json = await res.json();
  serpStats.live++;
  if (opts.cache !== false) {
    await admin.from('serp_cache').upsert({ key, engine: params.engine ?? 'unknown', response: json, hits: 0, created_at: new Date().toISOString() });
  }
  return json;
}

/** Google Maps local results near a point. */
export async function mapsSearch(q: string, lat: number, lng: number, limit = 6): Promise<Place[]> {
  const j = await serp({ engine: 'google_maps', type: 'search', q, ll: `@${lat},${lng},14z` });
  return (j.local_results ?? []).slice(0, limit).map((r: any): Place => ({
    title: r.title,
    address: r.address,
    lat: r.gps_coordinates?.latitude,
    lng: r.gps_coordinates?.longitude,
    rating: r.rating,
    category: r.type,
    thumbnail: r.thumbnail,
    link: r.website,
    source: 'google_maps',
    source_id: r.place_id,
  }));
}

/** Google Events (this week) for an area. */
export async function eventsSearch(q: string, limit = 6): Promise<Place[]> {
  const j = await serp({ engine: 'google_events', q, htichips: 'date:week' });
  return (j.events_results ?? []).slice(0, limit).map((e: any): Place => ({
    title: e.title,
    address: Array.isArray(e.address) ? e.address.join(', ') : e.address,
    when: e.date?.when ?? e.date?.start_date,
    thumbnail: e.thumbnail,
    link: e.link,
    category: 'event',
    source: 'google_events',
  }));
}

/** Google Lens on a PUBLIC image URL. Returns visual-match titles (used as verification evidence). */
export async function lensTitles(imageUrl: string, limit = 8): Promise<string[]> {
  const j = await serp({ engine: 'google_lens', url: imageUrl }, { cache: false });
  return (j.visual_matches ?? []).slice(0, limit).map((m: any) => m.title).filter(Boolean);
}
