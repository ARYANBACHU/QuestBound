// Owner: AD. Chapter template: The Witch's Cottage.
import type { PageArt } from './types';
import { circle, cloud, ellipse, poly, rr, star4, storybookFrame } from './shapes';

// ---- local helpers -------------------------------------------------------------------------------------------
type P = [number, number];
/** [x,y] = line · [cx,cy,x,y] = quadratic · [c1x,c1y,c2x,c2y,x,y] = cubic (all absolute). */
type Seg = number[];
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Closed contour from segments. ccw=true emits the same outline reversed (to cut it as a hole). */
function path(start: P, segs: Seg[], ccw = false): string {
  let s = segs;
  if (ccw) {
    const ends: P[] = [start, ...segs.map((g) => [g[g.length - 2], g[g.length - 1]] as P)];
    s = [[...ends[ends.length - 1]]];
    for (let i = segs.length - 1; i >= 0; i--) {
      const g = segs[i], e = ends[i];
      s.push(g.length === 2 ? [...e] : g.length === 4 ? [g[0], g[1], ...e] : [g[2], g[3], g[0], g[1], ...e]);
    }
  }
  const cmd = (g: Seg) => (g.length === 2 ? 'L' : g.length === 4 ? 'Q' : 'C') + g.map(r1).join(' ');
  return `M${r1(start[0])} ${r1(start[1])} ` + s.map(cmd).join(' ') + ' Z';
}

/** Smooth closed blob through points (Catmull-Rom → cubic Béziers). List points clockwise on screen. */
function smooth(pts: P[]): string {
  const n = pts.length, at = (i: number) => pts[(i + n) % n];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + ' Z';
}

// ---- the broomstick: leaning on the wall left of the door, big bristles. Also cut out of the cottage. ----------
const BA: P = [390, 852]; // handle meets bristles
const BB: P = [462, 690]; // handle top
const bl = Math.hypot(BB[0] - BA[0], BB[1] - BA[1]);
const bu: P = [(BB[0] - BA[0]) / bl, (BB[1] - BA[1]) / bl];
const bn: P = [-bu[1], bu[0]]; // points right/down
const off = (p: P, k: number, v: P = bn): P => [p[0] + v[0] * k, p[1] + v[1] * k];
const BROOM: [P, Seg[]] = [
  off(BA, -42),
  [
    [...off(BA, -12)], [...off(BB, -12)],
    [...off(BB, 26, bu), ...off(BB, 12)], // rounded handle tip
    [...off(BA, 12)], [...off(BA, 42)],
    [BA[0] + 70, BA[1] + 44, 468, 950, 468, 994], // bristles flare, right
    [449, 1007, 430, 994], [411, 1007, 392, 994], [373, 1007, 354, 994], [335, 1007, 316, 994], // bristle tips
    [314, 940, BA[0] - 66, BA[1] + 6, ...off(BA, -42)], // bristles flare, left
  ],
];

// ---- the crooked cottage: leaning walls, witch-hat roof with a bent tip, crooked chimney -----------------------
const COTTAGE =
  path(
    [292, 1010],
    [
      [300, 900, 288, 760, 314, 668], // left wall
      [252, 682], // left eave
      [300, 600, 390, 470, 440, 390], // roof, left slope
      [455, 340, 430, 300, 372, 252], // bent tip
      [450, 262, 520, 290, 548, 330], // over the top
      [598, 398], [588, 336], [656, 328], [662, 484], // crooked chimney
      [700, 534, 740, 590, 778, 642], // roof, right slope
      [712, 660], // right eave
      [730, 760, 706, 900, 730, 1010], // right wall
    ],
  ) +
  ' ' + rr(578, 312, 92, 26, 10) + // chimney cap
  ' ' + path(...BROOM, true);

// ---- the bubbling cauldron: fat pot, thick rim, stubby legs, bubbles + a puff of magic steam -----------------
const CAULDRON = [
  ellipse(225, 1180, 160, 118),
  rr(78, 1048, 294, 48, 24),
  rr(128, 1268, 30, 46, 10), rr(292, 1268, 30, 46, 10),
  circle(150, 1028, 30), circle(222, 1002, 40), circle(282, 1034, 24),
  cloud(200, 920, 82, 40, 7),
].join(' ');

// ---- the herb garden: plank planter with basil, lavender spikes and a mint bush, as one silhouette -----------
const HERBS = path(
  [598, 1300],
  [
    [598, 1170],
    [586, 1100, 636, 1052, 668, 1074], // basil, left lobe
    [692, 1036, 738, 1060, 726, 1100], // basil, right lobe
    [722, 1020, 734, 966, 750, 960], [766, 966, 770, 1030, 760, 1110], // lavender spike 1
    [774, 1000, 790, 980, 804, 986], [818, 1000, 812, 1060, 804, 1110], // lavender spike 2
    [816, 1056, 862, 1034, 886, 1066], [926, 1068, 934, 1124, 922, 1170], // mint bush
    [922, 1300], [922, 1312, 910, 1312], [610, 1312], [598, 1312, 598, 1300],
  ],
);

// ---- the black cat: sitting on the knoll, facing us, tail wrapped round its paws -----------------------------
const CAT_RAW: P[] = [
  [770, 612], [796, 640], [826, 638], [852, 612], [864, 660], [856, 708], [842, 732], [872, 782], [886, 840], [872, 872],
  [806, 878], [742, 872], [730, 824], [748, 764], [774, 730], [760, 704], [754, 660],
];
const catPt = (x: number, y: number): P => [r1(850 + (x - 810) * 1.15), r1(896 + (y - 876) * 1.15)];
const CAT = CAT_RAW.map(([x, y]) => catPt(x, y));

// ---- the spell book: floating open, ribbon dangling ---------------------------------------------------------
const BOOK = [
  'M680 172 L680 318 C732 304 782 312 806 344 C830 312 880 304 932 318 L932 172 Z', // cover
  'M806 178 C772 148 720 144 690 160 L690 304 C722 292 772 298 806 326 Z', // left page
  'M806 178 C840 148 892 144 922 160 L922 304 C890 292 840 298 806 326 Z', // right page
  poly([[798, 336], [816, 336], [822, 402], [808, 388], [794, 402]]), // ribbon
].join(' ');

// ---- scenery -------------------------------------------------------------------------------------------------
const MOON_HALO = circle(220, 250, 150);
const HILLS = 'M65 900 Q220 740 420 830 Q620 720 800 800 Q880 770 935 790 V1100 H65 Z';
const MEADOW = 'M65 1000 Q300 960 500 1004 Q720 1046 935 990 V1319 Q935 1335 919 1335 H81 Q65 1335 65 1319 Z';
const KNOLL = 'M690 1010 Q750 892 935 878 V1010 Z';
const PATH = 'M462 1010 C456 1100 370 1160 392 1335 H620 C640 1200 560 1120 556 1010 Z';
const CLOUDS = `${cloud(330, 400, 96, 34, 6)} ${cloud(560, 120, 80, 30, 5)}`;
const PUMPKIN = ellipse(424, 1052, 36, 27);

export const witch_cottage: PageArt = {
  id: 'witch_cottage',
  viewBox: '0 0 1000 1400',
  scenery: [MOON_HALO, HILLS, MEADOW, KNOLL, PATH, CLOUDS, PUMPKIN],
  background: [
    // grass tufts + hill lines
    'M100 1310 l10 -18 l8 18 M460 1320 l10 -18 l8 18 M660 1000 l8 -16 l6 16 M90 960 l8 -16 l6 16',
    'M120 880 Q200 850 260 870 M560 790 Q640 770 700 790',
  ],
  regions: {
    crooked_cottage: { d: COTTAGE, labelAt: [510, 780] },
    cauldron: { d: CAULDRON, labelAt: [225, 1190] },
    herb_garden: { d: HERBS, labelAt: [760, 1235] },
    black_cat: { d: smooth(CAT), labelAt: catPt(808, 790) },
    broomstick: { d: path(...BROOM), labelAt: [392, 935] },
    spell_book: { d: BOOK, labelAt: [748, 240] },
  },
  ink: [
    ...storybookFrame(),
    // sleepy crescent moon + stars + bats
    'M196 160 A92 92 0 1 0 300 300 A74 74 0 1 1 196 160 Z', 'M168 250 Q180 260 192 250', 'M178 290 Q192 298 206 288',
    star4(420, 120, 18), star4(110, 420, 14), star4(660, 230, 14), star4(900, 470, 16),
    'M420 220 q18 -18 30 0 q12 -10 18 0 q6 -10 18 0 q12 -18 30 0 q-20 4 -48 20 q-28 -16 -48 -20 Z',
    'M150 520 q14 -14 24 0 q10 -8 14 0 q4 -8 14 0 q10 -14 24 0 q-16 4 -38 16 q-22 -12 -38 -16 Z',
    // chimney smoke curling up
    'M622 300 Q596 262 628 244 Q660 226 636 192 Q620 168 646 146',
    // roof: shingle scallops + attic window
    'M372 520 q18 16 36 0 q18 16 36 0 M556 520 q18 16 36 0 q18 16 36 0 q18 16 36 0',
    'M330 620 q18 16 36 0 q18 16 36 0 q18 16 36 0 M580 610 q18 16 36 0 q18 16 36 0 q18 16 36 0',
    'M440 430 q18 16 36 0 q18 16 36 0',
    circle(500, 500, 34), 'M466 500 H534 M500 466 V534',
    // eave line, door, right window with shutters, wall patch
    'M252 682 Q480 650 778 642',
    'M470 1010 V940 A55 55 0 0 1 580 940 V1010', 'M525 886 V1010 M496 900 V1010 M554 900 V1010', circle(560, 960, 7),
    rr(600, 720, 70, 72, 6), 'M635 720 V792 M600 756 H670', 'M600 812 H670',
    'M642 880 L700 874 L704 924 L646 930 Z', 'M656 884 l6 8 M674 882 l6 8 M690 884 l6 8',
    // broom: binding + bristle lines
    `M${r1(off(BA, -40)[0])} ${r1(off(BA, -40)[1])} L${r1(off(BA, 40)[0])} ${r1(off(BA, 40)[1])}`,
    'M340 960 L330 994 M372 960 L368 994 M404 964 L410 994 M436 960 L450 990',
    // cauldron: goo drips over the rim, bubble shine, steam swirl, fire + logs
    'M110 1096 V1118 Q118 1132 126 1118 V1096 M300 1096 V1124 Q308 1138 316 1124 V1096',
    'M126 1020 a20 20 0 0 1 14 -14', 'M200 990 a26 26 0 0 1 18 -18',
    'M160 920 q20 -20 40 0 q20 20 40 0',
    'M190 1330 Q176 1306 196 1292 Q204 1310 214 1296 Q230 1312 222 1330 M100 1330 L170 1314 M350 1330 L280 1314',
    star4(330, 960, 14), star4(100, 960, 12),
    // herbs: basil leaf veins, lavender buds, mint leaves, plant marker, planks
    'M650 1110 Q664 1090 680 1078 M700 1100 Q704 1080 712 1066',
    'M742 990 l10 4 M740 1020 l12 4 M740 1050 l12 4 M796 1010 l10 4 M794 1040 l10 4',
    'M850 1110 Q866 1090 884 1084 M884 1130 Q898 1112 910 1108',
    'M680 1160 H900', 'M680 1176 V1312 M840 1176 V1312', circle(620, 1196, 5), circle(900, 1196, 5),
    // cat: eyes, nose, smile, whiskers, tail round the paws
    ellipse(...catPt(790, 668), 8, 12), ellipse(...catPt(830, 668), 8, 12),
    `M${catPt(804, 690).join(' ')} L${catPt(816, 690).join(' ')} L${catPt(810, 698).join(' ')} Z`,
    `M${catPt(798, 706).join(' ')} Q${catPt(810, 714).join(' ')} ${catPt(822, 706).join(' ')}`,
    `M${catPt(770, 694).join(' ')} L${catPt(740, 688).join(' ')} M${catPt(770, 704).join(' ')} L${catPt(742, 708).join(' ')}`,
    `M${catPt(850, 694).join(' ')} L${catPt(880, 688).join(' ')} M${catPt(850, 704).join(' ')} L${catPt(878, 708).join(' ')}`,
    `M${catPt(880, 846).join(' ')} Q${catPt(840, 880).join(' ')} ${catPt(770, 860).join(' ')} Q${catPt(752, 850).join(' ')} ${catPt(766, 840).join(' ')}`,
    // spell book: text lines, a moon sigil, sparkles
    'M830 200 Q865 186 902 194 M830 230 Q865 216 902 224 M830 260 Q865 246 902 254',
    star4(660, 120, 14), star4(905, 380, 12),
    // pumpkin by the path
    'M424 1026 Q426 1012 438 1008 M410 1030 Q398 1052 410 1076 M438 1030 Q450 1052 438 1076',
    // path stones
    ellipse(508, 1060, 26, 12), ellipse(470, 1130, 30, 13), ellipse(500, 1210, 34, 14), ellipse(450, 1290, 36, 15),
  ],
};
