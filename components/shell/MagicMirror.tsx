// Owner: AB. The Magic Mirror: an oval gold-framed mirror that shimmers while Muse verifies a proof.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { ink, space } from '@/shared/theme';
import { T } from './T';

const W = 200;
const H = 260;

export function MagicMirror({ photoUri, pondering = true, caption = 'The Mirror ponders…' }: {
  photoUri?: string | null;
  pondering?: boolean;
  caption?: string;
}) {
  const x = useSharedValue(-W);
  useEffect(() => {
    if (!pondering) return;
    x.value = withRepeat(withTiming(W * 1.5, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(x);
  }, [pondering, x]);
  const shimmer = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '20deg' }] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <View style={styles.glass}>
          {photoUri ? <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
            <View style={[StyleSheet.absoluteFill, styles.center]}><T style={styles.eye}>🔮</T></View>
          )}
          {pondering ? (
            <Animated.View style={[styles.shimmer, shimmer]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}
        </View>
      </View>
      <View style={styles.stand} />
      {caption ? <T variant="story" center style={{ marginTop: space.md }}>{caption}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  frame: {
    width: W + 24, height: H + 24, borderRadius: (W + 24) / 2, borderWidth: 3, borderColor: ink.ink, backgroundColor: ink.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  glass: {
    width: W, height: H, borderRadius: W / 2, overflow: 'hidden', backgroundColor: ink.lavenderMist, borderWidth: 3, borderColor: ink.ink,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  eye: { fontSize: 56, lineHeight: 68 },
  shimmer: { position: 'absolute', top: -40, bottom: -40, width: 70 },
  stand: { width: 70, height: 14, borderRadius: 6, backgroundColor: ink.gold, borderWidth: 3, borderColor: ink.ink, marginTop: -4 },
});
