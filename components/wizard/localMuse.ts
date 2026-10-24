// Owner: AB. Offline Muse: answers common questions from live app data. Used in mock mode and when
// wizard-chat is unreachable, so the Wizard is never silent during a demo.
import type { FellowshipMember, Mission, Page, Storyline, WizardAction, WizardChatResponse } from '@/shared/types';
import type { WizardScreen } from './screens';

export interface MuseContext {
  meId: string | null;
  members: FellowshipMember[];
  storyline: Storyline | null;
  activePage: Page | null;
  missions: Mission[];
}

const nameOf = (ctx: MuseContext, id: string) =>
  id === ctx.meId ? 'you' : ctx.members.find((m) => m.user_id === id)?.profile?.display_name ?? 'a friend';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const avail = (ctx: MuseContext, id: string) => ctx.members.find((m) => m.user_id === id)?.profile?.availability ?? [];

function pickPair(ctx: MuseContext): [string, string, string] | null {
  const others = ctx.members.filter((m) => m.user_id !== ctx.meId);
  const me = ctx.meId;
  if (!me) return null;
  const mine = avail(ctx, me);
  for (const o of others) {
    const shared = avail(ctx, o.user_id).find((a) => mine.includes(a));
    if (shared) return [me, o.user_id, shared === 'weekends' ? 'on the weekend' : shared === 'weekday_evenings' ? 'on a weekday evening' : 'on a whim'];
  }
  return others[0] ? [me, others[0].user_id, 'soon'] : null;
}

export function localMuse(question: string, screen: WizardScreen, ctx: MuseContext): WizardChatResponse {
  const q = question.toLowerCase();
  const pageMissions = ctx.missions.filter((m) => m.page_id === ctx.activePage?.id);
  const open = pageMissions.filter((m) => m.status === 'open' || m.status === 'pending');
  const needFriends = open.filter((m) => m.required_members >= 2);
  const actions: WizardAction[] = [];

  if (!ctx.storyline) {
    return {
      reply: 'Your book is still blank! Gather your fellowship, then let me write your first tale.',
      actions: [{ type: 'summon_storyline' }],
    };
  }

  if (/sequel|next book/.test(q)) {
    return { reply: 'When every page of this book is colored, I write a sequel — shaped by what you actually did. Love duets? Expect more duets.', actions: [{ type: 'navigate', target: 'storybook' }] };
  }
  if (/montage|album|recap/.test(q)) {
    return { reply: 'The montage plays from your Storybook once photos are in. Every proof photo becomes a frame.', actions: [{ type: 'navigate', target: 'storybook' }] };
  }
  if (/invite|join|add friend/.test(q)) {
    return { reply: 'Open Friends and tap Invite — a friend scans the QR or types your 6-letter code. Bigger fellowship, bigger feasts.', actions: [{ type: 'navigate', target: 'friends' }] };
  }
  if (/type|explain mission|kinds?/.test(q)) {
    return { reply: 'Gatherings need everyone. Duets need two. Gifts: one gives, the other confirms. Relics want a photo, Bards want a verse, Trials want an answer.', actions: [] };
  }
  if (/color a region|how do i color|turn|pages? turn/.test(q)) {
    return { reply: 'Finish a mission in real life, submit proof, and the Magic Mirror checks it. Pass, and the region fills with your crayon. Color all six and the page turns.', actions: [{ type: 'navigate', target: 'coloring' }] };
  }
  if (/explain this page|this page|chapter/.test(q) && ctx.activePage) {
    const done = pageMissions.length - open.length;
    return { reply: `"${ctx.activePage.title}" — ${ctx.activePage.narrative} ${done} of ${pageMissions.length} regions colored so far.`, actions: [] };
  }
  if (/need friends|pair|team|who should/.test(q) && needFriends.length) {
    const m = needFriends.find((x) => x.type !== 'gathering') ?? needFriends[0];
    const pair = pickPair(ctx);
    const who = m.type === 'gathering'
      ? 'It needs the whole fellowship'
      : pair ? `${cap(nameOf(ctx, pair[0]))} and ${nameOf(ctx, pair[1])} are both free ${pair[2]}` : 'Grab a friend';
    const gathering = needFriends.find((x) => x.type === 'gathering' && x.id !== m.id);
    actions.push({ type: 'open_mission', target: m.id });
    return {
      reply: `${needFriends.length} missions need company. ${who} — perfect for "${m.title}"${m.place ? ` at ${m.place.title}` : ''}.${gathering ? ` And "${gathering.title}" needs everyone.` : ''}`,
      actions,
    };
  }
  if (/meetup|plan|when/.test(q)) {
    const gathering = open.find((m) => m.type === 'gathering') ?? needFriends[0];
    const weekend = ctx.members.filter((m) => m.profile?.availability.includes('weekends')).map((m) => m.profile!.display_name);
    const when = weekend.length >= 2 ? `${weekend.slice(0, 3).join(', ')} are free on weekends — Saturday afternoon?` : 'Pick an evening this week?';
    if (gathering) actions.push({ type: 'open_mission', target: gathering.id });
    return { reply: `${when} ${gathering ? `Make it "${gathering.title}"${gathering.place ? ` at ${gathering.place.title}` : ''} and you'll color a big region together.` : ''}`.trim(), actions };
  }
  // default: what next
  const next = open.find((m) => m.required_members === 1 && (m.assignee_ids.length === 0 || (ctx.meId && m.assignee_ids.includes(ctx.meId))))
    ?? open[0];
  if (!next) {
    return { reply: 'Every region on this page is colored or waiting on a seal. Check the page — it may be ready to turn!', actions: [{ type: 'navigate', target: 'coloring' }] };
  }
  actions.push({ type: 'open_mission', target: next.id });
  if (screen !== 'missions') actions.push({ type: 'navigate', target: 'missions' });
  return {
    reply: `Try "${next.title}"${next.place ? ` at ${next.place.title}` : ''}. ${next.story_hook} ${open.length - 1 > 0 ? `${open.length - 1} more regions still wait.` : 'It is the last one on this page!'}`.trim(),
    actions,
  };
}
