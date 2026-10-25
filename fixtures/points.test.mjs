// Owner: EV. Proves the points math adds up (ROUND-2-PLAN E4). Run: node fixtures/points.test.mjs
// Uses the SAME module the edge functions and the app use (supabase/functions/_shared/points.ts).
import assert from 'node:assert/strict';
import {
  CREW_POINTS, crewOf, DIFFICULTY_MULTIPLIER, leaderboard, missionPoints, pointsFor, SIZE_POINTS, totalAwarded,
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

test('G1: crew base solo 10 / duet 20 / trio 30 / fellowship 40 × difficulty', () => {
  assert.deepEqual(CREW_POINTS, { solo: 10, duet: 20, trio: 30, fellowship: 40 });
  const table = ['solo', 'duet', 'trio', 'fellowship'].map((c) => ['easy', 'normal', 'hard'].map((d) => missionPoints(c, d)));
  assert.deepEqual(table, [[8, 10, 15], [15, 20, 30], [23, 30, 45], [30, 40, 60]]);
  assert.equal(crewOf({ type: 'gathering', required_members: 2 }), 'fellowship');
  assert.equal(crewOf({ type: 'duet', required_members: 3 }), 'trio');
  assert.equal(crewOf({ type: 'relic', required_members: 2 }), 'duet');
  assert.equal(crewOf({ type: 'bard', required_members: 1 }), 'solo');
});

test('fixture missions are priced by their crew, and no page has more than 1 solo mission (V6)', () => {
  for (const m of MISSIONS) assert.equal(m.points, missionPoints(crewOf(m)), m.id);
  for (const p of PAGES) {
    const solos = MISSIONS.filter((m) => m.page_id === p.id && crewOf(m) === 'solo').length;
    assert.ok(solos <= 1, `${p.id} has ${solos} solo missions`); // V6: max 1 solo per page
  }
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
    completed_by: m.type === 'gathering' ? ids : Array.from({ length: m.required_members }, (_, k) => ids[(i + k) % 4]),
  }));
  const board = leaderboard(MEMBERS, played);
  const sum = board.reduce((s, r) => s + r.points, 0);
  assert.equal(sum, totalAwarded(played));
  for (const r of board) assert.equal(r.points, pointsFor(r.user_id, played));
  for (let k = 1; k < board.length; k++) assert.ok(board[k - 1].points >= board[k].points, 'sorted desc');
  assert.equal(board.length, MEMBERS.length);
  assert.equal(PAGES.length * 6, MISSIONS.length, 'every page has 6 missions');
  // Grand total of the fixture book at normal difficulty (V6): 3 pages × (40 + 30 + 20 + 20 + 20 + 10) = 420 mission points.
  assert.equal(played.reduce((s, m) => s + m.points, 0), 420);
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
