// Owner: MP. Auth (anonymous sign-in) + the signed-in user's profile.
// CONTRACT: keep these export names/signatures. Implementation details are MP's call.
//
// Real mode keeps ONE module-level store shared by every component (useSyncExternalStore), so no provider
// is needed in app/_layout.tsx. Other lib files (fellowship, chat) read it through `sessionStore`.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { USE_MOCKS } from './env';
import { mock, emitMock, subscribeMock } from './mockStore';
import { supabase } from './supabase';
import { ME } from '@/fixtures/demo';
import type { Profile } from '@/shared/types';

export interface SessionState {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  /** Signs in anonymously if needed. Safe to call repeatedly. */
  ensureSignedIn: () => Promise<string>;
  updateProfile: (patch: Partial<Omit<Profile, 'id' | 'created_at'>>) => Promise<void>;
  refresh: () => Promise<void>;
}

type ProfilePatch = Partial<Omit<Profile, 'id' | 'created_at'>>;

// ---------------------------------------------------------------------------------------------------------
// Real store
// ---------------------------------------------------------------------------------------------------------
interface Snapshot {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
}

let snap: Snapshot = { userId: null, profile: null, loading: true };
const listeners = new Set<() => void>();
let started = false;
let signingIn: Promise<string> | null = null;

function setSnap(patch: Partial<Snapshot>) {
  snap = { ...snap, ...patch };
  listeners.forEach((fn) => fn());
}

async function loadProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  if (data) return data as Profile;
  // The DB trigger normally creates the row; make sure it exists anyway.
  const { data: created, error: upErr } = await supabase
    .from('profiles')
    .upsert({ id: uid }, { onConflict: 'id' })
    .select('*')
    .single();
  if (upErr) throw upErr;
  return created as Profile;
}

async function refreshProfile() {
  const uid = snap.userId;
  if (!uid) return;
  try {
    const profile = await loadProfile(uid);
    if (snap.userId === uid) setSnap({ profile });
  } catch (e) {
    console.warn('[session] profile load failed', e);
  }
}

async function handleUser(uid: string | null) {
  if (uid === snap.userId && snap.profile) return;
  if (!uid) {
    setSnap({ userId: null, profile: null, loading: false });
    return;
  }
  setSnap({ userId: uid, profile: snap.userId === uid ? snap.profile : null });
  await refreshProfile();
  setSnap({ loading: false });
}

function start() {
  if (started || USE_MOCKS) return;
  started = true;
  supabase.auth
    .getSession()
    .then(({ data }) => handleUser(data.session?.user.id ?? null))
    .catch((e) => {
      console.warn('[session] getSession failed', e);
      setSnap({ loading: false });
    });
  supabase.auth.onAuthStateChange((_event, session) => {
    // Never await supabase calls inside this callback (supabase-js deadlock); defer.
    setTimeout(() => void handleUser(session?.user.id ?? null), 0);
  });
}

async function ensureSignedInReal(): Promise<string> {
  start();
  if (snap.userId) return snap.userId;
  if (signingIn) return signingIn;
  signingIn = (async () => {
    try {
      const existing = await supabase.auth.getSession();
      let uid = existing.data.session?.user.id ?? null;
      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw new Error(`Muse could not open the gate: ${error.message}. Check your connection and try again.`);
        uid = data.user?.id ?? null;
      }
      if (!uid) throw new Error('Muse could not open the gate. Try again in a moment.');
      setSnap({ userId: uid });
      if (!snap.profile) {
        const profile = await loadProfile(uid);
        if (snap.userId === uid) setSnap({ profile });
      }
      setSnap({ loading: false });
      return uid;
    } finally {
      signingIn = null;
    }
  })();
  return signingIn;
}

async function updateProfileReal(patch: ProfilePatch) {
  const uid = await ensureSignedInReal();
  const before = snap.profile;
  // Optimistic: onboarding should feel instant.
  if (before) setSnap({ profile: { ...before, ...patch } });
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid).select('*').maybeSingle();
  if (error) {
    if (snap.userId === uid) setSnap({ profile: before });
    throw new Error(`Your scroll did not save: ${error.message}. Try again.`);
  }
  if (data && snap.userId === uid) setSnap({ profile: data as Profile });
  else await refreshProfile();
}

/** Non-hook access for other lib modules (fellowship, chat). */
export const sessionStore = {
  get: (): Snapshot => (USE_MOCKS ? { userId: ME, profile: mock.profiles.find((p) => p.id === ME) ?? null, loading: false } : snap),
  subscribe(fn: () => void): () => void {
    if (USE_MOCKS) return subscribeMock(fn);
    start();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureSignedIn: (): Promise<string> => (USE_MOCKS ? Promise.resolve(ME) : ensureSignedInReal()),
  refresh: (): Promise<void> => (USE_MOCKS ? Promise.resolve() : refreshProfile()),
};

// ---------------------------------------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------------------------------------
function useMockSession(): SessionState {
  const [, force] = useState(0);
  useEffect(() => subscribeMock(() => force((n) => n + 1)), []);

  const ensureSignedIn = useCallback(async () => ME, []);
  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    const i = mock.profiles.findIndex((p) => p.id === ME);
    mock.profiles[i] = { ...mock.profiles[i], ...patch };
    // keep the member list (which embeds profiles) in sync
    const m = mock.members.find((x) => x.user_id === ME);
    if (m) m.profile = mock.profiles[i];
    emitMock();
  }, []);
  const refresh = useCallback(async () => {}, []);
  return { userId: ME, profile: mock.profiles.find((p) => p.id === ME) ?? null, loading: false, ensureSignedIn, updateProfile, refresh };
}

function useRealSession(): SessionState {
  const s = useSyncExternalStore(sessionStore.subscribe, () => snap, () => snap);
  return {
    userId: s.userId,
    profile: s.profile,
    loading: s.loading,
    ensureSignedIn: ensureSignedInReal,
    updateProfile: updateProfileReal,
    refresh: refreshProfile,
  };
}

// USE_MOCKS is a build-time constant, so the hook order never changes between renders.
export const useSession: () => SessionState = USE_MOCKS ? useMockSession : useRealSession;
