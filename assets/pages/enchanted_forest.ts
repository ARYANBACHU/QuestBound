// Owner: AD. Chapter template: The Enchanted Forest.
import type { PageArt } from './types';
import { circle, ellipse, onEllipse, scallops, storybookFrame, wave } from './shapes';

const [tx, ty] = onEllipse(500, 440, 270, 240, 108);
const OWL_HOLE = 'M440 380 L428 440 C410 520 440 560 500 560 C560 560 590 520 572 440 L560 380 L538 412 Q500 400 462 412 Z';
const OWL = 'M440 380 L462 412 Q500 400 538 412 L560 380 L572 440 C590 520 560 560 500 560 C440 560 410 520 428 440 Z';

const TREE =
  `M${tx.toFixed(1)} ${ty.toFixed(1)}` + scallops(500, 440, 270, 240, 108, 432, 9) +
  ' L565 730 L565 960 Q575 1050 660 1085 L340 1085 Q425 1050 435 960 L435 730 Z ' + OWL_HOLE;

/** cap dome + stem as one contour */
function mushroom(cx: number, baseY: number, w: number, capH: number, sw: number, stemH: number): string {
  const capY = baseY - stemH;
  return `M${cx - w / 2} ${capY} A${w / 2} ${capH} 0 0 1 ${cx + w / 2} ${capY} L${cx + sw / 2} ${capY} L${cx + sw / 2 + 6} ${baseY} Q${cx} ${baseY + 10} ${cx - sw / 2 - 6} ${baseY} L${cx - sw / 2} ${capY} Z`;
}

const FLIES: [number, number][] = [[125, 150], [285, 100], [115, 430], [715, 100], [875, 150], [885, 430]];

export const enchanted_forest: PageArt = {
  id: 'enchanted_forest',
  viewBox: '0 0 1000 1400',
  background: [
    'M50 1086 Q200 1060 340 1086 M660 1086 Q760 1070 950 1080',
    'M120 1050 Q170 990 230 1050 M780 1040 Q820 1000 860 1040',
    'M100 1330 l8 -16 l6 16 M650 1200 l8 -16 l6 16 M330 1330 l8 -16 l6 16',
  ],
  regions: {
    great_tree: { d: TREE, labelAt: [330, 330] },
    owl: { d: OWL, labelAt: [500, 515] },
    mushroom_ring: {
      d: `${mushroom(150, 1290, 170, 100, 56, 80)} ${mushroom(310, 1250, 130, 80, 46, 70)} ${mushroom(200, 1080, 110, 70, 40, 60)}`,
      labelAt: [150, 1160],
    },
    river: {
      d: 'M948 760 C770 820 690 950 750 1060 C800 1150 720 1240 650 1348 L860 1348 C900 1220 880 1130 880 1060 C880 980 900 930 948 900 Z',
      labelAt: [810, 1010],
    },
    path: {
      d: 'M450 1088 L550 1088 C600 1150 480 1180 560 1240 C590 1270 605 1300 615 1348 L385 1348 C380 1290 440 1240 420 1200 C400 1160 470 1130 450 1088 Z',
      labelAt: [500, 1290],
    },
    fireflies: { d: FLIES.map(([x, y]) => circle(x, y, 36)).join(' '), labelAt: FLIES[0] },
  },
  ink: [
    ...storybookFrame(),
    // bark + roots
    'M470 760 Q460 840 478 920 M530 790 Q545 870 528 960 M500 980 Q505 1030 480 1070 M395 1060 Q420 1040 440 1050 M605 1060 Q580 1040 560 1050',
    // canopy curls
    'M300 470 q30 -30 60 0 M640 300 q30 -30 60 0 M600 600 q30 -30 60 0 M360 600 q30 -30 60 0 M470 250 q30 -30 60 0',
    // owl face
    circle(474, 448, 20), circle(526, 448, 20), circle(476, 450, 6), circle(524, 450, 6),
    'M492 474 L500 490 L508 474 Z', 'M450 500 Q462 530 480 545 M550 500 Q538 530 520 545',
    // owl's branch
    'M410 562 Q500 572 600 558',
    // mushroom spots
    circle(118, 1160, 14), circle(175, 1140, 18), circle(205, 1190, 10), circle(290, 1135, 12), circle(335, 1155, 10), circle(195, 980, 12),
    // river ripples
    wave(770, 860, 980, 7, 30), wave(740, 830, 1110, 7, 30), wave(700, 790, 1260, 7, 30),
    // path pebbles
    ellipse(505, 1140, 14, 8), ellipse(520, 1215, 12, 7), ellipse(470, 1270, 16, 9),
    // fireflies: tiny bodies + wings
    ...FLIES.map(([x, y]) => `${ellipse(x, y + 4, 7, 11)} M${x - 6} ${y - 4} q-14 -16 -2 -20 q8 4 8 16 M${x + 6} ${y - 4} q14 -16 2 -20 q-8 4 -8 16`),
  ],
};
