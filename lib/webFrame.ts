// Infra (merge agent owns). Web only: on wide screens the app renders in a centered phone-width column
// (CSS in public/index.html). This makes the "window" size the app measures match that column, so screens that
// size themselves from useWindowDimensions (coloring page, QR, sheets) lay out like on a phone.
import { Dimensions, Platform } from 'react-native';

/** Must match the max-width + breakpoint in public/index.html. */
export const WEB_COLUMN_WIDTH = 480;
const WIDE_BREAKPOINT = 600;

type Dims = { width: number; height: number; scale: number; fontScale: number };
type Handler = (d: { window: Dims; screen: Dims }) => void;

function clamp(d: Dims): Dims {
  return d.width >= WIDE_BREAKPOINT ? { ...d, width: WEB_COLUMN_WIDTH } : d;
}

let installed = false;

export function installWebFrame() {
  if (Platform.OS !== 'web' || installed || typeof window === 'undefined') return;
  installed = true;
  const D = Dimensions as unknown as {
    get: (k: 'window' | 'screen') => Dims;
    addEventListener: (t: 'change', h: Handler) => { remove: () => void };
    removeEventListener: (t: 'change', h: Handler) => void;
  };
  const get = D.get.bind(Dimensions);
  const add = D.addEventListener.bind(Dimensions);
  const remove = D.removeEventListener.bind(Dimensions);
  const wrapped = new WeakMap<Handler, Handler>();
  D.get = (k) => (k === 'window' ? clamp(get('window')) : get(k));
  D.addEventListener = (t, h) => {
    const w: Handler = (d) => h({ ...d, window: clamp(d.window) });
    wrapped.set(h, w);
    const sub = add(t, w);
    return { remove: () => { sub.remove(); wrapped.delete(h); } };
  };
  D.removeEventListener = (t, h) => {
    remove(t, wrapped.get(h) ?? h);
    wrapped.delete(h);
  };
}

/** Web: how far the centered column sits from the viewport's left edge (0 on phones and native).
 *  Subtract it from viewport x (measureInWindow, pageX) to get column-relative x. */
export function webFrameOffsetX(): number {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return 0;
  return document.body.getBoundingClientRect().left;
}
