// Owner: MP. Points, one source of truth.
// EV is adding `pointsFor(userId, missions)` + `leaderboard(members, missions)` to lib/game.ts (Round 2 · E4).
// Until it reaches main this is a same-signature local copy of the rule; then this file just re-exports:
//   export { pointsFor, leaderboard } from '@/lib/game';
// Rule: every participant in a completed mission's `completed_by` earns that mission's `points` (set server-side).
import type { FellowshipMember, Mission } from '@/shared/types';

export interface LeaderboardEntry {
  user_id: string;
  points: number;
  /** Completed missions this hero took part in. */
  missions: number;
}

function completed(missions: Mission[]): Mission[] {
  return missions.filter((m) => m.status === 'complete');
}

export function pointsFor(userId: string, missions: Mission[]): number {
  return completed(missions).reduce((sum, m) => ((m.completed_by ?? []).includes(userId) ? sum + (m.points ?? 0) : sum), 0);
}

/** Every member (even with 0 points), highest first; ties keep join order. */
export function leaderboard(members: FellowshipMember[], missions: Mission[]): LeaderboardEntry[] {
  const done = completed(missions);
  return members
    .map((mem, i) => {
      const mine = done.filter((m) => (m.completed_by ?? []).includes(mem.user_id));
      return { user_id: mem.user_id, points: mine.reduce((s, m) => s + (m.points ?? 0), 0), missions: mine.length, i };
    })
    .sort((a, b) => b.points - a.points || a.i - b.i)
    .map(({ i: _i, ...row }) => row);
}
