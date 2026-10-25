// Owner: EV. GPS math + the "are you there?" rule (E3). Pure TypeScript with NO imports so the edge functions
// (submit-proof) and the app's mock engine (lib/api.ts) gate place missions exactly the same way.

export const GEO_DEFAULT_RADIUS_M = 400;
export const GEO_SLACK_MAX_M = 150;

export function isCoord(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** Great-circle distance in meters. */
export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km (${(m / 1609.34).toFixed(1)} mi)`;
}

export type GeoResult = { ok: true; distance_m?: number } | { ok: false; reason: 'no_location' | 'too_far'; flavor: string; distance_m?: number };

/**
 * A mission whose place has coordinates needs the submitter within `radiusM` (+ their GPS accuracy, max 150 m slack).
 * Missions without a located place always pass. `force` (DEMO_FORCE_PASS) passes but still reports the distance.
 */
export function checkGeo(
  place: { title: string; lat?: number; lng?: number } | null | undefined,
  fix: { lat?: number; lng?: number; accuracy_m?: number },
  radiusM = GEO_DEFAULT_RADIUS_M,
  force = false,
): GeoResult {
  if (!place || !isCoord(place.lat, place.lng)) return { ok: true };
  const distance_m = isCoord(fix.lat, fix.lng) ? Math.round(haversineM(fix.lat, fix.lng!, place.lat, place.lng!)) : undefined;
  if (force) return { ok: true, distance_m };
  if (distance_m == null) {
    return {
      ok: false, reason: 'no_location',
      flavor: `Sage's map can't find you! This quest happens at ${place.title}. Turn on location for Questbound and try again from there.`,
    };
  }
  const acc = Number(fix.accuracy_m);
  const slack = Number.isFinite(acc) && acc > 0 ? Math.min(acc, GEO_SLACK_MAX_M) : 0;
  if (distance_m <= radiusM + slack) return { ok: true, distance_m };
  const walkMin = Math.max(1, Math.round((distance_m - radiusM) / 80)); // ~80 m per minute of strolling
  return {
    ok: false, reason: 'too_far', distance_m,
    flavor: distance_m > 20_000
      ? `You're ${fmtDistance(distance_m)} from ${place.title}. Even dragons fly less than that! Head over there and try again.`
      : `You're about ${fmtDistance(distance_m)} from ${place.title}, roughly a ${walkMin}-minute stroll. ` +
        `${place.title} won't come to you (Sage asked politely). Get closer and try again!`,
  };
}
