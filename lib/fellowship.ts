// Owner: MP. The active fellowship + its members (with profiles).
// CONTRACT: keep these export names/signatures.
import { useCallback, useEffect, useState } from 'react';
import { USE_MOCKS } from './env';
import { mock, subscribeMock } from './mockStore';
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

export function useFellowship(): FellowshipState {
  const [, force] = useState(0);
  useEffect(() => (USE_MOCKS ? subscribeMock(() => force((n) => n + 1)) : undefined), []);
  const createFellowship = useCallback(async (_name: string) => mock.fellowship, []);
  const joinByCode = useCallback(async (_code: string) => mock.fellowship, []);
  const leave = useCallback(async () => {}, []);
  const refresh = useCallback(async () => {}, []);
  // TODO(MP): real implementation when !USE_MOCKS
  return { fellowship: mock.fellowship, members: mock.members, loading: false, createFellowship, joinByCode, leave, refresh };
}

/** Helper used everywhere to render a member's crest/color/name. */
export function profileOf(members: FellowshipMember[], userId: string | null | undefined): Profile | undefined {
  return members.find((m) => m.user_id === userId)?.profile;
}
