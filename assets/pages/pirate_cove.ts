// Owner: AD. Chapter template: The Pirate Cove.
import type { PageArt } from './types';
import { circle, cloud, ellipse, star4, storybookFrame, wave } from './shapes';

const n = (v: number) => Math.round(v * 10) / 10;

/** Point mapper: local (x, y) → scaled, rotated (deg), translated "X Y" string. */
function xf(ox: number, oy: number, s = 1, deg = 0) {
  const c = Math.cos((deg * Math.PI) / 180), sn = Math.sin((deg * Math.PI) / 180);
  const at = (x: number, y: number): [number, number] => [n(ox + s * (x * c - y * sn)), n(oy + s * (x * sn + y * c))];
  return Object.assign((x: number, y: number) => at(x, y).join(' '), { at });
}

/** Dashed line along a quadratic curve (dashes ≥ 25 units so they read on a phone). */
function dashedQ(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, count: number): string {
  const at = (t: number) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
  let out = '';
  for (let i = 0; i < count; i++) {
    const [ax, ay] = at(i / count), [bx, by] = at((i + 0.55) / count);
    out += `M${n(ax)} ${n(ay)} L${n(bx)} ${n(by)} `;
  }
  return out.trim();
}

// ── The pirate ship: hull + four billowing sails + jolly flag (one region) ──
const HULL = 'M85 610 L250 610 L250 690 L560 690 L645 632 C636 800 600 905 525 935 L245 935 C150 920 100 820 85 610 Z';
const MAIN_SAIL = 'M180 350 Q290 362 400 350 Q432 478 400 615 Q290 628 180 615 Q212 482 180 350 Z';
const MAIN_TOP = 'M218 264 Q290 272 362 264 Q388 300 376 338 Q290 345 204 338 Q224 300 218 264 Z';
const FORE_SAIL = 'M435 380 Q520 390 605 380 Q632 500 605 625 Q520 636 435 625 Q460 500 435 380 Z';
const FORE_TOP = 'M455 290 Q520 298 585 290 Q604 326 585 362 Q520 369 455 362 Q470 326 455 290 Z';
const FLAG = 'M525 200 Q575 186 625 204 L608 230 L628 258 Q575 244 525 258 Z';
const SHIP = [HULL, MAIN_SAIL, MAIN_TOP, FORE_SAIL, FORE_TOP, FLAG].join(' ');

// ── The lighthouse: dome, lamp room, gallery, tapered tower ──
const LIGHTHOUSE =
  'M780 268 A55 62 0 0 1 890 268 L890 365 L907 365 L907 402 L892 402 L925 862 L740 862 L778 402 L763 402 L763 365 L780 365 Z';
/** tower edge x at height y (for stripes) */
const lhL = (y: number) => 778 - ((y - 402) * 38) / 460;
const lhR = (y: number) => 892 + ((y - 402) * 33) / 460;
const stripe = (y: number) => `M${n(lhL(y))} ${y} Q${n((lhL(y) + lhR(y)) / 2)} ${y + 16} ${n(lhR(y))} ${y}`;

// ── The parrot: chubby, flying right — hooked beak, raised wing, forked tail ──
const pp = xf(0, 4, 1.15);
const PARROT =
  `M${pp(250, 85)} C${pp(280, 83)} ${pp(300, 98)} ${pp(302, 116)} C${pp(322, 116)} ${pp(336, 134)} ${pp(330, 160)} ` +
  `C${pp(324, 150)} ${pp(312, 146)} ${pp(300, 150)} C${pp(298, 180)} ${pp(270, 205)} ${pp(230, 214)} ` +
  `C${pp(200, 220)} ${pp(175, 220)} ${pp(155, 214)} L${pp(92, 262)} L${pp(102, 238)} L${pp(64, 244)} L${pp(132, 188)} ` +
  `C${pp(140, 180)} ${pp(150, 168)} ${pp(162, 158)} Q${pp(124, 128)} ${pp(116, 68)} Q${pp(186, 66)} ${pp(222, 112)} ` +
  `C${pp(226, 96)} ${pp(236, 87)} ${pp(250, 85)} Z`;

// ── The message in a bottle: bobbing in the shallows, neck up-right ──
const bp = xf(705, 988, 0.95, -12);
const BOTTLE =
  `M${bp(-100, -62)} L${bp(60, -62)} Q${bp(100, -62)} ${bp(120, -35)} L${bp(145, -28)} L${bp(185, -28)} L${bp(185, -38)} ` +
  `L${bp(218, -38)} L${bp(218, 38)} L${bp(185, 38)} L${bp(185, 28)} L${bp(145, 28)} L${bp(120, 35)} Q${bp(100, 62)} ${bp(60, 62)} ` +
  `L${bp(-100, 62)} Q${bp(-140, 62)} ${bp(-140, 0)} Q${bp(-140, -62)} ${bp(-100, -62)} Z`;

// ── The anchor: chunky, leaning in the sand (ring + shank/stock/arms) ──
const ap = xf(788, 1200, 0.95, 10);
const ANCHOR_BODY =
  `M${ap(-26, -92)} L${ap(26, -92)} L${ap(26, -82)} L${ap(84, -82)} Q${ap(102, -82)} ${ap(102, -65)} Q${ap(102, -48)} ${ap(84, -48)} ` +
  `L${ap(26, -48)} L${ap(26, 40)} Q${ap(72, 58)} ${ap(86, 26)} L${ap(66, 30)} L${ap(116, -22)} L${ap(138, 50)} L${ap(120, 44)} ` +
  `Q${ap(100, 136)} ${ap(0, 140)} Q${ap(-100, 136)} ${ap(-120, 44)} L${ap(-138, 50)} L${ap(-116, -22)} L${ap(-66, 30)} L${ap(-86, 26)} ` +
  `Q${ap(-72, 58)} ${ap(-26, 40)} L${ap(-26, -48)} L${ap(-84, -48)} Q${ap(-102, -48)} ${ap(-102, -65)} Q${ap(-102, -82)} ${ap(-84, -82)} ` +
  `L${ap(-26, -82)} Z`;
const [rx, ry] = ap.at(0, -130);
const ANCHOR = `${ANCHOR_BODY} ${circle(rx, ry, 42)} ${circle(rx, ry, 19, true)}`;

// ── The treasure map: unrolled parchment with a roll at each end ──
const MAP =
  'M125 1100 Q150 1092 160 1112 C270 1092 420 1128 540 1104 Q550 1084 575 1092 Q600 1100 598 1120 L598 1280 ' +
  'Q598 1305 572 1302 Q550 1300 545 1288 C420 1312 270 1282 160 1302 Q150 1318 125 1312 Q100 1306 100 1285 L100 1125 Q100 1104 125 1100 Z';

// ── Scenery ──
const SUN = circle(660, 140, 70);
const SEA = 'M52 790 Q160 772 270 790 T490 790 T710 790 T948 790 L948 1110 L52 1110 Z';
const ROCK = 'M715 930 Q705 880 740 850 Q780 828 830 840 Q880 826 915 848 Q942 880 935 930 Q830 950 715 930 Z';
const ISLAND =
  'M650 795 Q700 755 760 795 Z ' + // sandy mound on the horizon
  'M700 782 Q690 720 712 662 L722 664 Q704 722 712 782 Z ' + // leaning trunk
  'M716 662 Q680 630 648 652 Q684 646 716 662 Z M716 662 Q706 620 676 612 Q700 636 716 662 Z ' +
  'M716 662 Q740 622 770 626 Q744 640 716 662 Z M716 662 Q752 652 776 676 Q744 664 716 662 Z';
const BEACH =
  'M52 1092 Q200 1060 360 1088 Q520 1112 680 1080 Q820 1056 948 1086 L948 1334 Q948 1348 934 1348 L66 1348 Q52 1348 52 1334 Z';

export const pirate_cove: PageArt = {
  id: 'pirate_cove',
  viewBox: '0 0 1000 1400',
  scenery: [SUN, SEA, cloud(420, 118, 72, 30, 6), ROCK, cloud(745, 182, 82, 32, 7), ISLAND, BEACH, cloud(130, 478, 62, 28, 6)],
  background: [
    // horizon
    'M52 792 H948',
    // sand ripples + tufts
    'M80 1325 Q140 1314 200 1325 M330 1330 Q400 1318 470 1330 M620 1322 Q660 1314 700 1322',
    'M612 1150 l8 -18 l7 18 M630 1270 l8 -18 l7 18 M920 1110 l-8 -16 l-6 16',
  ],
  regions: {
    pirate_ship: { d: SHIP, labelAt: [345, 820] },
    lighthouse: { d: LIGHTHOUSE, labelAt: [835, 590] },
    parrot: { d: PARROT, labelAt: pp.at(225, 168) },
    message_bottle: { d: BOTTLE, labelAt: bp.at(-45, 0) },
    anchor: { d: ANCHOR, labelAt: ap.at(0, 92) },
    treasure_map: { d: MAP, labelAt: [255, 1205] },
  },
  ink: [
    ...storybookFrame(),
    // ship: masts, yards, bowsprit + rigging
    'M290 248 V690 M520 190 V690',
    'M180 350 H400 M218 264 H362 M435 380 H605 M455 290 H585',
    'M645 632 L715 592 M520 290 L705 598 M290 264 L95 600',
    // sail seams (follow the billow)
    'M250 350 Q270 480 250 620 M340 350 Q360 480 340 620 M490 388 Q510 505 490 630 M560 388 Q580 505 560 630',
    // jolly flag: smiling skull + crossbones
    circle(566, 222, 17), 'M558 219 h0.1 M574 219 h0.1 M560 230 Q566 235 572 230', 'M548 246 L586 210 M548 210 L586 246',
    // hull: deck rail, planks, portholes, stern windows
    'M250 664 H560 M300 664 V690 M360 664 V690 M420 664 V690 M480 664 V690 M540 664 V690',
    'M150 885 Q330 905 560 870 M110 735 Q140 740 250 740',
    circle(455, 790, 22), circle(540, 780, 22), circle(455, 790, 10), circle(540, 780, 10),
    'M120 640 h40 v34 h-40 Z M185 640 h40 v34 h-40 Z',
    // lighthouse: stripes, door, window, lamp panes, gallery rail, finial, beams
    stripe(455), stripe(500), stripe(650), stripe(695),
    'M812 862 V818 A20 20 0 0 1 852 818 V862', 'M820 752 V730 A12 12 0 0 1 844 730 V752 Z',
    'M808 290 V365 M835 290 V365 M862 290 V365 M780 315 H890',
    'M790 372 V402 M815 372 V402 M855 372 V402 M880 372 V402',
    circle(835, 196, 10), 'M835 206 V206',
    'M760 300 L690 270 M760 330 L690 342',
    // parrot face, beak line, wing feathers, tail feathers
    circle(...pp.at(268, 118), 6), `M${pp(302, 116)} Q${pp(298, 134)} ${pp(304, 150)}`,
    `M${pp(232, 150)} Q${pp(248, 162)} ${pp(266, 156)}`,
    `M${pp(140, 96)} Q${pp(170, 100)} ${pp(196, 120)} M${pp(146, 128)} Q${pp(168, 132)} ${pp(184, 148)}`,
    `M${pp(84, 246)} L${pp(140, 200)}`,
    // bottle: rolled message inside + cork line
    `M${bp(10, -30)} L${bp(80, -30)} L${bp(80, 30)} L${bp(10, 30)} Z M${bp(22, -10)} L${bp(68, -10)} M${bp(22, 10)} L${bp(68, 10)}`,
    `M${bp(185, -28)} L${bp(185, 28)}`,
    // anchor: rope looped through the ring
    `M${ap(28, -150)} Q${ap(80, -175)} ${ap(118, -130)}`,
    // anchor rivets on the stock
    circle(...ap.at(-72, -65), 6), circle(...ap.at(72, -65), 6),
    // map: roll edges, dashed trail, X marks the spot, compass, little island
    'M160 1112 V1302 M545 1104 V1288',
    dashedQ(300, 1278, 380, 1140, 470, 1220, 6),
    'M470 1205 L510 1245 M510 1205 L470 1245',
    star4(500, 1148, 26),
    'M260 1275 Q290 1250 320 1275',
    // sea ripples + foam
    wave(80, 200, 980, 9, 40), wave(260, 420, 1010, 9, 40), wave(440, 540, 970, 9, 40), wave(120, 260, 1060, 9, 46),
    wave(870, 930, 1040, 7, 30), wave(70, 160, 900, 8, 30), wave(560, 660, 1062, 8, 34), wave(760, 900, 960, 8, 36),
    // gulls + sun sparkle
    'M420 238 q15 -15 30 0 q15 -15 30 0', 'M440 178 q12 -12 24 0 q12 -12 24 0',
    star4(115, 385, 16), star4(905, 120, 18),
  ],
};
