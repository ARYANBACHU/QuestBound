// Owner: AD. Chapter template: The Candy Village.
import type { PageArt } from './types';
import { circle, cloud, star4, storybookFrame, wave } from './shapes';

const n = (v: number) => Math.round(v * 10) / 10;

/** Point mapper: local (x, y) → scaled + translated "X Y" string (and .at for a tuple). */
function xf(ox: number, oy: number, sx = 1, sy = sx) {
  const at = (x: number, y: number): [number, number] => [n(ox + sx * x), n(oy + sy * y)];
  return Object.assign((x: number, y: number) => at(x, y).join(' '), { at });
}

/** Icing drips: a row of bumps hanging off the line (x0,y0)→(x1,y1), bulging to its right-hand side. */
function icing(x0: number, y0: number, x1: number, y1: number, count: number, depth: number): string {
  const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  let out = `M${n(x0)} ${n(y0)}`;
  for (let i = 1; i <= count; i++) {
    const ax = x0 + ((x1 - x0) * (i - 1)) / count, ay = y0 + ((y1 - y0) * (i - 1)) / count;
    const bx = x0 + ((x1 - x0) * i) / count, by = y0 + ((y1 - y0) * i) / count;
    out += ` Q${n((ax + bx) / 2 + nx * depth)} ${n((ay + by) / 2 + ny * depth)} ${n(bx)} ${n(by)}`;
  }
  return out;
}

/** Lollipop swirl: an Archimedean spiral from the center out to radius r. */
function spiral(cx: number, cy: number, r: number, turns = 2.4): string {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, a = t * turns * 2 * Math.PI;
    pts.push(`${i ? 'L' : 'M'}${n(cx + r * t * Math.cos(a))} ${n(cy + r * t * Math.sin(a))}`);
  }
  return pts.join(' ');
}

// ── The gingerbread hall: gabled roof with a chimney, big walls ──
const HALL =
  'M260 480 L500 200 L610 328 L610 255 L670 255 L670 398 L740 480 L710 480 L710 930 L290 930 L290 480 Z';

// ── The lollipop grove: three lollipop trees (left, top-left behind the roof, top-right) ──
/** candy disc + stick; the stick's foot can slope (left y, right y) to sit flush on a roof */
const lolly = ([cx, cy, r]: [number, number, number], footL: number, footR = footL, w = 26) =>
  `${circle(cx, cy, r)} M${cx - w / 2} ${cy + r - 4} L${cx + w / 2} ${cy + r - 4} L${cx + w / 2} ${footR} L${cx - w / 2} ${footL} Z`;
const L1: [number, number, number] = [172, 382, 97];
const L2: [number, number, number] = [845, 296, 84];
const L3: [number, number, number] = [330, 176, 80];
/** roof's left slope y at x */
const roofL = (x: number) => n(480 - ((x - 260) * 280) / 240);
const LOLLIPOPS = [lolly(L1, 930), lolly(L2, 452), lolly(L3, roofL(317), roofL(343))].join(' ');

// ── The candy cane: a chunky lamp-post cane hugging the hall's right wall, hook curling right ──
const CANE =
  'M714 930 L714 570 A106 106 0 0 1 926 570 L926 640 Q926 660 905 660 L863 660 Q842 660 842 640 L842 570 A22 22 0 0 0 798 570 L798 930 Z';

// ── The chocolate river: two pools either side of the wafer bridge ──
const RIVER =
  'M68 950 Q160 932 250 947 T448 944 L440 1070 Q340 1088 250 1074 T68 1068 Z ' +
  'M552 944 Q650 930 750 946 T932 942 L932 1068 Q840 1084 750 1072 T560 1070 Z';

// ── The cupcake: swirled frosting, pleated liner, cherry on top ──
const cp = xf(200, 1238, 1.0, 0.9);
const CUPCAKE =
  `M${cp(-108, 6)} Q${cp(-134, -18)} ${cp(-104, -40)} Q${cp(-98, -68)} ${cp(-64, -68)} Q${cp(-54, -96)} ${cp(-20, -94)} ` +
  `Q${cp(-6, -112)} ${cp(0, -122)} Q${cp(6, -112)} ${cp(20, -94)} Q${cp(54, -96)} ${cp(64, -68)} Q${cp(98, -68)} ${cp(104, -40)} ` +
  `Q${cp(134, -18)} ${cp(108, 6)} L${cp(86, 98)} Q${cp(0, 108)} ${cp(-86, 98)} Z ` +
  circle(...cp.at(0, -142), 21);

// ── The gumdrop: a big sugary dome ──
const GUMDROP = 'M690 1318 C684 1196 742 1112 805 1112 C868 1112 926 1196 920 1318 Q805 1336 690 1318 Z';

// ── Scenery ──
const HILLS = 'M52 560 Q170 470 300 540 Q420 600 520 520 Q650 420 780 500 Q870 550 948 470 L948 960 L52 960 Z';
const GROUND = 'M52 935 Q250 918 500 935 Q750 950 948 930 L948 1334 Q948 1348 934 1348 L66 1348 Q52 1348 52 1334 Z';
const PATH = 'M455 930 L545 930 Q556 1120 628 1348 L372 1348 Q444 1120 455 930 Z';

export const candy_village: PageArt = {
  id: 'candy_village',
  viewBox: '0 0 1000 1400',
  scenery: [cloud(150, 165, 82, 40, 7), HILLS, cloud(650, 140, 92, 40, 8), GROUND, cloud(800, 95, 66, 28, 6), PATH],
  background: [
    'M60 1150 Q120 1138 170 1150 M300 1300 Q330 1290 360 1300 M660 1110 Q700 1098 740 1110',
    'M330 1180 l8 -16 l6 16 M640 1250 l8 -16 l6 16 M940 1100 l-8 -16 l-6 16',
  ],
  regions: {
    gingerbread_hall: { d: HALL, labelAt: [500, 640] },
    lollipop_grove: { d: LOLLIPOPS, labelAt: [L1[0], L1[1]] },
    chocolate_river: { d: RIVER, labelAt: [250, 1015] },
    candy_cane: { d: CANE, labelAt: [756, 770] },
    cupcake: { d: CUPCAKE, labelAt: cp.at(0, 42) },
    gumdrop: { d: GUMDROP, labelAt: [805, 1240] },
  },
  ink: [
    ...storybookFrame(),
    // hall: icing trim on the roof edges + eave, chimney frosting
    icing(276, 466, 500, 222, 7, 16), icing(500, 222, 724, 466, 7, 16), icing(296, 494, 704, 494, 9, 16),
    icing(612, 270, 668, 270, 2, 14),
    // hall: windows with crossbars, round attic window, door + knob
    'M320 590 h80 v92 h-80 Z M360 590 v92 M320 636 h80', 'M600 590 h80 v92 h-80 Z M640 590 v92 M600 636 h80',
    circle(500, 380, 34), 'M466 380 h68 M500 346 v68',
    'M455 930 V865 A45 45 0 0 1 545 865 V930', circle(528, 900, 6),
    // hall: gumdrops on the roof, peppermint swirls on the walls, gingerbread icing zigzag
    'M406 352 A14 14 0 0 1 434 352 Z M566 352 A14 14 0 0 1 594 352 Z',
    circle(350, 800, 28), spiral(350, 800, 24, 1.6), circle(650, 800, 28), spiral(650, 800, 24, 1.6),
    icing(316, 712, 404, 712, 3, 14), icing(596, 712, 684, 712, 3, 14),
    // lollipops: candy ring on the big one, swirls on the others, little bows
    circle(L1[0], L1[1], 72), spiral(L2[0], L2[1], L2[2] - 12), spiral(L3[0], L3[1], L3[2] - 12),
    'M148 526 q-24 -18 -24 6 q0 22 24 4 M196 526 q24 -18 24 6 q0 22 -24 4',
    // candy cane stripes (stick + hook), skipping the label spot
    'M714 640 L798 600 M714 700 L798 660 M714 850 L798 810 M714 910 L798 870',
    'M732 500 L782 540 M820 464 L820 548 M908 500 L858 540',
    'M842 620 L926 600',
    // chocolate river: ripples + a wafer bridge between the pools
    wave(110, 220, 1040, 7, 34), wave(300, 410, 1000, 7, 34), wave(600, 700, 1000, 7, 34), wave(780, 900, 1040, 7, 34),
    'M448 940 V1078 M552 940 V1078 M448 958 H552 M448 1060 H552 M478 958 V1060 M522 958 V1060',
    // cupcake: frosting edge, liner pleats, cherry stem + shine
    `M${cp(-104, 6)} Q${cp(-78, 22)} ${cp(-52, 6)} Q${cp(-26, 22)} ${cp(0, 6)} Q${cp(26, 22)} ${cp(52, 6)} Q${cp(78, 22)} ${cp(104, 6)}`,
    `M${cp(-60, 20)} L${cp(-52, 98)} M${cp(-30, 20)} L${cp(-26, 100)} M${cp(30, 20)} L${cp(26, 100)} M${cp(60, 20)} L${cp(52, 98)}`,
    `M${cp(-62, -46)} Q${cp(0, -30)} ${cp(62, -46)}`,
    `M${cp(0, -162)} Q${cp(6, -186)} ${cp(26, -194)}`,
    // gumdrop: sugar sparkles + a sweet face
    'M760 1160 l10 6 M850 1150 l-8 8 M720 1220 l10 0 M890 1215 l-10 2',
    circle(782, 1280, 5), circle(828, 1280, 5), 'M792 1296 Q805 1306 818 1296',
    // sprinkles on the hills + sparkles in the sky
    'M95 640 l18 -10 M240 600 l20 6 M865 600 l-16 14 M110 860 l20 8 M880 820 l-18 10',
    star4(470, 110, 20), star4(905, 420, 14), star4(250, 290, 14), star4(560, 175, 12),
  ],
};
