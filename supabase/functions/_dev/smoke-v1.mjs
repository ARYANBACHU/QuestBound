// Owner: EV. Live smoke test (V1 guard + V2 UT demo). Run: node supabase/functions/_dev/smoke-v1.mjs (needs EXPO_PUBLIC_SUPABASE_URL/ANON_KEY; creates anonymous users + a test fellowship).
const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL, ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const out = (...a) => console.log(...a);
async function req(path, { method = 'GET', token, body, headers = {} } = {}) {
  const r = await fetch(URL_ + path, { method, headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}
async function user(name, crest, color, interests) {
  const { j } = await req('/auth/v1/signup', { method: 'POST', body: { data: {} } });
  const token = j.access_token, id = j.user.id;
  await req(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', token, body: { display_name: name, crest, color, interests }, headers: { Prefer: 'return=minimal' } });
  return { token, id, name };
}
const fn = (name, token, body) => req(`/functions/v1/${name}`, { method: 'POST', token, body });
const rest = (q, token) => req(`/rest/v1/${q}`, { token });
const check = (label, ok, extra = '') => out(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);

const A = await user('Ava', 'knight', 'red', ['video_games', 'museums']);
const B = await user('Ben', 'dragon', 'blue', ['photography', 'coffee']);
const C = await user('Cy', 'owl', 'green', ['art', 'live_music']);
const D = await user('Dee', 'fox', 'purple', ['parks']);
const f = (await req('/rest/v1/fellowships?select=*', { method: 'POST', token: A.token, body: { name: 'V1 Smoke Fellowship', created_by: A.id, lat: 30.2849, lng: -97.7341, area_label: 'Austin, TX' }, headers: { Prefer: 'return=representation' } })).j[0];
for (const [u, role] of [[A, 'founder'], [B, 'member'], [C, 'member']]) {
  const r = await req('/rest/v1/fellowship_members', { method: 'POST', token: u.token, body: { fellowship_id: f.id, user_id: u.id, role }, headers: { Prefer: 'return=minimal' } });
  if (r.status >= 300) out('join failed', u.name, r.status, r.j);
}
out('fellowship', f.id);

// ---- V1 guard
let r = await fn('generate-storyline', A.token, { mode: 'first' });
check('no fellowship_id -> 400 no_fellowship', r.status === 400 && r.j.code === 'no_fellowship', JSON.stringify(r.j));
r = await fn('generate-storyline', A.token, { fellowship_id: 'undefined', mode: 'first' });
check('"undefined" id -> 400 no_fellowship', r.status === 400 && r.j.code === 'no_fellowship');
r = await fn('generate-storyline', A.token, { fellowship_id: crypto.randomUUID(), mode: 'first' });
check('disbanded/unknown fellowship -> 404 no_fellowship', r.status === 404 && r.j.code === 'no_fellowship', JSON.stringify(r.j));
r = await fn('generate-storyline', D.token, { fellowship_id: f.id, mode: 'first', replace_active: true });
check('outsider -> 403 not_member', r.status === 403 && r.j.code === 'not_member', JSON.stringify(r.j));
r = await req('/functions/v1/generate-storyline', { method: 'POST', token: A.token, body: 'null' });
check('null body -> friendly 4xx', r.status === 400 && r.j.code === 'no_fellowship');
r = await req('/functions/v1/generate-storyline', { method: 'POST', token: A.token, body: '{not json' });
check('bad json -> friendly 4xx', r.status === 400 && !!r.j.error);
const noBooks = await rest(`storylines?select=id&fellowship_id=eq.${f.id}`, A.token);
check('no book was written by any rejected call', Array.isArray(noBooks.j) && noBooks.j.length === 0);

// ---- V2 UT demo
let t = Date.now();
r = await fn('generate-storyline', A.token, { fellowship_id: f.id, mode: 'first', demo: 'ut' });
check('UT demo summoned', r.status === 200 && !!r.j.storyline_id, `${Date.now() - t} ms`);
const sid = r.j.storyline_id;
const book = (await rest(`storylines?select=id,title,status,geo_enforced,generation_context&id=eq.${sid}`, A.token)).j[0];
check('UT book geo_enforced = false', book.geo_enforced === false, `${book.title} / ${book.status}`);
const coop = (book.generation_context?.ut_verify ?? []).find((v) => v.key === 'coop');
out('coop verify:', JSON.stringify(coop));
const pages = (await rest(`pages?select=id,chapter_number,title,template_id,status&storyline_id=eq.${sid}&order=chapter_number`, A.token)).j;
check('chapter I title', pages[0].title === 'The Forty Acres Awaken', pages.map((p) => `${p.chapter_number}:${p.template_id}:${p.title}`).join(' | '));
const ms = (await rest(`missions?select=id,page_id,region_id,title,type,required_members,points,place,status,proof_type,description&storyline_id=eq.${sid}`, A.token)).j;
for (const p of pages) {
  const pm = ms.filter((m) => m.page_id === p.id);
  const solos = pm.filter((m) => m.required_members === 1).length;
  out(`  ch${p.chapter_number} solos=${solos}  ` + pm.map((m) => `${m.region_id}:${m.required_members}`).join(' '));
}
const ch1 = ms.filter((m) => m.page_id === pages[0].id);
for (const m of ch1) out(`  · ${m.region_id.padEnd(10)} ${m.title.padEnd(28)} ${m.type}/${m.proof_type} x${m.required_members} ${m.points}pt  ${m.place?.title ?? '(no place)'}  — ${m.description}`);

// riddle from 290 km away (Dallas), right answer, 2 heroes -> colors, verdict carries distance
const moon = ch1.find((m) => m.region_id === 'moon');
r = await fn('submit-proof', A.token, { mission_id: moon.id, participant_ids: [A.id, B.id], proof_text: 'red eared sliders', lat: 32.7767, lng: -96.797, accuracy_m: 20 });
check('UT riddle from Dallas passes (geo not enforced) + distance shown', r.j.verdict?.pass === true && r.j.verdict?.distance_m > 250000, `pass=${r.j.verdict?.pass} d=${r.j.verdict?.distance_m} "${r.j.verdict?.flavor_text}"`);
// no GPS at all -> still passes (wrong answer path first: still a friendly hint)
const moat = ch1.find((m) => m.region_id === 'moat');
r = await fn('submit-proof', A.token, { mission_id: moat.id, participant_ids: [A.id], proof_url: 'https://example.com/x.jpg' });
check('duet still needs 2 heroes', r.j.verdict?.reason === 'not_enough_members', r.j.verdict?.flavor_text);

// ---- regression: a normal (enforced) book still blocks far proofs
r = await fn('generate-storyline', A.token, { fellowship_id: f.id, mode: 'first', demo: true });
const sid2 = r.j.storyline_id;
const b2 = (await rest(`storylines?select=geo_enforced,title&id=eq.${sid2}`, A.token)).j[0];
check('normal demo book geo_enforced = true', b2.geo_enforced === true, b2.title);
const ms2 = (await rest(`missions?select=id,region_id,place,required_members,status,proof_type&storyline_id=eq.${sid2}&status=eq.open`, A.token)).j;
const placed = ms2.find((m) => m.place?.lat && m.proof_type !== 'confirm');
if (placed) {
  r = await fn('submit-proof', A.token, { mission_id: placed.id, participant_ids: [A.id, B.id, C.id], proof_text: 'x', proof_url: 'https://example.com/x.jpg', lat: 32.7767, lng: -96.797, accuracy_m: 20 });
  check('enforced book blocks a far proof (too_far)', r.j.verdict?.reason === 'too_far', r.j.verdict?.flavor_text);
} else out('SKIP no placed mission in demo book');

// ---- V1: leave, then "New storyline"
await req(`/rest/v1/fellowship_members?fellowship_id=eq.${f.id}&user_id=eq.${C.id}`, { method: 'DELETE', token: C.token });
r = await fn('generate-storyline', C.token, { fellowship_id: f.id, mode: 'first', replace_active: true, difficulty: 'easy' });
check('after leaving -> 403 not_member, no book', r.status === 403 && r.j.code === 'not_member', r.j.error);
const after = (await rest(`storylines?select=id,status&fellowship_id=eq.${f.id}&status=eq.active`, A.token)).j;
check('the active book is untouched', after.length === 1 && after[0].id === sid2);
// switch back to the UT book for any manual poking
out('UT storyline', sid, 'fellowship', f.id);
