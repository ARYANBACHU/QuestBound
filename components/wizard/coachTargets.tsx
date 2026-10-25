// Owner: AB. Things Sage's spotlight tour can point at (U5).
//   <CoachTarget id="missions.chapters"> … </CoachTarget>   — wrap any element (any owner may use it)
//   measureCoachTarget(id) → its window rect, or null if it isn't on screen right now.
import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { Dimensions, View, type StyleProp, type ViewStyle } from 'react-native';

export type Rect = { x: number; y: number; w: number; h: number };
type ViewRef = ComponentRef<typeof View>;

const targets = new Map<string, Set<{ current: ViewRef | null }>>();

export function CoachTarget({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<ViewRef | null>(null);
  useEffect(() => {
    const set = targets.get(id) ?? new Set();
    set.add(ref);
    targets.set(id, set);
    return () => { set.delete(ref); };
  }, [id]);
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}

/** Window rect of the first visible element registered under `id` (null when missing or off-screen). */
export async function measureCoachTarget(id: string): Promise<Rect | null> {
  const refs = [...(targets.get(id) ?? [])];
  const { width, height } = Dimensions.get('window');
  for (const r of refs) {
    const rect = await new Promise<Rect | null>((resolve) => {
      const node = r.current;
      if (!node?.measureInWindow) { resolve(null); return; }
      const t = setTimeout(() => resolve(null), 400);
      node.measureInWindow((x, y, w, h) => { clearTimeout(t); resolve(w && h ? { x, y, w, h } : null); });
    });
    // visible = mostly on screen (hidden tabs measure off-screen or 0×0)
    if (rect && rect.x > -rect.w / 2 && rect.x + rect.w / 2 < width && rect.y >= 0 && rect.y + rect.h / 2 < height) return rect;
  }
  return null;
}
