// Owner: MP. Points, one source of truth: EV's E4 helpers (lib/game.ts → supabase/functions/_shared/points.ts).
// leaderboard rows: { member, user_id, points, missions, rank } (desc, ties share a rank).
export { pointsFor, leaderboard, type LeaderboardEntry } from '@/lib/game';
