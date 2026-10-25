// Owner: AD. Chapter template: The Dragon's Peak.
// A friendly, round-bellied dragon sits at the foot of a snowy peak at sunset, guarding a heap of treasure,
// while a knight's shield and lantern wait in the foreground and storm clouds grumble overhead.
import type { PageArt } from './types';
import { circle, cloud, ellipse, poly, rr, star4, storybookFrame } from './shapes';

// ---- the dragon: ONE clean contour (head, horns, snout, chest, feet, tail, back spikes, wing) --------------------
const DRAGON = [
  'M395 572',
  'C378 505 388 430 420 388', // back of the head
  'L378 300 L452 366', // horn 1
  'L470 272 L512 356', // horn 2
  'C565 350 612 378 626 440', // brow
  'L662 450 C705 458 708 532 680 562', // snout tip
  'C640 588 572 592 548 576', // chin
  'C540 612 562 646 588 694', // throat
  'C626 784 622 900 582 990', // chest + round belly
  'L606 1032 Q610 1066 578 1066 L474 1066 Q456 1044 474 1022', // front foot
  'Q404 1052 336 1026', // between the feet
  'L344 1066 L246 1066 Q224 1044 248 1020', // back foot
  'C180 1052 112 1040 100 990', // tail underside, curling up-left
  'L70 944 L114 950 L118 898 L148 948', // spade tip
  'C160 984 196 990 236 962', // tail top
  'Q206 940 226 918 Q200 896 222 872 Q196 850 220 826 Q196 802 224 780 Q206 758 236 736', // back spikes
  'C246 718 254 708 262 700', // shoulder
  'Q204 702 182 652 Q132 642 122 582 Q86 544 96 482', // wing's scalloped trailing edge
  'L112 330', // wing tip
  'C200 382 300 440 344 524', // wing's leading edge
  'Q366 560 395 572 Z',
].join(' ');

// ---- the mountain: a snowy peak on the right, behind the dragon (shapes only touch, never overlap) --------------
const MOUNTAIN = poly([
  [640, 990], [700, 780], [745, 600], [770, 470], [800, 300], [836, 360], [858, 420], [880, 400], [906, 362], [935, 410], [935, 990],
]);

// ---- the treasure hoard: a gold heap with a chest on top --------------------------------------------------------
const TREASURE =
  'M522 1312 Q536 1190 622 1142 L622 1062 Q622 992 722 992 Q822 992 822 1062 L822 1132 Q906 1170 926 1312 Z';

// ---- the knight's kit ------------------------------------------------------------------------------------------
const SHIELD = 'M88 1092 L292 1092 L292 1182 Q292 1272 190 1312 Q88 1272 88 1182 Z';
const LANTERN = `${rr(338, 1126, 154, 188, 28)} ${poly([[384, 1086], [446, 1086], [498, 1128], [332, 1128]])}`;

// ---- the storm clouds --------------------------------------------------------------------------------------------
const CLOUDS = `${cloud(245, 182, 150, 72, 7)} ${cloud(565, 145, 108, 52, 6)}`;

/** A little gem (diamond) outline. */
const gem = (x: number, y: number, s: number) => poly([[x, y - s], [x + s * 0.8, y], [x, y + s], [x - s * 0.8, y]]);

export const dragon_peak: PageArt = {
  id: 'dragon_peak',
  viewBox: '0 0 1000 1400',
  scenery: [
    circle(850, 215, 92), // setting sun behind the peak
    poly([[65, 900], [150, 760], [230, 840], [330, 720], [430, 820], [560, 700], [660, 800], [760, 690], [860, 790], [935, 730], [935, 1000], [65, 1000]]), // far range
    'M65 990 Q300 968 500 998 Q700 978 935 992 V1335 H65 Z', // warm ground
    ellipse(420, 1064, 250, 34), // the rocky ledge under the dragon
    cloud(690, 200, 62, 26, 5), // little sunset cloud
    `${ellipse(110, 1322, 40, 14)} ${ellipse(505, 1324, 30, 12)}`, // pebbles
  ],
  background: [
    // ground cracks + grass tufts
    'M320 1330 Q360 1318 400 1330 M70 1060 l10 -18 l8 18 M300 1092 l8 -16 l6 16 M930 1060 l-8 -16 l-6 16',
    // birds over the far range
    'M690 560 q12 -12 24 0 q12 -12 24 0 M610 640 q10 -10 20 0 q10 -10 20 0',
  ],
  regions: {
    dragon: { d: DRAGON, labelAt: [380, 830] },
    mountain: { d: MOUNTAIN, labelAt: [845, 820] },
    treasure: { d: TREASURE, labelAt: [722, 1215] },
    clouds: { d: CLOUDS, labelAt: [245, 185] },
    shield: { d: SHIELD, labelAt: [190, 1175] },
    lantern: { d: LANTERN, labelAt: [415, 1238] },
  },
  ink: [
    ...storybookFrame(),
    // dragon face: big friendly eye, brow, nostril, smile, blush, a fang, smoke rings
    circle(548, 440, 26), circle(554, 444, 11), circle(546, 432, 5),
    'M520 402 Q548 390 576 404', circle(664, 488, 6),
    'M590 548 Q626 566 664 544', 'M612 556 l6 14 l8 -12',
    'M560 500 l14 -6 M558 516 l14 -6',
    circle(712, 420, 12), circle(734, 386, 9),
    // horn ridges
    'M398 330 l20 10 M462 312 l18 8',
    // belly plate with stripes + little arm
    'M588 700 C540 760 520 880 556 990',
    'M560 760 h44 M540 820 h68 M536 880 h72 M546 940 h56',
    'M470 724 Q452 800 528 808 M528 808 l14 -12 M528 808 l18 0 M528 808 l12 12',
    // wing ribs (from the shoulder out to each scallop point)
    'M330 560 L182 652 M330 560 L122 582 M330 560 L96 482 M330 560 L112 330',
    // toes
    'M500 1066 v-14 M530 1066 v-14 M272 1066 v-14 M302 1066 v-14',
    // tail tip notch line
    'M100 990 Q110 970 128 960',
    // mountain: snowcap, crags, winding path and a flag at the summit
    'M760 512 L782 540 L802 512 L826 544 L850 506 M890 410 L906 430 L922 404',
    'M800 300 V236 M800 236 L846 252 L800 268',
    'M700 940 Q740 910 720 880 Q700 850 760 830 Q800 815 790 780 Q780 740 830 720',
    'M880 600 l24 30 M800 680 l18 -26 M900 920 l-20 -26',
    // treasure: chest lid band, lock, coins, gems, a crown and sparkles
    'M622 1062 H822 M622 1100 H822', rr(706, 1082, 32, 36, 6),
    'M672 994 V1062 M772 994 V1062',
    circle(588, 1246, 20), circle(640, 1196, 18), circle(796, 1180, 18), circle(884, 1288, 16), circle(735, 1287, 20), circle(658, 1288, 15),
    gem(552, 1294, 20), gem(812, 1292, 18),
    'M818 1252 l-10 -36 l22 16 l10 -26 l10 26 l22 -16 l-10 36 Z',
    star4(905, 1100, 18), star4(545, 1120, 14),
    // shield: inner rim + a little star crest at the point
    'M110 1110 H270 V1180 Q270 1256 190 1290 Q110 1256 110 1180 Z', star4(190, 1262, 18),
    // lantern: bars, handle ring, flame glow
    'M374 1128 V1314 M456 1128 V1314', 'M398 1086 Q415 1056 432 1086',
    'M415 1196 Q396 1172 415 1146 Q434 1172 415 1196 Z',
    // storm cloud face (the small cloud huffs) + lightning bolts + rain
    circle(542, 140, 7), circle(586, 140, 7), 'M554 166 Q564 158 574 166',
    'M180 270 L156 318 L182 316 L160 364', 'M330 270 L314 306 L336 304 L322 340',
    'M560 210 l-10 22 M600 210 l-10 22',
  ],
};
