// Plays a whole book against the local stack. Usage: deno run -A loop.ts [demo|llm]
const GW = 'http://127.0.0.1:54321';
const F = 'aaaaaaaa-0000-0000-0000-000000000001';
const U = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'];
const OUTSIDER = '55555555-5555-5555-5555-555555555555';
const tok = async (sub: string, role = 'authenticated') => (await fetch(`${GW}/__sign?sub=${sub}&role=${role}`)).text();
const SRK = await (await fetch(`${GW}/__sign?role=service_role`)).text();
let failures = 0;
const check = (cond: unknown, msg: string) => { console.log(`${cond ? '  ok ' : '  FAIL'} ${msg}`); if (!cond) failures++; };

async function call(fn: string, user: string, body: unknown) {
  const res = await fetch(`${GW}/functions/v1/${fn}`, { method: 'POST', headers: { Authorization: `Bearer ${await tok(user)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t0 = Date.now();
  const j = await res.json();
  return { status: res.status, ...j, _ms: Date.now() - t0 };
}
async function rest(path: string) {
  const res = await fetch(`${GW}/rest/v1/${path}`, { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } });
  return res.json();
}
const ANSWERS: Record<string, string> = { tower_flag: 'A keyboard!', river: 'river', clouds: 'Footsteps', chandelier: 'candle' };

const mode = Deno.args[0] ?? 'demo';
const gen = await call('generate-storyline', U[0], { fellowship_id: F, mode: 'first', demo: mode === 'demo' });
check(gen.status === 200 && gen.storyline_id, `generate first (${mode}) -> ${gen.storyline_id}`);
const sid = gen.storyline_id;

// negatives on chapter 1
const missions = await rest(`missions?storyline_id=eq.${sid}&select=*,pages(chapter_number)&order=created_at`);
const ch = (n: number) => missions.filter((m: any) => m.pages.chapter_number === n);
const locked = ch(2)[0];
let r = await call('submit-proof', U[0], { mission_id: locked.id, participant_ids: [U[0]], proof_text: 'x' });
check(r.verdict?.pass === false && r.verdict.reason === 'locked', 'locked mission rejected');
r = await call('submit-proof', OUTSIDER, { mission_id: ch(1)[0].id, participant_ids: [OUTSIDER] });
check(r.status === 403, 'outsider 403');
const gathering = ch(1).find((m: any) => m.type === 'gathering');
r = await call('submit-proof', U[0], { mission_id: gathering.id, participant_ids: [U[0]], proof_url: 'https://img/x.jpg' });
check(r.verdict?.pass === false && r.verdict.reason === 'not_enough_members', `gathering with 1 person rejected: "${r.verdict?.flavor_text}"`);
const trial = ch(1).find((m: any) => m.type === 'trial');
if (trial) {
  r = await call('submit-proof', U[1], { mission_id: trial.id, participant_ids: [U[1]], proof_text: 'a toaster' });
  check(r.verdict?.pass === false, `wrong answer rejected: "${r.verdict?.flavor_text}"`);
}
const relic = ch(1).find((m: any) => m.proof_type === 'photo' && m.type === 'relic');
if (relic) {
  r = await call('submit-proof', U[2], { mission_id: relic.id, participant_ids: [U[2]], proof_url: 'https://img/BADPHOTO.jpg' });
  check(r.verdict?.pass === false, `bad photo rejected: "${r.verdict?.flavor_text}" lens=${JSON.stringify(r.verdict?.lens_titles)}`);
}

// play every chapter
for (let n = 1; n <= 4; n++) {
  const list = ch(n);
  if (!list.length) break;
  console.log(`-- chapter ${n} (${list.length} missions)`);
  let turned = false, bookDone = false;
  for (const [i, m] of list.entries()) {
    const actor = U[i % U.length];
    const partner = U[(i + 1) % U.length];
    let body: any = { mission_id: m.id, participant_ids: [actor] };
    if (m.type === 'gathering') body = { ...body, participant_ids: U.slice(0, 3), proof_url: `https://img/group-${m.id}.jpg` };
    else if (m.type === 'duet') body = { ...body, participant_ids: [actor, partner], proof_url: `https://img/duet-${m.id}.jpg` };
    else if (m.proof_type === 'photo') body = { ...body, proof_url: `https://img/relic-${m.id}.jpg` };
    else if (m.proof_type === 'answer') body = { ...body, participant_ids: m.required_members > 1 ? [actor, partner] : [actor], proof_text: ANSWERS[m.region_id] ?? 'piano' };
    else if (m.proof_type === 'text') body = { ...body, proof_text: 'Two lines of verse, bravely sung.' };
    if (m.proof_type === 'confirm') {
      r = await call('submit-proof', actor, { ...body, confirm_for: partner });
      check(r.verdict?.pass && r.mission?.status === 'pending', `gift sent (${m.region_id})`);
      const wrong = await call('submit-proof', actor, { mission_id: m.id, participant_ids: [actor], confirm_for: partner });
      check(wrong.verdict?.pass === false, `giver cannot self-seal: "${wrong.verdict?.flavor_text}"`);
      r = await call('submit-proof', partner, { mission_id: m.id, participant_ids: [partner], confirm_for: actor });
    } else {
      r = await call('submit-proof', actor, body);
    }
    const ok = r.verdict?.pass && r.mission?.status === 'complete';
    check(ok, `${m.region_id} (${m.type}/${m.proof_type}) -> ${ok ? r.mission.story_line?.slice(0, 70) : JSON.stringify(r).slice(0, 300)}`);
    if (r.page_completed) turned = true;
    if (r.book_completed) bookDone = true;
  }
  check(turned, `chapter ${n} page_completed reported`);
  const pages = await rest(`pages?storyline_id=eq.${sid}&order=chapter_number`);
  check(pages[n - 1].status === 'complete', `page ${n} complete in db`);
  if (pages[n]) check(pages[n].status === 'active', `page ${n + 1} active`);
  if (bookDone) { console.log('-- book complete'); break; }
}
// dup submit
r = await call('submit-proof', U[0], { mission_id: ch(1)[1].id, participant_ids: [U[0], U[1]], proof_text: 'again', proof_url: 'https://img/again.jpg' });
check(r.verdict?.pass === false && r.verdict.reason === 'already_complete', 'already-complete rejected');

await new Promise((res) => setTimeout(res, 1500)); // background art
const [book] = await rest(`storylines?id=eq.${sid}`);
check(book.status === 'complete' && book.recap?.summary, `book complete with recap: "${book.recap?.summary?.slice(0, 90)}" stats=${JSON.stringify(book.recap?.stats)}`);
check(book.recap?.per_member?.length === 4, 'recap has 4 per_member entries');
const mem = await rest(`memories?storyline_id=eq.${sid}&select=kind`);
const kinds = mem.reduce((a: any, m: any) => ((a[m.kind] = (a[m.kind] ?? 0) + 1), a), {});
check(kinds.photo > 0 && kinds.illustration > 0, `memories: ${JSON.stringify(kinds)}`);
const pagesArt = await rest(`pages?storyline_id=eq.${sid}&select=illustration_url`);
check(pagesArt.every((p: any) => p.illustration_url), `illustrations: ${pagesArt[0]?.illustration_url}`);
const msgs = await rest(`messages?fellowship_id=eq.${F}&order=created_at&select=kind,body,payload`);
const events = msgs.map((m: any) => m.payload?.event ?? m.kind);
check(events.includes('book_complete') && events.filter((e: string) => e === 'page_complete').length >= 3, `proclamations: ${JSON.stringify(events.reduce((a: any, e: string) => ((a[e] = (a[e] ?? 0) + 1), a), {}))}`);
const mc = msgs.find((m: any) => m.payload?.event === 'mission_complete');
check(mc?.payload?.color && mc.payload.region_id, `mission_complete payload has color+region: ${JSON.stringify(mc?.payload)}`);

// sequel
const seq = await call('generate-storyline', U[1], { fellowship_id: F, mode: 'sequel' });
check(seq.status === 200 && seq.adaptation?.note, `sequel -> note: "${seq.adaptation?.note}"`);
const [s2] = await rest(`storylines?id=eq.${seq.storyline_id}`);
check(s2.book_number === 2 && s2.status === 'active', `sequel book_number=${s2.book_number} title="${s2.title}"`);
const p2 = await rest(`pages?storyline_id=eq.${seq.storyline_id}&order=chapter_number&select=template_id`);
check(p2.length === 3 && p2[2].template_id === 'royal_feast', `sequel chapters: ${p2.map((p: any) => p.template_id).join(',')}`);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASSED');
