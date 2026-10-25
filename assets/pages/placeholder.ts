// Owner: AD. [MERGE] integration fallback (pre-round 3): a simple storybook placeholder for any template whose art
// isn't drawn yet, so all 20 ids in shared/templates.ts render and validatePageArt() passes. Replace per id as the
// real pages land (AD: assets/pages/<id>.ts, MP: assets/pages/set-mp/<id>.ts).
// Layout: 3 small stars/moons up top, 2 medium shields mid-page, 1 large rolling hill along the bottom.
import { TEMPLATES, type TemplateId } from '@/shared/templates';
import type { PageArt, RegionArt } from './types';
import { circle, rr, star4, storybookFrame, wave } from './shapes';

const SMALL: RegionArt[] = [
  { d: circle(250, 270, 85), labelAt: [250, 270] },
  { d: circle(500, 220, 85), labelAt: [500, 220] },
  { d: circle(750, 270, 85), labelAt: [750, 270] },
];
const MEDIUM: RegionArt[] = [
  { d: rr(120, 450, 340, 320, 60), labelAt: [290, 610] },
  { d: rr(540, 450, 340, 320, 60), labelAt: [710, 610] },
];
const LARGE: RegionArt = {
  d: 'M80 1300 L80 1010 C230 880 380 880 500 960 C620 880 770 880 920 1010 L920 1300 Z',
  labelAt: [500, 1130],
};

export function placeholderArt(id: TemplateId): PageArt {
  const regions: Record<string, RegionArt> = {};
  let s = 0, m = 0;
  for (const r of TEMPLATES[id].regions) {
    regions[r.id] = r.size === 'large' ? LARGE : r.size === 'medium' ? MEDIUM[m++ % 2] : SMALL[s++ % 3];
  }
  return {
    id,
    viewBox: '0 0 1000 1400',
    background: [wave(80, 920, 860, 8, 70), 'M80 1300 H920'],
    regions,
    ink: [...storybookFrame(), star4(140, 140, 22), star4(860, 140, 22), star4(500, 820, 16)],
  };
}
