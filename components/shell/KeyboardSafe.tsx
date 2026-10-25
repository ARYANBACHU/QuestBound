// Owner: AB. ONE keyboard helper for every screen with a text input (B4). Works in Expo Go on iOS + Android.
//
//   <KeyboardSafe>                       // pads its bottom by exactly the part of the keyboard that covers it
//     <KeyboardSafeScroll>…inputs…</KeyboardSafeScroll>   // scrolls the focused input into view
//     <Composer />                       // anything pinned below the scroll rides on top of the keyboard
//   </KeyboardSafe>
//
// - Measures its own position (tab bar, modal, sheet — no magic offsets to pass).
// - iOS follows the keyboard frame by frame. Android measures the real overlap, so edge-to-edge (no resize) and
//   adjustResize (already resized → 0) both come out right — never double padding.
// - Tap outside an input dismisses the keyboard (`dismissOnTap`, default on; off on web where there's no soft keyboard).
// - `useKeyboardVisible()` / `useKeyboardInset()` for custom layouts (Sage's sheet uses them).
import { useEffect, useRef, useState, type ComponentRef, type ReactNode, type RefObject, type Ref } from 'react';
import {
  Dimensions, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions,
  type KeyboardEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';

export type ScrollRef = ComponentRef<typeof ScrollView>;

const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
/** Breathing room between the focused input and the keyboard. */
const REVEAL_MARGIN = 24;

/** Reanimated's keyboard tracker is native-only (it warns on web). Web has no soft keyboard to follow → height 0. */
const useKeyboardHeight: () => { height: SharedValue<number> } =
  Platform.OS === 'web' ? () => ({ height: useSharedValue(0) }) : useAnimatedKeyboard;

// ---------- shared keyboard state (one set of listeners for the whole app) ----------
let kbVisible = false;
let kbHeight = 0;
let tallestWindow = Dimensions.get('window').height;
const subs = new Set<(v: boolean) => void>();
let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  Keyboard.addListener(SHOW, (e: KeyboardEvent) => { kbVisible = true; kbHeight = e.endCoordinates?.height ?? 0; subs.forEach((f) => f(true)); });
  Keyboard.addListener(HIDE, () => { kbVisible = false; kbHeight = 0; subs.forEach((f) => f(false)); });
}
function noteWindow(h: number) {
  if (!kbVisible) tallestWindow = h; // a closed keyboard = the real full window (also follows rotation)
  else tallestWindow = Math.max(tallestWindow, h);
}

/** True while the soft keyboard is up (iOS: from the moment it starts to slide in). */
export function useKeyboardVisible(): boolean {
  const [v, setV] = useState(kbVisible);
  useEffect(() => {
    wire();
    setV(kbVisible);
    subs.add(setV);
    return () => { subs.delete(setV); };
  }, []);
  return v;
}

/**
 * Animated height of the keyboard that overlaps a view whose bottom edge sits `offset` px above the screen bottom.
 * Compensates when Android resized the window itself. Runs on the UI thread (follows the keyboard frame by frame).
 */
export function useKeyboardInset(offset: number | SharedValue<number> = 0): SharedValue<number> {
  const kb = useKeyboardHeight();
  const { height } = useWindowDimensions();
  const shrink = useSharedValue(0);
  useEffect(() => {
    wire();
    noteWindow(height);
    shrink.value = Math.max(0, tallestWindow - height);
  }, [height, shrink]);
  return useDerivedValue(() => {
    const off = typeof offset === 'number' ? offset : offset.value;
    return Math.max(0, kb.height.value - shrink.value - off);
  });
}

// ---------- <KeyboardSafe> ----------
export function KeyboardSafe({
  children, style, offset, dismissOnTap = true, enabled = true, pointerEvents,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Distance from this view's bottom to the screen bottom. Omit to measure it automatically (recommended). */
  offset?: number;
  dismissOnTap?: boolean;
  enabled?: boolean;
  pointerEvents?: 'box-none' | 'auto';
}) {
  const outer = useRef<ComponentRef<typeof View>>(null);
  const inset = useOverlap(outer, offset);
  const pad = useAnimatedStyle(() => ({ paddingBottom: enabled ? inset.value : 0 }));
  const body = (
    <Animated.View ref={outer} pointerEvents={pointerEvents} style={[styles.fill, style, pad]}>
      {children}
    </Animated.View>
  );
  if (!dismissOnTap || Platform.OS === 'web') return body;
  return (
    <Pressable style={styles.fill} onPress={Keyboard.dismiss} accessible={false} focusable={false}>
      {body}
    </Pressable>
  );
}

/**
 * How much of `ref`'s view the keyboard covers.
 * iOS: the window never resizes → keyboard height minus our resting distance to the screen bottom, frame-synced.
 * Android (incl. inside Modals): measure our bottom edge against the keyboard top when it shows — 0 if the system
 * already resized the window, the real overlap if it didn't (edge-to-edge).
 */
function useOverlap(ref: RefObject<ComponentRef<typeof View> | null>, offset?: number): SharedValue<number> {
  const kb = useKeyboardHeight();
  const rest = useSharedValue(offset ?? 0);
  const android = useSharedValue(0);
  const ios = Platform.OS === 'ios';

  useEffect(() => {
    if (offset != null) { rest.value = offset; return; }
    if (!ios) return;
    // measure the resting distance to the screen bottom (re-measure on each show: layouts move)
    const measure = () => ref.current?.measureInWindow((_x, y, _w, h) => {
      if (Number.isFinite(y) && h) rest.value = Math.max(0, Dimensions.get('window').height - (y + h));
    });
    const t = setTimeout(measure, 0);
    const sub = Keyboard.addListener('keyboardWillShow', measure);
    return () => { clearTimeout(t); sub.remove(); };
  }, [offset, ios, ref, rest]);

  useEffect(() => {
    if (ios || Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      const top = e.endCoordinates?.screenY;
      if (top == null) return;
      ref.current?.measureInWindow((_x, y, _w, h) => {
        if (!Number.isFinite(y) || !h) return;
        android.value = withTiming(Math.max(0, Math.round(y + h - top)), { duration: 120 });
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => { android.value = withTiming(0, { duration: 120 }); });
    return () => { show.remove(); hide.remove(); };
  }, [ios, ref, android]);

  return useDerivedValue(() => (ios ? Math.max(0, kb.height.value - rest.value) : android.value));
}

// ---------- <KeyboardSafeScroll> ----------
/** A ScrollView that keeps taps working with the keyboard up and scrolls the focused input above the keyboard. */
export function KeyboardSafeScroll({ ref, onScroll, children, ...rest }: ScrollViewProps & { ref?: Ref<ScrollRef> }) {
  const inner = useRef<ScrollRef>(null);
  const y = useRef(0);

  useEffect(() => {
    const reveal = (e: KeyboardEvent) => {
      // wait one beat so the padding has applied and the scroll view can scroll that far
      const top = e.endCoordinates?.screenY ?? Dimensions.get('window').height - kbHeight;
      setTimeout(() => revealFocused(inner.current, y.current, top), Platform.OS === 'ios' ? 280 : 60);
    };
    const sub = Keyboard.addListener(SHOW, reveal);
    return () => sub.remove();
  }, []);

  return (
    <ScrollView
      ref={(node) => {
        inner.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref && typeof ref === 'object') (ref as { current: ScrollRef | null }).current = node;
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      scrollEventThrottle={32}
      onScroll={(ev: NativeSyntheticEvent<NativeScrollEvent>) => { y.current = ev.nativeEvent.contentOffset.y; onScroll?.(ev); }}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

type Measurable = { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void };

function revealFocused(scroll: ScrollRef | null, scrollY: number, keyboardTop: number) {
  try {
    const input = TextInput.State.currentlyFocusedInput?.() as unknown as Measurable | null;
    const host = (scroll as unknown as { getNativeScrollRef?: () => Measurable | null })?.getNativeScrollRef?.() ?? (scroll as unknown as Measurable);
    if (!scroll || !input?.measureInWindow || !host?.measureInWindow) return;
    host.measureInWindow((sx, sy, sw) => {
      input.measureInWindow!((ix, iy, _iw, ih) => {
        if (ix < sx - 1 || ix > sx + sw || iy < sy) return; // not inside this scroll view
        const visibleBottom = Math.min(Dimensions.get('window').height, keyboardTop);
        const overflow = iy + ih + REVEAL_MARGIN - visibleBottom;
        if (overflow > 0) scroll.scrollTo({ y: scrollY + overflow, animated: true });
      });
    });
  } catch {
    // measuring is best effort; the padding alone already keeps pinned inputs visible
  }
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
