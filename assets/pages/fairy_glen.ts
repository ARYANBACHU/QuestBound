// Owner: AD. Chapter template: The Fairy Glen.
import type { PageArt } from './types';
import { circle, ellipse, onEllipse, scallops, star4, storybookFrame, wave } from './shapes';

const n = (v: number) => Math.round(v * 10) / 10;

// ---- the wishing willow: domed crown, a curtain of leafy drips, and the trunk dropping out of the middle
/** Leafy drip hem from x1 down to x2 (x1 > x2, moving left), notches at y, tips hanging to y + len. */
function drips(x1: number, x2: number, y: number, count: number, lens: number[]): string {
  const w = (x1 - x2) / count;
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = x1 - i * w, tx = a - w / 2, ty = y + lens[i % lens.length], b = a - w;
    out += ` Q${n(a - 2)} ${n(ty - 20)} ${n(tx)} ${n(ty)} Q${n(b + 2)} ${n(ty - 20)} ${n(b)} ${n(y)}`;
  }
  return out;
}
const [wx0, wy0] = onEllipse(650, 446, 234, 326, 168);
const WILLOW =
  `M${n(wx0)} ${n(wy0)}` + scallops(650, 446, 234, 326, 168, 372, 9, 0.56) +
  ' Q924 600 910 700' + drips(910, 704, 700, 4, [118, 74, 132, 86]) +
  ' Q706 900 712 968 Q730 1012 772 1030 L516 1030 Q558 1012 576 968 Q586 900 586 700' +
  drips(586, 392, 700, 4, [96, 136, 70, 120]) +
  ` Q376 600 ${n(wx0)} ${n(wy0)} Z`;
const strand = (x: number, y1: number, y2: number, sway: number) => `M${x} ${y1} Q${x + sway} ${(y1 + y2) / 2} ${x} ${y2}`;

// ---- the toadstool house (cap + stem as one contour)
const HOUSE =
  'M76 640 C76 470 176 418 222 418 C268 418 368 470 368 640 Q368 666 342 666 L318 666' +
  ' L328 896 Q328 910 314 910 L130 910 Q116 910 116 896 L126 666 L102 666 Q76 666 76 640 Z';

// ---- fairy wings: a mirrored pair (upper + lower lobe each), touching at the middle
const WC = 230;
function wing(side: 1 | -1): string {
  const X = (dx: number) => n(WC + side * dx);
  const pts = `M${X(8)} 252 C${X(20)} 176 ${X(64)} 116 ${X(112)} 124 C${X(156)} 132 ${X(150)} 222 ${X(62)} 258` +
    ` C${X(132)} 270 ${X(134)} 364 ${X(82)} 366 C${X(40)} 368 ${X(12)} 316 ${X(8)} 252 Z`;
  if (side === 1) return pts;
  // mirrored copy runs counter-clockwise; rebuild it clockwise so it fills like its twin
  return `M${X(8)} 252 C${X(12)} 316 ${X(40)} 368 ${X(82)} 366 C${X(134)} 364 ${X(132)} 270 ${X(62)} 258` +
    ` C${X(150)} 222 ${X(156)} 132 ${X(112)} 124 C${X(64)} 116 ${X(20)} 176 ${X(8)} 252 Z`;
}

// ---- the glow flower: scalloped bloom + two leaves at the stem
const FC: [number, number] = [420, 1062];
const [fx, fy] = onEllipse(FC[0], FC[1], 82, 82, -90);
const BLOOM = `M${n(fx)} ${n(fy)}${scallops(FC[0], FC[1], 82, 82, -90, 270, 6, 0.64)} Z`;
const FLOWER_LEAVES = 'M418 1252 C390 1214 350 1196 318 1204 C330 1240 370 1262 418 1252 Z M424 1236 C452 1196 492 1180 524 1188 C512 1226 472 1248 424 1236 Z';

// ---- the acorn: scalloped-rim cap over a round nut
const ACORN =
  'M88 1180 C88 1120 140 1094 190 1094 C240 1094 292 1120 292 1180 Q292 1198 274 1198 L266 1198' +
  ' C266 1272 222 1320 190 1326 C158 1320 114 1272 114 1198 L106 1198 Q88 1198 88 1180 Z';

// ---- the dewdrop pond
const POND = ellipse(744, 1194, 188, 132);

/** A fern frond (closed, zig-zag pinnae) from base (bx, by), height h, leaning by dx at the tip. */
function fern(bx: number, by: number, h: number, w: number, dx: number): string {
  const k = 6, L: string[] = [], R: string[] = [];
  for (let i = 0; i <= k; i++) {
    const t = i / k, sx = bx + dx * t * t, sy = by - h * t, ww = w * (1 - t * 0.85);
    L.push(`${n(sx - ww)} ${n(sy - h / k / 2)}`, `${n(sx - ww * 0.3)} ${n(sy - h / k / 1.4)}`);
    R.unshift(`${n(sx + ww * 0.3)} ${n(sy - h / k / 1.4)}`, `${n(sx + ww)} ${n(sy - h / k / 2)}`);
  }
  return `M${bx} ${by} L${L.join(' L')} L${n(bx + dx)} ${n(by - h - 20)} L${R.join(' L')} Z`;
}

export const fairy_glen: PageArt = {
  id: 'fairy_glen',
  viewBox: '0 0 1000 1400',
  scenery: [
    // rolling back hills
    'M65 760 Q220 640 420 716 Q520 756 570 830 L570 1000 L65 1000 Z',
    'M480 920 Q700 790 935 860 L935 1050 L480 1050 Z',
    // the mossy ground
    'M65 968 Q300 924 520 990 Q760 1050 935 1004 L935 1335 L65 1335 Z',
    // ferns
    fern(312, 1000, 170, 40, -14),
    fern(900, 1080, 190, 34, -20),
    fern(560, 1330, 150, 36, 22),
    // a pale moon peeking over the willow
    'M820 150 A64 64 0 1 1 900 230 A50 50 0 0 0 820 150 Z',
  ],
  background: [
    'M100 1000 l10 -18 l8 18 M470 960 l8 -14 l6 14 M640 1060 l8 -14 l6 14 M300 1320 l10 -18 l8 18',
    'M80 1060 Q140 1046 190 1060 M330 1300 Q380 1288 420 1300',
  ],
  regions: {
    wishing_willow: { d: WILLOW, labelAt: [640, 330] },
    toadstool_house: { d: HOUSE, labelAt: [222, 545] },
    dewdrop_pond: { d: POND, labelAt: [742, 1192] },
    fairy_wings: { d: `${wing(-1)} ${wing(1)}`, labelAt: [WC + 92, 182] },
    acorn_cap: { d: ACORN, labelAt: [190, 1250] },
    glow_flower: { d: `${BLOOM} ${FLOWER_LEAVES}`, labelAt: FC },
  },
  ink: [
    ...storybookFrame(),
    // willow: hanging strands + leaf ticks + wish sparkles
    strand(430, 440, 680, -12), strand(500, 420, 700, 10), strand(570, 450, 690, -10), strand(710, 450, 690, 10),
    strand(780, 420, 700, -12), strand(850, 440, 680, 10), strand(640, 600, 760, 8), strand(450, 700, 770, 6), strand(830, 710, 790, -6), strand(540, 170, 260, -8), strand(740, 170, 260, 8),
    'M430 520 l-16 14 M500 560 l16 14 M570 540 l-16 14 M710 580 l16 14 M780 520 l-16 14 M850 560 l16 14',
    star4(470, 300, 16), star4(812, 330, 18), star4(640, 520, 18),
    // willow trunk: sleepy smiling face + bark
    'M612 806 q12 10 24 0 M660 806 q12 10 24 0', 'M626 846 q22 18 44 0', 'M600 900 Q606 940 592 980 M690 910 Q684 950 700 990',
    // house: door, round window, cap spots, doorstep
    'M192 910 V846 A30 30 0 0 1 252 846 V910', circle(238, 880, 5), circle(222, 740, 28), 'M222 712 V768 M194 740 H250',
    circle(122, 598, 20), circle(322, 598, 18), circle(222, 462, 20), circle(152, 500, 14), circle(294, 504, 14),
    'M188 934 h68 M202 954 h40',
    // wings: veins + eyespots + a ribbon knot
    'M238 252 Q290 190 330 150 M238 260 Q290 300 300 340 M222 252 Q170 190 130 150 M222 260 Q170 300 160 340',
    circle(310, 310, 12), circle(150, 310, 12),
    ellipse(230, 256, 12, 22), 'M218 270 l-18 30 M242 270 l18 30',
    // glow flower: stem, petal creases, glow rays
    'M420 1178 Q426 1250 420 1330',
    'M420 992 V1008 M480 1028 l-12 8 M480 1096 l-12 -8 M360 1028 l12 8 M360 1096 l12 -8',
    'M420 938 V912 M532 1000 l20 -12 M532 1124 l20 12 M308 1000 l-20 -12 M308 1124 l-20 12',
    // acorn: cap crosshatch, stem, nut shine + face
    'M190 1094 q-4 -24 16 -36', 'M120 1150 l40 -40 M160 1180 l60 -64 M220 1180 l44 -48 M150 1110 l60 64 M210 1106 l60 70 M110 1130 l40 46',
    'M140 1222 q-6 40 20 70', circle(174, 1290, 4), circle(206, 1290, 4),
    // pond: ripples, lily pads, a frog's eyes peeking
    wave(620, 720, 1150, 7, 34), wave(760, 870, 1240, 7, 36), wave(640, 740, 1268, 6, 34),
    'M840 1150 a34 22 0 1 1 -8 -20 L842 1150 Z', 'M640 1214 a28 18 0 1 0 8 -16 L636 1214 Z',
    circle(810, 1124, 12), circle(836, 1124, 12), circle(810, 1126, 3), circle(836, 1126, 3),
    // fireflies / sparkles
    star4(110, 430, 16), star4(330, 420, 14), star4(560, 940, 12), star4(900, 760, 16), star4(110, 900, 12),
  ],
};
