// Owner: AD. Chapter template: The Dragon's Peak.
import type { PageArt } from './types';
import { circle, cloud, ellipse, poly, rr, star4, storybookFrame } from './shapes';

const DRAGON = [
  ellipse(410, 860, 235, 170), // body
  'M225 760 Q195 650 215 560 L325 560 Q315 660 375 720 Z', // neck
  circle(270, 500, 95), // head
  rr(110, 470, 150, 95, 42), // snout
  poly([[225, 425], [205, 350], [260, 412]]), // horns
  poly([[290, 408], [312, 338], [335, 420]]),
  'M380 700 L470 470 L650 370 Q625 470 655 560 Q595 555 600 640 Q540 625 520 720 Z', // wing
  'M200 930 Q60 900 100 720 L72 688 L128 640 L150 702 Q120 850 215 880 Z', // tail
].join(' ');

export const dragon_peak: PageArt = {
  id: 'dragon_peak',
  viewBox: '0 0 1000 1400',
  background: [
    'M50 1062 H640 M948 1062 H950',
    'M60 1330 Q200 1318 330 1330 M760 1335 Q860 1325 945 1335',
  ],
  regions: {
    dragon: { d: DRAGON, labelAt: [430, 880] },
    mountain: { d: poly([[640, 1060], [720, 720], [800, 540], [870, 660], [948, 760], [948, 1060]]), labelAt: [835, 900] },
    treasure: { d: 'M330 1300 Q350 1110 545 1075 Q740 1110 760 1300 Z', labelAt: [545, 1215] },
    clouds: { d: `${cloud(240, 200, 150, 70, 7)} ${cloud(700, 170, 130, 62, 6)}`, labelAt: [240, 200] },
    shield: { d: 'M100 1090 L300 1090 L300 1180 Q300 1270 200 1310 Q100 1270 100 1180 Z', labelAt: [200, 1170] },
    lantern: {
      d: `${rr(790, 1110, 130, 170, 22)} ${poly([[830, 1070], [880, 1070], [900, 1112], [810, 1112]])}`,
      labelAt: [855, 1195],
    },
  },
  ink: [
    ...storybookFrame(),
    // face: eye, nostril, smile, brow
    circle(290, 485, 15), circle(294, 488, 5), circle(140, 500, 7), 'M150 540 Q190 556 235 540', 'M262 458 Q290 448 316 462',
    // back spikes
    'M430 692 l18 -32 l14 34 M500 700 l20 -30 l12 36 M565 720 l22 -26 l8 38',
    // belly scales
    'M260 880 Q330 910 420 900 M270 940 Q340 970 430 960 M300 995 Q360 1015 430 1010',
    // wing bones
    'M470 470 L600 640 M470 470 L655 560 M470 470 L540 690',
    // feet + claws
    'M300 1022 q20 22 44 0 M470 1028 q20 22 44 0',
    // snowcap
    'M752 650 L776 684 L800 652 L830 688 L862 648',
    'M690 860 l20 -30 M860 830 l24 30',
    // treasure coins + crown
    circle(470, 1160, 22), circle(560, 1130, 22), circle(630, 1190, 22), circle(420, 1240, 22), circle(700, 1270, 18), circle(520, 1250, 18),
    'M545 1075 l-30 -40 l25 18 l5 -32 l5 32 l25 -18 l-30 40',
    circle(330, 1330, 14), circle(780, 1330, 12),
    // shield emblem
    'M200 1110 V1285 M120 1170 H280',
    // lantern frame + handle + flame
    'M830 1110 V1280 M880 1110 V1280 M790 1150 H920 M790 1240 H920', 'M840 1070 Q855 1035 870 1070',
    'M855 1215 Q838 1192 855 1168 Q872 1192 855 1215 Z',
    // lightning
    'M300 262 L270 320 L300 318 L272 380', 'M760 228 L790 290 L765 292 L800 352',
    // stars
    star4(470, 120, 16), star4(905, 330, 16), star4(560, 300, 12),
  ],
};
