// Owner: AD. Small helpers shared by the coloring page + storybook.
import { CRAYONS, ink, type CrayonColor } from '@/shared/theme';
import type { FellowshipMember, Mission, MissionStatus, Page } from '@/shared/types';
import { profileOf } from '@/lib/fellowship';

export function crayonHex(color: CrayonColor | null | undefined): string {
  return color && CRAYONS[color] ? CRAYONS[color] : ink.muted;
}

/** Mix a hex color toward black (amt < 0) or white (amt > 0). */
export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const out = v.map((c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt));
  return '#' + out.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

/** Crayon colors of everyone credited for a mission (completer first). */
export function missionColors(mission: Mission, members: FellowshipMember[]): CrayonColor[] {
  const ids = mission.completed_by.length ? mission.completed_by : mission.assignee_ids;
  return ids.map((id) => profileOf(members, id)?.color).filter((c): c is CrayonColor => !!c);
}

export const STATUS_LABEL: Record<MissionStatus, string> = {
  locked: 'locked',
  open: 'open',
  pending: 'waiting for a friend',
  complete: 'colored',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const roman = (n: number) => ROMAN[n] ?? String(n);

export const pageMissions = (missions: Mission[], page: Page | null | undefined) =>
  page ? missions.filter((m) => m.page_id === page.id) : [];

/** Rough bounding box of SVG path data (absolute + relative M/L/H/V/Q/C/A/Z). Good enough for fill radii. */
export function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const tokens = d.match(/[MLHVQCATSZmlhvqcatsz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (px: number, py: number) => { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); };
  const num = () => parseFloat(tokens[i++]);
  const counts: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, Q: 4, S: 4, C: 6, A: 7, Z: 0 };
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
    const up = cmd.toUpperCase(), rel = cmd !== up;
    if (up === 'Z') { x = sx; y = sy; continue; }
    const c = counts[up];
    if (c === undefined || i + c > tokens.length) break;
    const a = Array.from({ length: c }, num);
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (up === 'H') x = a[0] + (rel ? x : 0);
    else if (up === 'V') y = a[0] + (rel ? y : 0);
    else {
      for (let k = up === 'A' ? 5 : 0; k + 1 < c; k += 2) add(a[k] + ox, a[k + 1] + oy);
      x = a[c - 2] + ox; y = a[c - 1] + oy;
      if (up === 'A') { add(x - a[0], y - a[1]); add(x + a[0], y + a[1]); }
    }
    add(x, y);
    if (up === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
  }
  return { minX, minY, maxX, maxY };
}
