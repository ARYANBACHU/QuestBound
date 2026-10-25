// Owner: MP. Keeps a bottom-pinned composer sitting right on top of the keyboard.
// KeyboardAvoidingView needs a hand-tuned offset (tab bar + safe area + header); this measures instead: how much of
// the view (in window coordinates) the keyboard covers → bottom padding. Works with edge-to-edge Android and with
// adjustResize (overlap is then ~0), and follows iOS keyboard animation timing.
import { useCallback, useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent, type View } from 'react-native';

export type ViewRef = ComponentRef<typeof View>;

export interface KeyboardLift {
  /** Bottom padding to apply under the composer. */
  lift: number;
  /** Keyboard is on screen. */
  visible: boolean;
  /** Re-measure (call from onLayout of the measured view). */
  remeasure: () => void;
}

export function useKeyboardLift(ref: RefObject<ViewRef | null>): KeyboardLift {
  const [lift, setLift] = useState(0);
  const [visible, setVisible] = useState(false);
  const kbTop = useRef<number | null>(null);

  const apply = useCallback(
    (e?: KeyboardEvent) => {
      const top = kbTop.current;
      if (top == null) {
        setLift(0);
        return;
      }
      ref.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        if (!h) return;
        const next = Math.max(0, Math.round(y + h - top));
        setLift((cur) => {
          if (cur === next) return cur;
          if (Platform.OS === 'ios' && e?.duration) {
            LayoutAnimation.configureNext({
              duration: Math.max(e.duration, 10),
              update: { duration: Math.max(e.duration, 10), type: LayoutAnimation.Types[e.easing] ?? 'keyboard' },
            });
          }
          return next;
        });
      });
    },
    [ref],
  );

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const onShow = (e: KeyboardEvent) => {
      kbTop.current = e.endCoordinates.screenY;
      setVisible(true);
      apply(e);
    };
    const onHide = (e: KeyboardEvent) => {
      kbTop.current = null;
      setVisible(false);
      if (ios && e?.duration) {
        LayoutAnimation.configureNext({ duration: Math.max(e.duration, 10), update: { duration: Math.max(e.duration, 10), type: 'keyboard' } });
      }
      setLift(0);
    };
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', onShow),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', onHide),
    ];
    if (ios) {
      // QuickType bar / emoji keyboard height changes.
      subs.push(
        Keyboard.addListener('keyboardWillChangeFrame', (e) => {
          if (kbTop.current == null) return;
          kbTop.current = e.endCoordinates.screenY;
          apply(e);
        }),
      );
    }
    return () => subs.forEach((s) => s.remove());
  }, [apply]);

  const remeasure = useCallback(() => apply(), [apply]);
  return { lift, visible, remeasure };
}
