// Owner: AD. Chapter template: The Mermaid Lagoon.
import type { PageArt } from './types';
import { circle, ellipse, poly, rr, scallops, star4, storybookFrame, wave } from './shapes';

// ---- local helpers -------------------------------------------------------------------------------------------
type P = [number, number];
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Smooth closed blob through points (Catmull-Rom → cubic Béziers). List points clockwise on screen. */
function smooth(pts: P[]): string {
  const n = pts.length, at = (i: number) => pts[(i + n) % n];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + ' Z';
}

/** A rounded "branch" between two points, always clockwise so branches union with each other. */
function capsule(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const L = Math.hypot(x2 - x1, y2 - y1), h = w / 2;
  let nx = (-(y2 - y1) / L) * h, ny = ((x2 - x1) / L) * h;
  // shoelace of the quad decides the winding; flip the normal to keep it clockwise on screen
  const q: P[] = [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
  const area = q.reduce((s, [ax, ay], i) => s + ax * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * ay, 0);
  if (area < 0) { nx = -nx; ny = -ny; }
  return `M${r1(x1 + nx)} ${r1(y1 + ny)} L${r1(x2 + nx)} ${r1(y2 + ny)} A${r1(h)} ${r1(h)} 0 0 1 ${r1(x2 - nx)} ${r1(y2 - ny)} L${r1(x1 - nx)} ${r1(y1 - ny)} A${r1(h)} ${r1(h)} 0 0 1 ${r1(x1 + nx)} ${r1(y1 + ny)} Z`;
}

/** Wavy kelp frond rising from (x, yb). */
function kelp(x: number, yb: number, h: number, w: number, amp: number, phase = 0): string {
  const steps = 6, left: P[] = [], right: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = yb - (h * i) / steps, sway = amp * Math.sin(phase + i * 1.3), ww = w * (1 - i / (steps + 1.5));
    left.push([x + sway, y]);
    right.push([x + sway + ww, y]);
  }
  const tip: P = [x + amp * Math.sin(phase + (steps + 0.6) * 1.3) + w * 0.2, yb - h - 40];
  return smooth([...left, tip, ...right.reverse()]);
}

// ---- regions -------------------------------------------------------------------------------------------------
// The singing rock (left): a big lumpy boulder with a flat seat on top for the mermaid.
const ROCK: P[] = [[90, 1058], [72, 950], [92, 820], [140, 726], [230, 690], [330, 694], [396, 735], [426, 840], [418, 960], [392, 1050], [250, 1066]];

// The coral reef (center-right hero): one lush silhouette — staghorn fingers, a tube sponge, a round sea fan,
// and a brain-coral base that runs down to the bottom-right corner.
const REEF_PTS: P[] = [
  [462, 1036], [452, 980], [468, 920], // base, left
  [440, 840], [412, 744], [394, 664], [378, 612], [398, 590], [416, 614], [422, 648], [432, 600], [454, 588], [464, 616], [458, 700], [476, 790], // staghorn, left fork
  [492, 818], [488, 720], [476, 620], [466, 540], [456, 492], [476, 474], [494, 500], [502, 530], [508, 482], [530, 470], [542, 500], [538, 600], [540, 700], // staghorn, middle fork
  [556, 738], [572, 660], [586, 592], [582, 548], [604, 534], [616, 560], [624, 582], [640, 548], [664, 558], [654, 594], [628, 664], [612, 760], // staghorn, right fork
  [632, 786], [642, 720], [642, 650], [664, 630], [690, 634], [700, 660], [704, 712], [718, 690], [742, 682], [756, 702], [754, 790], // tube sponges
  [768, 822], [770, 796], [736, 762], [712, 700], [720, 630], [760, 586], [815, 570], [870, 588], [906, 636], [912, 700], [888, 762], [846, 798], [842, 830], // sea fan on a stalk
  [866, 856], [890, 838], [914, 852], [926, 884], // brain-coral column
  [926, 1100], [924, 1300], [900, 1322], [800, 1324], [714, 1322], [698, 1272], [710, 1220], [696, 1160], [712, 1092], [650, 1052], [560, 1040],
];
const REEF = smooth(REEF_PTS);

// The giant pearl clam (bottom center): scalloped upper shell, bowl-shaped lower shell, pearl resting on the lip.
const CLAM_C: P = [520, 1212];
const [cRx, cRy] = [166, 160];
const CLAM = [
  `M${CLAM_C[0] - cRx} ${CLAM_C[1]}` + scallops(CLAM_C[0], CLAM_C[1], cRx, cRy, 180, 360, 7, 0.6) + ' Z',
  'M348 1206 H692 C688 1284 614 1324 520 1324 C426 1324 352 1284 348 1206 Z',
  circle(520, 1202, 44),
].join(' ');

// The starfish (bottom left): a chubby five-armed star.
const STAR_C: P = [194, 1218];
const STAR: P[] = Array.from({ length: 10 }, (_, i) => {
  const a = ((-90 + i * 36) * Math.PI) / 180, r = i % 2 ? 68 : 130;
  return [STAR_C[0] + r * Math.cos(a), STAR_C[1] + r * Math.sin(a)] as P;
});

// The seahorse (upper right), facing left toward the bubbles.
const SEAHORSE: P[] = [
  [742, 302], [790, 290], [812, 258], [834, 240], [850, 220], [866, 242], [888, 266], [886, 312], [908, 372], [906, 442],
  [882, 502], [852, 546], [812, 564], [782, 540], [790, 508], [816, 506], [834, 480], [812, 440], [800, 380], [814, 336],
  [798, 318], [770, 320], [742, 316],
];

// The bubbles (rising from the mermaid's song).
const BUBBLES: [number, number, number][] = [[460, 330, 68], [578, 236, 50], [350, 450, 34], [420, 196, 36]];

// ---- scenery -------------------------------------------------------------------------------------------------
const SKY = wave(65, 935, 170, 14, 87) + ' V81 Q935 65 919 65 H81 Q65 65 65 81 Z';
const FAR_REEF = 'M65 1180 V990 Q150 900 240 960 Q330 880 430 940 Q560 860 680 930 Q800 870 935 940 V1180 Z';
const RAYS = [poly([[560, 176], [620, 176], [600, 880], [500, 880]]), poly([[760, 176], [820, 176], [930, 640], [930, 760]])].join(' ');
const KELP = [kelp(76, 1120, 600, 54, 14, 0.3), kelp(866, 1110, 540, 54, 14, 1)].join(' ');
const SAND = 'M65 1110 Q200 1070 350 1100 Q520 1135 680 1095 Q820 1065 935 1100 V1319 Q935 1335 919 1335 H81 Q65 1335 65 1319 Z';
// The mermaid perched on the singing rock (scenery, so she stays the story's star without being a mission).
const MERMAID: P[] = [
  [238, 425], [268, 432], [284, 458], [282, 486], [266, 505], [290, 522], [298, 562], [284, 602], [302, 640], [298, 674],
  [240, 688], [170, 688], [120, 680], [96, 668], [60, 694], [82, 652], [62, 606], [110, 640], [170, 652], [214, 646],
  [206, 610], [196, 580], [176, 540], [176, 498], [188, 456], [210, 432],
];
const mp = (x: number, y: number): P => [r1(240 + (x - 240) * 1.22), r1(690 + (y - 690) * 1.22)];
/** Scale an absolute M/L/Q/C path drawn at the mermaid's original size. */
const mer = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => mp(+x, +y).join(' '));
const MERMAID_BIG = MERMAID.map(([x, y]) => mp(x, y));
const SUN = circle(830, 112, 40);

export const mermaid_lagoon: PageArt = {
  id: 'mermaid_lagoon',
  viewBox: '0 0 1000 1400',
  scenery: [SKY, FAR_REEF, RAYS, KELP, SAND, smooth(MERMAID_BIG), SUN],
  background: [
    // sand ripples + pebbles
    'M90 1110 Q140 1100 190 1112 M300 1330 Q340 1318 380 1330 M640 1330 Q670 1320 700 1330',
    'M380 1140 q20 -10 40 0 M612 1150 q18 -10 36 0',
  ],
  regions: {
    coral_reef: { d: REEF, labelAt: [585, 960] },
    singing_rock: { d: smooth(ROCK), labelAt: [262, 905] },
    pearl_clam: { d: CLAM, labelAt: [520, 1112] },
    starfish: { d: smooth(STAR), labelAt: STAR_C },
    seahorse: { d: smooth(SEAHORSE), labelAt: [856, 410] },
    bubbles: { d: BUBBLES.map(([x, y, r]) => circle(x, y, r)).join(' '), labelAt: [460, 330] },
  },
  ink: [
    ...storybookFrame(),
    // sun + gulls over the water, surface sparkle
    'M830 52 V60 M770 112 H780 M880 112 H890 M788 70 l6 6 M872 70 l-6 6',
    'M640 110 q14 -14 28 0 q14 -14 28 0', 'M560 92 q10 -10 20 0 q10 -10 20 0',
    wave(90, 270, 196, 6, 30), wave(620, 760, 200, 6, 30),
    // little fish in open water
    `${ellipse(130, 252, 34, 20)} M164 252 L194 232 L194 272 Z`, circle(116, 248, 5),
    `${ellipse(240, 304, 26, 15)} M266 304 L289 289 L289 319 Z`, circle(229, 301, 4),
    // mermaid: outline, hair waves, closed singing eye, open mouth, shell top, arm, tail scales, fin ribs
    smooth(MERMAID_BIG),
    mer('M212 440 Q196 480 206 520 Q194 560 214 600 M232 430 Q216 470 226 506'),
    mer('M258 456 Q265 462 272 456'), ellipse(...mp(276, 484), 7, 9), star4(...mp(214, 440), 18),
    mer('M256 540 Q266 526 276 540 Q286 526 296 540'),
    mer('M290 528 Q312 600 320 690'),
    mer('M150 664 Q160 674 170 664 M190 666 Q200 676 210 666 M230 668 Q240 678 250 668'),
    mer('M70 616 L104 650 M70 686 L100 664'),
    // music notes floating up from her song
    'M306 340 V302 L332 296 V334', ellipse(299, 342, 9, 7), ellipse(325, 336, 9, 7),
    'M548 430 V398', ellipse(541, 432, 9, 7), 'M548 398 Q562 404 560 420',
    // bubble shine
    ...BUBBLES.map(([x, y, r]) => `M${x - r * 0.72} ${y - r * 0.1} A${r * 0.72} ${r * 0.72} 0 0 1 ${x - r * 0.1} ${y - r * 0.72}`),
    // singing rock: cracks + barnacles
    'M150 820 L190 860 L176 910 M360 980 L330 1020 L350 1060 M380 780 l-30 30',
    circle(120, 980, 10), circle(140, 1004, 8), circle(380, 900, 10),
    // starfish: little dots down each arm
    ...Array.from({ length: 5 }, (_, i) => {
      const a = ((-90 + i * 72) * Math.PI) / 180;
      return `${circle(STAR_C[0] + 82 * Math.cos(a), STAR_C[1] + 82 * Math.sin(a), 8)}`;
    }),
    // seahorse: eye, smile, belly ridges, back fin, coronet line
    circle(830, 274, 11), circle(833, 276, 4), 'M776 312 q14 8 26 -2',
    'M808 392 q16 -6 26 4 M806 422 q16 -6 26 4 M814 452 q14 -4 22 6',
    'M904 380 q24 10 22 30 q-4 18 -22 20', 'M840 244 L850 226 L860 244',
    // reef: staghorn polyps, tube opening, sea-fan lattice, brain-coral maze, base holes
    circle(428, 720, 7), circle(446, 790, 6), circle(508, 590, 7), circle(512, 680, 6), circle(600, 630, 7), circle(592, 710, 6),
    ellipse(672, 650, 18, 8), ellipse(736, 698, 14, 6),
    'M815 800 L815 600 M815 790 L748 660 M815 790 L882 660 M815 790 L770 610 M815 790 L860 610',
    'M745 720 Q815 690 885 720 M760 650 Q815 625 870 650',
    'M740 960 Q770 930 800 960 Q830 990 860 960 Q880 940 900 960 M740 1030 Q770 1000 800 1030 Q830 1060 860 1030 Q880 1010 900 1030',
    'M740 1100 Q770 1070 800 1100 Q830 1130 860 1100 M750 1180 Q790 1140 830 1180 Q860 1210 900 1180 M740 1260 Q780 1230 820 1260 Q850 1290 890 1260',
    circle(486, 992, 9), circle(664, 990, 9), circle(690, 900, 7),
    // clam: rim ridges, lower-shell lip, pearl shine
    ...[200, 225, 250, 290, 315, 340].map((deg) => {
      const a = (deg * Math.PI) / 180;
      const [x0, y0] = [CLAM_C[0] + (cRx - 60) * Math.cos(a), CLAM_C[1] + (cRy - 60) * Math.sin(a)];
      const [x1, y1] = [CLAM_C[0] + (cRx - 10) * Math.cos(a), CLAM_C[1] + (cRy - 10) * Math.sin(a)];
      return `M${r1(x0)} ${r1(y0)} L${r1(x1)} ${r1(y1)}`;
    }),
    'M366 1256 Q520 1294 674 1256', 'M500 1186 a22 22 0 0 1 22 -14',
    // sparkles near the pearl and in the water
    star4(345, 1108, 14), star4(700, 380, 16), star4(110, 560, 12), star4(640, 470, 12),
  ],
};
