/**
 * MAPS LINKS — infra (merge agent owned). Every "Open in Maps" / place tap calls openInMaps(place).
 * iOS → Apple Maps; Android / web → Google Maps. A place's website is never the maps action.
 */
import { Linking, Platform } from 'react-native';
import type { Place } from '@/shared/types';

export type MapsPlace = Pick<Place, 'title'> & Partial<Pick<Place, 'address' | 'lat' | 'lng'>>;

function coords(place: MapsPlace): { lat: number; lng: number } | null {
  const { lat, lng } = place;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null; // "null island" = missing data
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function searchText(place: MapsPlace): string {
  return [place.title, place.address].map((s) => (s ?? '').trim()).filter(Boolean).join(', ');
}

/** Google Maps web URL — works on every platform (also the fallback). */
export function googleMapsUrl(place: MapsPlace): string {
  const c = coords(place);
  const query = c ? `${c.lat},${c.lng}` : encodeURIComponent(searchText(place));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Apple Maps URL (iOS). */
export function appleMapsUrl(place: MapsPlace): string {
  const c = coords(place);
  if (c) return `http://maps.apple.com/?q=${encodeURIComponent(place.title?.trim() || 'Quest')}&ll=${c.lat},${c.lng}`;
  return `http://maps.apple.com/?q=${encodeURIComponent(searchText(place))}`;
}

/** Prefers lat/lng, else title + address. Apple Maps on iOS, Google Maps elsewhere. */
export function mapsUrl(place: MapsPlace): string {
  return Platform.OS === 'ios' ? appleMapsUrl(place) : googleMapsUrl(place);
}

/** Opens the place in the native maps app; falls back to Google Maps on the web. Resolves false if nothing opened. */
export async function openInMaps(place: MapsPlace | null | undefined): Promise<boolean> {
  if (!place || (!coords(place) && !searchText(place))) return false;
  try {
    await Linking.openURL(mapsUrl(place));
    return true;
  } catch {
    try {
      await Linking.openURL(googleMapsUrl(place));
      return true;
    } catch {
      return false;
    }
  }
}
