// Owner: AB. Small pure helpers for missions UI.
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { TEMPLATES, regionDef } from '@/shared/templates';
import { CRAYONS } from '@/shared/theme';

export type MissionGroup = 'whole' | 'pairs' | 'solo';

export function missionGroup(m: Mission): MissionGroup {
  if (m.type === 'gathering') return 'whole';
  if (m.type === 'duet' || m.type === 'gift' || m.required_members >= 2) return 'pairs';
  return 'solo';
}

export const GROUP_TITLES: Record<MissionGroup, { title: string; sub: string }> = {
  whole: { title: 'Whole fellowship', sub: 'The big regions. Everyone shows up.' },
  pairs: { title: 'Pairs', sub: 'Grab a friend — these need two heroes.' },
  solo: { title: 'Solo', sub: 'Small regions you can color on your own.' },
};

export function completerColor(m: Mission, members: FellowshipMember[]): string | null {
  if (m.status !== 'complete') return null;
  const p = members.find((x) => x.user_id === m.completed_by[0])?.profile;
  return p ? CRAYONS[p.color] : CRAYONS.violet;
}

/** Missions of a page in the template's region order (big → small). */
export function orderedPageMissions(page: Page, missions: Mission[]): Mission[] {
  const order = TEMPLATES[page.template_id]?.regions.map((r) => r.id) ?? [];
  return missions
    .filter((m) => m.page_id === page.id)
    .sort((a, b) => order.indexOf(a.region_id) - order.indexOf(b.region_id));
}

export function regionLabel(page: Page | null | undefined, m: Mission): string {
  return (page && regionDef(page.template_id, m.region_id)?.label) ?? m.region_id.replace(/_/g, ' ');
}

export function pointsByMember(missions: Mission[], members: FellowshipMember[]) {
  return members
    .map((mem) => ({
      member: mem,
      points: missions.filter((m) => m.status === 'complete' && m.completed_by.includes(mem.user_id)).reduce((s, m) => s + m.points, 0),
    }))
    .sort((a, b) => b.points - a.points);
}

export function needsLabel(m: Mission): string | null {
  if (m.type === 'gathering') return 'Everyone';
  if (m.required_members >= 2) return `Needs ${m.required_members} heroes`;
  return null;
}
