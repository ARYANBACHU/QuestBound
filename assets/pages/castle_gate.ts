// Owner: AD. Chapter template: The Castle Gate.
import type { PageArt } from './types';
import { circle, crenels, star4, storybookFrame, wave } from './shapes';

// gate opening (a hole in the castle, filled by the drawbridge region)
const GATE_HOLE = 'M410 900 L410 1060 L590 1060 L590 900 A90 90 0 0 0 410 900 Z';
const GATE = 'M410 900 A90 90 0 0 1 590 900 L590 1060 L410 1060 Z';
const BRIDGE = 'M410 1060 L590 1060 L640 1280 L360 1280 Z';
const bannerAt = (x: number) => `M${x} 470 L${x + 110} 470 L${x + 110} 760 L${x + 55} 715 L${x} 760 Z`;
const bannerHoleAt = (x: number) => `M${x} 470 L${x} 760 L${x + 55} 715 L${x + 110} 760 L${x + 110} 470 Z`;

const CASTLE =
  'M150 1060 L150 400' + crenels(150, 350, 400, 3, 44) +
  ' L350 560' + crenels(350, 430, 560, 2, 36) +
  ' L430 380 L405 380 L500 268 L595 380 L570 380 L570 560' + crenels(570, 650, 560, 2, 36) +
  ' L650 400' + crenels(650, 850, 400, 3, 44) +
  ' L850 1060 Z ' + GATE_HOLE + ' ' + bannerHoleAt(195) + ' ' + bannerHoleAt(695);

// bridge edge x at a given y (for plank lines)
const bl = (y: number) => 410 - (50 * (y - 1060)) / 220;
const br = (y: number) => 590 + (50 * (y - 1060)) / 220;

export const castle_gate: PageArt = {
  id: 'castle_gate',
  viewBox: '0 0 1000 1400',
  background: [
    'M50 1062 H950',
    'M60 1300 Q200 1285 330 1300 M670 1300 Q800 1285 940 1300',
    'M90 1330 l10 -18 l8 18 M860 1328 l10 -18 l8 18 M180 1075 l8 -14 l6 14 M800 1075 l8 -14 l6 14',
  ],
  regions: {
    castle: { d: CASTLE, labelAt: [500, 650] },
    drawbridge: { d: `${GATE} ${BRIDGE}`, labelAt: [500, 1180] },
    banners: { d: `${bannerAt(195)} ${bannerAt(695)}`, labelAt: [250, 600] },
    moon: { d: circle(220, 230, 115), labelAt: [220, 230] },
    tower_flag: { d: 'M505 115 Q600 95 690 120 L742 125 L705 182 L742 245 L690 240 Q600 215 505 235 Z', labelAt: [600, 175] },
    moat: {
      d:
        'M70 1110 Q240 1088 402 1095 L366 1255 Q230 1272 70 1250 Z ' +
        'M598 1095 Q760 1088 930 1110 L930 1250 Q770 1272 634 1255 Z',
      labelAt: [215, 1175],
    },
  },
  ink: [
    ...storybookFrame(),
    // flag pole + finial
    'M500 268 V108', 'M500 92 a8 8 0 1 0 0.1 0',
    // banner poles
    'M180 470 H320 M680 470 H820',
    // banner emblems
    'M250 540 l18 34 h-36 z M750 540 l18 34 h-36 z',
    // windows
    'M480 470 V430 A20 20 0 0 1 520 430 V470 Z',
    'M232 900 V860 A18 18 0 0 1 268 860 V900 Z', 'M732 900 V860 A18 18 0 0 1 768 860 V900 Z',
    'M375 700 V675 A14 14 0 0 1 403 675 V700 Z', 'M597 700 V675 A14 14 0 0 1 625 675 V700 Z',
    // bricks
    'M170 980 h40 M240 1010 h50 M190 1035 h30 M700 990 h45 M770 1020 h40 M440 600 h40 M520 625 h40 M170 440 h30 M790 445 h30',
    // raised portcullis
    'M440 830 V880 M470 815 V880 M500 812 V880 M530 815 V880 M560 830 V880 M415 870 H585',
    // bridge planks + chains
    ...[1115, 1170, 1225].map((y) => `M${bl(y)} ${y} H${br(y)}`),
    'M402 835 L366 1262 M598 835 L634 1262',
    // moat ripples
    wave(110, 230, 1150, 8, 40), wave(220, 330, 1205, 8, 36), wave(680, 800, 1150, 8, 40), wave(760, 880, 1205, 8, 40),
    // moon craters
    circle(185, 200, 18), circle(255, 265, 24), circle(250, 180, 9),
    // stars
    star4(380, 150, 18), star4(860, 150, 20), star4(905, 320, 14), star4(105, 420, 14),
  ],
};
