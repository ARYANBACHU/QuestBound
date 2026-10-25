// Owner: EV. THE single source of truth for points. Pure TypeScript with NO imports, so it runs in three places:
// - edge functions (Deno): every mission's `points` is set server-side with missionPoints()
// - the app (lib/game.ts re-exports pointsFor / leaderboard / missionPoints)
// - node (fixtures/points.test.ts proves the totals add up)
//
// Rules (ROUND-2-PLAN E4):
// - points = size base (large 40 / medium 20 / small 10) × difficulty multiplier (easy 0.75 / normal 1 / hard 1.5)
// - every participant in a COMPLETE mission's completed_by earns that mission's points (a duet pays both heroes)

export type PointsDifficulty = 'easy' | 'normal' | 'hard';
export type PointsSize = 'small' | 'medium' | 'large';

export const SIZE_POINTS: Record<PointsSize, number> = { large: 40, medium: 20, small: 10 };
export const DIFFICULTY_MULTIPLIER: Record<PointsDifficulty, number> = { easy: 0.75, normal: 1, hard: 1.5 };

export function asDifficulty(v: unknown, fallback: PointsDifficulty = 'normal'): PointsDifficulty {
  return v === 'easy' || v === 'normal' || v === 'hard' ? v : fallback;
}

/** Points a mission is worth. Rounded to whole points (easy small = 8). */
export function missionPoints(size: PointsSize, difficulty: PointsDifficulty = 'normal'): number {
  return Math.round(SIZE_POINTS[size] * DIFFICULTY_MULTIPLIER[asDifficulty(difficulty)]);
}

/** Minimal mission shape the math needs (a full Mission row fits). */
export interface ScoredMission {
  status: string;
  completed_by: string[] | null;
  points: number;
}

function credited(m: ScoredMission): string[] {
  return m.status === 'complete' && Array.isArray(m.completed_by) ? [...new Set(m.completed_by)] : [];
}

/** Total points a user has earned across these missions (pass every book's missions for a lifetime score). */
export function pointsFor(userId: string, missions: readonly ScoredMission[]): number {
  let total = 0;
  for (const m of missions) if (credited(m).includes(userId)) total += Number(m.points) || 0;
  return total;
}

/** Missions a user helped complete. */
export function missionsCompletedBy(userId: string, missions: readonly ScoredMission[]): number {
  return missions.filter((m) => credited(m).includes(userId)).length;
}

export interface LeaderboardEntry<M> {
  member: M;
  user_id: string;
  points: number;
  missions: number; // missions this member was credited on
  rank: number; // 1-based; ties share a rank (1, 1, 3)
}

/**
 * Members sorted by points (desc), then missions (desc), then original order. Members with 0 points are included.
 * Pass FellowshipMember rows, profiles, or anything with `user_id` (or `id`).
 */
export function leaderboard<M extends { user_id: string } | { id: string }>(
  members: readonly M[],
  missions: readonly ScoredMission[],
): LeaderboardEntry<M>[] {
  const rows = members.map((member, i) => {
    const user_id = 'user_id' in member ? member.user_id : member.id;
    return { member, user_id, points: pointsFor(user_id, missions), missions: missionsCompletedBy(user_id, missions), rank: 0, i };
  });
  rows.sort((a, b) => b.points - a.points || b.missions - a.missions || a.i - b.i);
  rows.forEach((r, k) => {
    r.rank = k > 0 && rows[k - 1].points === r.points ? rows[k - 1].rank : k + 1;
  });
  return rows.map(({ i: _i, ...r }) => r);
}

/** Sum of every mission's points times its credited heroes = sum of all members' points (the test checks this). */
export function totalAwarded(missions: readonly ScoredMission[]): number {
  return missions.reduce((s, m) => s + credited(m).length * (Number(m.points) || 0), 0);
}
