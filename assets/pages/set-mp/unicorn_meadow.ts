// Owner: MP (Round 3 U2). Chapter template: The Unicorn Meadow.
// A unicorn standing proud in a flowery meadow, a waterfall with a rainbow in its spray, a bluebird overhead,
// a daisy chain looped in the grass and a lucky horseshoe.
import type { PageArt } from '../types';
import { circle, cloud, ellipse, onEllipse, star4, storybookFrame, wave } from '../shapes';

const f = (v: number) => v.toFixed(1);

// Facing left. Horn → ear → mane line → back → rump → hind legs → belly → front legs → chest → jaw → muzzle.
const UNICORN =
  'M262 318 L330 462 L350 446 L372 404 L380 470 C420 500 450 600 470 690 C520 682 640 684 720 698 ' +
  'C772 706 792 760 782 810 C772 842 752 862 746 882 L748 1050 L708 1050 L706 912 L688 912 ' +
  'L688 1050 L648 1050 L650 882 C600 872 520 872 478 878 L482 1050 L442 1050 L440 912 L424 912 ' +
  'L424 1050 L384 1050 L390 862 C384 790 380 720 350 640 C330 602 302 582 276 586 ' +
  'C240 594 214 584 208 562 C204 540 226 520 250 506 L296 474 Z ' +
  'M776 742 C844 740 874 800 856 860 C844 900 862 940 884 952 C822 964 790 914 800 862 C806 822 792 794 770 784 Z';

const FALLS = 'M650 214 L890 214 L874 600 C830 616 760 616 704 600 Z';

const FIELD = (() => {
  let d = 'M56 1330 L56 1090';
  const xs = [56, 200, 340, 500, 660, 800, 944];
  for (let i = 1; i < xs.length; i++) {
    const mid = (xs[i - 1] + xs[i]) / 2;
    d += ` Q${mid} ${i % 2 ? 1060 : 1100} ${xs[i]} 1086`;
  }
  return d + ' L944 1330 Z';
})();

const HORSESHOE = 'M728 1170 L762 1170 L762 1222 A38 38 0 0 0 838 1222 L838 1170 L872 1170 L872 1222 A72 72 0 0 1 728 1222 Z';

const DAISIES: [number, number][] = Array.from({ length: 7 }, (_, i) => onEllipse(230, 1222, 118, 58, -90 + (i * 360) / 7));
const DAISY_CHAIN = DAISIES.map(([x, y]) => cloud(x, y, 22, 22, 8)).join(' ');

const BLUEBIRD =
  'M228 206 C228 180 204 168 184 172 C164 176 154 190 150 196 C120 194 92 204 76 214 L56 196 L64 236 L84 232 ' +
  'C104 252 150 262 186 246 C214 236 228 224 228 206 Z';

const rainbowArc = (r: number) => {
  const [x0, y0] = onEllipse(770, 560, r, r * 0.8, 200);
  const [x1, y1] = onEllipse(770, 560, r, r * 0.8, 340);
  return `M${f(x0)} ${f(y0)} A${r} ${f(r * 0.8)} 0 0 1 ${f(x1)} ${f(y1)}`;
};

export const unicorn_meadow: PageArt = {
  id: 'unicorn_meadow',
  viewBox: '0 0 1000 1400',
  background: [
    // rolling hills behind the meadow, the pool under the falls
    'M56 760 Q200 690 360 740', 'M840 760 Q900 740 944 744',
    'M60 900 Q300 860 520 900',
  ],
  regions: {
    unicorn: { d: UNICORN, labelAt: [600, 780] },
    rainbow_falls: { d: FALLS, labelAt: [770, 340] },
    wildflower_field: { d: FIELD, labelAt: [520, 1280] },
    horseshoe: { d: HORSESHOE, labelAt: [800, 1278] },
    daisy_chain: { d: DAISY_CHAIN, labelAt: DAISIES[0] },
    bluebird: { d: BLUEBIRD, labelAt: [150, 226] },
  },
  ink: [
    ...storybookFrame(),
    // cliffs beside the falls + top rocks
    'M650 214 C620 260 630 360 610 440 C600 500 640 560 680 600 M890 214 C920 280 910 380 930 460',
    'M630 214 Q700 190 770 206 Q840 186 912 210',
    // falling water lines + splash + rainbow in the spray
    'M700 240 V560 M760 236 V590 M820 240 V570 M860 260 V520',
    'M680 610 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0', ellipse(784, 640, 150, 30),
    rainbowArc(170), rainbowArc(140), rainbowArc(110),
    // unicorn: eye + lashes, nostril, horn spiral, mane locks, hooves, tail locks, cheek
    ellipse(300, 520, 10, 12), 'M292 508 l-8 -8 M300 506 l-2 -10 M308 508 l4 -9', circle(226, 548, 5),
    'M276 352 L300 340 M286 384 L314 370 M298 416 L324 402 M308 446 L330 436',
    'M380 470 C430 470 412 520 450 540 C420 540 440 590 470 610 C440 616 460 660 480 690',
    'M392 500 C410 520 400 560 430 580 M410 610 C430 630 430 650 450 670',
    'M384 1030 H424 M440 1030 H480 M652 1030 H692 M708 1030 H748',
    'M790 790 C830 800 840 840 826 880 M812 770 C860 790 870 840 850 900',
    // daisy chain: daisy hearts + the stem loop that links them
    ...DAISIES.map(([x, y]) => circle(x, y, 8)), ellipse(230, 1222, 118, 58),
    // horseshoe nail holes + lucky sparkle
    ...[[744, 1186], [744, 1214], [856, 1186], [856, 1214]].map(([x, y]) => circle(x, y, 5)), star4(800, 1120, 16),
    // meadow flowers + grass
    ...[[420, 1160], [560, 1200], [640, 1140], [500, 1300], [620, 1270]].map(
      ([x, y]) => `${circle(x, y, 9)} ${circle(x, y - 18, 9)} ${circle(x + 17, y - 6, 9)} ${circle(x - 17, y - 6, 9)} ${circle(x + 11, y + 14, 9)} ${circle(x - 11, y + 14, 9)}`,
    ),
    'M90 1110 q4 -22 10 -26 M104 1110 q0 -26 2 -32 M360 1120 q4 -22 10 -26 M374 1120 q0 -26 2 -32 M700 1110 q4 -22 10 -26',
    // bluebird: wing, eye, beak line
    'M104 216 C134 196 172 204 178 226 C148 234 122 230 104 216 Z', circle(204, 194, 5), 'M226 198 L250 207 L226 216',
    'M120 236 q8 6 16 0 M150 242 q8 6 16 0',
    // sky: sun, clouds, sparkles
    circle(470, 140, 46), 'M470 76 v-16 M470 204 v16 M406 140 h-16 M534 140 h16 M424 94 l-11 -11 M516 94 l11 -11 M424 186 l-11 11 M516 186 l11 11',
    cloud(330, 250, 60, 26, 6), cloud(560, 290, 50, 22, 5),
    star4(120, 420, 14), star4(560, 450, 12), star4(940 - 40, 680, 12), star4(200, 820, 10),
  ],
};
