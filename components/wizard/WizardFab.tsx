// Owner: AB. Sage's floating button (B5): tap = sheet, long-press = Demo Tools, drag = move it.
// - Home: bottom-right, just above the tab bar. Drag anywhere; on release it tucks to the nearest side edge and stays
//   at that height. Position is saved as fractions of the free area, so it survives restarts, rotation and
//   per-tab lifts — and it is re-clamped on every layout change, so it can never end up off-screen.
// - Always mounted: hiding fades it out (no remount, no lost position). Hidden only while Sage's sheet/pill is up,
//   while the keyboard is up (it would cover Send), or while a FOCUSED screen calls useHideWizardFab(true).
// - A stored spot that doesn't validate falls back to home.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '@/components/shell/KeyboardSafe';
import { playSfx } from '@/components/shell/sfx';
import { ink, realm, shadow, space } from '@/shared/theme';
import { Sage } from './Sage';
import { useWizard } from './WizardProvider';

export const FAB_SIZE = 60;
const MARGIN = space.lg;
const TOP_CLEAR = 76; // keep clear of screen headers ("…" menus, titles, the music toggle)
const POS_KEY = 'qb.sage.fabPos.v2';
const SPRING = { damping: 17, stiffness: 190 };

/** side: which edge it hugs · t: 0 = top of the free area, 1 = bottom (home). */
type Spot = { side: 'l' | 'r'; t: number };
const HOME: Spot = { side: 'r', t: 1 };
let savedSpot: Spot = HOME; // survives remounts of the tabs layout within a session

function validSpot(v: unknown): v is Spot {
  const s = v as Spot;
  return !!s && (s.side === 'l' || s.side === 'r') && typeof s.t === 'number' && s.t >= 0 && s.t <= 1;
}

export function WizardFab({ bottom }: { bottom: number }) {
  const { open, openDemoTools, mode, fabHidden } = useWizard();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const kbOpen = useKeyboardVisible();
  const spot = useRef<Spot>(savedSpot);

  // Free area for the FAB's top-left corner.
  const box = useMemo(() => {
    const minX = MARGIN;
    const maxX = Math.max(minX, width - MARGIN - FAB_SIZE);
    const minY = insets.top + TOP_CLEAR;
    const maxY = Math.max(minY, height - bottom - FAB_SIZE);
    return { minX, maxX, minY, maxY };
  }, [width, height, bottom, insets.top]);
  const boxRef = useRef(box);
  boxRef.current = box;

  const toXY = useCallback((s: Spot) => ({
    x: s.side === 'l' ? box.minX : box.maxX,
    y: box.minY + (box.maxY - box.minY) * s.t,
  }), [box]);

  const home = toXY(spot.current);
  const x = useSharedValue(home.x);
  const y = useSharedValue(home.y);
  const shown = useSharedValue(1);

  // Restore the saved spot once.
  useEffect(() => {
    AsyncStorage.getItem(POS_KEY)
      .then((raw) => {
        const v = raw ? JSON.parse(raw) : null;
        if (validSpot(v)) { spot.current = v; savedSpot = v; const p = toXY(v); x.value = withSpring(p.x, SPRING); y.value = withSpring(p.y, SPRING); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-clamp whenever the free area changes (rotation, tab lift, safe area) — never off-screen.
  useEffect(() => {
    const p = toXY(spot.current);
    x.value = withSpring(p.x, SPRING);
    y.value = withSpring(p.y, SPRING);
  }, [toXY, x, y]);

  const hidden = mode !== 'closed' || fabHidden || kbOpen;
  useEffect(() => { shown.value = withTiming(hidden ? 0 : 1, { duration: hidden ? 140 : 220 }); }, [hidden, shown]);

  const start = useRef({ x: 0, y: 0 });
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
    onPanResponderGrant: () => { start.current = { x: x.value, y: y.value }; },
    onPanResponderMove: (_, g) => {
      const b = boxRef.current;
      // follow the finger, softly clamped to the screen
      x.value = Math.min(b.maxX + MARGIN, Math.max(b.minX - MARGIN, start.current.x + g.dx));
      y.value = Math.min(b.maxY, Math.max(b.minY, start.current.y + g.dy));
    },
    onPanResponderRelease: (_, g) => {
      const b = boxRef.current;
      const cx = start.current.x + g.dx + FAB_SIZE / 2;
      const ny = Math.min(b.maxY, Math.max(b.minY, start.current.y + g.dy));
      const next: Spot = {
        side: cx < width / 2 ? 'l' : 'r',
        t: b.maxY > b.minY ? (ny - b.minY) / (b.maxY - b.minY) : 1,
      };
      spot.current = next;
      savedSpot = next;
      x.value = withSpring(next.side === 'l' ? b.minX : b.maxX, SPRING);
      y.value = withSpring(ny, SPRING);
      Haptics.selectionAsync().catch(() => {});
      AsyncStorage.setItem(POS_KEY, JSON.stringify(next)).catch(() => {});
    },
    onPanResponderTerminate: () => {
      const p = toXY(spot.current);
      x.value = withSpring(p.x, SPRING);
      y.value = withSpring(p.y, SPRING);
    },
  }), [width, x, y, toXY]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 0.6 + 0.4 * shown.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents={hidden ? 'none' : 'auto'}>
      <View {...pan.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Sage the wizard"
        accessibilityHint="Long-press for demo tools. Drag to move."
        accessibilityElementsHidden={hidden}
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
        onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('open'); open(); }}
        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); playSfx('open'); openDemoTools(); }}
        delayLongPress={600}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <View style={styles.face}>
          <Sage size={50} variant="face" still />
        </View>
      </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, top: 0, width: FAB_SIZE, height: FAB_SIZE, zIndex: 20, elevation: 20 },
  fab: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, backgroundColor: realm.royalMist, borderWidth: 2.5,
    borderColor: ink.ink, alignItems: 'center', justifyContent: 'center', ...shadow.md,
    outlineColor: realm.warmGold, outlineWidth: 3, outlineStyle: 'solid', outlineOffset: 2,
  },
  face: { width: FAB_SIZE - 6, height: FAB_SIZE - 6, borderRadius: (FAB_SIZE - 6) / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.93 }] },
});
