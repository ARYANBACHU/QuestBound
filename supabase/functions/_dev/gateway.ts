// Local stand-in for Supabase (REST via PostgREST, auth/user, storage) + fake Meta LLM + fake SerpApi.
// Env: PGRST=http://127.0.0.1:54330, JWT_SECRET, FN_PORTS="generate-storyline=8101,submit-proof=8102,..."
// LLM_MODE: good | messy | garbage | slow | down
const PGRST = Deno.env.get('PGRST') ?? 'http://127.0.0.1:54330';
const SECRET = Deno.env.get('JWT_SECRET')!;
const FN_PORTS = Object.fromEntries((Deno.env.get('FN_PORTS') ?? '').split(',').filter(Boolean).map((kv) => kv.split('=')));
const STORE = Deno.env.get('STORE_DIR') ?? '/tmp/qb-dev/store';
let LLM_MODE = Deno.env.get('LLM_MODE') ?? 'good';
const llmLog: unknown[] = [];

function b64url(buf: ArrayBuffer | Uint8Array | string) {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
export async function sign(payload: Record<string, unknown>) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400, ...payload }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}
function claims(token: string) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null; }
}

const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function regionsFromPrompt(text: string): { id: string; size: string; types: string[] }[] {
  const out = [];
  for (const m of text.matchAll(/region_id "(\w+)" \([^,]+, (\w+)\) -> ([\w |]+)/g)) out.push({ id: m[1], size: m[2], types: m[3].split(' | ') });
  return out;
}

function fakeLLM(body: any): any {
  const msgs = body.messages as any[];
  const lastText = JSON.stringify(msgs[msgs.length - 1].content);
  const allText = msgs.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n');
  const name = body.response_format?.json_schema?.name;
  let content: any;
  if (name === 'outline' || lastText.includes('OUTLINE')) {
    const chapters = [...allText.matchAll(/"template_id": "(\w+)"/g)].map((m) => m[1]);
    content = { title: 'The Clockwork Owl of Austin', synopsis: 'A clockwork owl has stolen every song in Austin. The fellowship must win them back.', theme_tags: ['coffee', 'live_music', 'not_a_tag'],
      chapters: chapters.map((t, i) => ({ chapter_number: i + 1, template_id: t, title: `LLM chapter ${i + 1}`, narrative: `Narrative ${i + 1}.` })) };
  } else if (name === 'chapter' || lastText.includes('NOW WRITE CHAPTER')) {
    const regions = regionsFromPrompt(allText.split('NOW WRITE CHAPTER')[1] ?? '');
    content = { missions: regions.map((r, i) => {
      const messy = LLM_MODE === 'messy';
      let type = r.types[0];
      if (r.size === 'small') type = ['relic', 'bard', 'trial'][i % 3];
      if (r.size === 'medium') type = ['duet', 'trial', 'gift'][i % 3];
      if (messy && i === 0) type = 'duet'; // wrong type for large
      const trial = type === 'trial';
      return {
        region_id: r.id, type, title: `LLM ${r.id}`, description: `Do the ${r.id} thing at the place.`, story_hook: 'Hook.',
        place_ref: i % 2 ? `P${i}` : null, assignee_names: i === 3 ? ['Bram'] : [],
        trial_question: trial && !(messy && r.size === 'medium') ? 'What has keys but no locks?' : null,
        trial_answer: trial && !(messy && r.size === 'medium') ? 'Piano' : null,
        verification_hint: 'Show it.', points: messy ? 9999 : 10,
      };
    }) };
    if (LLM_MODE === 'messy') { content.missions.pop(); content.missions.push({ region_id: 'not_a_region', type: 'relic', title: 'x', description: 'y' }); }
  } else if (allText.includes('wants a DIFFERENT mission')) {
    const rid = allText.match(/region "(\w+)"/)?.[1];
    const types = allText.match(/allowed types: ([\w |]+)\)/)?.[1].split(' | ') ?? ['relic'];
    content = { missions: [{ region_id: rid, type: types[0], title: 'Rerolled quest', description: 'Do a brand new thing.', story_hook: 'New hook.', place_ref: 'P0', assignee_names: [], trial_question: types[0] === 'trial' ? 'Q?' : null, trial_answer: types[0] === 'trial' ? 'A' : null, verification_hint: 'Show it', points: 10 }] };
  } else if (allText.includes('Riddle:')) {
    content = { pass: /piano/i.test(lastText.split('Player answered:')[1] ?? ''), flavor_text: 'The mirror ponders your riddle answer.' };
  } else if (allText.includes('Magic Mirror')) {
    content = { pass: !lastText.includes('BADPHOTO'), confidence: 0.88, reason: 'fake', flavor_text: 'The Mirror sees truth in your photo!' };
  } else if (allText.includes('story_line')) {
    content = { story_line: 'The heroes did a fake heroic thing, and the page sang.' };
  } else if (allText.includes('recap')) {
    const ids = [...allText.matchAll(/user_id ([0-9a-f-]{36})/g)].map((m) => m[1]);
    content = { summary: 'They did it all.', highlights: ['One', 'Two', 'Three'], per_member: ids.map((id) => ({ user_id: id, title: 'X the Bold', contribution: 'Was there.' })), next_book_hint: 'More soon.' };
  } else {
    content = { ok: true };
  }
  let text = JSON.stringify(content);
  if (LLM_MODE === 'garbage') text = 'Once upon a time I forgot how to JSON.';
  return { choices: [{ message: { role: 'assistant', content: '```json\n' + text + '\n```' } }] };
}

function fakeSerp(url: URL): any {
  const engine = url.searchParams.get('engine');
  const q = url.searchParams.get('q') ?? '';
  if (engine === 'google_maps') return { local_results: [1, 2, 3, 4, 5].map((i) => ({ title: `${q} #${i}`, address: `${i}00 Guadalupe St`, rating: 4.5, type: q, place_id: `pid-${q}-${i}`, gps_coordinates: { latitude: 30.28, longitude: -97.74 } })) };
  if (engine === 'google_events') return { events_results: [1, 2].map((i) => ({ title: `Event ${i}`, address: ['Austin, TX'], date: { when: 'Sat, 7 PM' }, link: 'https://x' })) };
  if (engine === 'google_lens') return { visual_matches: [{ title: 'Full moon over Austin skyline' }, { title: 'Moon photography' }] };
  return {};
}

Deno.serve({ port: 54321 }, async (req) => {
  const url = new URL(req.url);
  const p = url.pathname;
  if (p === '/__mode') { LLM_MODE = url.searchParams.get('m') ?? LLM_MODE; return new Response(LLM_MODE); }
  if (p === '/__llmlog') return Response.json(llmLog.splice(0));
  if (p === '/__sign') return new Response(await sign(Object.fromEntries(url.searchParams)));
  if (p.startsWith('/llm/')) {
    const body = await req.json();
    llmLog.push({ path: p, model: body.model, response_format: body.response_format?.type, reasoning_effort: body.reasoning_effort, hasImage: JSON.stringify(body.messages ?? '').includes('image_url') });
    if (LLM_MODE === 'down') return new Response('down', { status: 503 });
    if (LLM_MODE === 'slow') await new Promise((r) => setTimeout(r, 40_000));
    if (p.endsWith('/images/generations')) return Response.json({ created: 1, data: [{ b64_json: PNG_1x1 }], output_format: 'png' });
    return Response.json(fakeLLM(body));
  }
  if (p === '/serp/search.json') return Response.json(fakeSerp(url));
  if (p === '/auth/v1/user') {
    const c = claims((req.headers.get('Authorization') ?? '').replace('Bearer ', ''));
    if (!c?.sub) return Response.json({ msg: 'bad jwt' }, { status: 401 });
    return Response.json({ id: c.sub, aud: 'authenticated', role: 'authenticated' });
  }
  if (p.startsWith('/storage/v1/object/')) {
    const rel = p.replace('/storage/v1/object/', '');
    const path = `${STORE}/${rel}`;
    await Deno.mkdir(path.split('/').slice(0, -1).join('/'), { recursive: true });
    await Deno.writeFile(path, new Uint8Array(await req.arrayBuffer()));
    return Response.json({ Key: rel });
  }
  if (p.startsWith('/rest/v1/')) {
    const target = `${PGRST}${p.replace('/rest/v1', '')}${url.search}`;
    const headers = new Headers(req.headers);
    headers.delete('host');
    const res = await fetch(target, { method: req.method, headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer() });
    return new Response(res.body, { status: res.status, headers: res.headers });
  }
  if (p.startsWith('/functions/v1/')) {
    const name = p.split('/')[3];
    const port = FN_PORTS[name];
    if (!port) return new Response('no fn', { status: 404 });
    const res = await fetch(`http://127.0.0.1:${port}/`, { method: req.method, headers: req.headers, body: await req.arrayBuffer() });
    return new Response(res.body, { status: res.status, headers: res.headers });
  }
  return new Response('not found ' + p, { status: 404 });
});
