// Owner: AB. Thin adapters over EV's lib/game.ts + lib/api.ts (round 2: EV's exports landed; no local fallbacks).
import * as api from '@/lib/api';
import type { Difficulty } from '@/shared/types';

/** Points (E4): EV's single source of truth — every participant in completed_by earns mission.points. */
export { pointsFor, leaderboard } from '@/lib/game';

export const REROLL_REASON: Record<Difficulty, string> = {
  easy: 'Make it easier: closer, cheaper and quicker to do.',
  normal: 'Something different at a similar level.',
  hard: 'Make it more ambitious: farther, bolder, more memorable.',
};

/** Ask the engine for a replacement mission (E2: difficulty is relative — easier / similar / harder). */
export function rerollWithDifficulty(missionId: string, difficulty: Difficulty) {
  return api.rerollMission(missionId, REROLL_REASON[difficulty], difficulty);
}
