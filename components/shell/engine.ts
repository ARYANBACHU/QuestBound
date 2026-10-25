// Owner: AB. Thin adapters over EV's lib/game.ts + lib/api.ts for Round 2 contracts that may not have landed yet.
// When EV's exports exist they are used as-is (one source of truth); until then a faithful local fallback runs.
import * as api from '@/lib/api';
import * as game from '@/lib/game';
import type { Difficulty, FellowshipMember, Mission } from '@/shared/types';

type PointsFor = (userId: string, missions: Mission[]) => number;
const ev = game as unknown as { pointsFor?: PointsFor };

/** Points a member earned: every participant in completed_by earns mission.points (E4). */
export function pointsFor(userId: string, missions: Mission[]): number {
  if (typeof ev.pointsFor === 'function') return ev.pointsFor(userId, missions);
  return missions.filter((m) => m.status === 'complete' && m.completed_by.includes(userId)).reduce((s, m) => s + (m.points ?? 0), 0);
}

/** Members sorted by points (desc), built on pointsFor so totals always match EV's. */
export function leaderboard(members: FellowshipMember[], missions: Mission[]) {
  return members
    .map((member) => ({ member, points: pointsFor(member.user_id, missions) }))
    .sort((a, b) => b.points - a.points);
}

export const REROLL_REASON: Record<Difficulty, string> = {
  easy: 'Make it easier: closer, cheaper and quicker to do.',
  normal: 'Something different at a similar level.',
  hard: 'Make it more ambitious: farther, bolder, more memorable.',
};

type Reroll = (missionId: string, reason?: string, difficulty?: Difficulty) => Promise<api.RerollMissionResponse>;

/** Ask the engine for a replacement mission (E2: difficulty is passed through once reroll-mission accepts it). */
export function rerollWithDifficulty(missionId: string, difficulty: Difficulty) {
  return (api.rerollMission as Reroll)(missionId, REROLL_REASON[difficulty], difficulty);
}
