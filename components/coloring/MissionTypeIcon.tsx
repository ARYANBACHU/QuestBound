// Owner: AD. One hand-drawn ink glyph per mission type. Used on the Missions dashboard (AB) and on coloring pages.
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { MissionType } from '@/shared/types';
import { ink } from '@/shared/theme';

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  gathering: 'Gathering',
  duet: 'Duet',
  relic: 'Relic',
  bard: 'Bard',
  trial: 'Trial',
  gift: 'Gift',
};

interface GlyphProps { type: MissionType; color?: string; strokeWidth?: number }

/**
 * The raw glyph drawn in a 24×24 box, as an SVG group. Use this INSIDE an existing <Svg>
 * (e.g. wrap in <G transform="translate(x y) scale(s)">). Use <MissionTypeIcon> everywhere else.
 */
export function MissionTypeGlyph({ type, color = ink.ink, strokeWidth = 1.8 }: GlyphProps) {
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (type) {
    case 'gathering': // three figures around a round table
      return (
        <G {...s}>
          <Circle cx={5} cy={7} r={2.2} />
          <Circle cx={12} cy={4.6} r={2.2} />
          <Circle cx={19} cy={7} r={2.2} />
          <Path d="M2.2 13.2 Q5 9.6 7.8 13.2 M9.2 10.8 Q12 7.2 14.8 10.8 M16.2 13.2 Q19 9.6 21.8 13.2" />
          <Ellipse cx={12} cy={16} rx={8.6} ry={3.2} />
          <Path d="M7 18.6 L6.4 21.6 M17 18.6 L17.6 21.6" />
        </G>
      );
    case 'duet': // two linked rings
      return (
        <G {...s}>
          <Circle cx={8.6} cy={12} r={5.4} />
          <Circle cx={15.4} cy={12} r={5.4} />
          <Path d="M5.4 6.4 L4.4 5 M18.6 6.4 L19.6 5" />
        </G>
      );
    case 'relic': // faceted gem
      return (
        <G {...s}>
          <Path d="M5 9 L8.6 4.4 H15.4 L19 9 L12 20.4 Z" />
          <Path d="M5 9 H19 M8.6 4.4 L10.2 9 L12 20.4 L13.8 9 L15.4 4.4" />
        </G>
      );
    case 'bard': // quill over an ink line
      return (
        <G {...s}>
          <Path d="M20.6 3 C14 3.6 8.8 8.6 7 16.4 C12.6 15.6 17.6 11 20.6 3 Z" />
          <Path d="M20.6 3 L5.2 18.8" />
          <Path d="M10.6 11.2 L13.2 11.6 M13.6 8 L16.4 8.4" />
          <Path d="M3 21 C6 19.6 8.4 21.8 11.4 20.4" />
        </G>
      );
    case 'trial': // scroll with a question mark
      return (
        <G {...s}>
          <Path d="M7 4.4 H17.6 Q19.6 4.4 19.6 6.4 V18 Q19.6 20 17.6 20 H6.6 Q4.6 20 4.6 18 V16.6 H7 V6.6 Q7 4.4 9.2 4.4" />
          <Path d="M7 6.6 Q7 8.8 5 8.8 Q3.6 8.8 3.6 7.2 Q3.6 5.6 5.4 5" />
          <Path d="M11 9.4 Q11 7.6 13.2 7.6 Q15.2 7.6 15.2 9.4 Q15.2 10.8 13.2 11.6 V13.2" />
          <Circle cx={13.2} cy={16.2} r={0.6} fill={color} />
        </G>
      );
    case 'gift': // wrapped box with a bow
      return (
        <G {...s}>
          <Path d="M4.6 11 H19.4 V20.4 H4.6 Z" />
          <Path d="M3.4 7.6 H20.6 V11 H3.4 Z" />
          <Path d="M12 7.6 V20.4" />
          <Path d="M12 7.6 C9.6 3.4 5.8 5 8 7.4 M12 7.6 C14.4 3.4 18.2 5 16 7.4" />
        </G>
      );
  }
}

/** Little hourglass used for pending (waiting) regions. 24×24 box, use inside an <Svg>. */
export function HourglassGlyph({ color = ink.ink, strokeWidth = 1.8 }: { color?: string; strokeWidth?: number }) {
  return (
    <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path d="M6 3 H18 M6 21 H18" />
      <Path d="M7.4 3 C7.4 8.6 16.6 8.6 16.6 12 C16.6 15.4 7.4 15.4 7.4 21 M16.6 3 C16.6 8.6 7.4 8.6 7.4 12 C7.4 15.4 16.6 15.4 16.6 21" />
      <Path d="M9.6 19 Q12 16.6 14.4 19 Z" fill={color} />
    </G>
  );
}

export interface MissionTypeIconProps { type: MissionType; size?: number; color?: string }

/** `<MissionTypeIcon type={mission.type} size={24} />` */
export function MissionTypeIcon({ type, size = 24, color = ink.ink }: MissionTypeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={MISSION_TYPE_LABEL[type]}>
      <MissionTypeGlyph type={type} color={color} strokeWidth={size < 20 ? 2.2 : 1.8} />
    </Svg>
  );
}

export default MissionTypeIcon;
