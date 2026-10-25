// Owner: MP (Round 3 U2). Chapter template: The Cloud Kingdom.
// A spired castle riding a big cloud, a rainbow bridge climbing up to its gate, a striped hot-air balloon, a
// diamond kite, a smiling sunbeam and a fluffy cloud sheep.
import type { PageArt } from '../types';
import { circle, cloud, ellipse, onEllipse, poly, scallops, star4, storybookFrame, wave } from '../shapes';

const f = (v: number) => v.toFixed(1);

// The castle's cloud: one outline = castle walls + the cloud's scalloped underside.
const CX = 630, CY = 840, RX = 280, RY = 80;
/** Angle (deg, 180..360 = top half) where the cloud ellipse's top edge crosses x. */
const topAngle = (x: number) => 360 - (Math.acos((x - CX) / RX) * 180) / Math.PI;
const aL = topAngle(420), aR = topAngle(800);
const [lx, ly] = onEllipse(CX, CY, RX, RY, aL);
const [rx, ry] = onEllipse(CX, CY, RX, RY, aR);
const CASTLE =
  `M${f(lx)} ${f(ly)} L420 560 L398 560 L460 436 L522 560 L500 560 L500 600 L540 600 L540 470 L516 470 L610 292 ` +
  `L704 470 L680 470 L680 600 L720 600 L720 560 L698 560 L760 436 L822 560 L800 560 L${f(rx)} ${f(ry)}` +
  scallops(CX, CY, RX, RY, aR, aL + 360, 10) + ' Z';

const RAINBOW = 'M84 1256 C110 980 300 880 470 878 L486 966 C340 972 214 1050 200 1256 Z';

const BALLOON =
  'M230 236 C334 236 374 320 364 410 C354 492 282 532 266 562 L194 562 C178 532 106 492 96 410 C86 320 126 236 230 236 Z ' +
  'M188 612 L272 612 L262 676 L198 676 Z';

const KITE = poly([[838, 96], [908, 196], [838, 300], [768, 196]]);

// Sun disc + 12 pointed rays as one star outline.
const SUN = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 112 : 74;
    pts.push(onEllipse(470, 170, r, r, i * 15 - 90));
  }
  return poly(pts);
})();

// Woolly body + head (head outline shows over the wool).
const SHEEP = `${cloud(774, 1140, 128, 80, 10)} ${ellipse(644, 1122, 42, 34)}`;

const gores = 'M230 236 C190 300 186 460 212 562 M230 236 C270 300 274 460 248 562 M120 330 C180 350 280 350 340 330 M100 440 C180 462 280 462 360 440';

export const cloud_kingdom: PageArt = {
  id: 'cloud_kingdom',
  viewBox: '0 0 1000 1400',
  background: [
    wave(80, 380, 1000, 10, 60), wave(560, 920, 1320, 10, 60), wave(300, 640, 1110, 8, 56),
  ],
  regions: {
    sky_castle: { d: CASTLE, labelAt: [610, 690] },
    rainbow_bridge: { d: RAINBOW, labelAt: [210, 1060] },
    sky_balloon: { d: BALLOON, labelAt: [230, 400] },
    kite: { d: KITE, labelAt: [838, 196] },
    sunbeam: { d: SUN, labelAt: [470, 170] },
    cloud_sheep: { d: SHEEP, labelAt: [790, 1140] },
  },
  ink: [
    ...storybookFrame(),
    // castle: gate, windows, roof bands, pennants
    'M580 800 V740 A30 30 0 0 1 640 740 V800',
    'M600 520 V490 A10 10 0 0 1 620 490 V520 Z', 'M450 640 V612 A10 10 0 0 1 470 612 V640 Z', 'M750 640 V612 A10 10 0 0 1 770 612 V640 Z',
    'M560 660 h24 M640 690 h28 M440 720 h26 M750 710 h28',
    'M410 540 H510 M710 540 H810 M528 450 H692',
    'M610 292 V230 M610 230 l56 16 l-56 16 M460 436 V396 M460 396 l34 10 l-34 10 M760 436 V396 M760 396 l34 10 l-34 10',
    // cloud puffs inside the big cloud
    'M420 860 q30 -26 60 0 M720 870 q30 -26 60 0 M560 900 q24 -20 48 0',
    // rainbow stripes + the little cloud it rises from
    'M118 1256 C142 1010 320 920 476 908 M158 1256 C176 1036 330 950 482 938',
    cloud(160, 1282, 86, 34, 7),
    // balloon: gores, ropes, basket weave
    gores, 'M194 562 L190 612 M266 562 L270 612 M230 562 V612', 'M192 640 H268 M230 612 V676',
    // kite: cross struts + tail with bows
    'M838 96 V300 M768 196 H908',
    'M838 300 C818 350 890 370 870 420 C852 466 914 488 900 540',
    'M846 352 l-22 -12 v24 Z M846 352 l22 -12 v24 Z M876 460 l-22 -12 v24 Z M876 460 l22 -12 v24 Z',
    // sun face
    circle(446, 160, 7), circle(494, 160, 7), 'M440 190 Q470 214 500 190', circle(426, 186, 9), circle(514, 186, 9),
    // sheep: eyes, ears, legs, the cloud it stands on
    circle(630, 1116, 5), circle(658, 1116, 5), 'M634 1138 q10 8 20 0', 'M608 1102 l-26 -10 l12 24 M680 1102 l26 -10 l-12 24',
    'M720 1218 v34 M760 1222 v34 M800 1222 v34 M840 1216 v34',
    cloud(776, 1280, 150, 40, 9),
    // drifting clouds, birds, sparkles
    cloud(866, 1010, 56, 24, 6), cloud(150, 820, 64, 26, 6), cloud(420, 1200, 90, 34, 7),
    'M330 700 q14 -14 28 0 q14 -14 28 0 M880 920 q12 -12 24 0 q12 -12 24 0',
    star4(110, 140, 16), star4(660, 140, 14), star4(900, 430, 18), star4(330, 1330 - 30, 12), star4(560, 1010, 14),
  ],
};
