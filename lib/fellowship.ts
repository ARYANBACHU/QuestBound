// Owner: MP. The active fellowship + its members (with profiles).
// CONTRACT: keep these export names/signatures.
//
// Real mode: one module-level store shared by every component (useSyncExternalStore). It follows the
// signed-in user from `sessionStore`, resolves the active fellowship (AsyncStorage `qb.activeFellowship`,
// else the user's first membership) and keeps members live over Supabase Realtime.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { USE_MOCKS } from './env';
import { mock, emitMock, subscribeMock } from './mockStore';
import { supabase } from './supabase';
import { sessionStore } from './session';
import { CRESTS, DEFAULT_LOCATION } from '@/shared/theme';
import type { Fellowship, FellowshipMember, Profile } from '@/shared/types';

export interface FellowshipState {
  fellowship: Fellowship | null;
  members: FellowshipMember[]; // each has .profile populated
  loading: boolean;
  createFellowship: (name: string) => Promise<Fellowship>; // uses device location, falls back to DEFAULT_LOCATION
  joinByCode: (code: string) => Promise<Fellowship>;
  leave: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Helper used everywhere to render a member's crest/color/name. */
export function profileOf(members: FellowshipMember[], userId: string | null | undefined): Profile | undefined {
  return members.find((m) => m.user_id === userId)?.profile;
}

/** "Aria the Fox" — how proclamations and system lines name a hero. */
export function heroName(profile: Pick<Profile, 'display_name' | 'crest'> | null | undefined): string {
  if (!profile) return 'A wanderer';
  const crest = CRESTS[profile.crest]?.title;
  return crest ? `${profile.display_name} the ${crest}` : profile.display_name;
}

/** Uppercase, strip spaces/punctuation, and accept a full `questbound://join/CODE` link. */
export function normalizeInviteCode(raw: string): string {
  const s = raw.trim();
  const fromLink = s.match(/join\/([A-Za-z0-9]{4,12})/);
  return (fromLink ? fromLink[1] : s).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

const ACTIVE_KEY = 'qb.activeFellowship';
/** Joined before onboarding → announce once the hero has a name and crest. */
const PENDING_JOIN_KEY = 'qb.pendingJoinAnnounce';
const NOT_FOUND = 'No fellowship has that code. Check the letters and try again.';

// ---------------------------------------------------------------------------------------------------------
// Location → "City, ST"
// ---------------------------------------------------------------------------------------------------------
const US_STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

async function deviceLocation(): Promise<{ lat: number; lng: number; label: string }> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ...DEFAULT_LOCATION };
    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      8000,
    ).catch(() => Location.getLastKnownPositionAsync());
    if (!pos) return { ...DEFAULT_LOCATION };
    const { latitude: lat, longitude: lng } = pos.coords;
    let label: string = DEFAULT_LOCATION.label;
    try {
      const [addr] = await withTimeout(Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }), 5000);
      const city = addr?.city ?? addr?.subregion ?? addr?.district;
      const region = addr?.region ? (US_STATES[addr.region.toLowerCase()] ?? addr.region) : addr?.country;
      if (city) label = region ? `${city}, ${region}` : city;
    } catch {
      // keep the coords, default label
    }
    return { lat, lng, label };
  } catch {
    return { ...DEFAULT_LOCATION };
  }
}

// ---------------------------------------------------------------------------------------------------------
// Real store
// ---------------------------------------------------------------------------------------------------------
interface Snapshot {
  fellowship: Fellowship | null;
  members: FellowshipMember[];
  loading: boolean;
}

let snap: Snapshot = { fellowship: null, members: [], loading: true };
const listeners = new Set<() => void>();
let started = false;
let currentUid: string | null = null;
let channel: RealtimeChannel | null = null;
let extrasChannel: RealtimeChannel | null = null;
let resolveSeq = 0;

function setSnap(patch: Partial<Snapshot>) {
  snap = { ...snap, ...patch };
  listeners.forEach((fn) => fn());
}

async function fetchMembers(fellowshipId: string): Promise<FellowshipMember[]> {
  const { data, error } = await supabase
    .from('fellowship_members')
    .select('*, profile:profiles(*)')
    .eq('fellowship_id', fellowshipId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FellowshipMember[];
}

async function reloadMembers() {
  const f = snap.fellowship;
  if (!f) return;
  try {
    const members = await fetchMembers(f.id);
    if (snap.fellowship?.id === f.id) setSnap({ members });
  } catch (e) {
    console.warn('[fellowship] members reload failed', e);
  }
}

function unsubscribeRealtime() {
  if (channel) void supabase.removeChannel(channel);
  if (extrasChannel) void supabase.removeChannel(extrasChannel);
  channel = null;
  extrasChannel = null;
}

function subscribeRealtime(fellowshipId: string) {
  unsubscribeRealtime();
  const filter = `fellowship_id=eq.${fellowshipId}`;
  channel = supabase
    .channel(`fellowship:${fellowshipId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fellowship_members', filter }, () => void reloadMembers())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fellowship_members', filter }, () => void reloadMembers())
    // Realtime can't filter DELETEs; the old row carries the primary key (fellowship_id, user_id).
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fellowship_members' }, (p) => {
      if ((p.old as Partial<FellowshipMember>)?.fellowship_id === fellowshipId) void reloadMembers();
    })
    .subscribe((status) => {
      // (Re)connected → catch up on anyone who joined while we were away.
      if (status === 'SUBSCRIBED') void reloadMembers();
    });
  // Separate channel: `profiles`/`fellowships` aren't in the realtime publication until REQUESTS.md lands,
  // and a rejected table must not take the members channel down with it.
  extrasChannel = supabase
    .channel(`fellowship-extras:${fellowshipId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p) => {
      const updated = p.new as Profile;
      if (!snap.members.some((m) => m.user_id === updated.id)) return;
      setSnap({ members: snap.members.map((m) => (m.user_id === updated.id ? { ...m, profile: updated } : m)) });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fellowships', filter: `id=eq.${fellowshipId}` }, (p) => {
      if (snap.fellowship?.id === fellowshipId) setSnap({ fellowship: p.new as Fellowship });
    })
    .subscribe();
}

/** Load a fellowship + members and make it the active one. */
async function activate(fellowshipId: string | null) {
  const seq = ++resolveSeq;
  if (!fellowshipId) {
    unsubscribeRealtime();
    setSnap({ fellowship: null, members: [], loading: false });
    return;
  }
  const [{ data: f, error }, members] = await Promise.all([
    supabase.from('fellowships').select('*').eq('id', fellowshipId).maybeSingle(),
    fetchMembers(fellowshipId),
  ]);
  if (seq !== resolveSeq) return;
  if (error) throw error;
  if (!f) {
    setSnap({ fellowship: null, members: [], loading: false });
    return;
  }
  setSnap({ fellowship: f as Fellowship, members, loading: false });
  subscribeRealtime(fellowshipId);
}

/** Pick the active fellowship for this user: stored id if still a member, else the first membership. */
async function resolveActive(uid: string) {
  const seq = resolveSeq;
  setSnap({ loading: true });
  try {
    const { data: rows, error } = await supabase
      .from('fellowship_members')
      .select('fellowship_id, joined_at')
      .eq('user_id', uid)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.fellowship_id as string);
    const stored = await AsyncStorage.getItem(ACTIVE_KEY).catch(() => null);
    // A create/join finished while we were looking → it already activated the right fellowship.
    if (seq !== resolveSeq) return;
    const id = stored && ids.includes(stored) ? stored : (ids[0] ?? null);
    if (id !== stored) {
      if (id) await AsyncStorage.setItem(ACTIVE_KEY, id).catch(() => {});
      else await AsyncStorage.removeItem(ACTIVE_KEY).catch(() => {});
    }
    await activate(id);
  } catch (e) {
    console.warn('[fellowship] resolve failed', e);
    setSnap({ loading: false });
  }
}

function onSession() {
  const { userId, loading } = sessionStore.get();
  if (userId === currentUid) {
    if (!userId && !loading && snap.loading) setSnap({ loading: false });
    return;
  }
  currentUid = userId;
  if (!userId) {
    resolveSeq++;
    unsubscribeRealtime();
    setSnap({ fellowship: null, members: [], loading: loading });
    return;
  }
  void resolveActive(userId);
}

function start() {
  if (started || USE_MOCKS) return;
  started = true;
  sessionStore.subscribe(onSession);
  sessionStore.onProfileSaved((p) => void onProfileSaved(p));
  onSession();
}

async function setActive(id: string) {
  await AsyncStorage.setItem(ACTIVE_KEY, id).catch(() => {});
  await activate(id);
}

async function postSystem(fellowshipId: string, uid: string, body: string, payload: object | null) {
  const { error } = await supabase.from('messages').insert({ fellowship_id: fellowshipId, user_id: uid, kind: 'system', body, payload });
  if (error) console.warn('[fellowship] system message failed', error);
}

async function myProfile(uid: string): Promise<Profile | null> {
  const p = sessionStore.get().profile;
  if (p?.id === uid) return p;
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  return (data as Profile) ?? null;
}

async function createFellowshipReal(name: string): Promise<Fellowship> {
  const uid = await sessionStore.ensureSignedIn();
  const cleanName = name.trim() || 'The Lantern Fellowship';
  const loc = await deviceLocation();
  let f: Fellowship | null = null;
  for (let attempt = 0; attempt < 3 && !f; attempt++) {
    const { data, error } = await supabase
      .from('fellowships')
      .insert({ name: cleanName, created_by: uid, lat: loc.lat, lng: loc.lng, area_label: loc.label })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') continue; // invite code collision → the DB rolls a new one
      throw new Error(`Muse could not found your fellowship: ${error.message}. Try again.`);
    }
    f = data as Fellowship;
  }
  if (!f) throw new Error('Muse could not found your fellowship. Try again.');
  const { error: mErr } = await supabase.from('fellowship_members').insert({ fellowship_id: f.id, user_id: uid, role: 'founder' });
  if (mErr && mErr.code !== '23505') throw new Error(`Muse could not seat you in your fellowship: ${mErr.message}. Try again.`);
  await setActive(f.id);
  const me = await myProfile(uid);
  await postSystem(f.id, uid, `${heroName(me)} founded the fellowship.`, null);
  return f;
}

async function joinByCodeReal(raw: string): Promise<Fellowship> {
  const code = normalizeInviteCode(raw);
  if (code.length < 4) throw new Error(NOT_FOUND);
  const uid = await sessionStore.ensureSignedIn();
  const { data, error } = await supabase.from('fellowships').select('*').eq('invite_code', code).maybeSingle();
  if (error) throw new Error(`Muse could not read the code: ${error.message}. Check your connection and try again.`);
  if (!data) throw new Error(NOT_FOUND);
  const f = data as Fellowship;
  const { error: mErr } = await supabase.from('fellowship_members').insert({ fellowship_id: f.id, user_id: uid, role: 'member' });
  const alreadyMember = mErr?.code === '23505';
  if (mErr && !alreadyMember) throw new Error(`Muse could not open the gate: ${mErr.message}. Try again.`);
  await setActive(f.id);
  if (!alreadyMember) {
    const me = await myProfile(uid);
    if (me && !me.onboarded) await AsyncStorage.setItem(PENDING_JOIN_KEY, f.id).catch(() => {});
    else await announceJoin(f.id, uid, me);
  }
  return f;
}

async function announceJoin(fellowshipId: string, uid: string, me: Profile | null) {
  await postSystem(fellowshipId, uid, `${heroName(me)} joined the fellowship!`, { event: 'member_joined', user_id: uid });
}

async function onProfileSaved(p: Profile) {
  // Fellow members see the new name/crest/color right away.
  setSnap({ members: snap.members.map((m) => (m.user_id === p.id ? { ...m, profile: p } : m)) });
  if (!p.onboarded) return;
  const pending = await AsyncStorage.getItem(PENDING_JOIN_KEY).catch(() => null);
  if (!pending) return;
  await AsyncStorage.removeItem(PENDING_JOIN_KEY).catch(() => {});
  await announceJoin(pending, p.id, p);
}

async function leaveReal() {
  const uid = sessionStore.get().userId;
  const f = snap.fellowship;
  if (!uid || !f) return;
  const { error } = await supabase.from('fellowship_members').delete().eq('fellowship_id', f.id).eq('user_id', uid);
  if (error) throw new Error(`Muse could not release you: ${error.message}. Try again.`);
  await AsyncStorage.removeItem(ACTIVE_KEY).catch(() => {});
  await activate(null);
}

async function refreshReal() {
  const uid = sessionStore.get().userId;
  if (uid) await resolveActive(uid);
}

/** Non-hook access for other lib modules (chat). */
export const fellowshipStore = {
  get: (): Snapshot => (USE_MOCKS ? { fellowship: mock.fellowship, members: mock.members, loading: false } : snap),
  subscribe(fn: () => void): () => void {
    if (USE_MOCKS) return subscribeMock(fn);
    start();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Re-fetch members + profiles (chat calls this when a join/system line arrives). */
  reloadMembers: (): Promise<void> => (USE_MOCKS ? Promise.resolve() : reloadMembers()),
};

// ---------------------------------------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------------------------------------
function useMockFellowship(): FellowshipState {
  'use no memo'; // mock store mutates in place; the React Compiler must not cache reads of it
  const [, force] = useState(0);
  useEffect(() => subscribeMock(() => force((n) => n + 1)), []);
  const createFellowship = useCallback(async (name: string) => {
    if (name.trim()) mock.fellowship = { ...mock.fellowship, name: name.trim() };
    emitMock();
    return mock.fellowship;
  }, []);
  const joinByCode = useCallback(async (code: string) => {
    if (normalizeInviteCode(code).length < 4) throw new Error(NOT_FOUND);
    return mock.fellowship;
  }, []);
  const leave = useCallback(async () => {}, []);
  const refresh = useCallback(async () => {}, []);
  // Fresh objects each render so memoized consumers see in-place mock mutations.
  const members = mock.members.map((m) => ({ ...m, profile: mock.profiles.find((p) => p.id === m.user_id) ?? m.profile }));
  return { fellowship: { ...mock.fellowship }, members, loading: false, createFellowship, joinByCode, leave, refresh };
}

function useRealFellowship(): FellowshipState {
  const s = useSyncExternalStore(fellowshipStore.subscribe, () => snap, () => snap);
  return {
    fellowship: s.fellowship,
    members: s.members,
    loading: s.loading,
    createFellowship: createFellowshipReal,
    joinByCode: joinByCodeReal,
    leave: leaveReal,
    refresh: refreshReal,
  };
}

// USE_MOCKS is a build-time constant, so the hook order never changes between renders.
export const useFellowship: () => FellowshipState = USE_MOCKS ? useMockFellowship : useRealFellowship;
