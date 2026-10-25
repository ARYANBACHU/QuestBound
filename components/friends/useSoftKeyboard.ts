// Owner: MP. "Is the soft keyboard up?" on every platform.
// Native: AB's shared useKeyboardVisible (Keyboard events). Web: there are no keyboard events, so watch the visual
// viewport — a text field is focused AND the viewport lost a keyboard's worth of height (Android Chrome shrinks the
// page, iOS Safari shrinks the visual viewport). Desktop browsers never lose that much height on focus → false.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useKeyboardVisible } from '@/components/shell/KeyboardSafe';

/** Less than this is a browser toolbar showing/hiding, not a keyboard. */
const MIN_KEYBOARD = 150;

let open = false;
let tallest = 0;
let wired = false;
const subs = new Set<(v: boolean) => void>();

function viewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}
function typingInField(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable;
}
function update() {
  const h = viewportHeight();
  const focused = typingInField();
  if (!focused) tallest = h; // no keyboard → this is the full height (also follows rotation)
  else tallest = Math.max(tallest, h);
  const next = focused && tallest - h > MIN_KEYBOARD;
  if (next !== open) {
    open = next;
    subs.forEach((f) => f(open));
  }
}
function wireWeb() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  tallest = viewportHeight();
  const later = () => setTimeout(update, 50); // focus moves before the viewport settles
  window.visualViewport?.addEventListener('resize', update);
  window.addEventListener('resize', update);
  document.addEventListener('focusin', later);
  document.addEventListener('focusout', later);
}

function useWebKeyboardOpen(): boolean {
  const [v, setV] = useState(open);
  useEffect(() => {
    wireWeb();
    setV(open);
    subs.add(setV);
    return () => {
      subs.delete(setV);
    };
  }, []);
  return v;
}

export const useSoftKeyboard: () => boolean = Platform.OS === 'web' ? useWebKeyboardOpen : useKeyboardVisible;
