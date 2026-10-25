// Owner: AD. Chapter template: The Ice Palace.
import type { PageArt } from './types';
import { circle, crenels, poly, star4, storybookFrame } from './shapes';

type Pt = [number, number];
const n = (v: number) => Math.round(v * 10) / 10;
const area = (pts: Pt[]) => pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0);
const cw = (pts: Pt[]): Pt[] => (area(pts) < 0 ? [...pts].reverse() : pts);
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** Smooth closed curve through a point loop (quadratic midpoint spline), always clockwise. */
function smooth(raw: Pt[]): string {
  const pts = cw(raw);
  const m0 = mid(pts[pts.length - 1], pts[0]);
  let d = `M${n(m0[0])} ${n(m0[1])}`;
  pts.forEach((p, i) => { const m = mid(p, pts[(i + 1) % pts.length]); d += ` Q${n(p[0])} ${n(p[1])} ${n(m[0])} ${n(m[1])}`; });
  return d + ' Z';
}

// ---- the frost palace: two side towers + a tall centre tower with curvy spires, crenellated halls between
/** Curvy spire from (x1, y) up to a tip and down to (x2, y); the current point must be at (x1, y). */
const spire = (x1: number, x2: number, y: number, tipY: number) => {
  const c = (x1 + x2) / 2;
  return ` Q${n(c - (x2 - x1) * 0.16)} ${n(y - 50)} ${c} ${tipY} Q${n(c + (x2 - x1) * 0.16)} ${n(y - 50)} ${x2} ${y}`;
};
const PALACE =
  'M246 900 L246 480 L230 480' + spire(230, 366, 480, 330) + ' L350 480 L350 610' +
  crenels(350, 424, 610, 2, 30) + ' L424 380 L404 380' + spire(404, 596, 380, 118) +
  ' L576 380 L576 610' + crenels(576, 650, 610, 2, 30) + ' L650 480 L634 480' + spire(634, 770, 480, 330) +
  ' L754 480 L754 900 Z';
/** Ink icicles hanging under a ledge from x1 to x2 at y. */
const icicles = (x1: number, x2: number, y: number, count: number) => {
  const w = (x2 - x1) / count;
  return Array.from({ length: count }, (_, i) => `M${n(x1 + i * w + 4)} ${y} L${n(x1 + (i + 0.5) * w)} ${y + (i % 2 ? 26 : 40)} L${n(x1 + (i + 1) * w - 4)} ${y}`).join(' ');
};
const archWin = (x: number, y: number, w: number, h: number) => `M${x - w / 2} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${y + w / 2} V${y + h} Z`;

// ---- the frozen fountain: ice jet, upper bowl with icicles, stem, wide basin (one contour)
const FX = 330;
const fx = (dx: number) => n(FX + dx);
const FOUNTAIN =
  `M${fx(0)} 940 Q${fx(52)} 992 ${fx(28)} 1040 L${fx(140)} 1040 Q${fx(154)} 1040 ${fx(148)} 1058` +
  ` L${fx(140)} 1064 L${fx(126)} 1116 L${fx(112)} 1070 Q${fx(70)} 1092 ${fx(36)} 1094 L${fx(36)} 1160` +
  ` L${fx(208)} 1160 Q${fx(222)} 1160 ${fx(222)} 1174 Q${fx(222)} 1188 ${fx(208)} 1188 L${fx(186)} 1188 Q${fx(186)} 1296 ${fx(140)} 1300` +
  ` L${fx(-140)} 1300 Q${fx(-186)} 1296 ${fx(-186)} 1188 L${fx(-208)} 1188 Q${fx(-222)} 1188 ${fx(-222)} 1174 Q${fx(-222)} 1160 ${fx(-208)} 1160` +
  ` L${fx(-36)} 1160 L${fx(-36)} 1094 Q${fx(-70)} 1092 ${fx(-112)} 1070 L${fx(-126)} 1116 L${fx(-140)} 1064 L${fx(-148)} 1058` +
  ` Q${fx(-154)} 1040 ${fx(-140)} 1040 L${fx(-28)} 1040 Q${fx(-52)} 992 ${fx(0)} 940 Z`;

// ---- the silver sleigh (body with a high scrolled back + a curly runner)
const SLEIGH_BODY = smooth([
  [574, 1010], [592, 970], [634, 966], [652, 1006], [668, 1070], [716, 1098], [800, 1100], [846, 1084],
  [860, 1000], [876, 944], [914, 930], [930, 970], [918, 1060], [910, 1150], [876, 1218], [704, 1226], [622, 1198], [584, 1120],
]);
/** A thick curve: offset a centreline by ±h into one closed outline. */
function thick(line: Pt[], h: number): string {
  const L: Pt[] = [], R: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    L.push([p[0] - (dy / len) * h, p[1] + (dx / len) * h]);
    R.push([p[0] + (dy / len) * h, p[1] - (dx / len) * h]);
  });
  return smooth([...L, ...R.reverse()]);
}
const RUNNER = thick([[922, 1274], [820, 1276], [700, 1276], [630, 1270], [592, 1250], [580, 1218], [600, 1198], [624, 1210]], 15);

// ---- the snowflake: one outline with six chunky arms, each with a pair of spikes
function snowflake(cx: number, cy: number, R: number, w: number): string {
  const arm: Pt[] = [[w * 1.73, -w], [R * 0.44, -w], [R * 0.56, -w - 44], [R * 0.7, -w - 40], [R * 0.66, -w], [R - 20, -w], [R, 0], [R - 20, w], [R * 0.66, w], [R * 0.7, w + 40], [R * 0.56, w + 44], [R * 0.44, w]];
  const pts: Pt[] = [];
  for (let k = 0; k < 6; k++) {
    const a = ((-90 + 60 * k) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (const [x, y] of arm) pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return poly(cw(pts));
}
const SF: Pt = [176, 202];

// ---- the ice crown (five points, round jewels on the tips)
const CROWN = 'M716 292 L712 134 L766 186 L814 108 L862 186 L916 134 L912 292 Q814 310 716 292 Z';
const CROWN_TIPS = [circle(712, 130, 17), circle(814, 104, 19), circle(916, 130, 17)];

// ---- the snow fox, sitting with its tail curled round (left of the palace)
const FOX_HEAD = 'M92 612 L128 662 Q154 654 180 662 L216 612 L218 690 L232 716 Q196 752 154 770 Q112 752 76 716 L90 690 Z';
const FOX_BODY = smooth([[154, 744], [204, 776], [226, 850], [216, 904], [92, 904], [82, 850], [104, 776]]);
const FOX_TAIL = smooth([[200, 902], [120, 912], [74, 880], [70, 810], [94, 770], [124, 784], [112, 830], [124, 870], [170, 886]]);

export const ice_palace: PageArt = {
  id: 'ice_palace',
  viewBox: '0 0 1000 1400',
  scenery: [
    // the aurora ribbon
    'M65 300 C230 170 420 330 600 220 C760 120 860 210 935 170 L935 250 C860 300 760 220 600 320 C420 420 230 270 65 390 Z',
    // far mountains
    'M65 720 L190 500 L280 610 L400 440 L520 620 L650 450 L790 640 L935 520 L935 900 L65 900 Z',
    // snowy hills
    'M65 880 Q300 820 520 900 Q760 970 935 870 L935 1335 L65 1335 Z',
    // snow-capped firs (right of the palace)
    'M800 900 L830 840 L812 840 L846 770 L830 770 L860 700 L890 770 L874 770 L908 840 L890 840 L920 900 Z',
    // front snow drift
    'M65 1210 Q260 1150 480 1230 Q720 1300 935 1220 L935 1335 L65 1335 Z',
    // a soft moon halo
    'M850 900 L872 862 L860 862 L884 818 L872 818 L894 776 L916 818 L904 818 L926 862 L914 862 L934 900 Z',
  ],
  background: [
    'M70 905 Q160 890 240 905 M770 905 Q850 890 930 905',
    'M560 1000 Q600 990 640 1000 M90 1070 Q130 1060 170 1070',
  ],
  regions: {
    frost_palace: { d: PALACE, labelAt: [500, 640] },
    frozen_fountain: { d: FOUNTAIN, labelAt: [FX, 1240] },
    sleigh: { d: `${SLEIGH_BODY} ${RUNNER}`, labelAt: [790, 1170] },
    snowflake: { d: snowflake(SF[0], SF[1], 124, 23), labelAt: SF },
    ice_crown: { d: [CROWN, ...CROWN_TIPS].join(' '), labelAt: [814, 244] },
    snow_fox: { d: `${FOX_TAIL} ${FOX_BODY} ${FOX_HEAD}`, labelAt: [168, 842] },
  },
  ink: [
    ...storybookFrame(),
    // palace: icicles under every ledge, windows, rose window, door, ice-block lines, spire stars
    icicles(236, 360, 480, 4), icicles(640, 764, 480, 4), icicles(410, 590, 380, 5),
    icicles(350, 424, 610, 2), icicles(576, 650, 610, 2),
    archWin(298, 560, 40, 70), archWin(702, 560, 40, 70), archWin(298, 720, 40, 70), archWin(702, 720, 40, 70),
    circle(500, 480, 34), 'M500 446 V514 M466 480 H534 M476 456 L524 504 M524 456 L476 504',
    'M456 900 V820 A44 44 0 0 1 544 820 V900 M500 776 V900',
    'M264 640 h40 M690 650 h44 M376 700 h36 M592 700 h36 M370 820 h40 M600 830 h40 M270 860 h36 M700 860 h36',
    star4(300, 300, 16), star4(500, 84, 18), star4(700, 300, 16),
    // fountain: frozen ripples, frost sparkles, jet shine
    'M200 1210 Q260 1196 300 1212 M370 1210 Q420 1198 470 1214', 'M322 980 Q316 1010 324 1030',
    star4(190, 1020, 14), star4(470, 990, 14), icicles(150, 230, 1188, 2), icicles(430, 510, 1188, 2),
    // sleigh: side swirl, struts, cushion, back scroll
    'M676 1160 q30 -44 64 -12 q22 28 -8 40', 'M680 1220 V1260 M860 1214 V1260', 'M690 1104 Q770 1090 846 1094', 'M904 972 q-22 -6 -16 20', 'M594 1000 q10 -22 30 -12',
    // snowflake: centre lines on each arm
    ...[0, 1, 2, 3, 4, 5].map((k) => { const a = ((-90 + 60 * k) * Math.PI) / 180; return `M${n(SF[0] + 66 * Math.cos(a))} ${n(SF[1] + 66 * Math.sin(a))} L${n(SF[0] + 92 * Math.cos(a))} ${n(SF[1] + 92 * Math.sin(a))}`; }),
    // crown: jewels on the band + rim line
    circle(756, 252, 12), circle(872, 252, 12), 'M722 212 Q814 228 906 212',
    // fox: eyes, nose, smile, cheek fluff, chest bib, paws, tail tip
    circle(134, 706, 5), circle(174, 706, 5), 'M147 726 h14 l-7 9 Z', 'M140 744 q14 9 28 0', 'M110 640 L126 672 M198 640 L182 672', 'M92 700 Q128 712 146 752 M216 700 Q180 712 162 752',
    'M128 782 Q154 812 180 782', 'M146 904 v-26 M196 904 v-26', 'M78 846 q22 -4 30 12',
    // falling snow + sparkles
    ...[[380, 260], [860, 400], [110, 470], [560, 300], [420, 160], [920, 680], [90, 1000], [620, 960], [260, 380]].map(([x, y]) => circle(x, y, 6)),
    star4(330, 150, 16), star4(640, 230, 14), star4(110, 560, 14), star4(900, 1000, 14),
  ],
};
