// Owner: AB. Small pure helpers for missions UI.
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { TEMPLATES, regionDef } from '@/shared/templates';
import { CRAYONS } from '@/shared/theme';
import { leaderboard } from './engine';

export type MissionGroup = 'whole' | 'pairs' | 'solo';

export function missionGroup(m: Mission): MissionGroup {
  if (m.type === 'gathering') return 'whole';
  if (m.type === 'duet' || m.type === 'gift' || m.required_members >= 2) return 'pairs';
  return 'solo';
}

export const GROUP_TITLES: Record<MissionGroup, { title: string; sub: string }> = {
  whole: { title: 'Whole fellowship', sub: 'The big regions. Everyone shows up.' },
  pairs: { title: 'Duets & trios', sub: 'Grab a friend or two — these need two or three heroes.' },
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

/** Leaderboard — delegates to EV's single source of truth (lib/game.ts pointsFor/leaderboard) via ./engine. */
export function pointsByMember(missions: Mission[], members: FellowshipMember[]) {
  return leaderboard(members, missions);
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
export const roman = (n: number) => ROMAN[n] ?? String(n);

export function needsLabel(m: Mission): string | null {
  if (m.type === 'gathering') return 'Everyone';
  if (m.required_members >= 2) return `Needs ${m.required_members} heroes`;
  return null;
}
