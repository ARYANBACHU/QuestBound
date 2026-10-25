// Owner: EV. Round 3 G1/G2: every template has valid fallback missions with the group-play crew plan, and the
// template picker obeys its rules. Run: node fixtures/templates.test.mjs
import assert from 'node:assert/strict';
import { TEMPLATES } from '../shared/templates.ts';
import { ALTERNATES, crewFor, FALLBACK, FALLBACK_CHAPTER_TEXT } from '../supabase/functions/_shared/fallbacks.ts';
import { CLASSICS, pickChapterTemplates, TEMPLATE_FIT } from '../supabase/functions/_shared/pick.ts';

const SIZE_TYPES = { large: ['gathering'], medium: ['duet', 'gift', 'trial'], small: ['relic', 'bard', 'trial'] };
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };
const ids = Object.keys(TEMPLATES);
console.log('templates');

test('all 20 templates have fallback missions for exactly their regions, valid types and riddles', () => {
  assert.equal(ids.length, 20);
  for (const id of ids) {
    const fb = FALLBACK[id];
    assert.ok(fb, `${id}: no fallback`);
    assert.deepEqual(Object.keys(fb).sort(), TEMPLATES[id].regions.map((r) => r.id).sort(), `${id}: regions`);
    for (const r of TEMPLATES[id].regions) {
      const s = fb[r.id];
      assert.ok(SIZE_TYPES[r.size].includes(s.type), `${id}.${r.id}: ${s.type} not allowed on ${r.size}`);
      if (s.type === 'trial') assert.ok(s.trial?.q && s.trial?.a, `${id}.${r.id}: trial needs q/a`);
      else assert.equal(s.trial, undefined, `${id}.${r.id}: only trials carry riddles`);
      for (const n of [1, 2, 3]) {
        const d = s.desc(n === 3 ? { title: 'Epoch Coffee' } : null, n);
        assert.ok(typeof d === 'string' && d.length > 20 && !d.includes('undefined'), `${id}.${r.id}: desc`);
      }
      assert.ok(s.title && s.hook && s.hint, `${id}.${r.id}: copy`);
    }
    assert.ok(FALLBACK_CHAPTER_TEXT[id]?.title && FALLBACK_CHAPTER_TEXT[id]?.narrative, `${id}: chapter text`);
    assert.ok(TEMPLATE_FIT[id], `${id}: mood fit`);
  }
});

test('G1 crew plan: one trio medium (never a gift) and one duet small per page → at most 2 solos', () => {
  for (const id of ids) {
    const regions = TEMPLATES[id].regions;
    const trio = regions.filter((r) => r.size === 'medium' && FALLBACK[id][r.id].crew === 3);
    const duet = regions.filter((r) => r.size === 'small' && FALLBACK[id][r.id].crew === 2);
    assert.equal(trio.length, 1, `${id}: trio slots`);
    assert.notEqual(FALLBACK[id][trio[0].id].type, 'gift', `${id}: trio can't be a gift`);
    assert.equal(duet.length, 1, `${id}: duet small slots`);
    for (const size of [2, 3, 4, 6]) {
      const crews = regions.map((r) => crewFor(r.size, FALLBACK[id][r.id].crew, size, FALLBACK[id][r.id].type));
      assert.ok(crews.filter((c) => c === 1).length <= 2, `${id} @${size}: solos`);
      assert.equal(crews[0], Math.max(2, size), `${id} @${size}: gathering = everyone`);
      if (size >= 3) assert.ok(crews.includes(3), `${id} @${size}: has a trio`);
      else assert.ok(!crews.includes(3), `${id} @${size}: no trio in a fellowship of 2`);
    }
  }
});

test('reroll alternates exist for every size', () => {
  for (const size of ['large', 'medium', 'small']) assert.ok(ALTERNATES[size].length >= 2);
});

test('G2 picker: distinct, only allowed (art-ready) templates, opener + finale slots, avoids the previous book', () => {
  const counts = { desserts: 3, brunch: 2, live_music: 2, sunsets: 1 };
  const all = pickChapterTemplates({ count: 4, interestCounts: counts, allowed: ids, seed: 7 });
  assert.equal(new Set(all).size, 4);
  assert.ok(TEMPLATE_FIT[all[0]].slots.includes('open'), `opener ${all[0]}`);
  assert.ok(TEMPLATE_FIT[all[3]].slots.includes('finale'), `finale ${all[3]}`);
  const next = pickChapterTemplates({ count: 4, interestCounts: counts, allowed: ids, previous: all, seed: 8 });
  assert.equal(next.filter((t) => all.includes(t)).length, 0, `sequel repeats: ${next}`);
  // Only classics have art → only classics are picked, even if every other template fits better.
  const classic = pickChapterTemplates({ count: 3, interestCounts: counts, allowed: [], seed: 7 });
  assert.ok(classic.every((t) => CLASSICS.includes(t)), `${classic}`);
  // Placeholder-only templates are never picked.
  const partial = pickChapterTemplates({ count: 4, interestCounts: counts, allowed: ['candy_village', 'lantern_festival'], seed: 3 });
  assert.ok(partial.every((t) => [...CLASSICS, 'candy_village', 'lantern_festival'].includes(t)), `${partial}`);
  // Variety: different fellowships/books don't all get the same book.
  const books = new Set(Array.from({ length: 12 }, (_, s) => pickChapterTemplates({ count: 3, interestCounts: {}, allowed: ids, seed: s * 977 }).join()));
  assert.ok(books.size >= 4, `only ${books.size} distinct books`);
  console.log(`    e.g. dessert lovers: ${all.join(' → ')}; their sequel: ${next.join(' → ')}`);
});

console.log(`${passed} passed`);
