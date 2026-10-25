// Owner: AB. POST WizardChatRequest -> WizardChatResponse. Full spec: handoffs/AB.md §7.
// Sage the Wizard (powered by Meta's Muse Spark): answers questions about the app and the group's live story,
// and nudges friends to meet up.
// Never fails the client: any error -> a friendly canned reply with no actions.
import { preflight, json, fail } from '../_shared/cors.ts';
import { admin, callerId } from '../_shared/db.ts';
import { chatJSON, type ChatMsg } from '../_shared/llm.ts';

// Round 2 naming: the character is Sage; "Muse" (Meta's model) is only the credit line. Inline so the wizard's voice
// doesn't depend on EV's narrator persona wording.
const SAGE_PERSONA =
  'You are Sage, a warm, witty, slightly cheeky wizard-narrator (round, starry hat, cloud beard, glowing staff) who ' +
  'writes fairy tales about real friend groups. You run on Meta\'s Muse Spark model, but your name is Sage. You speak in short, ' +
  'vivid sentences with gentle humor. You never mock anyone. You turn ordinary real-world activities (getting coffee, ' +
  'walking a bridge, playing board games) into chapters of a fairy tale. You care about one thing: getting friends to ' +
  'spend real time together.';

const APP_GUIDE = `
HOW QUESTBOUND WORKS (explain from this; never invent features):
- A Fellowship is a friend group. Sage writes them a Book (Storyline) of 3-4 Chapters. Each Chapter is a coloring page.
- Each page has 6 regions; each region is one Mission done in real life. Finishing a mission fills its region with the
  finisher's crayon color and Sage posts a Proclamation ("Hear ye!") in the group chat.
- Region size decides who must take part: LARGE regions are Gatherings (the whole fellowship, a group photo);
  MEDIUM regions need two people (Duet = do it together and take a photo; Gift = one friend gives a small gift, the
  receiver confirms it in the app; co-op Trial = answer a riddle together); SMALL regions are solo (Relic = photo of a
  thing or place; Bard = write a short verse; Trial = answer a riddle). You cannot finish a page alone.
- Proof: photos are checked by the Magic Mirror (Sage looks at the photo, and Google Lens says what it sees);
  verses and riddle answers are checked by Sage; gifts are sealed when the receiver confirms. Missions at a real place
  also check that you are actually near it (GPS) — "You're close!" shows on the mission when you are.
- Not feeling a mission? On the mission, tap "…" -> "Ask Sage for a different mission" (easier / similar / harder).
- Want a whole new tale? Missions "…" or Settings -> "New storyline" (Easy / Normal / Hard; the current book goes to the
  Storybook). Hard books are worth 1.5x points.
- When all 6 regions are colored the page turns, Sage paints an illustration of the chapter, and the next chapter's
  missions unlock. When the book is finished: album, montage, recap, and Sage writes a Sequel tailored to what the
  group actually did (what they finished, skipped, loved).
TABS: Friends (fellowship members, group chat with proclamations, Invite button with QR + 6-letter code),
  Missions (the quest board: chapter selector I/II/III to look back at past chapters, filters, groups by Whole
  fellowship / Pairs / Solo, points leaderboard, tap a card to submit proof),
  Page (the coloring page itself; tap a region to see its mission), Storybook (finished chapters, album, montage,
  sequel), Settings (crest, crayon, interests, invite code, music + sound effects, new storyline, replay the tour).
  The little speaker on the tab bar mutes the bards' music.
INVITING: Friends tab -> Invite -> friend scans the QR or types the 6-letter code during onboarding.
`.trim();

const OUTPUT_RULES = `
REPLY RULES:
- Answer as Sage: warm, playful, a little theatrical and cheeky, never cringe. Short sentences. At most 70 words.
  Never call yourself Muse.
- Be specific: name real missions, places and fellowship members from the CONTEXT. Never invent missions, places,
  people, times or features that are not in the CONTEXT or the guide.
- Push the group to meet in real life. When a mission needs two or more people, suggest WHO could pair up, using their
  availability ("both free on weekends") and interests.
- If there is no book yet, suggest summoning one.
- Return ONLY a JSON object: {"reply": string, "actions": Action[]} with 0-2 actions. Action is one of:
  {"type":"navigate","target":"friends"|"missions"|"coloring"|"storybook"|"settings"}
  {"type":"open_mission","target":"<mission id from CONTEXT>"}
  {"type":"summon_storyline"}
  Only add an action when it directly helps with what was asked. Never put ids in the reply text.
`.trim();

const TABS = ['friends', 'missions', 'coloring', 'storybook', 'settings'] as const;
const AVAIL: Record<string, string> = { weekday_evenings: 'weekday evenings', weekends: 'weekends', spontaneous: 'spontaneous' };

type Role = 'user' | 'assistant';
interface Req { fellowship_id: string | null; screen?: string; messages?: { role: Role; content: string }[] }
type Action =
  | { type: 'navigate'; target: (typeof TABS)[number] }
  | { type: 'open_mission'; target: string }
  | { type: 'summon_storyline' };

interface Ctx {
  me: Record<string, unknown> | null;
  fellowship: Record<string, unknown> | null;
  members: Record<string, unknown>[];
  book: Record<string, unknown> | null;
  active_page: Record<string, unknown> | null;
  recent_chat: Record<string, unknown>[];
  missionIds: Set<string>;
  hasBook: boolean;
  openMissions: { title: string; place?: string; required: number }[];
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);

  let body: Req;
  try { body = await req.json(); } catch { return fail('Bad JSON'); }
  const screen = TABS.includes(body.screen as (typeof TABS)[number]) ? body.screen! : 'coloring';
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!history.length || history[history.length - 1].role !== 'user') {
    return json({ reply: 'Ask me anything, traveler — about your missions, your friends, or how the tale works.', actions: [] });
  }

  let ctx: Ctx | null = null;
  try {
    ctx = await loadContext(uid, body.fellowship_id);
  } catch (e) {
    console.error('[wizard-chat] context', String(e));
  }

  if (!Deno.env.get('LLM_API_KEY')) return json(canned(ctx));

  const { missionIds: _ids, hasBook: _hb, openMissions: _om, ...visible } = ctx ?? ({} as Ctx);
  const system = [
    SAGE_PERSONA,
    APP_GUIDE,
    OUTPUT_RULES,
    `CURRENT SCREEN: ${screen}`,
    `CONTEXT (live data, JSON): ${JSON.stringify(ctx ? visible : { note: 'No fellowship yet.' })}`,
  ].join('\n\n');
  const messages: ChatMsg[] = [{ role: 'system', content: system }, ...history];

  try {
    const out = await chatJSON<{ reply?: unknown; actions?: unknown }>(messages, { temperature: 0.7, timeoutMs: 20_000 });
    const reply = typeof out.reply === 'string' ? clampWords(out.reply.trim(), 90) : '';
    if (!reply) throw new Error('empty reply');
    return json({ reply, actions: validateActions(out.actions, ctx) });
  } catch (e) {
    console.error('[wizard-chat] llm', String(e));
    return json(canned(ctx));
  }
});

// ---------- context ----------
async function loadContext(uid: string, fellowshipId: string | null): Promise<Ctx> {
  const meRes = await admin.from('profiles').select('*').eq('id', uid).maybeSingle();
  const me = meRes.data;
  const ctx: Ctx = {
    me: me ? personOf(me, true) : null,
    fellowship: null, members: [], book: null, active_page: null, recent_chat: [],
    missionIds: new Set(), hasBook: false, openMissions: [],
  };
  if (!fellowshipId) return ctx;

  const membership = await admin.from('fellowship_members').select('user_id')
    .eq('fellowship_id', fellowshipId).eq('user_id', uid).maybeSingle();
  if (!membership.data) return ctx; // not a member: answer generically

  const [fRes, memRes, bookRes, chatRes] = await Promise.all([
    admin.from('fellowships').select('name, invite_code, area_label').eq('id', fellowshipId).maybeSingle(),
    admin.from('fellowship_members').select('user_id, role').eq('fellowship_id', fellowshipId),
    admin.from('storylines').select('id, title, synopsis, book_number, status')
      .eq('fellowship_id', fellowshipId).order('book_number', { ascending: false }).limit(1).maybeSingle(),
    admin.from('messages').select('user_id, kind, body, created_at')
      .eq('fellowship_id', fellowshipId).order('created_at', { ascending: false }).limit(15),
  ]);

  const memberIds = (memRes.data ?? []).map((m) => m.user_id as string);
  const profRes = memberIds.length ? await admin.from('profiles').select('*').in('id', memberIds) : { data: [] };
  const profiles = new Map<string, Record<string, unknown>>((profRes.data ?? []).map((p) => [p.id as string, p]));
  const nameOf = (id: string | null) => (id && (profiles.get(id)?.display_name as string)) || 'someone';

  if (fRes.data) ctx.fellowship = { name: fRes.data.name, invite_code: fRes.data.invite_code, area: fRes.data.area_label };
  ctx.members = (memRes.data ?? []).map((m) => {
    const p = profiles.get(m.user_id as string);
    return { ...(p ? personOf(p, m.user_id === uid) : { name: 'someone' }), role: m.role };
  });
  ctx.recent_chat = (chatRes.data ?? []).reverse().map((m) => ({
    who: m.kind === 'text' ? nameOf(m.user_id as string) : m.kind, text: String(m.body).slice(0, 200),
  }));

  const book = bookRes.data;
  if (!book) return ctx;
  ctx.hasBook = true;

  const pagesRes = await admin.from('pages').select('id, chapter_number, title, narrative, template_id, status')
    .eq('storyline_id', book.id).order('chapter_number');
  const pages = pagesRes.data ?? [];
  const active = pages.find((p) => p.status === 'active') ?? pages.filter((p) => p.status === 'complete').slice(-1)[0];
  ctx.book = {
    title: book.title, synopsis: book.synopsis, book_number: book.book_number, status: book.status,
    chapters: pages.map((p) => ({ chapter: p.chapter_number, title: p.title, status: p.status })),
  };
  if (!active) return ctx;

  const msRes = await admin.from('missions')
    .select('id, region_id, title, description, type, proof_type, required_members, assignee_ids, place, status, completed_by, points')
    .eq('page_id', active.id);
  const missions = msRes.data ?? [];
  missions.forEach((m) => ctx.missionIds.add(m.id as string));
  ctx.openMissions = missions.filter((m) => m.status === 'open' || m.status === 'pending')
    .map((m) => ({ title: m.title as string, place: (m.place as { title?: string } | null)?.title, required: m.required_members as number }));
  ctx.active_page = {
    chapter: active.chapter_number, title: active.title, narrative: active.narrative,
    colored: `${missions.filter((m) => m.status === 'complete').length} of ${missions.length}`,
    missions: missions.map((m) => {
      const place = m.place as { title?: string; address?: string; when?: string } | null;
      return {
        id: m.id, title: m.title, type: m.type, region: m.region_id, status: m.status, points: m.points,
        what_to_do: String(m.description ?? '').slice(0, 200),
        people_needed: m.required_members,
        assigned_to: ((m.assignee_ids as string[]) ?? []).map(nameOf),
        completed_by: ((m.completed_by as string[]) ?? []).map(nameOf),
        place: place ? { title: place.title, address: place.address, when: place.when } : null,
      };
    }),
  };
  return ctx;
}

function personOf(p: Record<string, unknown>, isMe: boolean) {
  return {
    name: p.display_name, crest: p.crest, crayon: p.color, is_me: isMe || undefined,
    interests: p.interests, budget: p.budget,
    free: ((p.availability as string[]) ?? []).map((a) => AVAIL[a] ?? a),
  };
}

// ---------- validation ----------
function validateActions(raw: unknown, ctx: Ctx | null): Action[] {
  if (!Array.isArray(raw)) return [];
  const out: Action[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object') continue;
    const t = (a as { type?: unknown }).type;
    const target = (a as { target?: unknown }).target;
    if (t === 'navigate' && TABS.includes(target as (typeof TABS)[number])) {
      out.push({ type: 'navigate', target: target as (typeof TABS)[number] });
    } else if (t === 'open_mission' && typeof target === 'string' && ctx?.missionIds.has(target)) {
      out.push({ type: 'open_mission', target });
    } else if (t === 'summon_storyline' && ctx && !ctx.hasBook && ctx.fellowship) {
      out.push({ type: 'summon_storyline' });
    }
    if (out.length >= 2) break;
  }
  // de-dupe
  return out.filter((a, i) => out.findIndex((b) => JSON.stringify(b) === JSON.stringify(a)) === i);
}

function clampWords(s: string, max: number) {
  const words = s.split(/\s+/);
  return words.length <= max ? s : `${words.slice(0, max).join(' ')}…`;
}

// ---------- fallback ----------
function canned(ctx: Ctx | null): { reply: string; actions: Action[] } {
  if (!ctx?.fellowship) {
    return { reply: 'My crystal ball is foggy, traveler. Gather your fellowship, and I will write you a tale worth living.', actions: [] };
  }
  if (!ctx.hasBook) {
    return { reply: 'Your book is still blank! Summon your story and I will fill it with quests around town.', actions: [] };
  }
  const pair = ctx.openMissions.find((m) => m.required >= 2);
  const any = pair ?? ctx.openMissions[0];
  if (any) {
    return {
      reply: `My crystal ball flickers, but I can still see the board: "${any.title}"${any.place ? ` at ${any.place}` : ''} awaits${any.required >= 2 ? ' — bring a friend' : ''}. Ask me again in a moment.`,
      actions: [],
    };
  }
  return { reply: 'Every region on this page is colored or waiting on a seal. Peek at the page — it may be ready to turn!', actions: [] };
}
