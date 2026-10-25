// Owner: EV. V2/V6: the UT Campus Demo book — exact Chapter I, group play (max 1 solo per page), valid places.
// Run: node fixtures/ut-campus.test.mjs
import assert from 'node:assert/strict';
import { TEMPLATES } from '../shared/templates.ts';
import { crewFor } from '../supabase/functions/_shared/fallbacks.ts';
import { UT_BOOK, UT_GEO_ENFORCED, UT_PLACES } from '../supabase/functions/_shared/ut-campus.ts';

const SIZE_TYPES = { large: ['gathering'], medium: ['duet', 'gift', 'trial'], small: ['relic', 'bard', 'trial'] };
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };
const sizeOf = (t, r) => TEMPLATES[t].regions.find((x) => x.id === r)?.size;
console.log('ut-campus');

test('the UT demo never blocks on location', () => assert.equal(UT_GEO_ENFORCED, false));

test('every page covers exactly its regions with allowed types; places exist; riddles have answers', () => {
  assert.equal(UT_BOOK.chapters.length, 4);
  for (const c of UT_BOOK.chapters) {
    assert.deepEqual(c.missions.map((m) => m.region_id).sort(), TEMPLATES[c.template_id].regions.map((r) => r.id).sort(), c.title);
    for (const m of c.missions) {
      assert.ok(SIZE_TYPES[sizeOf(c.template_id, m.region_id)].includes(m.type), `${m.title}: ${m.type}`);
      if (m.place) assert.ok(UT_PLACES[m.place], `${m.title}: unknown place ${m.place}`);
      if (m.type === 'trial') assert.ok(m.trial_question && m.trial_answer, `${m.title}: riddle`);
      if ((m.crew ?? 0) >= 2) assert.ok(m.description.startsWith('{Crew}') || /^Two of you/.test(m.description), `${m.title}: crew copy`);
    }
  }
});

test('Chapter I is "The Forty Acres Awaken" with the exact judging-table missions', () => {
  const c = UT_BOOK.chapters[0];
  assert.equal(c.template_id, 'castle_gate');
  assert.equal(c.title, 'The Forty Acres Awaken');
  const by = Object.fromEntries(c.missions.map((m) => [m.region_id, m]));
  assert.equal(by.castle.title, 'The Great Tournament'); assert.equal(by.castle.type, 'gathering'); assert.equal(by.castle.place, null);
  assert.equal(by.drawbridge.title, 'Salute the Tower'); assert.equal(by.drawbridge.crew, 3); assert.equal(by.drawbridge.place, 'tower');
  assert.equal(by.banners.title, 'The Harvest Horns'); assert.equal(by.banners.crew, 2); assert.equal(by.banners.place, 'coop');
  assert.equal(by.tower_flag.title, 'The Royal Portraitist'); assert.equal(by.tower_flag.crew, 2); assert.equal(by.tower_flag.place, 'blanton');
  assert.equal(by.moon.place, 'turtle_pond'); assert.equal(by.moon.type, 'trial');
  assert.equal(by.moat.place, 'littlefield');
});

test('max 1 solo per page (Chapter I has none) for fellowships of 2–6', () => {
  for (const n of [2, 3, 4, 6]) {
    UT_BOOK.chapters.forEach((c, i) => {
      const solos = c.missions.filter((m) => crewFor(sizeOf(c.template_id, m.region_id), m.crew, n, m.type) === 1).length;
      assert.ok(solos <= (i === 0 ? 0 : 1), `${c.title} (${n} members): ${solos} solos`);
    });
  }
});

console.log(`${passed} passed`);
