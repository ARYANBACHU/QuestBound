// Owner: EV. SerpApi client with a Postgres cache (table serp_cache). Secret: SERPAPI_KEY.
// Engines used (serpapi.com docs): google_maps (type=search, q, ll=@lat,lng,zoom -> local_results[]),
// google_events (q, htichips=date:week -> events_results[]), google_lens (url -> visual_matches[]).
// Resilience: fresh cache (<12 h) -> live call (timeout) -> stale cache of any age -> throw.
import { admin } from './db.ts';
import type { Place } from './types.ts';

const KEY = Deno.env.get('SERPAPI_KEY') ?? '';
const TTL_HOURS = 12;
export const HAS_SERP = KEY.length > 0;

async function hashKey(params: Record<string, string>): Promise<string> {
  const s = JSON.stringify(Object.keys(params).sort().map((k) => [k, params[k]]));
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Live vs cached SerpApi calls. Module state survives between requests in one isolate, so reset per request. */
export const serpStats = { live: 0, cached: 0, stale: 0, failed: 0 };
export function resetSerpStats() {
  serpStats.live = 0; serpStats.cached = 0; serpStats.stale = 0; serpStats.failed = 0;
}
export function snapshotSerpStats() {
  return { ...serpStats };
}

// deno-lint-ignore no-explicit-any
export async function serp(params: Record<string, string>, opts: { cache?: boolean; timeoutMs?: number } = {}): Promise<any> {
  const useCache = opts.cache !== false;
  const key = await hashKey(params);
  // deno-lint-ignore no-explicit-any
  let stale: any = null;
  if (useCache) {
    const { data } = await admin.from('serp_cache').select('response, created_at, hits').eq('key', key).maybeSingle();
    if (data) {
      if (Date.now() - new Date(data.created_at).getTime() < TTL_HOURS * 3600_000) {
        serpStats.cached++;
        admin.from('serp_cache').update({ hits: (data.hits ?? 0) + 1 }).eq('key', key).then(() => {});
        return data.response;
      }
      stale = data.response;
    }
  }
  try {
    if (!HAS_SERP) throw new Error('SERPAPI_KEY not set');
    const url = new URL('https://serpapi.com/search.json');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('api_key', KEY);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10_000);
    let res: Response;
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) throw new Error(`SerpApi ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    if (json.error && !json.local_results && !json.events_results && !json.visual_matches) {
      // SerpApi returns 200 + {error:"Google hasn't returned any results"} for empty searches.
      console.warn('[serp]', params.engine, json.error);
    }
    serpStats.live++;
    if (useCache) {
      admin.from('serp_cache')
        .upsert({ key, engine: params.engine ?? 'unknown', response: json, hits: 0, created_at: new Date().toISOString() })
        .then(({ error }) => error && console.error('[serp cache]', error.message));
    }
    return json;
  } catch (e) {
    if (stale) {
      serpStats.stale++;
      console.warn('[serp] live failed, serving stale cache:', String(e));
      return stale;
    }
    serpStats.failed++;
    throw e;
  }
}

/** Google Maps local results near a point. */
export async function mapsSearch(q: string, lat: number, lng: number, limit = 6): Promise<Place[]> {
  // Round coords so nearby fellowships share cache entries (~1 km).
  const ll = `@${lat.toFixed(3)},${lng.toFixed(3)},14z`;
  const j = await serp({ engine: 'google_maps', type: 'search', q, ll });
  // deno-lint-ignore no-explicit-any
  return (j.local_results ?? []).slice(0, limit).map((r: any): Place => ({
    title: r.title,
    address: r.address,
    lat: r.gps_coordinates?.latitude,
    lng: r.gps_coordinates?.longitude,
    rating: r.rating,
    category: r.type ?? (Array.isArray(r.types) ? r.types[0] : undefined),
    thumbnail: r.thumbnail,
    link: r.website,
    source: 'google_maps',
    source_id: r.place_id,
  })).filter((p: Place) => !!p.title);
}

/** Google Events (this week) for an area. */
export async function eventsSearch(q: string, limit = 6): Promise<Place[]> {
  const j = await serp({ engine: 'google_events', q, htichips: 'date:week' });
  // deno-lint-ignore no-explicit-any
  return (j.events_results ?? []).slice(0, limit).map((e: any): Place => ({
    title: e.title,
    address: Array.isArray(e.address) ? e.address.join(', ') : e.address,
    when: e.date?.when ?? e.date?.start_date,
    thumbnail: e.thumbnail ?? e.image,
    link: e.link,
    category: 'event',
    source: 'google_events',
  })).filter((p: Place) => !!p.title);
}

/** Google Lens on a PUBLIC image URL. Returns visual-match titles (used as verification evidence). */
export async function lensTitles(imageUrl: string, limit = 8, timeoutMs = 8_000): Promise<string[]> {
  const j = await serp({ engine: 'google_lens', url: imageUrl }, { cache: false, timeoutMs });
  const titles: string[] = [];
  // knowledge_graph (when present) is the single best "what is this" answer — put it first.
  // deno-lint-ignore no-explicit-any
  const kg = Array.isArray(j.knowledge_graph) ? j.knowledge_graph : j.knowledge_graph ? [j.knowledge_graph] : [];
  // deno-lint-ignore no-explicit-any
  for (const k of kg as any[]) if (k?.title) titles.push(k.title);
  // deno-lint-ignore no-explicit-any
  for (const m of (j.visual_matches ?? []) as any[]) if (m?.title) titles.push(m.title);
  return Array.from(new Set(titles)).slice(0, limit);
}
