// Owner: MP (Round 3 U2). Chapter template: The Lantern Festival.
// A festival night by the river: sky lanterns rising, fireworks blooming, a little lantern boat drifting, a
// paper lantern on its post, a festival drum on the near bank and a sparkler fizzing.
import type { PageArt } from '../types';
import { circle, ellipse, onEllipse, poly, rr, star4, storybookFrame, wave } from '../shapes';

const f = (v: number) => v.toFixed(1);

/** A sky lantern: wide paper top, narrower open bottom. */
const lantern = (cx: number, cy: number, w: number, h: number) =>
  `M${f(cx - w / 2)} ${f(cy - h / 2)} Q${f(cx)} ${f(cy - h / 2 - 16)} ${f(cx + w / 2)} ${f(cy - h / 2)} ` +
  `L${f(cx + w * 0.36)} ${f(cy + h / 2)} Q${f(cx)} ${f(cy + h / 2 + 8)} ${f(cx - w * 0.36)} ${f(cy + h / 2)} Z`;
const SKY: [number, number, number, number][] = [
  [150, 330, 100, 132], [310, 200, 76, 100], [450, 390, 108, 144], [560, 170, 62, 82], [270, 580, 88, 116], [600, 540, 76, 100],
];

/** Firework burst: n spikes between radius r0 and r1. */
const burst = (cx: number, cy: number, r1: number, r0: number, n: number, rot = -90) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r0;
    pts.push(onEllipse(cx, cy, r, r, rot + (i * 180) / n));
  }
  return poly(pts);
};
const spokes = (cx: number, cy: number, r0: number, r1: number, n: number, rot = -90) =>
  Array.from({ length: n }, (_, i) => {
    const [x0, y0] = onEllipse(cx, cy, r0, r0, rot + (i * 360) / n);
    const [x1, y1] = onEllipse(cx, cy, r1, r1, rot + (i * 360) / n);
    return `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}`;
  }).join(' ');

const FIREWORKS = `${burst(770, 290, 150, 72, 14)} ${burst(712, 660, 72, 36, 10, -72)}`;

const BOAT =
  'M330 1040 L700 1040 C680 1100 620 1122 515 1122 C410 1122 350 1100 330 1040 Z ' +
  `${rr(452, 984, 126, 60, 6)} ${poly([[420, 990], [610, 990], [572, 946], [458, 946]])}`;

const PAPER = `${ellipse(204, 830, 62, 52)} ${rr(180, 768, 48, 16, 4)} ${rr(180, 876, 48, 16, 4)}`;

const DRUM = `M112 1196 C100 1226 100 1278 112 1306 L264 1306 C276 1278 276 1226 264 1196 Z ${ellipse(188, 1196, 76, 18)}`;

const SPARKLER = `${burst(830, 1176, 74, 34, 12)} ${rr(826, 1234, 9, 92, 4)}`;

export const lantern_festival: PageArt = {
  id: 'lantern_festival',
  viewBox: '0 0 1000 1400',
  background: [
    // far bank, river, near bank
    'M56 944 Q300 930 500 944 Q700 958 944 940', 'M56 1176 Q300 1190 500 1178 Q720 1166 944 1182',
    // far roofs along the bank
    'M330 944 L330 900 L300 900 L360 860 L420 900 L390 900 L390 944 M640 944 L640 892 L612 892 L680 846 L748 892 L720 892 L720 944',
  ],
  regions: {
    sky_lanterns: { d: SKY.map(([x, y, w, h]) => lantern(x, y, w, h)).join(' '), labelAt: [450, 390] },
    lantern_boat: { d: BOAT, labelAt: [515, 1076] },
    fireworks: { d: FIREWORKS, labelAt: [770, 290] },
    paper_lantern: { d: PAPER, labelAt: [204, 830] },
    festival_drum: { d: DRUM, labelAt: [188, 1256] },
    sparkler: { d: SPARKLER, labelAt: [830, 1176] },
  },
  ink: [
    ...storybookFrame(),
    // crescent moon + stars
    'M150 110 A50 50 0 1 0 186 196 A40 40 0 1 1 150 110 Z',
    star4(420, 130, 14), star4(900, 520, 12), star4(80 + 20, 520, 12), star4(500, 620, 10),
    // sky lanterns: ribs + glowing flames
    ...SKY.map(
      ([x, y, w, h]) =>
        `M${f(x - w * 0.16)} ${f(y - h / 2 - 4)} Q${f(x - w * 0.2)} ${f(y)} ${f(x - w * 0.13)} ${f(y + h / 2 - 16)} ` +
        `M${f(x + w * 0.16)} ${f(y - h / 2 - 4)} Q${f(x + w * 0.2)} ${f(y)} ${f(x + w * 0.13)} ${f(y + h / 2 - 16)} ` +
        `M${f(x - w * 0.4)} ${f(y + h / 2 - 16)} Q${f(x)} ${f(y + h / 2 - 8)} ${f(x + w * 0.4)} ${f(y + h / 2 - 16)}`,
    ),
    ...SKY.map(([x, y, w, h]) => `M${f(x)} ${f(y + h / 2 - 2 - w * 0.22)} q${f(-w * 0.09)} ${f(w * 0.12)} 0 ${f(w * 0.2)} q${f(w * 0.09)} ${f(-w * 0.08)} 0 ${f(-w * 0.2)} Z`),
    // fireworks: spokes + trailing sparks
    spokes(770, 290, 20, 60, 14), circle(770, 290, 14), spokes(712, 660, 10, 26, 10, -72),
    'M770 440 q-10 60 6 120 M712 732 q6 40 -4 80', circle(640, 140, 6), circle(900, 200, 6), circle(880, 420, 5), circle(650, 430, 5),
    // boat: mast, a little lantern on top, cabin window, roof tip, reflection
    'M515 946 V860 M515 870 H560', ellipse(560, 892, 16, 20), 'M552 870 h16 M552 914 h16',
    'M490 1000 h50 v26 h-50 Z', 'M515 946 v-10',
    wave(380, 650, 1146, 7, 34), wave(440, 600, 1162, 5, 26),
    // river ripples with lantern reflections
    wave(80, 280, 1000, 7, 34), wave(720, 920, 1010, 7, 34), wave(120, 300, 1090, 7, 34), wave(730, 910, 1100, 7, 34),
    ellipse(240, 1040, 14, 5), ellipse(800, 1060, 14, 5),
    // paper lantern: post + arm, ribs, tassel
    'M100 944 V740 Q100 724 116 724 H204 V768', 'M150 830 H258 M170 800 Q204 790 238 800 M170 860 Q204 870 238 860',
    'M204 892 V920 M196 920 l8 18 l8 -18',
    // drum: rivets, stand, sticks
    ...[130, 160, 190, 220, 250].map((x) => circle(x, 1222, 4)), 'M124 1306 L104 1334 M252 1306 L272 1334',
    'M274 1246 L326 1146 M288 1262 L350 1170', circle(328, 1140, 9), circle(352, 1163, 9),
    // sparkler: crackles
    spokes(830, 1176, 12, 26, 12), 'M740 1110 l-10 -6 M916 1100 l12 -8 M740 1240 l-12 6 M922 1244 l12 6',
    circle(752, 1170, 4), circle(912, 1174, 4), circle(830, 1090, 4),
    // near-bank grass
    'M380 1260 q4 -22 10 -26 M394 1260 q0 -26 2 -32 M560 1300 q4 -22 10 -26 M574 1300 q0 -26 2 -32',
  ],
};
