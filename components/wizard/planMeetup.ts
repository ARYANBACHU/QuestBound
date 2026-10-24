// Owner: AB. Muse plans a meetup from members' availability + the open missions that need company.
// Pure + local (no LLM) so it works offline; the chat post is a normal message from the user.
import type { FellowshipMember, Mission } from '@/shared/types';

export interface MeetupPlan {
  when: string; // "Saturday at 2 PM"
  slot: string;
  free: string[]; // display names free then
  mission: Mission | null;
  reply: string; // what Muse says in the sheet
  post: string; // the message posted to the fellowship chat
}

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function nextWhen(slot: string, now = new Date()): string {
  const d = now.getDay();
  if (slot === 'weekends') {
    // upcoming Saturday (or Sunday if today is Saturday evening)
    if (d === 6 && now.getHours() < 12) return 'today (Saturday) at 2 PM';
    if (d === 6) return 'tomorrow (Sunday) at 2 PM';
    if (d === 0 && now.getHours() < 12) return 'today (Sunday) at 2 PM';
    return 'Saturday at 2 PM';
  }
  if (slot === 'weekday_evenings') {
    let add = now.getHours() < 17 ? 0 : 1;
    while ([0, 6].includes((d + add) % 7)) add++;
    return add === 0 ? 'tonight at 7 PM' : add === 1 ? 'tomorrow at 7 PM' : `${DAY[(d + add) % 7]} at 7 PM`;
  }
  return 'tonight — whoever’s around';
}

export function planMeetup(members: FellowshipMember[], missions: Mission[], meId: string | null): MeetupPlan | null {
  const people = members.filter((m) => m.profile);
  if (people.length < 2) return null;
  const slots = ['weekends', 'weekday_evenings', 'spontaneous'];
  const ranked = slots
    .map((s) => ({ s, who: people.filter((m) => m.profile!.availability.includes(s)) }))
    .sort((a, b) => b.who.length - a.who.length);
  const best = ranked[0].who.length >= 2 ? ranked[0] : { s: 'weekends', who: people };
  const name = (m: FellowshipMember) => (m.user_id === meId ? 'you' : m.profile!.display_name);
  const free = best.who.map(name);

  const open = missions.filter((m) => m.status === 'open');
  const mission =
    (best.who.length >= people.length - 1 ? open.find((m) => m.type === 'gathering') : undefined)
    ?? open.find((m) => m.required_members >= 2 && m.required_members <= best.who.length)
    ?? open.find((m) => m.type === 'gathering')
    ?? open[0] ?? null;

  const when = nextWhen(best.s);
  const where = mission?.place ? ` at ${mission.place.title}` : '';
  const list = free.length > 2 ? `${free.slice(0, -1).join(', ')} and ${free[free.length - 1]}` : free.join(' and ');
  const reply = mission
    ? `${cap(list)} are free ${slotPhrase(best.s)}. How about ${when}${where} for "${mission.title}"? Shall I post it to the fellowship?`
    : `${cap(list)} are free ${slotPhrase(best.s)}. How about ${when}? Shall I post it to the fellowship?`;
  const post = mission
    ? `🧙 Muse proposes a quest: "${mission.title}"${where}, ${when}. Who's in? Reply 👍 or suggest another time!`
    : `🧙 Muse proposes a fellowship meetup ${when}. Who's in? Reply 👍 or suggest another time!`;
  return { when, slot: best.s, free, mission, reply, post };
}

function slotPhrase(s: string) {
  return s === 'weekends' ? 'on weekends' : s === 'weekday_evenings' ? 'on weekday evenings' : 'on a whim';
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
