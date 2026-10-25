// Owner: AD. Chapter template: The Starlit Tower.
import type { PageArt } from './types';
import { circle, cloud, ellipse, star4, storybookFrame } from './shapes';

const n = (v: number) => Math.round(v * 10) / 10;

/** Point mapper: local (x, y) → scaled, rotated (deg), translated "X Y" string (and .at for a tuple). */
function xf(ox: number, oy: number, s = 1, deg = 0) {
  const c = Math.cos((deg * Math.PI) / 180), sn = Math.sin((deg * Math.PI) / 180);
  const at = (x: number, y: number): [number, number] => [n(ox + s * (x * c - y * sn)), n(oy + s * (x * sn + y * c))];
  return Object.assign((x: number, y: number) => at(x, y).join(' '), { at });
}

/** Chubby five-point star (points rounded with a little quadratic). */
function star5(cx: number, cy: number, R: number, inner = 0.52): string {
  const pt = (i: number, r: number): [number, number] => {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  let d = '';
  for (let i = 0; i < 10; i += 2) {
    const [tx, ty] = pt(i, R), [ax, ay] = pt(i - 0.18, R * 0.9), [bx, by] = pt(i + 0.18, R * 0.9), [ix, iy] = pt(i + 1, R * inner);
    d += `${i ? 'L' : 'M'}${n(ax)} ${n(ay)} Q${n(tx)} ${n(ty)} ${n(bx)} ${n(by)} L${n(ix)} ${n(iy)} `;
  }
  return d + 'Z';
}

// ── The starlit tower: plinth, tall round tower, balcony ring, observatory dome + spire ──
const TOWER =
  'M475 360 A120 140 0 0 1 715 360 L745 360 L745 400 L725 400 L725 1120 L740 1120 L740 1195 L450 1195 L450 1120 ' +
  'L465 1120 L465 400 L445 400 L445 360 Z M583 226 L595 168 L607 226 Z';

// ── The brass telescope: tube on a pillar + chunky tripod, peering up-left at the comet ──
const tp = xf(325, 862, 1.25, 65); // local −x end = objective, rotated to point up-left
const TUBE =
  `M${tp(-205, -60)} L${tp(-165, -60)} L${tp(-165, -48)} L${tp(135, -30)} L${tp(135, -17)} L${tp(175, -17)} ` +
  `L${tp(175, 17)} L${tp(135, 17)} L${tp(135, 30)} L${tp(-165, 48)} L${tp(-165, 60)} L${tp(-205, 60)} Z`;
const leg = (x0: number, y0: number, x1: number, y1: number, w: number) => {
  const len = Math.hypot(x1 - x0, y1 - y0), px = (-(y1 - y0) / len) * (w / 2), py = ((x1 - x0) / len) * (w / 2);
  return `M${n(x0 - px)} ${n(y0 - py)} L${n(x1 - px * 1.3)} ${n(y1 - py * 1.3)} L${n(x1 + px * 1.3)} ${n(y1 + py * 1.3)} L${n(x0 + px)} ${n(y0 + py)} Z`;
};
const TRIPOD = [
  'M266 876 L300 876 L300 950 L266 950 Z', // neck from the tube's underside
  circle(283, 978, 34), // hub
  leg(268, 990, 118, 1236, 48), leg(283, 1004, 270, 1258, 48), leg(298, 990, 412, 1236, 48),
].join(' ');

// ── The comet: big round head, swooping tail streaming up toward the top of the page ──
const COMET =
  'M239 472 A86 86 0 0 1 118 489 A86 86 0 0 1 101 368 C56 220 300 72 628 86 C500 136 426 214 376 300 Q334 384 239 472 Z';

// ── The wishing star ──
const WISH = star5(800, 206, 136, 0.56);

// ── The crystal ball on its little stand ──
const BALL = `${circle(845, 1052, 80)} M800 1128 Q845 1142 890 1128 L908 1180 L930 1180 L930 1212 L760 1212 L760 1180 L782 1180 Z`;

// ── The star map: a chart unrolled on the grass ──
const MAP =
  'M486 1216 Q500 1204 514 1216 Q630 1202 760 1220 Q772 1206 788 1214 Q804 1222 802 1240 L802 1310 Q802 1328 784 1328 ' +
  'Q770 1328 764 1316 Q630 1300 514 1320 Q500 1334 484 1326 Q468 1318 468 1302 L468 1236 Q468 1220 486 1216 Z';

// ── Scenery ──
const HALO = circle(595, 330, 215);
const HILLS = 'M52 1060 Q200 990 360 1050 Q470 1090 600 1040 Q760 980 948 1050 L948 1210 L52 1210 Z';
const GROUND = 'M52 1185 Q300 1160 520 1190 Q760 1215 948 1180 L948 1334 Q948 1348 934 1348 L66 1348 Q52 1348 52 1334 Z';

export const starlit_tower: PageArt = {
  id: 'starlit_tower',
  viewBox: '0 0 1000 1400',
  scenery: [HALO, HILLS, cloud(150, 640, 70, 28, 6), GROUND, cloud(860, 520, 70, 28, 6)],
  background: [
    'M70 1300 Q110 1290 150 1300 M600 1335 Q640 1325 680 1335 M820 1290 Q860 1280 900 1290',
    'M410 1290 l8 -16 l6 16 M80 1220 l8 -16 l6 16 M900 1240 l-8 -16 l-6 16',
  ],
  regions: {
    star_tower: { d: TOWER, labelAt: [595, 800] },
    telescope: { d: `${TUBE} ${TRIPOD}`, labelAt: tp.at(-60, 0) },
    comet: { d: COMET, labelAt: [172, 424] },
    wish_star: { d: WISH, labelAt: [800, 186] },
    crystal_ball: { d: BALL, labelAt: [845, 1052] },
    star_map: { d: MAP, labelAt: [568, 1266] },
  },
  ink: [
    ...storybookFrame(),
    // tower: dome slit + ribs, balcony posts, windows, door, stones, moon + star decals
    'M580 360 V250 Q595 236 610 250 V360', 'M520 360 Q530 290 565 248 M670 360 Q660 290 625 248',
    'M470 360 V400 M520 360 V400 M670 360 V400 M720 360 V400',
    'M520 560 V515 A25 25 0 0 1 570 515 V560 Z M545 490 V560',
    'M620 680 V635 A25 25 0 0 1 670 635 V680 Z M645 610 V680',
    'M520 960 V915 A25 25 0 0 1 570 915 V960 Z M545 890 V960',
    'M565 1120 V1065 A30 30 0 0 1 625 1065 V1120', circle(612, 1094, 5),
    'M470 1120 H720 M490 450 h40 M650 470 h40 M480 740 h36 M680 760 h36 M660 1000 h40 M490 1060 h36',
    // telescope: brass bands, lens, focus knob, tripod spreader
    `M${tp(-165, -48)} L${tp(-165, 48)}`, `M${tp(70, -34)} L${tp(70, 34)} M${tp(100, -32)} L${tp(100, 32)}`,
    `M${tp(-205, -40)} L${tp(-205, 40)}`,
    'M190 1150 L394 1150',
    // comet: sparkle trail + glow
    star4(520, 170, 12), star4(385, 430, 12), 'M150 360 Q170 345 195 350',
    'M200 318 C236 214 360 136 520 104 M290 300 C330 236 400 180 500 138',
    // wishing star: sleepy smile + rosy cheeks
    'M786 254 Q800 264 814 254', 'M776 240 q8 -8 16 0 M808 240 q8 -8 16 0',
    // crystal ball: shine + swirl of mist, stand detail
    'M790 1020 Q800 990 830 982', 'M820 1100 Q845 1110 870 1098', 'M774 1180 H916',
    // star map: roll edges, constellation (dots + lines), little crescent
    'M514 1216 V1320 M764 1220 V1316',
    'M650 1250 L684 1282 L720 1256 L742 1290', circle(650, 1250, 6), circle(684, 1282, 6), circle(720, 1256, 6), circle(742, 1290, 6),
    'M610 1290 a14 14 0 1 0 14 22 a11 11 0 1 1 -14 -22 Z',
    // night sky: twinkles
    star4(105, 120, 16), star4(330, 560, 14), star4(905, 380, 16), star4(780, 460, 12), star4(110, 900, 14), star4(905, 760, 14),
    star4(410, 720, 12), ellipse(895, 880, 4, 4), ellipse(80, 780, 4, 4),
  ],
};
