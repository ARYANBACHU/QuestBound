// Owner: AD. Chapter template: The Castle Gate.
// A storybook castle at dusk: witch-hat towers, a welcoming open gate, a sleepy moon and a flag waving hello.
import type { PageArt } from './types';
import { circle, cloud, crenels, ellipse, star4, storybookFrame, wave } from './shapes';

// ---- the castle (one contour: left tower, keep, centre tower, keep, right tower) -------------------------------
/** Concave "witch hat" roof from eave (x1) over apex (ax, ay) to eave (x2), all at eave height y. */
const roof = (x1: number, x2: number, y: number, ax: number, ay: number) =>
  ` L${x1} ${y} Q${ax - 25} ${y - 40} ${ax} ${ay} Q${ax + 25} ${y - 40} ${x2} ${y}`;

// gate opening (a CCW hole in the castle, filled by the drawbridge region)
const GATE_HOLE = 'M410 920 L410 1060 L590 1060 L590 920 A90 90 0 0 0 410 920 Z';
const GATE = 'M410 920 A90 90 0 0 1 590 920 L590 1060 L410 1060 Z';

// swallowtail banners hanging on the two side towers
const BANNER_TOP = 590;
const BANNER_BOT = 950;
const bannerAt = (x: number) =>
  `M${x} ${BANNER_TOP} L${x + 140} ${BANNER_TOP} L${x + 140} ${BANNER_BOT} L${x + 70} ${BANNER_BOT - 55} L${x} ${BANNER_BOT} Z`;
const bannerHoleAt = (x: number) =>
  `M${x} ${BANNER_TOP} L${x} ${BANNER_BOT} L${x + 70} ${BANNER_BOT - 55} L${x + 140} ${BANNER_BOT} L${x + 140} ${BANNER_TOP} Z`;
const BANNER_X = [145, 715] as const;

const CASTLE =
  'M120 1060 L120 520' + roof(100, 330, 520, 215, 345) +
  ' L310 520 L310 640' + crenels(310, 410, 640, 2, 40) +
  ' L410 420' + roof(390, 610, 420, 500, 250) +
  ' L590 420 L590 640' + crenels(590, 690, 640, 2, 40) +
  ' L690 520' + roof(670, 900, 520, 785, 345) +
  ' L880 520 L880 1060 Z ' +
  GATE_HOLE + ' ' + BANNER_X.map(bannerHoleAt).join(' ');

// ---- the lowered drawbridge (gate opening + bridge across the moat) --------------------------------------------
const BRIDGE_BOT = 1270;
const BRIDGE = `M410 1060 L590 1060 L650 ${BRIDGE_BOT} L350 ${BRIDGE_BOT} Z`;
const bl = (y: number) => 410 - (60 * (y - 1060)) / (BRIDGE_BOT - 1060);
const br = (y: number) => 590 + (60 * (y - 1060)) / (BRIDGE_BOT - 1060);

// ---- the moat: two pools of water either side of the bridge ----------------------------------------------------
const MOAT =
  `M70 1088 Q230 1072 ${bl(1084).toFixed(1)} 1084 L${bl(1200).toFixed(1)} 1200 Q220 1214 70 1196 Z ` +
  `M${br(1084).toFixed(1)} 1084 Q770 1072 930 1088 L930 1196 Q780 1214 ${br(1200).toFixed(1)} 1200 Z`;

// ---- the tower flag, waving from the centre spire --------------------------------------------------------------
const FLAG = 'M512 100 Q590 78 660 104 Q735 130 805 104 L762 172 L805 240 Q735 266 660 240 Q590 214 512 234 Z';

/** A small heart (keystone over the gate). */
const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s} C${cx - s * 1.6} ${cy} ${cx - s} ${cy - s * 1.2} ${cx} ${cy - s * 0.4} C${cx + s} ${cy - s * 1.2} ${cx + s * 1.6} ${cy} ${cx} ${cy + s} Z`;

/** A five-petal meadow flower. */
const flower = (x: number, y: number) =>
  `${circle(x, y, 7)} M${x} ${y - 7} q-10 -18 0 -24 q10 6 0 24 M${x + 7} ${y} q18 -10 24 0 q-6 10 -24 0 M${x} ${y + 7} q10 18 0 24 q-10 -6 0 -24 M${x - 7} ${y} q-18 10 -24 0 q6 -10 24 0`;

/** A little duck paddling (outline only). */
const duck = (x: number, y: number) =>
  `M${x - 34} ${y} Q${x - 30} ${y + 22} ${x} ${y + 22} Q${x + 30} ${y + 22} ${x + 26} ${y - 4} Q${x + 4} ${y + 4} ${x - 6} ${y - 6} Q${x - 18} ${y - 4} ${x - 34} ${y} Z` +
  ` M${x + 14} ${y - 4} Q${x + 8} ${y - 40} ${x + 28} ${y - 40} Q${x + 44} ${y - 38} ${x + 38} ${y - 22} L${x + 52} ${y - 22} L${x + 38} ${y - 14} Q${x + 34} ${y - 6} ${x + 26} ${y - 4}` +
  ` ${circle(x + 30, y - 30, 2.5)} M${x - 14} ${y + 6} Q${x + 2} ${y + 14} ${x + 14} ${y + 4}`;

export const castle_gate: PageArt = {
  id: 'castle_gate',
  viewBox: '0 0 1000 1400',
  scenery: [
    circle(190, 195, 125), // moon halo
    'M65 940 Q140 860 240 905 Q330 850 440 900 Q560 860 660 905 Q780 850 860 900 Q900 880 935 900 L935 1070 L65 1070 Z', // far hills
    cloud(860, 410, 70, 30, 6), // wisp of cloud
    'M65 1050 H935 V1335 H65 Z', // the meadow and moat bank
    `M${bl(BRIDGE_BOT - 6)} ${BRIDGE_BOT - 6} L${br(BRIDGE_BOT - 6)} ${BRIDGE_BOT - 6} C690 1300 720 1318 740 1335 L270 1335 C290 1318 320 1296 ${bl(BRIDGE_BOT - 6)} ${BRIDGE_BOT - 6} Z`, // road out
    `${cloud(160, 1288, 78, 40, 6)} ${cloud(840, 1288, 78, 40, 6)}`, // hedges
    cloud(380, 300, 60, 24, 5), // second cloud wisp
  ],
  background: [
    // grass tufts and meadow lines
    'M90 1240 l10 -20 l8 20 M240 1250 l10 -20 l8 20 M760 1245 l10 -20 l8 20 M905 1230 l8 -18 l6 18',
    'M200 1300 Q240 1290 270 1300 M730 1300 Q770 1290 800 1300',
    // distant tree lollipops on the far hills
    'M82 980 V1045 M82 980 a18 22 0 1 1 0.1 0 M918 980 V1045 M918 980 a18 22 0 1 1 0.1 0',
  ],
  regions: {
    castle: { d: CASTLE, labelAt: [500, 735] },
    drawbridge: { d: `${GATE} ${BRIDGE}`, labelAt: [500, 975] },
    banners: { d: BANNER_X.map(bannerAt).join(' '), labelAt: [215, 700] },
    moon: { d: circle(190, 195, 105), labelAt: [190, 202] },
    tower_flag: { d: FLAG, labelAt: [615, 170] },
    moat: { d: MOAT, labelAt: [215, 1140] },
  },
  ink: [
    ...storybookFrame(),
    // flag pole + golden finial + a star on the flag
    'M500 250 V114', circle(500, 102, 11), star4(725, 172, 24),
    // roof finials and roof-tile scallops
    circle(215, 333, 12), circle(785, 333, 12),
    'M150 490 Q170 505 190 490 Q215 505 240 490 Q260 505 280 490',
    'M720 490 Q740 505 760 490 Q785 505 810 490 Q830 505 850 490',
    'M440 395 Q460 410 480 395 Q500 410 520 395 Q540 410 560 395',
    // little round dormer windows in the side roofs
    circle(215, 445, 20), 'M215 425 V465 M195 445 H235',
    circle(785, 445, 20), 'M785 425 V465 M765 445 H805',
    // centre-tower rose window
    circle(500, 525, 38), circle(500, 525, 14), 'M500 487 V511 M500 539 V563 M462 525 H486 M514 525 H538',
    // keep windows with sills
    'M345 800 V752 A22 22 0 0 1 389 752 V800 Z M338 806 H396',
    'M611 800 V752 A22 22 0 0 1 655 752 V800 Z M604 806 H662',
    // banner rods + emblems (crown left, star right)
    'M128 590 H302 M698 590 H872', circle(128, 590, 8), circle(302, 590, 8), circle(698, 590, 8), circle(872, 590, 8),
    'M180 845 L180 800 L198 822 L215 790 L232 822 L250 800 L250 845 Z',
    star4(785, 815, 34),
    // gate arch trim + heart keystone
    'M392 920 A108 108 0 0 1 608 920', heart(500, 798, 16),
    // raised portcullis peeking from the arch
    'M440 845 V886 M470 834 V886 M500 830 V886 M530 834 V886 M560 845 V886 M422 878 H578',
    // wall torches beside the gate
    'M372 980 V940 M628 980 V940 M362 980 H382 M618 980 H638',
    'M372 932 Q358 914 372 892 Q386 914 372 932 Z M628 932 Q614 914 628 892 Q642 914 628 932 Z',
    // bricks
    'M150 990 h40 M215 1020 h45 M160 1040 h28 M760 1000 h44 M820 1030 h36 M330 870 h40 M630 880 h40 M340 680 h34 M630 690 h34',
    // climbing ivy on the left tower
    'M126 1056 Q160 1010 140 970 Q120 930 150 900 M140 1000 q-16 -6 -18 -20 M146 950 q16 -4 20 -18',
    // bridge planks + rails + chains
    ...[1095, 1130, 1165, 1200, 1235].map((y) => `M${bl(y).toFixed(1)} ${y} H${br(y).toFixed(1)}`),
    'M398 868 L358 1262 M602 868 L642 1262',
    // moat ripples, lily pads, a duck
    wave(95, 205, 1172, 7, 36), wave(705, 815, 1120, 7, 36), wave(820, 910, 1168, 7, 30),
    'M300 1170 a26 13 0 1 1 22 6 L300 1170 Z',
    duck(800, 1150),
    // the sleepy moon: closed eyes, rosy cheek, smile, and a nightcap tassel line
    'M135 150 Q150 163 165 150 M215 150 Q230 163 245 150', 'M122 196 l14 -6 M122 210 l14 -6 M244 190 l14 6 M244 204 l14 6', 'M165 250 Q190 272 215 250',
    // stars
    star4(380, 150, 20), star4(870, 160, 22), star4(905, 300, 15), star4(300, 270, 14), star4(92, 380, 14), star4(640, 300, 12),
    // meadow flowers
    flower(100, 1212), flower(255, 1236), flower(745, 1236), flower(900, 1212),
  ],
};
