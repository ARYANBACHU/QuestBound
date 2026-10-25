// Owner: EV. Live smoke test (V6 crews). Run: node supabase/functions/_dev/smoke-v6.mjs [llm|demo] — prints every mission + solos per page.
const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL, ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
async function req(path, { method = 'GET', token, body, headers = {} } = {}) {
  const r = await fetch(URL_ + path, { method, headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j };
}
async function user(name, crest, color, interests) {
  const { j } = await req('/auth/v1/signup', { method: 'POST', body: { data: {} } });
  await req(`/rest/v1/profiles?id=eq.${j.user.id}`, { method: 'PATCH', token: j.access_token, body: { display_name: name, crest, color, interests }, headers: { Prefer: 'return=minimal' } });
  return { token: j.access_token, id: j.user.id };
}
const us = [await user('Ava', 'knight', 'red', ['video_games', 'coffee']), await user('Ben', 'dragon', 'blue', ['hiking', 'coffee']), await user('Cy', 'owl', 'green', ['live_music', 'art']), await user('Dee', 'fox', 'purple', ['board_games', 'parks'])];
const A = us[0];
const f = (await req('/rest/v1/fellowships?select=*', { method: 'POST', token: A.token, body: { name: 'V6 Smoke', created_by: A.id, lat: 30.2849, lng: -97.7341, area_label: 'Austin, TX' }, headers: { Prefer: 'return=representation' } })).j[0];
for (const [i, u] of us.entries()) await req('/rest/v1/fellowship_members', { method: 'POST', token: u.token, body: { fellowship_id: f.id, user_id: u.id, role: i ? 'member' : 'founder' }, headers: { Prefer: 'return=minimal' } });
const kind = process.argv[2] ?? 'llm';
const t = Date.now();
const r = await req('/functions/v1/generate-storyline', { method: 'POST', token: A.token, body: { fellowship_id: f.id, mode: 'first', ...(kind === 'demo' ? { demo: true } : {}), art_ready: ['castle_gate', 'enchanted_forest', 'dragon_peak', 'royal_feast', 'candy_village', 'starlit_tower', 'mermaid_lagoon'] } });
console.log(kind, r.status, Date.now() - t, 'ms');
const sid = r.j.storyline_id;
const b = (await req(`/rest/v1/storylines?select=title,geo_enforced,generation_context&id=eq.${sid}`, { token: A.token })).j[0];
console.log(b.title, 'geo', b.geo_enforced, JSON.stringify(b.generation_context?.source));
const pages = (await req(`/rest/v1/pages?select=id,chapter_number,template_id&storyline_id=eq.${sid}&order=chapter_number`, { token: A.token })).j;
const ms = (await req(`/rest/v1/missions?select=page_id,region_id,type,required_members,points,description&storyline_id=eq.${sid}`, { token: A.token })).j;
let worst = 0;
for (const p of pages) {
  const pm = ms.filter((m) => m.page_id === p.id); const solos = pm.filter((m) => m.required_members === 1).length; worst = Math.max(worst, solos);
  console.log(`ch${p.chapter_number} ${p.template_id} solos=${solos}`);
  for (const m of pm) console.log(`   ${m.region_id.padEnd(14)} ${m.type.padEnd(9)} x${m.required_members} ${String(m.points).padStart(2)}pt  ${m.description.slice(0, 110)}`);
}
console.log(worst <= 1 ? 'PASS max 1 solo per page' : 'FAIL solos');
