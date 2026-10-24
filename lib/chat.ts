// Owner: MP. Group chat for a fellowship (texts + proclamations + system + wizard), realtime.
// CONTRACT: keep these export names/signatures.
import { useCallback, useEffect, useState } from 'react';
import { USE_MOCKS } from './env';
import { mock, emitMock, subscribeMock } from './mockStore';
import { ME } from '@/fixtures/demo';
import type { Message } from '@/shared/types';

export interface ChatState {
  messages: Message[]; // oldest -> newest
  loading: boolean;
  send: (body: string) => Promise<void>;
}

export function useChat(fellowshipId: string | null): ChatState {
  const [, force] = useState(0);
  useEffect(() => (USE_MOCKS ? subscribeMock(() => force((n) => n + 1)) : undefined), []);
  const send = useCallback(async (body: string) => {
    mock.messages.push({ id: `msg-${Date.now()}`, fellowship_id: fellowshipId ?? '', user_id: ME, kind: 'text', body, payload: null, created_at: new Date().toISOString() });
    emitMock();
  }, [fellowshipId]);
  // TODO(MP): real implementation when !USE_MOCKS
  return { messages: mock.messages, loading: false, send };
}
