// Owner: EV. In-memory store used ONLY in mock mode so UI branches see live-feeling updates
// (e.g. submitting a proof colors the region and posts a proclamation) without any backend.
import { FELLOWSHIP, MEMBERS, MEMORIES, MESSAGES, MISSIONS, PAGES, PROFILES, STORYLINE } from '@/fixtures/demo';
import type { Memory, Message, Mission, Page, Profile } from '@/shared/types';

type Listener = () => void;
const listeners = new Set<Listener>();

export const mock = {
  fellowship: { ...FELLOWSHIP },
  members: MEMBERS.map((m) => ({ ...m })),
  profiles: PROFILES.map((p) => ({ ...p })) as Profile[],
  storyline: { ...STORYLINE },
  pages: PAGES.map((p) => ({ ...p })) as Page[],
  missions: MISSIONS.map((m) => ({ ...m })) as Mission[],
  messages: MESSAGES.map((m) => ({ ...m })) as Message[],
  memories: MEMORIES.map((m) => ({ ...m })) as Memory[],
};

export function subscribeMock(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitMock() {
  listeners.forEach((fn) => fn());
}
