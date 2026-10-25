// Owner: MP (Round 3 U2). Chapter template: The Owl Library.
// A tall arched bookcase, a round moonlit window, a spectacled owl perched on a cosy armchair, a candle on the
// side table, and a scroll and quill on the rug.
import type { PageArt } from '../types';
import { circle, ellipse, rr, star4, storybookFrame, wave } from '../shapes';

const BOOKCASE = 'M80 1120 L80 330 C80 200 180 130 280 130 C380 130 480 200 480 330 L480 1120 Z';

const CHAIR =
  'M600 1080 L600 870 C600 840 615 828 640 828 L652 828 L652 780 C652 748 680 736 765 736 C850 736 878 748 878 780 ' +
  'L878 828 L890 828 C915 828 930 840 930 870 L930 1080 L902 1080 L898 1120 L876 1120 L872 1080 L658 1080 L654 1120 ' +
  'L632 1120 L628 1080 Z';

const OWL =
  'M650 750 C630 690 640 590 670 550 L660 502 L700 534 C725 524 755 524 780 534 L820 502 L810 550 C840 590 850 690 830 750 Z';

const CANDLE = `${ellipse(546, 952, 54, 15)} ${rr(522, 842, 48, 112, 8)} M546 780 C566 805 570 826 546 836 C522 826 526 805 546 780 Z`;

const SCROLL =
  'M140 1170 H420 C440 1170 452 1182 452 1200 L452 1246 C452 1262 440 1272 420 1272 H140 C120 1272 108 1262 108 1246 ' +
  'L108 1200 C108 1182 120 1170 140 1170 Z';

const QUILL = `${rr(520, 1226, 96, 84, 18)} M560 1232 C584 1172 650 1130 742 1140 C712 1186 646 1226 580 1240 Z`;

// Books on four shelves: deterministic widths/heights so the page is stable.
const SHELVES = [540, 720, 900, 1080];
const books = (() => {
  const W = [34, 28, 42, 30, 24, 46, 32, 36, 26, 40];
  const H = [140, 124, 156, 132, 116, 150, 128, 146, 120, 138];
  const out: string[] = [];
  SHELVES.forEach((base, s) => {
    let x = 116 + (s % 2) * 10;
    let i = s * 3;
    while (x < 420) {
      const w = W[i % W.length];
      const h = H[(i * 7) % H.length];
      if (x + w > 444) break;
      if (i % 9 === 4) {
        // a leaning book
        out.push(`M${x} ${base} L${x + h * 0.35} ${base - h * 0.94} L${x + h * 0.35 + w} ${base - h * 0.94 + 8} L${x + w + 2} ${base}`);
        x += w + h * 0.35 + 6;
      } else {
        out.push(rr(x, base - h, w, h, 4));
        if (w >= 30) out.push(`M${x + 6} ${base - h + 22} H${x + w - 6} M${x + 6} ${base - 26} H${x + w - 6}`);
        x += w + 2;
      }
      i++;
    }
  });
  return out;
})();

export const owl_library: PageArt = {
  id: 'owl_library',
  viewBox: '0 0 1000 1400',
  background: [
    // floor line + floorboards
    'M56 1120 H944', 'M60 1200 H100 M630 1180 H760 M650 1320 H760',
  ],
  regions: {
    great_bookcase: { d: BOOKCASE, labelAt: [280, 260] },
    reading_nook: { d: CHAIR, labelAt: [765, 1000] },
    scholar_owl: { d: OWL, labelAt: [740, 690] },
    quill: { d: QUILL, labelAt: [568, 1268] },
    scroll: { d: SCROLL, labelAt: [280, 1220] },
    candle: { d: CANDLE, labelAt: [546, 900] },
  },
  ink: [
    ...storybookFrame(),
    // bookcase: inner frame, crest window, shelves, books
    'M110 1090 L110 340 C110 230 190 166 280 166 C370 166 450 230 450 340 L450 1090 Z',
    circle(280, 280, 56), star4(280, 280, 30),
    ...SHELVES.map((y) => `M110 ${y} H450`), 'M110 360 H450',
    ...books,
    // the window: panes, crescent moon, stars, curtains
    circle(765, 290, 150), 'M765 140 V440 M615 290 H915',
    'M820 200 A44 44 0 1 0 836 262 A34 34 0 1 1 820 200 Z',
    star4(690, 220, 14), star4(700, 360, 10), star4(850, 370, 12),
    'M600 150 C620 260 600 360 640 460 M930 150 C910 260 930 360 890 460',
    // owl: spectacles, eyes, beak, brows, wings, belly feathers, feet
    circle(708, 590, 28), circle(772, 590, 28), 'M736 590 H744', circle(710, 592, 9), circle(770, 592, 9),
    'M728 618 L740 642 L752 618 Z',
    'M664 640 C650 680 660 720 684 744 M816 640 C830 680 820 720 796 744',
    'M708 670 q8 10 16 0 q8 10 16 0 q8 10 16 0 M716 700 q8 10 16 0 q8 10 16 0',
    'M712 750 l-8 14 M724 750 v16 M756 750 v16 M768 750 l8 14',
    // armchair: arms, seat cushion, tufting, legs
    'M640 828 C660 828 664 846 664 870 L664 1000 M890 828 C870 828 866 846 866 870 L866 1000',
    'M664 1000 Q765 1022 866 1000', circle(720, 800, 6), circle(810, 800, 6), circle(765, 840, 6),
    // side table under the candle
    'M486 962 H606 M500 962 V1120 M592 962 V1120 M500 1050 H592',
    'M532 870 C528 890 530 900 536 912',
    // scroll: rolled ends + writing
    ellipse(108, 1221, 18, 52), ellipse(452, 1221, 18, 52),
    'M150 1200 h120 M150 1222 h200 M150 1244 h150',
    // quill: ink pot neck + feather barbs
    'M532 1226 Q568 1210 604 1226', 'M592 1218 L700 1158 M620 1206 l-10 -26 M650 1190 l-8 -26 M680 1172 l-6 -22',
    // rug
    'M140 1306 Q500 1346 860 1306',
    // a stack of books on the floor
    rr(780, 1250, 124, 36, 6), rr(792, 1214, 104, 36, 6), rr(806, 1178, 84, 36, 6), 'M796 1268 H890 M806 1232 H884',
    // stray floating sparkles (it is a magic library)
    star4(560, 250, 12), star4(540, 520, 10), star4(900, 560, 14),
  ],
};
