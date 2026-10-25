// Owner: MP (Round 3 U2). Chapter template: The Swamp Hollow.
// A cosy house in a giant hollow stump, a tire on a rope swing under a mossy branch, a will-o'-wisp drifting by,
// a frog on its lily pad in the pond, and a clump of cattails.
import type { PageArt } from '../types';
import { circle, cloud, ellipse, rr, star4, storybookFrame, wave } from '../shapes';

const STUMP =
  'M130 1024 C168 994 192 958 200 900 L200 424 L238 382 L280 414 L330 352 L382 404 L432 362 L480 414 L516 380 ' +
  'L540 424 L540 900 C548 958 572 994 612 1024 L522 1024 C504 1002 482 996 468 1024 L272 1024 C258 996 236 1002 218 1024 Z';

const POND = 'M300 1180 C300 1110 440 1080 610 1080 C780 1080 920 1110 920 1186 C920 1262 780 1306 610 1306 C440 1306 300 1262 300 1180 Z';

const SWING = `${circle(790, 740, 96)} ${circle(790, 740, 44, true)} ${rr(784, 246, 12, 402, 6)}`;

const FROG =
  'M492 1196 C482 1156 502 1122 532 1112 C530 1090 550 1078 566 1090 C578 1082 592 1082 604 1090 C620 1078 640 1090 638 1112 ' +
  'C668 1122 688 1156 678 1196 Z';

const WISP = 'M650 380 C694 420 712 472 686 506 C660 538 608 532 598 492 C588 452 628 430 632 392 C640 414 652 406 650 380 Z';

const CATTAILS = `${rr(96, 1010, 36, 112, 18)} ${rr(146, 976, 38, 120, 19)} ${rr(198, 1022, 34, 104, 17)}`;

const blade = (x: number, y: number, dx: number, h: number) => `M${x} ${y} Q${x + dx * 0.2} ${y - h * 0.6} ${x + dx} ${y - h} Q${x + dx * 0.5} ${y - h * 0.55} ${x + 14} ${y}`;

export const swamp_hollow: PageArt = {
  id: 'swamp_hollow',
  viewBox: '0 0 1000 1400',
  background: [
    // muddy ground + far bank + mist
    'M56 1026 Q300 1010 560 1030 Q760 1044 944 1024',
    'M640 1000 Q720 960 800 990 Q860 970 940 990',
    wave(80, 300, 1320, 6, 40),
  ],
  regions: {
    stump_house: { d: STUMP, labelAt: [370, 560] },
    lily_pond: { d: POND, labelAt: [790, 1200] },
    rope_swing: { d: SWING, labelAt: [790, 670] },
    lily_frog: { d: FROG, labelAt: [585, 1160] },
    will_o_wisp: { d: WISP, labelAt: [650, 476] },
    cattails: { d: CATTAILS, labelAt: [165, 1036] },
  },
  ink: [
    ...storybookFrame(),
    // stump house: round door + knob, two windows with shutters, bark lines, rings on the jagged top, steps
    'M318 1024 V900 A52 52 0 0 1 422 900 V1024', circle(406, 960, 6), 'M370 852 V1024',
    circle(282, 620, 40), 'M242 620 H322 M282 580 V660', 'M458 720 V690 A26 26 0 0 1 510 690 V720 Z',
    'M224 470 Q236 560 222 640 M520 480 Q508 580 520 680 M238 760 Q228 820 240 880 M500 780 Q514 840 500 900',
    'M262 414 q30 -16 60 0 M400 400 q30 -14 56 0',
    'M300 1024 H440 M290 1046 H450',
    // crooked chimney + puffs of smoke
    'M440 370 V300 L460 290 V250 H500 V290 L482 300 V380', cloud(520, 200, 34, 22, 6), cloud(580, 140, 44, 26, 6),
    // a dragonfly zipping past
    'M120 236 L210 196', ellipse(214, 194, 9, 9),
    'M160 216 C130 170 104 176 112 196 C118 210 140 214 160 216 Z M160 216 C190 170 216 168 212 188 C208 204 184 212 160 216 Z',
    'M150 220 C112 220 96 240 108 252 C120 262 140 240 150 220 Z M170 212 C176 248 196 262 204 250 C212 238 194 222 170 212 Z',
    'M240 160 q10 -10 20 0 M276 236 q10 -10 20 0',
    // the mossy branch the swing hangs from + dangling moss
    'M944 214 C860 214 760 230 640 262 C620 268 612 254 630 246 C720 216 840 196 944 190',
    'M700 250 q-6 40 6 70 q-10 -30 -2 -60 M870 214 q-8 50 6 90 M910 206 q-4 30 4 50',
    // tire tread
    'M720 690 l14 8 M712 744 h16 M724 796 l14 -8 M856 690 l-14 8 M868 744 h-16 M856 796 l-14 -8 M790 650 v14 M790 830 v-14',
    // wisp: face + glow arcs
    circle(632, 470, 5), circle(660, 470, 5), 'M636 488 q10 8 20 0',
    'M580 430 q-16 30 -6 64 M714 440 q16 30 4 64 M610 548 q40 16 80 -6',
    // pond: lily pads, ripples, the frog's face and pad
    'M478 1196 C462 1206 470 1240 585 1240 C700 1240 708 1206 692 1196 M585 1222 L612 1240',
    circle(548, 1100, 7), circle(622, 1100, 7), 'M552 1150 Q585 1170 618 1150', 'M520 1196 q-10 10 -30 6 M650 1196 q10 10 30 6',
    ellipse(380, 1150, 44, 16), 'M380 1150 L410 1142', ellipse(840, 1150, 40, 14), 'M840 1150 L866 1142',
    wave(360, 460, 1260, 6, 26), wave(740, 880, 1260, 6, 30),
    // cattails: stems, tips, leaves
    'M114 1122 V1310 M165 1096 V1310 M215 1126 V1310', 'M114 1010 v-20 M165 976 v-22 M215 1022 v-18',
    blade(100, 1310, -40, 170), blade(190, 1310, 54, 200), blade(230, 1310, 30, 120),
    // fireflies
    star4(120, 300, 12), star4(110, 760, 10), star4(600, 760, 12), star4(880, 900, 10), star4(560, 620, 8),
  ],
};
