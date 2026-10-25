// Owner: AB. GPS for place missions: asks for location, watches it, and reports the distance to the place.
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Place } from '@/shared/types';

/** Matches the server's default GEO_RADIUS_M. */
export const CLOSE_RADIUS_M = 400;

export type ProximityStatus = 'off' | 'asking' | 'denied' | 'locating' | 'ready' | 'error';

export interface Proximity {
  status: ProximityStatus;
  coords: { lat: number; lng: number; accuracy_m?: number } | null;
  distance_m: number | null;
  close: boolean;
  retry: () => void;
}

export function hasCoords(place: Place | null | undefined): place is Place & { lat: number; lng: number } {
  return !!place && typeof place.lat === 'number' && typeof place.lng === 'number' && !(place.lat === 0 && place.lng === 0);
}

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "350 ft" / "1.2 mi" — our judges are in Texas. */
export function formatDistance(m: number): string {
  const ft = m * 3.28084;
  if (ft < 1000) return `${Math.max(10, Math.round(ft / 10) * 10)} ft`;
  const mi = m / 1609.34;
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}

export function useProximity(place: Place | null | undefined, enabled = true): Proximity {
  const target = hasCoords(place) ? { lat: place.lat, lng: place.lng } : null;
  const [status, setStatus] = useState<ProximityStatus>('off');
  const [coords, setCoords] = useState<Proximity['coords']>(null);
  const [attempt, setAttempt] = useState(0);
  const active = enabled && !!target;

  useEffect(() => {
    if (!active) { setStatus('off'); return; }
    let alive = true;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        setStatus('asking');
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!alive) return;
        if (!perm.granted) { setStatus('denied'); return; }
        setStatus('locating');
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 4000 },
          (pos) => {
            if (!alive) return;
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: pos.coords.accuracy ?? undefined });
            setStatus('ready');
          },
        );
        if (!alive) sub.remove();
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => { alive = false; sub?.remove(); };
  }, [active, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const distance_m = target && coords ? haversine(coords, target) : null;
  const slack = Math.min(coords?.accuracy_m ?? 0, 150);
  return { status, coords, distance_m, close: distance_m != null && distance_m <= CLOSE_RADIUS_M + slack, retry };
}
