// Owner: MP (Round 3 U2). Chapter template: The Rose Garden.
// A rose-covered arbor framing a tiered fountain, a butterfly, a watering can and a single rosebud by the path,
// and the green hedge maze across the front of the page.
import type { PageArt } from '../types';
import { circle, cloud, ellipse, rr, star4, storybookFrame, wave } from '../shapes';

const ARBOR =
  'M260 1010 L260 470 C260 300 370 196 500 196 C630 196 740 300 740 470 L740 1010 L680 1010 L680 470 ' +
  'C680 334 600 256 500 256 C400 256 320 334 320 470 L320 1010 Z';

// Bushy hedge top: a row of round bumps, then straight sides down to the bottom of the page.
const HEDGE = (() => {
  let d = 'M80 1330 L80 1110';
  const n = 12, x0 = 80, x1 = 920, w = (x1 - x0) / n;
  for (let i = 1; i <= n; i++) d += ` A${(w * 0.62).toFixed(1)} ${(w * 0.62).toFixed(1)} 0 0 1 ${(x0 + i * w).toFixed(1)} 1110`;
  return d + ' L920 1330 Z';
})();

const FOUNTAIN =
  'M342 920 L658 920 C648 978 598 1000 500 1000 C402 1000 352 978 342 920 Z ' +
  `${rr(480, 846, 40, 80, 8)} M410 806 L590 806 C580 844 550 856 500 856 C450 856 420 844 410 806 Z ${circle(500, 776, 20)}`;

const BUD = 'M860 676 C904 704 914 758 888 798 C874 820 846 820 832 798 C806 758 816 704 860 676 Z';

const wingL =
  'M180 258 C150 196 86 186 88 236 C90 272 140 282 180 262 Z M180 266 C140 276 106 302 120 328 C136 354 172 322 180 272 Z';
const mirror = (d: string, ax: number) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${2 * ax - Number(x)} ${y}`);
// Mirroring flips the winding, so the right wings are drawn reversed (still a solid fill with nonzero, as they don't overlap the left).
const BUTTERFLY = `${wingL} ${mirror(wingL, 184)}`;

const CAN = `${rr(72, 904, 124, 104, 18)} M192 944 L242 892 L256 906 L200 968 Z`;

/** A rose: outer petals circle + a spiral heart. */
const rose = (x: number, y: number, r = 26) =>
  `${circle(x, y, r)} M${x - r * 0.45} ${y} a${r * 0.45} ${r * 0.45} 0 1 1 ${r * 0.45} ${r * 0.45} a${r * 0.28} ${r * 0.28} 0 1 1 -${r * 0.28} -${r * 0.28}`;
const leaf = (x: number, y: number, dx = 34, dy = -14) => `M${x} ${y} q${dx / 2} ${dy - 14} ${dx} ${dy} q${-dx / 2} ${14} ${-dx} ${-dy} Z`;

const ARCH_ROSES: [number, number, number][] = [
  [290, 980, 24], [290, 860, 26], [290, 740, 24], [290, 610, 28], [300, 470, 26], [340, 350, 28], [420, 262, 26],
  [500, 226, 30], [580, 262, 26], [660, 350, 28], [700, 470, 26], [710, 610, 28], [710, 740, 24], [710, 860, 26],
  [710, 980, 24],
];

export const rose_garden: PageArt = {
  id: 'rose_garden',
  viewBox: '0 0 1000 1400',
  background: [
    // garden ground and the gravel path through the arbor
    'M56 1012 H944', 'M380 1012 L340 1096 M620 1012 L660 1096',
    'M60 700 Q160 640 250 690 M760 690 Q850 640 940 700',
  ],
  regions: {
    rose_arbor: { d: ARBOR, labelAt: [500, 226] },
    hedge_maze: { d: HEDGE, labelAt: [160, 1170] },
    garden_fountain: { d: FOUNTAIN, labelAt: [500, 960] },
    rosebud: { d: BUD, labelAt: [860, 750] },
    butterfly: { d: BUTTERFLY, labelAt: [128, 236] },
    watering_can: { d: CAN, labelAt: [134, 956] },
  },
  ink: [
    ...storybookFrame(),
    // arbor: lattice + roses + leaves climbing it
    'M260 900 L320 840 M260 780 L320 720 M260 660 L320 600 M680 900 L740 840 M680 780 L740 720 M680 660 L740 600',
    ...ARCH_ROSES.map(([x, y, r]) => rose(x, y, r)),
    leaf(316, 920), leaf(262, 800, -34, -14), leaf(318, 680), leaf(372, 300), leaf(450, 232, 30, -20), leaf(548, 236, 30, 18),
    leaf(628, 300, 30, 20), leaf(684, 680, -34, -14), leaf(738, 800), leaf(682, 920, -34, -14),
    // fountain: water arcs, droplets, rim lines, ripples
    'M500 760 C460 720 430 760 418 806 M500 760 C540 720 570 760 582 806',
    'M416 856 C380 860 360 890 352 920 M584 856 C620 860 640 890 648 920',
    circle(400, 760, 6), circle(604, 744, 6), circle(360, 870, 5), circle(642, 868, 5),
    'M342 920 Q500 944 658 920', wave(410, 590, 960, 6, 30),
    // watering can: handle, rose head holes, water drops onto the bud's stem
    'M96 904 C96 840 172 840 172 904', ellipse(254, 894, 9, 15), circle(251, 890, 2), circle(257, 898, 2),
    // rosebud: sepals, stem, leaves, thorns
    'M832 798 L818 822 L846 812 L860 832 L874 812 L902 822 L888 798',
    'M860 826 C866 880 852 940 860 1010', leaf(860, 900, 40, -16), leaf(858, 960, -40, -16), 'M858 870 l-12 -6 M864 930 l12 -6',
    // hedge maze: spiral of paths + entrance
    'M130 1170 H470 M530 1170 H870 V1300 H130 V1170',
    'M190 1214 H600 M660 1214 H810 V1258 H700 M640 1258 H190 V1214',
    'M400 1170 V1214 M560 1258 V1300 M760 1214 V1170 M300 1214 V1258',
    'M500 1110 V1170',
    ...[140, 260, 380, 620, 740, 860].map((x) => `M${x - 16} 1128 q8 -10 16 0 q8 -10 16 0`),
    // sky: clouds, sun, birds, sparkles
    cloud(700, 250, 76, 32, 7), circle(830, 170, 40), 'M830 112 v-16 M830 228 v16 M772 170 h-16 M888 170 h16 M790 130 l-11 -11 M870 130 l11 -11 M790 210 l-11 11 M870 210 l11 11', 'M560 140 q14 -14 28 0 q14 -14 28 0',
    star4(110, 420, 14), star4(860, 420, 12), star4(420, 140, 12),
    // butterfly: body + antennae
    ellipse(184, 268, 7, 26), 'M180 244 q-10 -30 -24 -34 M188 244 q10 -30 24 -34',
  ],
};
