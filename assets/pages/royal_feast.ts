// Owner: AD. Chapter template: The Royal Feast.
import type { PageArt } from './types';
import { circle, ellipse, poly, rr, storybookFrame } from './shapes';

function tableCloth(): string {
  const bumps = 6, x0 = 925, x1 = 75, y = 1140;
  const step = (x0 - x1) / bumps, r = step * 0.62;
  let d = 'M120 820 L880 820 L925 900 L925 1140';
  for (let i = 1; i <= bumps; i++) d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(x0 - step * i).toFixed(1)} ${y}`;
  return d + ' L75 900 Z';
}

const THRONE = [
  'M400 815 L400 500 Q400 350 500 320 Q600 350 600 500 L600 815 Z',
  circle(500, 318, 22),
  rr(340, 590, 90, 44, 18), rr(350, 590, 36, 225, 12),
  rr(570, 590, 90, 44, 18), rr(614, 590, 36, 225, 12),
].join(' ');

const CANDLES = [[225, 95, 70], [340, 112, 55], [483, 110, 55], [626, 112, 55], [741, 95, 70]] as const;

export const royal_feast: PageArt = {
  id: 'royal_feast',
  viewBox: '0 0 1000 1400',
  background: [
    // pillars and floor tiles
    'M90 300 V820 M140 300 V820 M860 300 V820 M910 300 V820 M80 300 H150 M850 300 H920',
    'M50 1190 H950 M50 1260 H950 M200 1190 L170 1350 M420 1190 L410 1350 M640 1190 L650 1350 M840 1190 L870 1350',
  ],
  regions: {
    feast_table: { d: tableCloth(), labelAt: [500, 1010] },
    throne: { d: THRONE, labelAt: [500, 460] },
    chandelier: {
      d: ['M215 160 L785 160 Q770 250 500 262 Q230 250 215 160 Z', ...CANDLES.map(([x, y, h]) => rr(x, y, 34, h + 4, 8))].join(' '),
      labelAt: [500, 205],
    },
    goblet: {
      d: 'M680 600 L840 600 Q835 700 772 722 L772 776 Q790 800 820 815 L700 815 Q730 800 748 776 L748 722 Q685 700 680 600 Z',
      labelAt: [760, 650],
    },
    cake: { d: `${rr(140, 740, 200, 80, 16)} ${rr(175, 672, 130, 72, 14)} ${rr(207, 612, 66, 64, 12)}`, labelAt: [240, 782] },
    lute: {
      d: `${ellipse(230, 1262, 95, 62)} ${rr(310, 1243, 230, 38, 12)} ${poly([[535, 1234], [600, 1224], [600, 1292], [535, 1290]])}`,
      labelAt: [182, 1262],
    },
  },
  ink: [
    ...storybookFrame(),
    // chandelier chains + flames
    'M500 52 L420 160 M500 52 L580 160',
    ...CANDLES.map(([x, y]) => `M${x + 17} ${y - 4} Q${x + 2} ${y - 22} ${x + 17} ${y - 40} Q${x + 32} ${y - 22} ${x + 17} ${y - 4} Z`),
    'M260 200 Q500 250 740 200',
    // garland swags
    'M60 330 Q200 410 340 330 M660 330 Q800 410 940 330',
    // throne cushion + crest
    'M420 700 Q500 680 580 700', 'M500 400 l26 40 l-26 40 l-26 -40 z',
    // table edge, plates, fruit
    'M75 900 H925', ellipse(500, 862, 70, 20), ellipse(390, 856, 40, 12), ellipse(610, 856, 40, 12),
    circle(480, 846, 14), circle(510, 842, 16), circle(532, 852, 10),
    // cloth folds
    'M260 905 Q250 1020 270 1150 M420 905 Q410 1030 430 1170 M580 905 Q590 1030 570 1170 M740 905 Q750 1020 730 1150',
    // cake frosting drips + candle
    'M140 760 Q170 780 200 760 Q240 785 280 760 Q310 780 340 760', 'M175 690 Q205 708 240 690 Q270 708 305 690',
    'M240 612 V580 M240 572 Q228 556 240 540 Q252 556 240 572 Z',
    // goblet gems + sparkle
    circle(730, 640, 12), circle(790, 640, 12), 'M690 600 H830',
    // lute: sound hole, strings, bridge, pegs
    circle(255, 1262, 22), 'M180 1250 H600 M180 1262 H600 M180 1274 H600', 'M190 1242 V1282',
    'M560 1224 v-14 M580 1222 v-14 M560 1292 v14 M580 1292 v14',
  ],
};
