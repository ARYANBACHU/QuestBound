// Owner: AB. Sage's floating button: tap = sheet, long-press = Demo Tools, drag = move it; it snaps to the nearest
// corner (remembered). Never blocks content: hides while the keyboard is open, while Sage's sheet/pill is up, and
// whenever a screen calls useHideWizardFab(true) (e.g. the Storybook reader / montage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ink, realm, shadow, space } from '@/shared/theme';
import { Sage } from './Sage';
import { useWizard } from './WizardProvider';

export const FAB_SIZE = 60;
const MARGIN = space.lg;
const TOP_CLEAR = 76; // keep clear of screen headers ("…" menus, titles)
const CORNER_KEY = 'qb.sage.fabCorner';
type Corner = 'tl' | 'tr' | 'bl' | 'br';

export function WizardFab({ bottom }: { bottom: number }) {
  const { open, openDemoTools, mode, fabHidden } = useWizard();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [corner, setCorner] = useState<Corner>('br');
  const [kbOpen, setKbOpen] = useState(false);

  const spots = useMemo(() => {
    const left = MARGIN;
    const right = width - MARGIN - FAB_SIZE;
    const top = insets.top + TOP_CLEAR;
    const low = height - bottom - FAB_SIZE;
    return { tl: { x: left, y: top }, tr: { x: right, y: top }, bl: { x: left, y: low }, br: { x: right, y: low } } as const;
  }, [width, height, bottom, insets.top]);

  const x = useSharedValue(spots.br.x);
  const y = useSharedValue(spots.br.y);

  useEffect(() => {
    AsyncStorage.getItem(CORNER_KEY).then((c) => { if (c === 'tl' || c === 'tr' || c === 'bl' || c === 'br') setCorner(c); }).catch(() => {});
  }, []);
  useEffect(() => {
    x.value = withSpring(spots[corner].x, { damping: 16, stiffness: 180 });
    y.value = withSpring(spots[corner].y, { damping: 16, stiffness: 180 });
  }, [corner, spots, x, y]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const start = useRef({ x: 0, y: 0 });
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
    onPanResponderGrant: () => { start.current = { x: x.value, y: y.value }; },
    onPanResponderMove: (_, g) => { x.value = start.current.x + g.dx; y.value = start.current.y + g.dy; },
    onPanResponderRelease: (_, g) => {
      const cx = start.current.x + g.dx + FAB_SIZE / 2;
      const cy = start.current.y + g.dy + FAB_SIZE / 2;
      const next: Corner = `${cy < height / 2 ? 't' : 'b'}${cx < width / 2 ? 'l' : 'r'}` as Corner;
      Haptics.selectionAsync().catch(() => {});
      setCorner(next);
      x.value = withSpring(spots[next].x, { damping: 16, stiffness: 180 });
      y.value = withSpring(spots[next].y, { damping: 16, stiffness: 180 });
      AsyncStorage.setItem(CORNER_KEY, next).catch(() => {});
    },
    onPanResponderTerminate: () => {
      x.value = withSpring(spots[corner].x);
      y.value = withSpring(spots[corner].y);
    },
  }), [height, width, spots, corner, x, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));

  if (mode !== 'closed' || fabHidden || kbOpen) return null;

  return (
    <Animated.View style={[styles.wrap, style]} {...pan.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Sage the wizard"
        accessibilityHint="Long-press for demo tools. Drag to move."
        onPress={() => { Haptics.selectionAsync().catch(() => {}); open(); }}
        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); openDemoTools(); }}
        delayLongPress={600}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <View style={styles.face}>
          <Sage size={50} variant="face" still />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, top: 0, width: FAB_SIZE, height: FAB_SIZE },
  fab: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, backgroundColor: realm.royalMist, borderWidth: 2.5,
    borderColor: ink.ink, alignItems: 'center', justifyContent: 'center', ...shadow.md,
    outlineColor: realm.warmGold, outlineWidth: 3, outlineStyle: 'solid', outlineOffset: 2,
  },
  face: { width: FAB_SIZE - 6, height: FAB_SIZE - 6, borderRadius: (FAB_SIZE - 6) / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.93 }] },
});
