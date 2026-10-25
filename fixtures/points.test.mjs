// Owner: EV. Proves the points math adds up (ROUND-2-PLAN E4). Run: node fixtures/points.test.mjs
// Uses the SAME module the edge functions and the app use (supabase/functions/_shared/points.ts).
import assert from 'node:assert/strict';
import {
  DIFFICULTY_MULTIPLIER, leaderboard, missionPoints, pointsFor, SIZE_POINTS, totalAwarded,
} from '../supabase/functions/_shared/points.ts';
import { MEMBERS, MISSIONS, PAGES } from './demo.ts';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

console.log('points');

test('size base × difficulty multiplier', () => {
  assert.deepEqual(SIZE_POINTS, { large: 40, medium: 20, small: 10 });
  assert.deepEqual(DIFFICULTY_MULTIPLIER, { easy: 0.75, normal: 1, hard: 1.5 });
  const table = ['small', 'medium', 'large'].map((s) => ['easy', 'normal', 'hard'].map((d) => missionPoints(s, d)));
  assert.deepEqual(table, [[8, 10, 15], [15, 20, 30], [30, 40, 60]]);
  assert.equal(missionPoints('large', 'nonsense'), 40, 'unknown difficulty = normal');
});

test('fixture missions are priced by the rule', () => {
  const sizeOf = { castle: 'large', great_tree: 'large', dragon: 'large', drawbridge: 'medium', banners: 'medium',
    mushroom_ring: 'medium', river: 'medium', mountain: 'medium', treasure: 'medium' };
  for (const m of MISSIONS) assert.equal(m.points, missionPoints(sizeOf[m.region_id] ?? 'small'), m.id);
});

test('only complete missions pay, every credited hero gets the full points', () => {
  const ms = [
    { status: 'complete', completed_by: ['a', 'b'], points: 20 }, // duet: both earn 20
    { status: 'complete', completed_by: ['a'], points: 10 },
    { status: 'open', completed_by: ['b'], points: 40 }, // not complete: nobody earns
    { status: 'complete', completed_by: ['a', 'a'], points: 10 }, // duplicate id counts once
    { status: 'complete', completed_by: null, points: 10 },
  ];
  assert.equal(pointsFor('a', ms), 40);
  assert.equal(pointsFor('b', ms), 20);
  assert.equal(pointsFor('nobody', ms), 0);
  assert.equal(pointsFor('a', ms) + pointsFor('b', ms), totalAwarded(ms));
});

test('a whole book: member totals add up to what the missions paid out', () => {
  const ids = MEMBERS.map((m) => m.user_id);
  // Deterministic "play": gatherings credit everyone, mediums two people, smalls one.
  const played = MISSIONS.map((m, i) => ({
    ...m,
    status: 'complete',
    completed_by: m.type === 'gathering' ? ids : m.required_members >= 2 ? [ids[i % 4], ids[(i + 1) % 4]] : [ids[i % 4]],
  }));
  const board = leaderboard(MEMBERS, played);
  const sum = board.reduce((s, r) => s + r.points, 0);
  assert.equal(sum, totalAwarded(played));
  for (const r of board) assert.equal(r.points, pointsFor(r.user_id, played));
  for (let k = 1; k < board.length; k++) assert.ok(board[k - 1].points >= board[k].points, 'sorted desc');
  assert.equal(board.length, MEMBERS.length);
  assert.equal(PAGES.length * 6, MISSIONS.length, 'every page has 6 missions');
  // Grand total of the fixture book at normal difficulty: 3 pages × (40 + 2×20 + 3×10) = 330 mission points.
  assert.equal(played.reduce((s, m) => s + m.points, 0), 330);
});

test('leaderboard ranks: ties share a rank, zero-point members included, works with profiles (id)', () => {
  const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const ms = [
    { status: 'complete', completed_by: ['a', 'b'], points: 20 },
    { status: 'complete', completed_by: ['c'], points: 10 },
  ];
  const board = leaderboard(people, ms);
  assert.deepEqual(board.map((r) => [r.user_id, r.points, r.rank]), [['a', 20, 1], ['b', 20, 1], ['c', 10, 3], ['d', 0, 4]]);
  assert.equal(board[0].member, people[0]);
});

console.log(`${passed} passed`);
