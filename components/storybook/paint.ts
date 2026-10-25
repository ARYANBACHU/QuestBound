// Owner: AD. U3/G3 adapter: ask Muse to paint a chapter that has no illustration yet.
// [MERGE] round 3: wired straight to EV's `paintChapter(pageId)` (lib/api → edge function `paint-chapter`, 10–40 s
// when it has to paint; mock mode paints a stock image). One request per page per session (in-flight + finished
// results are cached), so re-renders never re-paint.
import { paintChapter as enginePaint } from '@/lib/api';
import { useEffect, useState } from 'react';

const cache = new Map<string, Promise<string | null>>();

export function paintChapter(pageId: string): Promise<string | null> {
  let p = cache.get(pageId);
  if (p) return p;
  p = (async () => (await enginePaint(pageId)).illustration_url ?? null)().catch(() => {
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
