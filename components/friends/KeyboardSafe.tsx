// Owner: MP. Keeps bottom-pinned inputs (chat composer, join code) on top of the keyboard — in Expo Go, on iOS and
// edge-to-edge Android. Swap for AB's components/shell/KeyboardSafe once it lands on main (same idea, same props).
//
// How: Reanimated's useAnimatedKeyboard gives the keyboard height on the UI thread, frame-synced with the keyboard
// animation (incl. iOS interactive dismiss). We pad the view's bottom by however much of the view the keyboard
// covers:  lift = max(0, viewBottom − (screenBottom − keyboardHeight)).
//  - Tab bar / home indicator below the view → covered part is smaller → lift is smaller (no guessed offsets).
//  - Tab bar hides while typing → view grows → onLayout re-measures → lift grows.
//  - Android window resizes for the keyboard anyway → view bottom moves above the keyboard → lift is 0 (no double lift).
import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Keyboard, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

export interface KeyboardSafeProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra space between the keyboard and the content when it's open. */
  extra?: number;
  /** Fires when the keyboard opens/closes (JS side; fine for "scroll to newest" or a hide-keyboard button). */
  onKeyboardChange?: (visible: boolean) => void;
}

export default function KeyboardSafe({ children, style, extra = 0, onKeyboardChange }: KeyboardSafeProps) {
  const ref = useRef<ComponentRef<typeof Animated.View>>(null);
  const kb = useAnimatedKeyboard();
  const frame = useSafeAreaFrame();
  const viewBottom = useSharedValue(-1);
  // Bottom of the full window. Kept at its max so a keyboard-resized window can't shrink it.
  const screenBottom = useSharedValue(frame.y + frame.height);
  const visible = useKeyboardVisible();

  useEffect(() => {
    const b = frame.y + frame.height;
    if (b > screenBottom.value || !visible) screenBottom.value = b;
  }, [frame.y, frame.height, visible, screenBottom]);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _w, h) => {
      if (h > 0) viewBottom.value = y + h;
    });
  }, [viewBottom]);

  // Re-measure once the keyboard is up: by then any screen transition has settled.
  useEffect(() => {
    measure();
    onKeyboardChange?.(visible);
  }, [visible]);

  const lifted = useAnimatedStyle(() => {
    const h = kb.height.value;
    if (h <= 0 || viewBottom.value < 0) return { paddingBottom: 0 };
    const cover = viewBottom.value - (screenBottom.value - h);
    return { paddingBottom: cover > 0 ? cover + extra : 0 };
  });

  return (
    <Animated.View ref={ref} onLayout={measure} style={[styles.flex, style, lifted]}>
      {children}
    </Animated.View>
  );
}

/** Keyboard on screen (JS state; iOS "will" events so UI changes land with the animation). */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true)),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return visible;
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
