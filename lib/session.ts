// Owner: MP. Auth (anonymous sign-in) + the signed-in user's profile.
// CONTRACT: keep these export names/signatures. Implementation details are MP's call.
import { useCallback, useEffect, useState } from 'react';
import { USE_MOCKS } from './env';
import { mock, emitMock, subscribeMock } from './mockStore';
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

export function useSession(): SessionState {
  const [, force] = useState(0);
  useEffect(() => (USE_MOCKS ? subscribeMock(() => force((n) => n + 1)) : undefined), []);

  const ensureSignedIn = useCallback(async () => ME, []);
  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    const i = mock.profiles.findIndex((p) => p.id === ME);
    mock.profiles[i] = { ...mock.profiles[i], ...patch };
    emitMock();
  }, []);
  const refresh = useCallback(async () => {}, []);

  // TODO(MP): real implementation (supabase.auth.signInAnonymously + profiles select/update) when !USE_MOCKS
  return { userId: ME, profile: mock.profiles.find((p) => p.id === ME) ?? null, loading: false, ensureSignedIn, updateProfile, refresh };
}
