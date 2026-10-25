// Owner: AD. Chapter template: The Enchanted Forest.
// A great old tree with a little round door, a wise owl in its hollow, a mushroom ring, a silver river and
// fireflies glowing in the dusk between the treetops.
import type { PageArt } from './types';
import { circle, cloud, ellipse, onEllipse, scallops, star4, storybookFrame, wave } from './shapes';

// ---- the great tree: scalloped canopy + trunk with flared roots ------------------------------------------------
const CX = 500, CY = 410, RX = 315, RY = 245;
const A0 = 113; // canopy meets the trunk's left edge (bottom-left of the canopy ellipse)
const A1 = 360 + 67; // …and its right edge
const [tlx, tly] = onEllipse(CX, CY, RX, RY, A0);
const [trx] = onEllipse(CX, CY, RX, RY, A1);

// the owl, sitting in a hollow where the trunk meets the canopy (cut out of the tree as a CCW hole)
const OWL = 'M422 612 Q442 612 456 628 Q500 614 544 628 Q558 612 578 612 Q594 636 596 668 C618 772 578 838 500 838 C422 838 382 772 404 668 Q406 636 422 612 Z';
const OWL_HOLE = 'M422 612 Q406 636 404 668 C382 772 422 838 500 838 C578 838 618 772 596 668 Q594 636 578 612 Q558 612 544 628 Q500 614 456 628 Q442 612 422 612 Z';

const TREE =
  `M${tlx.toFixed(1)} ${tly.toFixed(1)}` + scallops(CX, CY, RX, RY, A0, A1, 10) +
  ` L${trx.toFixed(1)} 640 L610 930 Q618 1030 705 1086 L295 1086 Q382 1030 390 930 L${tlx.toFixed(1)} 640 Z ` +
  OWL_HOLE;

// ---- the mushroom ring: four toadstools in the left foreground -------------------------------------------------
/** Cap dome + stem as one contour (clockwise). */
function mushroom(cx: number, baseY: number, w: number, capH: number, sw: number, stemH: number): string {
  const capY = baseY - stemH;
  return `M${cx - w / 2} ${capY} A${w / 2} ${capH} 0 0 1 ${cx + w / 2} ${capY} L${cx + sw / 2} ${capY} L${cx + sw / 2 + 8} ${baseY} Q${cx} ${baseY + 10} ${cx - sw / 2 - 8} ${baseY} L${cx - sw / 2} ${capY} Z`;
}
const SHROOMS: [number, number, number, number, number, number][] = [
  [195, 1318, 260, 160, 96, 118], // big friendly one in front
  [390, 1292, 150, 96, 58, 82],
  [140, 1058, 140, 86, 50, 64],
  [285, 1074, 110, 70, 42, 50],
];

// ---- the winding path from the tree's door ---------------------------------------------------------------------
const PATH =
  'M452 1086 L548 1086 C560 1130 625 1150 615 1200 C605 1250 655 1290 662 1335 L470 1335 C480 1290 470 1250 492 1210 C512 1170 440 1140 452 1086 Z';

// ---- the silver river, winding in from the far hills -----------------------------------------------------------
const RIVER =
  'M935 735 C830 775 770 860 795 950 C820 1040 728 1110 708 1180 C692 1240 698 1290 690 1335 L905 1335 C895 1270 905 1200 905 1140 C905 1060 935 1010 935 960 Z';

// ---- fireflies: glowing orbs in the gaps around the canopy -----------------------------------------------------
const FLIES: [number, number, number][] = [
  [118, 470, 52], // labelled one
  [120, 170, 44], [300, 108, 40], [700, 108, 40], [880, 170, 44], [884, 470, 46],
];

/** Row of rounded tree-tops for the far forest (closed band down to y=1090). */
function treeline(): string {
  let d = 'M65 1090 L65 820';
  const tops = [800, 760, 790, 740, 785, 750, 795, 765, 805, 770];
  const step = 870 / tops.length;
  tops.forEach((y, i) => {
    const x0 = 65 + i * step, x1 = x0 + step;
    d += ` L${x0.toFixed(1)} ${y + 30} A${(step / 2).toFixed(1)} 44 0 0 1 ${x1.toFixed(1)} ${y + 30}`;
  });
  return d + ' L935 1090 Z';
}

/** A tiny frog on a lily pad (outline only). */
const frog = (x: number, y: number) =>
  `${ellipse(x, y + 16, 48, 16)} M${x - 26} ${y + 4} Q${x - 30} ${y - 26} ${x} ${y - 28} Q${x + 30} ${y - 26} ${x + 26} ${y + 4}` +
  ` ${circle(x - 14, y - 30, 9)} ${circle(x + 14, y - 30, 9)} M${x - 10} ${y - 12} Q${x} ${y - 4} ${x + 10} ${y - 12}`;

export const enchanted_forest: PageArt = {
  id: 'enchanted_forest',
  viewBox: '0 0 1000 1400',
  scenery: [
    ellipse(500, 400, 385, 320), // soft glow behind the canopy
    treeline(), // the far forest
    'M65 1062 Q300 1040 500 1070 Q700 1040 935 1062 V1335 H65 Z', // mossy ground
    cloud(735, 1052, 70, 34, 6), // a bush by the roots
    `${ellipse(445, 1325, 26, 12)} ${ellipse(675, 1060, 22, 10)}`, // stones
  ],
  background: [
    // grass tufts + ferns
    'M90 1110 l10 -20 l8 20 M440 1250 l8 -16 l6 16 M640 1120 l8 -16 l6 16 M915 1330 l8 -16 l6 16',
    'M600 1335 Q590 1300 610 1280 M600 1315 l-14 -8 M603 1298 l-12 -10',
  ],
  regions: {
    great_tree: { d: TREE, labelAt: [330, 300] },
    owl: { d: OWL, labelAt: [500, 772] },
    mushroom_ring: { d: SHROOMS.map((m) => mushroom(...m)).join(' '), labelAt: [195, 1140] },
    river: { d: RIVER, labelAt: [865, 1010] },
    path: { d: PATH, labelAt: [570, 1280] },
    fireflies: { d: FLIES.map(([x, y, r]) => circle(x, y, r)).join(' '), labelAt: [FLIES[0][0], FLIES[0][1]] },
  },
  ink: [
    ...storybookFrame(),
    // canopy leaf curls + berry pairs
    `${circle(440, 300, 10)} ${circle(458, 314, 10)} ${circle(700, 330, 10)} ${circle(718, 344, 10)} ${circle(520, 470, 10)} ${circle(538, 484, 10)} ${circle(250, 500, 10)} ${circle(268, 514, 10)}`,
    'M250 420 q28 -28 56 0 M640 250 q28 -28 56 0 M610 520 q28 -28 56 0 M300 540 q28 -28 56 0 M470 230 q28 -28 56 0 M720 400 q28 -28 56 0 M420 380 q28 -28 56 0',
    // the hollow around the owl
    'M392 660 Q380 600 425 580 M608 660 Q620 600 575 580',
    // bark, roots and the little round door
    'M420 880 Q410 930 430 990 M582 870 Q596 930 575 1000',
    'M330 1076 Q360 1050 395 1060 M670 1076 Q640 1050 605 1060',
    'M455 1084 V1010 A45 45 0 0 1 545 1010 V1084', 'M500 965 V1084', circle(526, 1040, 6), circle(500, 1000, 14),
    // owl: big eyes, beak, eyebrows, wing edges, toes on the hollow's lip
    'M500 712 C470 728 428 712 428 676 C428 646 462 640 500 656 C538 640 572 646 572 676 C572 712 530 728 500 712',
    circle(468, 678, 22), circle(532, 678, 22), circle(472, 682, 8), circle(528, 682, 8),
    'M490 702 L500 722 L510 702 Z',
    'M418 730 Q420 790 462 822 M582 730 Q580 790 538 822 M430 760 q14 6 18 20 M570 760 q-14 6 -18 20',
    'M470 838 v14 M486 838 v14 M514 838 v14 M530 838 v14',
    // mushroom spots + a sleepy smile on the big one's stem
    circle(122, 1124, 17), circle(250, 1092, 20), circle(292, 1162, 14), circle(100, 1176, 11),
    circle(362, 1172, 12), circle(424, 1160, 14), circle(110, 958, 12), circle(166, 944, 10), circle(268, 990, 9), circle(306, 1002, 8),
    'M172 1252 q8 8 16 0 M204 1252 q8 8 16 0 M182 1278 Q195 1292 210 1278',
    // river ripples, a lily-pad frog, a leaping fish
    wave(800, 880, 900, 7, 30), wave(760, 840, 1130, 7, 30), wave(730, 810, 1220, 7, 30),
    frog(810, 1290),
    'M860 820 Q880 800 905 815 Q880 832 860 820 Z M860 820 l-12 -10 M860 820 l-12 10',
    // path pebbles
    ellipse(520, 1130, 14, 8), ellipse(560, 1200, 12, 7), ellipse(520, 1235, 16, 9),
    // fireflies: tiny bodies, wings and glow sparkles (the labelled one just sparkles)
    ...FLIES.slice(1).map(([x, y]) =>
      `${circle(x, y - 16, 7)} ${ellipse(x, y + 4, 9, 14)} M${x - 8} ${y - 6} Q${x - 34} ${y - 26} ${x - 26} ${y + 4} Q${x - 16} ${y + 6} ${x - 8} ${y - 6} M${x + 8} ${y - 6} Q${x + 34} ${y - 26} ${x + 26} ${y + 4} Q${x + 16} ${y + 6} ${x + 8} ${y - 6} M${x - 12} ${y + 24} l-8 8 M${x + 12} ${y + 24} l8 8`),
    // stars peeking through the treetops
    star4(500, 100, 18), star4(90, 330, 14), star4(910, 320, 14), star4(800, 700, 12),
  ],
};
