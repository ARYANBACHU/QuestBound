// Owner: AD. U3/G3 adapter: ask Muse to paint a chapter that has no illustration yet.
// EV's G3 adds `paintChapter(pageId)` to lib/api.ts (edge function `paint-chapter`). Until it lands this adapter
// finds it at runtime; mock mode falls back to a stock painting after a short "Sage is painting…" beat.
// One request per page per session (in-flight + finished results are cached), so re-renders never re-paint.
import * as api from '@/lib/api';
import { USE_MOCKS } from '@/lib/env';
import { useEffect, useState } from 'react';

type PaintFn = (pageId: string) => Promise<unknown>;
const cache = new Map<string, Promise<string | null>>();

function urlFrom(r: unknown): string | null {
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object') {
    const o = r as Record<string, unknown>;
    const u = o.illustration_url ?? o.url ?? o.image_url ?? (o.page as Record<string, unknown> | undefined)?.illustration_url;
    return typeof u === 'string' ? u : null;
  }
  return null;
}

export function paintChapter(pageId: string): Promise<string | null> {
  let p = cache.get(pageId);
  if (p) return p;
  const fn = (api as unknown as Record<string, unknown>).paintChapter as PaintFn | undefined;
  p = (async () => {
    if (typeof fn === 'function') return urlFrom(await fn(pageId));
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 1800));
      return `https://picsum.photos/seed/questbound-paint-${pageId}/1000/1400`;
    }
    return null; // real mode without the engine's paint function: the coloring page stays the hero
  })().catch(() => {
    cache.delete(pageId); // let a later visit try again
    return null;
  });
  cache.set(pageId, p);
  return p;
}

/** The chapter's painting: the stored one, else ask Sage to paint it (only for finished chapters). */
export function useChapterPainting(pageId: string, stored: string | null, canPaint: boolean) {
  const [url, setUrl] = useState<string | null>(stored);
  const [painting, setPainting] = useState(false);
  useEffect(() => {
    if (stored) { setUrl(stored); setPainting(false); return; }
    setUrl(null);
    if (!canPaint) return;
    let alive = true;
    setPainting(true);
    paintChapter(pageId).then((u) => {
      if (!alive) return;
      setUrl(u);
      setPainting(false);
    });
    return () => { alive = false; };
  }, [pageId, stored, canPaint]);
  return { url, painting };
}
