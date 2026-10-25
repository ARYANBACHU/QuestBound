// Owner: MP (Round 3 U2). Chapter template: The Crystal Cave.
// Under dripping stalactites: a heart-shaped geode glittering with crystals, a still glowing pool, a mine cart
// heaped with gems on its rails, a cut gemstone on a rock, a cave bat and a pickaxe left by the wall.
import type { PageArt } from '../types';
import { circle, ellipse, poly, star4, storybookFrame, wave } from '../shapes';

const HEART =
  'M500 820 C376 738 270 650 270 528 C270 434 342 380 408 380 C452 380 486 402 500 436 C514 402 548 380 592 380 ' +
  'C658 380 730 434 730 528 C730 650 624 738 500 820 Z';

// Inner rim of the geode (same heart, scaled toward its middle).
const scaleHeart = (k: number, cx = 500, cy = 590) =>
  HEART.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
    `${(cx + (Number(x) - cx) * k).toFixed(1)} ${(cy + (Number(y) - cy) * k).toFixed(1)}`,
  );

// Crystal points around the inner rim, pointing to the heart's middle.
const crystals = (() => {
  const pts: string[] = [];
  const spots: [number, number][] = [
    [352, 520], [372, 460], [430, 440], [472, 480], [528, 480], [570, 440], [628, 460], [648, 520], [630, 600],
    [590, 660], [540, 710], [460, 710], [410, 660], [370, 600],
  ];
  for (const [x, y] of spots) {
    const dx = 500 - x, dy = 580 - y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const tip: [number, number] = [x + ux * 54, y + uy * 54];
    const a: [number, number] = [x - uy * 16, y + ux * 16];
    const b: [number, number] = [x + uy * 16, y - ux * 16];
    pts.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  return pts.join(' ');
})();

const POOL = 'M540 1150 C540 1080 650 1046 760 1050 C870 1054 930 1100 926 1160 C922 1226 830 1262 720 1260 C610 1258 540 1220 540 1150 Z';

const CART =
  'M96 1010 L128 962 L168 992 L206 938 L248 984 L290 928 L330 978 L370 948 L404 1010 L372 1150 L128 1150 Z ' +
  `${circle(176, 1172, 34)} ${circle(324, 1172, 34)}`;

const GEM = poly([[420, 936], [462, 884], [538, 884], [580, 936], [500, 1030]]);

const BAT_PATH =
  'M80 270 Q140 230 186 262 L192 234 L200 250 L208 234 L214 262 Q260 230 320 270 Q294 296 300 340 Q272 320 248 336 ' +
  'Q236 314 216 328 L200 356 L184 328 Q164 314 152 336 Q128 320 100 340 Q106 296 80 270 Z';
const BAT_DY = 20;
const BAT = BAT_PATH.replace(/(-?\d+) (-?\d+)/g, (_, x: string, y: string) => `${x} ${Number(y) + BAT_DY}`);

/** A little cluster of three hexagonal crystals growing from (x, y). */
const crystalCluster = (x: number, y: number, h = 90, flip = 1) =>
  [
    [x, y, h, 0],
    [x - 34 * flip, y + 6, h * 0.66, -0.35 * flip],
    [x + 30 * flip, y + 4, h * 0.55, 0.4 * flip],
  ]
    .map(([cx, cy, hh, tilt]) => {
      const w = 18;
      const pts: [number, number][] = [[-w, 0], [-w, -hh * 0.7], [0, -hh], [w, -hh * 0.7], [w, 0]];
      const rot = (px: number, py: number): [number, number] => [cx + px * Math.cos(tilt) - py * Math.sin(tilt), cy + px * Math.sin(tilt) + py * Math.cos(tilt)];
      const r = pts.map(([px, py]) => rot(px, py));
      const [fx0, fy0] = rot(0, -hh);
      const [fx1, fy1] = rot(0, 0);
      return `${poly(r)} M${fx0.toFixed(1)} ${fy0.toFixed(1)} L${fx1.toFixed(1)} ${fy1.toFixed(1)}`;
    })
    .join(' ');

const PICKAXE =
  'M716 782 C752 706 856 676 916 706 C858 706 800 726 744 790 Z ' + poly([[838, 964], [862, 960], [826, 712], [802, 716]]);

// Stalactites hanging from the cave roof.
const roof = (() => {
  let d = 'M56 150';
  const tips: [number, number, number][] = [
    [110, 196, 150], [180, 206, 150], [250, 200, 156], [330, 200, 150], [420, 230, 146], [520, 190, 144], [610, 260, 146],
    [690, 214, 150], [770, 290, 154], [850, 220, 150],
  ];
  let x = 56;
  for (const [tx, ty, base] of tips) {
    d += ` L${tx - 30} ${base} L${tx} ${ty} L${tx + 30} ${base}`;
    x = tx + 30;
  }
  return `${d} L${Math.max(x, 944)} 150`;
})();

const sparkle = (x: number, y: number, r = 16) => star4(x, y, r);

export const crystal_cave: PageArt = {
  id: 'crystal_cave',
  viewBox: '0 0 1000 1400',
  background: [
    // cave floor and back wall bumps
    'M56 1012 Q160 990 260 1008 M440 1040 Q500 1030 560 1044 M720 1010 Q840 990 944 1010',
    'M100 880 Q140 820 190 870 M820 900 Q860 850 900 890',
  ],
  regions: {
    heart_geode: { d: HEART, labelAt: [500, 590] },
    glow_pool: { d: POOL, labelAt: [730, 1150] },
    mine_cart: { d: CART, labelAt: [250, 1070] },
    gemstone: { d: GEM, labelAt: [500, 940] },
    cave_bat: { d: BAT, labelAt: [200, 300 + BAT_DY] },
    pickaxe: { d: PICKAXE, labelAt: [820, 730] },
  },
  ink: [
    ...storybookFrame(),
    roof,
    'M120 110 q30 -24 60 0 M380 104 q36 -26 72 0 M640 112 q30 -24 60 0 M840 104 q30 -22 60 0',
    // geode: rim + crystals + glints
    scaleHeart(0.72), crystals,
    sparkle(500, 590, 26), sparkle(440, 640, 12), sparkle(560, 530, 12),
    // pool: glow ripples + stalagmites around it
    wave(620, 800, 1120, 8, 30), wave(660, 860, 1176, 8, 34), wave(620, 760, 1226, 7, 28),
    sparkle(600, 1040, 14), sparkle(900, 1060, 16), sparkle(760, 1010, 10),
    ellipse(512, 1290, 26, 14), ellipse(560, 1310, 16, 10), ellipse(850, 1296, 22, 12),
    // cart: plank lines, gem facets, rails + ties
    'M118 1056 H382 M112 1100 H376', 'M206 938 L206 984 M290 928 L290 978', circle(176, 1172, 8), circle(324, 1172, 8),
    'M70 1214 H460 M70 1238 H460', 'M100 1206 v40 M180 1206 v40 M260 1206 v40 M340 1206 v40 M420 1206 v40',
    // gemstone: facets + rock it sits on
    'M420 936 H580 M462 884 L480 936 L500 1030 M538 884 L520 936 L500 1030 M480 936 L500 884 L520 936',
    'M400 1050 Q420 1022 470 1030 L530 1030 Q580 1022 600 1050 Q580 1080 500 1082 Q420 1080 400 1050 Z',
    // bat: eyes, fangs, ears
    circle(190, 280 + BAT_DY, 5), circle(210, 280 + BAT_DY, 5), `M194 ${296 + BAT_DY} l3 8 l3 -8 M202 ${296 + BAT_DY} l3 8 l3 -8`,
    // pickaxe: binding
    'M804 740 L828 736 M808 760 L830 756',
    // wall crystals
    crystalCluster(120, 720, 100), crystalCluster(862, 620, 96, -1),
    // glints
    sparkle(860, 450, 18), sparkle(140, 480, 14), sparkle(640, 860, 14), sparkle(370, 860, 12), sparkle(470, 1180, 14),
    wave(600, 680, 1320, 6, 26), wave(780, 880, 1320, 6, 26),
  ],
};
