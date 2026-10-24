// Owner: AB. Royal gold wax seal that stamps down (scale 1.4 → 1 with a bounce).
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { fonts, ink } from '@/shared/theme';

function scallops(cx: number, cy: number, r: number, n: number) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.9;
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

export function WaxSeal({ size = 140, mark = '✦', onLanded }: { size?: number; mark?: string; onLanded?: () => void }) {
  const scale = useSharedValue(1.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 160 });
    scale.value = withSequence(withTiming(1.4, { duration: 60 }), withDelay(80, withSpring(1, { damping: 7, stiffness: 260, mass: 0.8 })));
    const t = setTimeout(() => onLanded?.(), 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }, { rotate: '-8deg' }] }));
  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={scallops(50, 50, 47, 36)} fill={ink.gold} stroke={ink.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <Circle cx={50} cy={50} r={32} fill="none" stroke={ink.ink} strokeWidth={2} strokeDasharray="3 3" />
        <SvgText x={50} y={62} fontSize={34} fontFamily={fonts.display} fill={ink.ink} textAnchor="middle">{mark}</SvgText>
      </Svg>
    </Animated.View>
  );
}
