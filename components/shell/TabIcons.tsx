// Owner: AB. Hand-inked tab icons (react-native-svg). Active = filled with the player's crayon (soft) + bolder ink.
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ink } from '@/shared/theme';

export type TabName = 'friends' | 'missions' | 'coloring' | 'storybook' | 'settings';

interface IconProps { active: boolean; fill: string; size?: number }

export function TabIcon({ name, active, fill, size = 28 }: IconProps & { name: TabName }) {
  const sw = active ? 2.4 : 1.9;
  const f = active ? fill : 'none';
  const fo = active ? 0.45 : 0;
  const common = { stroke: ink.ink, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      {name === 'friends' && (
        <>
          <Circle cx={10} cy={9} r={4} fill={f} fillOpacity={fo} {...common} />
          <Path d="M3 23c0-4 3-7 7-7s7 3 7 7z" fill={f} fillOpacity={fo} {...common} />
          <Circle cx={19} cy={10} r={3.3} fill={f} fillOpacity={fo} {...common} />
          <Path d="M17.5 16.3c.5-.2 1-.3 1.5-.3 3.4 0 6 2.6 6 6h-6" fill="none" {...common} />
        </>
      )}
      {name === 'missions' && (
        <>
          <Path d="M7 4h14a3 3 0 0 1 0 6h-1v13a2 2 0 0 1-2 2H6a3 3 0 0 1 0-6h1z" fill={f} fillOpacity={fo} {...common} />
          <Path d="M7 19v-15" fill="none" {...common} />
          <Path d="M10 10l1.5 1.5L14 9M10 16l1.5 1.5L14 15" fill="none" {...common} />
        </>
      )}
      {name === 'coloring' && (
        <>
          <Path d="M19.5 3.5l5 5L10 23l-6.5 1.5L5 18z" fill={f} fillOpacity={fo} {...common} />
          <Path d="M16.5 6.5l5 5M5 18l5 5" fill="none" {...common} />
          <Path d="M3.5 24.5l2-2" fill="none" {...common} />
        </>
      )}
      {name === 'storybook' && (
        <>
          <Path d="M14 7c-3-2-7-2.5-11-2v17c4-.5 8 0 11 2z" fill={f} fillOpacity={fo} {...common} />
          <Path d="M14 7c3-2 7-2.5 11-2v17c-4-.5-8 0-11 2z" fill={f} fillOpacity={fo} {...common} />
          <Path d="M14 7v17" fill="none" {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={14} cy={14} r={5} fill={f} fillOpacity={fo} {...common} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <Rect key={deg} x={12.6} y={2.5} width={2.8} height={4.5} rx={1.2} fill={active ? fill : ink.page}
              fillOpacity={active ? 0.9 : 1} {...common} strokeWidth={sw * 0.8} transform={`rotate(${deg} 14 14)`} />
          ))}
        </>
      )}
    </Svg>
  );
}

/** Short wavy crayon stroke used under the active tab. */
export function CrayonSquiggle({ color, width = 30 }: { color: string; width?: number }) {
  return (
    <Svg width={width} height={8} viewBox="0 0 30 8">
      <Path d="M2 5c3-4 5 2 8-1s5-3 8 0 5 2 8-1 3 0 2 1" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}
