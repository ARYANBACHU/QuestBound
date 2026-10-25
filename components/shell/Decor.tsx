// Owner: AB. The ONE decorative layer per screen: a low-opacity castle skyline + a few stars.
// Original SVG; never behind text (place it in empty space, pointerEvents none).
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { decor } from '@/shared/theme';

function star(cx: number, cy: number, r: number) {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.35;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return `${d}Z`;
}

/** Castle + hills silhouette, full width, anchored to the bottom of its box. */
export function CastleSkyline({ height = 120, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.bottom, { height }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice">
        <Path
          fill={decor.silhouette}
          opacity={decor.opacity}
          d="M0 120 L0 92 C40 80 70 84 100 92 L118 92 L118 62 L112 62 L112 52 L120 52 L120 58 L128 58 L128 52 L136 52 L136 58 L144 58 L144 52 L152 52 L152 62 L146 62 L146 92 L170 92 L170 40 L164 40 L184 12 L204 40 L198 40 L198 92 L214 92 L214 56 L208 56 L224 32 L240 56 L234 56 L234 92 L256 92 L256 62 L250 62 L250 52 L258 52 L258 58 L266 58 L266 52 L274 52 L274 58 L282 58 L282 52 L290 52 L290 62 L284 62 L284 92 C320 84 360 78 400 90 L400 120 Z"
        />
        <Path d="M184 12 L184 0 L196 4 L184 8" fill={decor.silhouette} opacity={decor.opacity} />
      </Svg>
    </View>
  );
}

/** A few twinkle-less stars for the top corners of tall screens. */
export function StarField({ style }: { style?: StyleProp<ViewStyle> }) {
  const stars: [number, number, number][] = [[30, 30, 7], [80, 70, 4], [330, 24, 6], [370, 80, 4], [250, 50, 3]];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height={110} viewBox="0 0 400 110" preserveAspectRatio="xMidYMin slice">
        {stars.map(([x, y, r]) => (
          <Path key={`${x}-${y}`} d={star(x, y, r)} fill={decor.star} opacity={decor.sparkleOpacity} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
