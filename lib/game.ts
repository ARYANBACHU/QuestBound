// Owner: EV. Read-side hooks for the story (storylines, pages, missions, memories), realtime.
// CONTRACT: keep these export names/signatures. UI branches (AD, AB) depend on them.
import { useEffect, useState } from 'react';
import { USE_MOCKS } from './env';
import { mock, subscribeMock } from './mockStore';
import type { Memory, Mission, Page, Storyline } from '@/shared/types';

function useMockTick() {
  const [, force] = useState(0);
  useEffect(() => (USE_MOCKS ? subscribeMock(() => force((n) => n + 1)) : undefined), []);
}

export interface StorylineState {
  storyline: Storyline | null; // the fellowship's current (latest) book
  pages: Page[]; // ordered by chapter_number
  activePage: Page | null; // status 'active' (or last complete page if the book is done)
  loading: boolean;
}
export function useStoryline(fellowshipId: string | null): StorylineState {
  useMockTick();
  // TODO(EV): real query + realtime when !USE_MOCKS
  const pages = [...mock.pages].sort((a, b) => a.chapter_number - b.chapter_number);
  const activePage = pages.find((p) => p.status === 'active') ?? pages.filter((p) => p.status === 'complete').slice(-1)[0] ?? null;
  return { storyline: fellowshipId ? mock.storyline : null, pages, activePage, loading: false };
}

/** All missions of a storyline (filter by page_id client-side). */
export function useMissions(storylineId: string | null): { missions: Mission[]; loading: boolean } {
  useMockTick();
  return { missions: storylineId ? mock.missions.filter((m) => m.storyline_id === storylineId) : [], loading: false };
}

export function useMission(missionId: string | null): { mission: Mission | null; loading: boolean } {
  useMockTick();
  return { mission: mock.missions.find((m) => m.id === missionId) ?? null, loading: false };
}

/** Every book this fellowship has written (Storybook shelf), newest first. */
export function useBooks(fellowshipId: string | null): { books: Storyline[]; loading: boolean } {
  useMockTick();
  return { books: fellowshipId ? [mock.storyline] : [], loading: false };
}

export function useMemories(fellowshipId: string | null, storylineId?: string | null): { memories: Memory[]; loading: boolean } {
  useMockTick();
  const all = mock.memories.filter((m) => m.fellowship_id === fellowshipId);
  return { memories: storylineId ? all.filter((m) => m.storyline_id === storylineId) : all, loading: false };
}
