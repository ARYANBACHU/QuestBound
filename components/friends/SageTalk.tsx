// Owner: MP. Sage "talks" once: a ~600 ms bob + squash on mount when `talk` is true. Respects reduced motion.
// Used for NEW Sage messages in the chat (never on re-render, scroll-back or reopen — ChatView decides `talk`).
import { useEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export interface SageTalkProps {
  talk: boolean;
  /** Called once when the animation starts (so the parent never replays it). */
  onPlayed?: () => void;
  children: ReactNode;
}

export default function SageTalk({ talk, onPlayed, children }: SageTalkProps) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const s = useSharedValue(1);

  useEffect(() => {
    if (!talk) return;
    onPlayed?.();
    if (reduce) return;
    const t = (v: number, d: number) => withTiming(v, { duration: d });
    y.value = withSequence(t(-4, 110), t(0, 110), t(-3, 100), t(0, 110), t(-1.5, 80), t(0, 90));
    s.value = withSequence(t(1.07, 110), t(1, 110), t(1.05, 100), t(1, 110), t(1.02, 80), t(1, 90));
    // Mount-only: replaying on prop changes is exactly what we must not do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
