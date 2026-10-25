// Owner: AD. Chapter template: The Beanstalk.
import type { PageArt } from './types';
import { circle, cloud, ellipse, star4, storybookFrame, wave } from './shapes';

type Pt = [number, number];
const n = (v: number) => Math.round(v * 10) / 10;
const area = (pts: Pt[]) => pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0);
const cw = (pts: Pt[]): Pt[] => (area(pts) < 0 ? [...pts].reverse() : pts);
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** Smooth closed curve through a point loop (quadratic midpoint spline). */
function smooth(pts: Pt[]): string {
  const m0 = mid(pts[pts.length - 1], pts[0]);
  let d = `M${n(m0[0])} ${n(m0[1])}`;
  pts.forEach((p, i) => { const m = mid(p, pts[(i + 1) % pts.length]); d += ` Q${n(p[0])} ${n(p[1])} ${n(m[0])} ${n(m[1])}`; });
  return d + ' Z';
}

// ---- the beanstalk: an S-curving stalk from the ground (t=0) to a pointed tip in the clouds (t=1)
const Y0 = 1300, Y1 = 150;
const sy = (t: number) => Y0 - (Y0 - Y1) * t;
const sx = (t: number) => 495 + 80 * Math.sin(2.5 * Math.PI * t + 0.2);
const hw = (t: number) => (98 - 58 * t) * Math.min(1, (1 - t) / 0.14) + Math.max(0, (0.07 - t) / 0.07) * 32;
const STEPS = 40;
const left: Pt[] = [], right: Pt[] = [];
for (let i = 0; i <= STEPS; i++) {
  const t = i / STEPS;
  left.push([sx(t) - hw(t), sy(t)]);
  right.push([sx(t) + hw(t), sy(t)]);
}
const STALK = smooth([...left, ...right.reverse().slice(1)]);

/** A big pointed leaf growing from the stalk edge at t, on side -1 (left) / 1 (right), angle in degrees. */
function leaf(t: number, side: -1 | 1, deg: number, len: number, wid: number) {
  const b: Pt = [sx(t) + side * (hw(t) - 18), sy(t)];
  const u: Pt = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const p: Pt = [-u[1], u[0]];
  const at = (a: number, c: number): Pt => [b[0] + u[0] * len * a + p[0] * wid * c, b[1] + u[1] * len * a + p[1] * wid * c];
  const pts = cw([at(0, 0.12), at(0.18, 0.42), at(0.45, 0.55), at(0.75, 0.36), at(1, 0), at(0.75, -0.36), at(0.45, -0.55), at(0.18, -0.42), at(0, -0.12)]);
  const vein = (a: number) => { const s = at(a, 0), e1 = at(a + 0.16, 0.3), e2 = at(a + 0.16, -0.3); return `M${n(s[0])} ${n(s[1])} L${n(e1[0])} ${n(e1[1])} M${n(s[0])} ${n(s[1])} L${n(e2[0])} ${n(e2[1])}`; };
  const r0 = at(0.16, 0), r1 = at(0.86, 0);
  return { d: smooth(pts), ink: `M${n(r0[0])} ${n(r0[1])} L${n(r1[0])} ${n(r1[1])} ${vein(0.32)} ${vein(0.56)}` };
}
const LEAVES = [leaf(0.25, 1, -32, 300, 160), leaf(0.37, -1, 200, 300, 160), leaf(0.6, -1, 178, 270, 130)];

// twisting stripes (slanted curves across the stalk) + tip tendrils
const band = (t: number) =>
  `M${n(sx(t) - hw(t) + 6)} ${n(sy(t))} Q${n(sx(t + 0.02))} ${n(sy(t + 0.02) + 24)} ${n(sx(t + 0.045) + hw(t + 0.045) - 6)} ${n(sy(t + 0.045))}`;
const tip: Pt = [sx(1), sy(1)];

// ---- the giant's boot, stepping down out of the clouds (scalloped cloud cuff on top)
const BOOT =
  'M664 142 A30 30 0 0 1 720 130 A30 30 0 0 1 778 126 A30 30 0 0 1 836 130 A30 30 0 0 1 892 142' +
  ' L896 380 Q906 492 860 504 L634 504 Q576 504 578 452 Q580 394 642 384 L672 376 Q686 356 680 320 Z';

// ---- the golden harp on its cloud: a chunky frame (pillar, curly neck, soundboard) around an open string well
const HARP =
  'M86 512 L86 176 Q86 110 146 108 C200 108 226 160 278 150 C318 142 338 98 374 100 Q408 106 400 144' +
  ' C392 300 300 420 222 500 Q196 534 150 534 L108 534 Q86 534 86 512 Z' +
  ' M176 210 L176 462 Q192 462 210 442 C282 372 338 286 350 192 Q304 218 262 212 Q214 204 176 210 Z';
const STRINGS = ['M205 216 V436', 'M240 216 V380', 'M275 214 V318', 'M310 210 V256'];

// ---- the sky goose, flying left (one body contour + a raised wing + beak)
const GOOSE_BODY =
  'M912 676 Q902 770 800 776 Q722 780 692 738 C664 722 646 706 636 690 A34 34 0 1 1 660 638' +
  ' Q690 662 730 664 Q770 652 810 658 Q870 662 912 676 Z';
const GOOSE_WING = smooth(cw([[738, 676], [748, 610], [800, 566], [880, 548], [866, 598], [842, 624], [846, 652], [812, 684]]));
const GOOSE_BEAK = 'M606 640 L562 660 L612 674 Z';

// ---- golden egg in its nest (bottom right)
const EGG = 'M808 1066 C868 1066 900 1150 900 1196 C900 1258 860 1292 808 1292 C756 1292 716 1258 716 1196 C716 1150 748 1066 808 1066 Z';

// ---- three magic beans (bottom left), kidney shaped
function bean(cx: number, cy: number, w: number, h: number, deg: number): string {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  const P = (x: number, y: number) => `${n(cx + (x * w) / 100 * c - (y * h) / 70 * s)} ${n(cy + (x * w) / 100 * s + (y * h) / 70 * c)}`;
  return `M${P(-50, 0)} C${P(-50, -42)} ${P(-14, -44)} ${P(0, -24)} C${P(14, -44)} ${P(50, -42)} ${P(50, 0)} C${P(50, 44)} ${P(-50, 44)} ${P(-50, 0)} Z`;
}
const BEANS: [number, number, number, number, number][] = [[150, 1272, 132, 84, -10], [290, 1270, 132, 84, 12], [214, 1170, 160, 102, 4]];

export const beanstalk_sky: PageArt = {
  id: 'beanstalk_sky',
  viewBox: '0 0 1000 1400',
  scenery: [
    // high cloud banks
    cloud(250, 175, 190, 78, 8),
    // the little farm hill (left, far away)
    'M65 1170 Q90 1020 230 1010 Q350 1004 420 1120 L420 1200 L65 1200 Z',
    cloud(770, 150, 175, 80, 8),
    // rolling ground
    'M65 1196 Q250 1150 470 1188 Q700 1226 935 1170 L935 1335 L65 1335 Z',
    // the harp's cloud + a drifting cloud
    cloud(230, 556, 175, 52, 8),
    cloud(860, 900, 80, 40, 6),
  ],
  background: [
    'M100 1318 l10 -18 l8 18 M400 1320 l10 -18 l8 18 M640 1316 l10 -18 l8 18 M610 1220 l8 -14 l6 14',
    'M560 1236 Q620 1226 680 1240',
  ],
  regions: {
    beanstalk: { d: [STALK, ...LEAVES.map((l) => l.d)].join(' '), labelAt: [n(sx(0.31)), n(sy(0.31))] },
    giant_boot: { d: BOOT, labelAt: [790, 260] },
    golden_harp: { d: HARP, labelAt: [131, 330] },
    golden_egg: { d: EGG, labelAt: [808, 1196] },
    magic_beans: { d: BEANS.map(([x, y, w, h, a]) => bean(x, y, w, h, a)).join(' '), labelAt: [214, 1176] },
    sky_goose: { d: `${GOOSE_BODY} ${GOOSE_WING} ${GOOSE_BEAK}`, labelAt: [790, 724] },
  },
  ink: [
    ...storybookFrame(),
    // stalk node bands + leaf veins
    ...[0.06, 0.17, 0.42, 0.53, 0.66, 0.79].map(band),
    ...LEAVES.map((l) => l.ink),
    // curly tendrils at the very top
    `M${n(tip[0] - 4)} ${n(tip[1] + 8)} C${n(tip[0] + 40)} ${n(tip[1] - 30)} ${n(tip[0] + 80)} ${n(tip[1] + 20)} ${n(tip[0] + 50)} ${n(tip[1] + 40)} C${n(tip[0] + 30)} ${n(tip[1] + 52)} ${n(tip[0] + 22)} ${n(tip[1] + 28)} ${n(tip[0] + 40)} ${n(tip[1] + 22)}`,
    `M${n(sx(0.8) - hw(0.8))} ${n(sy(0.8))} C${n(sx(0.8) - hw(0.8) - 50)} ${n(sy(0.8) - 10)} ${n(sx(0.8) - hw(0.8) - 60)} ${n(sy(0.8) - 60)} ${n(sx(0.8) - hw(0.8) - 30)} ${n(sy(0.8) - 64)} C${n(sx(0.8) - hw(0.8) - 10)} ${n(sy(0.8) - 66)} ${n(sx(0.8) - hw(0.8) - 12)} ${n(sy(0.8) - 40)} ${n(sx(0.8) - hw(0.8) - 28)} ${n(sy(0.8) - 40)}`,
    // boot: laces, toe cap, sole, patch
    'M690 200 L730 230 M730 200 L690 230 M690 260 L730 290 M730 260 L690 290 M690 320 L730 350 M730 320 L690 350',
    'M640 388 Q668 440 632 500', 'M590 474 Q740 482 890 474', 'M846 330 h34 v40 h-34 Z',
    // harp: strings, scroll curl, music notes in the sky
    ...STRINGS,
    'M118 150 a14 14 0 1 1 14 14',
    'M410 300 V250 L440 242 V292', ellipse(400, 302, 13, 10), ellipse(430, 294, 13, 10),
    'M360 440 V396 l18 10', ellipse(350, 442, 13, 10),
    // goose: eye, smile, wing feathers, tail
    circle(628, 652, 5), 'M622 668 q8 6 16 2', 'M800 600 q24 -4 44 -30 M792 630 q30 -2 52 -24', 'M884 680 l24 -10 M884 700 l22 4',
    // egg shine + sparkles
    'M760 1130 Q748 1160 750 1190', star4(700, 1060, 20), star4(920, 1110, 16), star4(860, 1030, 12),
    // nest twigs under the egg
    'M700 1290 Q808 1320 916 1290 M716 1306 L780 1290 M900 1308 L840 1290',
    // beans: shines + a tiny sprout + sparkles
    circle(134, 1268, 5), circle(164, 1266, 5), 'M138 1286 q12 10 24 0', circle(276, 1266, 5), circle(306, 1272, 5), 'M280 1288 q12 12 24 2', 'M220 1124 q-4 -30 22 -44 m0 0 q-30 -8 -40 12 m40 -12 q22 14 10 32', star4(118, 1150, 18), star4(380, 1170, 14),
    // tiny farm on the hill: barn, fence, a round tree
    'M150 1060 v-46 l40 -32 l40 32 v46 Z M178 1060 v-30 h24 v30',
    'M260 1080 v-30 M290 1084 v-30 M320 1090 v-30 M250 1066 H330',
    circle(110, 1046, 26), 'M110 1072 V1100',
    // sun sparkles + wind lines
    star4(560, 110, 18), star4(910, 380, 14), star4(110, 820, 16), wave(560, 640, 1010, 6, 26), wave(140, 230, 960, 6, 30),
  ],
};
