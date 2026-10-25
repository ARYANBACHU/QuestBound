// Owner: MP (Round 3 U2). Chapter template: The Troll Bridge.
// A humped stone bridge over a rushing creek; a grumpy troll under the arch, a billy goat on top, a toll bell on
// its post, and a riddle stone on the near bank.
import type { PageArt } from '../types';
import { circle, cloud, ellipse, onEllipse, rr, star4, storybookFrame, wave } from '../shapes';

// Bridge: humped deck, one big arch. Deck top is a quadratic from (70,640) over (500,440) to (930,640).
const deckY = (x: number, lift = 0) => {
  const t = (x - 70) / 860;
  return 640 - 400 * t * (1 - t) + lift;
};
const BRIDGE =
  'M70 640 Q500 440 930 640 L930 960 L710 960 L710 900 C710 770 620 700 500 700 C380 700 290 770 290 900 L290 960 L70 960 Z';

// Troll: big-eared head on broad shoulders, standing in the creek under the arch.
const TROLL =
  'M378 960 C370 900 390 852 420 832 L344 784 L428 798 C438 746 468 724 500 724 C532 724 562 746 572 798 L656 784 L580 832 C610 852 630 900 622 960 Z';

const CREEK = 'M290 960 L710 960 C760 1060 900 1120 930 1240 L930 1340 L380 1340 C405 1250 300 1130 290 960 Z';

const GOAT =
  'M180 522 C180 482 214 468 256 468 L298 468 L316 440 C320 420 338 408 356 413 L384 432 C394 440 390 457 377 459 ' +
  'L354 463 L350 492 L338 472 L330 478 C330 500 322 518 312 526 L308 566 L292 566 L290 536 L276 538 L274 568 L260 568 ' +
  'L258 540 L226 540 L222 586 L206 586 L204 540 L196 538 L194 588 L178 588 Z';

const BELL = 'M652 532 C656 486 672 420 720 420 C768 420 784 486 788 532 L806 552 L634 552 Z';

const STONE = 'M112 1290 L124 1092 C130 1026 272 1018 280 1084 L292 1290 Z';

// Voussoir lines around the arch.
const voussoirs = Array.from({ length: 11 }, (_, i) => {
  const deg = 180 + (i + 0.5) * (180 / 11);
  const [x0, y0] = onEllipse(500, 900, 210, 200, deg);
  const [x1, y1] = onEllipse(500, 900, 262, 250, deg);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}`;
}).join(' ');

const rays = Array.from({ length: 8 }, (_, i) => {
  const [x0, y0] = onEllipse(820, 190, 78, 78, i * 45);
  const [x1, y1] = onEllipse(820, 190, 108, 108, i * 45);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}`;
}).join(' ');

const tuft = (x: number, y: number) => `M${x - 14} ${y} q4 -22 10 -26 M${x} ${y} q0 -26 2 -32 M${x + 14} ${y} q-2 -22 -10 -26`;
const flower = (x: number, y: number) => `${circle(x, y, 7)} ${circle(x, y - 15, 8)} ${circle(x + 14, y - 4, 8)} ${circle(x - 14, y - 4, 8)} ${circle(x + 9, y + 12, 8)} ${circle(x - 9, y + 12, 8)}`;

export const troll_bridge: PageArt = {
  id: 'troll_bridge',
  viewBox: '0 0 1000 1400',
  background: [
    // far hills behind the bridge
    'M60 600 Q200 470 360 540 Q470 470 560 520 Q700 430 940 560',
    // banks
    'M60 962 H290 M710 962 H940',
    'M60 1110 Q120 1095 180 1110',
  ],
  regions: {
    stone_bridge: { d: BRIDGE, labelAt: [150, 800] },
    bridge_troll: { d: TROLL, labelAt: [500, 920] },
    rushing_creek: { d: CREEK, labelAt: [640, 1230] },
    riddle_stone: { d: STONE, labelAt: [202, 1062] },
    billy_goat: { d: GOAT, labelAt: [250, 505] },
    toll_bell: { d: BELL, labelAt: [720, 495] },
  },
  ink: [
    ...storybookFrame(),
    // sun, clouds, birds, a far-off tower
    circle(820, 190, 62), rays,
    cloud(250, 200, 110, 46, 8), cloud(560, 140, 70, 30, 6),
    'M420 300 q16 -16 32 0 q16 -16 32 0 M520 250 q12 -12 24 0 q12 -12 24 0',
    'M560 506 V430 H610 V500 M550 430 L585 392 L620 430 M577 452 v18 h16 v-18 Z',
    // deck road + parapet stones
    `M90 ${deckY(90, 52).toFixed(1)} Q500 ${(440 + 52).toFixed(1)} 910 ${deckY(910, 52).toFixed(1)}`,
    ...[160, 260, 380, 620, 740, 840].map((x) => `M${x} ${deckY(x).toFixed(1)} V${deckY(x, 50).toFixed(1)}`),
    voussoirs,
    // pier stones
    rr(96, 742, 74, 40, 12), rr(186, 790, 64, 38, 12), rr(104, 846, 82, 40, 12), rr(206, 900, 58, 36, 12),
    rr(832, 742, 74, 40, 12), rr(752, 790, 64, 38, 12), rr(816, 846, 82, 40, 12), rr(740, 900, 58, 36, 12),
    rr(150, 676, 60, 30, 10), rr(790, 676, 60, 30, 10),
    // troll face: brows, eyes, warty nose, grin with tusks, tunic
    'M452 776 l34 10 M548 776 l-34 10',
    circle(470, 802, 13), circle(530, 802, 13), circle(473, 804, 5), circle(527, 804, 5),
    ellipse(500, 834, 22, 18), circle(512, 828, 3),
    'M456 862 Q500 888 544 862 M468 868 l4 -16 l8 14 M532 868 l-4 -16 l-8 14',
    'M408 912 Q500 940 592 912 M440 940 v18 M560 940 v18',
    'M478 724 q6 -20 18 -22 M500 722 q4 -24 14 -28 M520 726 q8 -18 20 -18',
    // goat: eye, ear, horns, tail
    circle(360, 430, 4), 'M330 428 q-22 -2 -28 10', 'M342 416 C330 386 304 384 298 404', 'M182 494 q-16 -8 -14 -26',
    // toll bell: post, arm, brace, rope, clapper, rim band
    `M840 ${deckY(840).toFixed(1)} V350 M846 360 H700 M840 410 L790 360 M720 360 V420`,
    circle(720, 568, 12), 'M646 532 H794',
    // creek: ripples, stepping stones, a jumping fish
    wave(400, 520, 1020, 8, 30), wave(560, 700, 1060, 8, 34), wave(450, 620, 1140, 9, 40), wave(700, 860, 1200, 9, 40),
    wave(470, 640, 1280, 9, 40), wave(760, 900, 1300, 8, 36),
    ellipse(540, 1220, 34, 16), ellipse(620, 1110, 30, 14),
    'M760 1110 C790 1080 840 1084 858 1110 C840 1136 790 1140 760 1110 Z M760 1110 l-22 -16 v32 Z', circle(838, 1104, 4),
    'M720 1150 q10 -10 20 0 M880 1150 q10 -10 20 0',
    // riddle stone: a carved question mark + runes
    'M172 1130 C170 1090 234 1088 232 1130 C230 1156 202 1158 202 1186', circle(202, 1216, 8),
    'M150 1262 l14 -20 l14 20 M220 1262 h30 M234 1248 v28',
    // bank grass + flowers
    tuft(330, 1330), tuft(310, 1000), tuft(880, 1000), tuft(110, 990),
    flower(900, 1060), flower(240, 1010),
    star4(120, 120, 14), star4(940 - 40, 330, 12),
  ],
};
