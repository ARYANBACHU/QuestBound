// Owner: AD. Chapter template: The Royal Feast.
import type { PageArt } from './types';
import { circle, ellipse, poly, rr, star4, storybookFrame, wave } from './shapes';

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

/** Rotate + move a contour (local coords around 0,0). */
function placed(start: P, segs: Seg[], x: number, y: number, deg: number): [P, Seg[]] {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  const f = (px: number, py: number): P => [x + px * c - py * s, y + px * s + py * c];
  const mapSeg = (g: Seg) => {
    const out: number[] = [];
    for (let i = 0; i < g.length; i += 2) out.push(...f(g[i], g[i + 1]));
    return out;
  };
  return [f(start[0], start[1]), segs.map(mapSeg)];
}

// ---- the feast table: perspective top + skirt with a scalloped hem, fruit bowl -----------------------
function tableCloth(): string {
  const bumps = 7, x0 = 925, x1 = 75, y = 1120;
  const step = (x0 - x1) / bumps, r = step * 0.6;
  let d = 'M120 850 L880 850 L925 910 L925 1120';
  for (let i = 1; i <= bumps; i++) d += ` A${r1(r)} ${r1(r)} 0 0 1 ${r1(x0 - step * i)} ${y}`;
  return d + ' L75 910 Z';
}

// Footed fruit bowl piled high. Flat base on the table edge (y 850) so it can be cut cleanly out of the throne.
const FRUIT_BOWL: [P, Seg[]] = [
  [420, 850],
  [
    [442, 832], [470, 826], [470, 814],
    [432, 808, 408, 796, 408, 780], // bowl, left half
    [404, 744, 446, 734, 452, 758], // apple
    [450, 712, 504, 704, 504, 746], // grapes
    [506, 708, 552, 716, 550, 756], // pear
    [560, 734, 598, 746, 592, 780], // orange
    [592, 796, 568, 808, 530, 814], // bowl, right half
    [530, 826], [558, 832], [580, 850],
  ],
];

// ---- the throne: crowned back, arms on posts. The fruit bowl in front is cut out as a hole. -------------------------
const THRONE = [
  'M395 850 V540 C395 470 415 432 448 414 L468 452 L500 395 L532 452 L552 414 C585 432 605 470 605 540 V850 Z',
  circle(448, 406, 17), circle(500, 386, 20), circle(552, 406, 17),
  rr(345, 652, 100, 42, 20), rr(555, 652, 100, 42, 20), // arm rests
  rr(355, 670, 36, 180, 12), rr(609, 670, 36, 180, 12), // arm posts
  path(...FRUIT_BOWL, true),
].join(' ');

// ---- the chandelier: deep bowl, six candles, central post ---------------------------------------------------
const CANDLE_X = [240, 325, 410, 590, 675, 760];
const CHANDELIER = [
  'M190 176 H810 C806 282 650 332 500 332 C350 332 194 282 190 176 Z',
  ...CANDLE_X.map((x) => rr(x - 20, 104, 40, 80, 9)),
  ...CANDLE_X.map((x) => ellipse(x, 180, 34, 11)), // drip cups
  rr(480, 96, 40, 90, 12), circle(500, 92, 22), // central post + orb
].join(' ');

// ---- the cake: three tiers + a candle ------------------------------------------------------------------------
const CAKE = [rr(118, 748, 226, 102, 18), rr(152, 672, 158, 84, 16), rr(187, 606, 88, 72, 14), rr(222, 562, 18, 50, 6)].join(' ');

// ---- the golden goblet ----------------------------------------------------------------------------------------
const GOBLET =
  'M662 562 H888 C884 680 832 724 788 730 L788 790 C800 814 828 830 846 850 H704 C722 830 750 814 762 790 L762 730 C718 724 666 680 662 562 Z';

// ---- the bard's lute: pear body + neck + bent pegbox, lying tilted on the floor ------------------------------
const LUTE = placed(
  [-120, 0],
  [
    [-120, -55, -72, -88, -8, -86],
    [52, -84, 96, -48, 128, -20],
    [318, -20], [392, 4], [384, 42], [318, 20],
    [128, 20],
    [96, 48, 52, 84, -8, 86],
    [-72, 88, -120, 55, -120, 0],
  ],
  228, 1244, -5,
);
const lutePt = (lx: number, ly: number): P => placed([lx, ly], [], 228, 1244, -5)[0];
const luteLine = (a: P, b: P) => `M${r1(a[0])} ${r1(a[1])} L${r1(b[0])} ${r1(b[1])}`;

// ---- scenery: floor, carpet, windows, drapes, alcove ---------------------------------------------------------
const FLOOR = 'M65 900 H935 V1319 Q935 1335 919 1335 H81 Q65 1335 65 1319 Z';
const CARPET = 'M405 1120 H595 L700 1335 H300 Z';
const archWin = (x: number) => `M${x} 610 V440 A60 60 0 0 1 ${x + 120} 440 V610 Z`;
const drape = (flip: boolean) => {
  const X = (x: number) => (flip ? 1000 - x : x);
  const pts = `M${X(65)} 65 H${X(345)} C${X(322)} 205 ${X(230)} 330 ${X(132)} 420 C${X(150)} 570 ${X(160)} 730 ${X(175)} 900 H${X(65)} Z`;
  return pts;
};
const ALCOVE = 'M318 850 V500 A182 182 0 0 1 682 500 V850 Z';

export const royal_feast: PageArt = {
  id: 'royal_feast',
  viewBox: '0 0 1000 1400',
  scenery: [FLOOR, CARPET, `${archWin(182)} ${archWin(698)}`, drape(false), ALCOVE, drape(true)],
  background: [
    // floor tiles in perspective
    'M65 1200 H300 M700 1200 H935 M65 1275 H270 M730 1275 H935',
    'M200 1140 L150 1335 M820 1140 L860 1335 M300 1140 L265 1200 M700 1140 L735 1200',
    // carpet border
    'M425 1140 L335 1320 M575 1140 L665 1320',
    // wainscot line on the back wall
    'M175 820 H318 M682 820 H825',
  ],
  regions: {
    feast_table: { d: `${tableCloth()} ${path(...FRUIT_BOWL)}`, labelAt: [500, 1030] },
    throne: { d: THRONE, labelAt: [500, 585] },
    chandelier: { d: CHANDELIER, labelAt: [500, 262] },
    goblet: { d: GOBLET, labelAt: [775, 632] },
    cake: { d: CAKE, labelAt: [231, 808] },
    lute: { d: path(...LUTE), labelAt: lutePt(-66, 0) },
  },
  ink: [
    ...storybookFrame(),
    // chandelier: chain, flames, band, gems, tassel
    'M500 52 V70',
    ...CANDLE_X.map((x) => `M${x} 100 Q${x - 14} 84 ${x} 64 Q${x + 14} 84 ${x} 100 Z`),
    'M196 198 H804', circle(300, 238, 13), circle(700, 238, 13), circle(380, 250, 10), circle(620, 250, 10),
    // windows: panes + a crescent moon and a star peeking in
    'M242 380 V556 M182 520 H302 M758 380 V556 M698 520 H818',
    'M215 470 a22 22 0 1 0 18 -30 a16 16 0 1 1 -18 30 Z', star4(790, 475, 14),
    // drapes: folds + tie-backs with tassels
    'M110 120 Q150 260 120 400 M200 120 Q190 250 135 405 M890 120 Q850 260 880 400 M800 120 Q810 250 865 405',
    'M100 420 Q132 436 165 420 M132 428 V470 M120 470 H144', 'M900 420 Q868 436 835 420 M868 428 V470 M856 470 H880',
    'M95 520 Q105 700 100 880 M905 520 Q895 700 900 880',
    // garland swags on the alcove wall
    'M318 560 Q345 600 372 590 M682 560 Q655 600 628 590', circle(345, 598, 9), circle(655, 598, 9),
    // throne: crest, cushion, arm scrolls
    'M500 468 l24 30 l-24 30 l-24 -30 z', circle(500, 498, 6),
    'M405 712 Q500 694 595 712', 'M405 760 Q500 744 595 760',
    'M368 673 q-14 -8 -6 -16 q10 -2 10 10 M632 673 q14 -8 6 -16 q-10 -2 -10 10',
    // fruit bowl: rim, grapes, apple stem, pear leaf
    'M412 784 Q500 800 588 784', 'M444 826 H556',
    circle(490, 728, 10), circle(512, 726, 10), circle(500, 744, 10), 'M502 706 q4 -14 16 -18',
    'M430 742 q-2 -12 6 -18', 'M528 716 q10 -16 24 -10 q-8 14 -24 10 Z',
    // table edge, plates, apples, bread, grapes
    'M75 910 H925',
    ellipse(170, 885, 46, 13), circle(158, 872, 13), circle(184, 870, 14), 'M184 856 q4 -10 12 -10',
    ellipse(345, 882, 44, 13), 'M320 875 q25 -14 50 0',
    ellipse(655, 880, 46, 15), 'M632 872 l8 8 M650 868 l8 8 M668 870 l8 8',
    ellipse(840, 884, 48, 13), circle(825, 870, 10), circle(845, 866, 10), circle(865, 872, 10), circle(835, 852, 10), circle(856, 852, 10),
    // cloth folds + lace hem
    'M220 915 Q210 1020 230 1145 M360 915 Q352 1030 368 1160 M640 915 Q648 1030 632 1160 M780 915 Q790 1020 770 1145',
    wave(110, 890, 1088, 8, 52),
    // cake: candle flame, frosting drips, cherries, dots
    'M231 560 Q218 544 231 524 Q244 544 231 560 Z',
    'M187 625 Q205 642 222 625 Q240 642 258 625 Q268 636 275 625',
    'M152 692 Q172 712 192 692 Q212 712 232 692 Q252 712 272 692 Q292 712 310 692',
    circle(206, 596, 10), circle(256, 596, 10),
    circle(148, 790, 7), circle(314, 790, 7), circle(148, 826, 7), circle(314, 826, 7),
    // goblet: lip, gems, stem knot, fizz
    'M666 584 Q775 604 884 584', circle(704, 646, 14), circle(846, 646, 14), 'M762 756 H788',
    circle(735, 540, 9), circle(770, 520, 12), circle(810, 536, 8),
    // lute: sound hole rosette, bridge, strings, pegs
    circle(...lutePt(52, 0), 26), circle(...lutePt(52, 0), 12),
    luteLine(lutePt(-24, -26), lutePt(-24, 26)),
    luteLine(lutePt(-24, -10), lutePt(322, -10)), luteLine(lutePt(-24, 0), lutePt(322, 0)), luteLine(lutePt(-24, 10), lutePt(322, 10)),
    luteLine(lutePt(340, -8), lutePt(350, -32)), luteLine(lutePt(370, 2), lutePt(382, -20)), luteLine(lutePt(352, 32), lutePt(346, 56)),
    // music notes drifting from the lute
    'M680 1215 V1170 L712 1162 V1205', ellipse(671, 1217, 11, 8), ellipse(703, 1207, 11, 8),
    // floor: rolled-away apple + confetti + sparkles
    circle(800, 1250, 22), 'M800 1228 q3 -12 12 -16', 'M860 1190 q20 -20 40 0 q20 20 40 0',
    'M700 1300 q14 -18 28 0 q14 18 28 0',
    star4(620, 1300, 16), star4(900, 1290, 14), star4(90, 1180, 12),
  ],
};
