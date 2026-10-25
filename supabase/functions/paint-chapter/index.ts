// Owner: EV. Round 3 G3: on-demand chapter paintings (Muse Image). Every finished chapter gets one.
//   POST { page_id }       -> { page_id, illustration_url, cached }        paint one completed page (or return its art)
//   POST { storyline_id }  -> { pages: [{ page_id, illustration_url, cached }] }  back-fill every completed page of a book
// submit-proof already paints a page in the background when it completes; this fills the gaps (older books, a failed
// paint, a phone that opened the Storybook before the background paint finished). Concurrent callers share one painting.
// Only completed pages are painted: an unfinished chapter isn't a story yet. Takes ~10–40 s when it has to paint.
import { preflight, json, fail } from '../_shared/cors.ts';
import { admin, callerId } from '../_shared/db.ts';
import { HAS_LLM } from '../_shared/llm.ts';
import { paintChapter } from '../_shared/progress.ts';
import { memberCtx, type MemberCtx, type Page, type Profile } from '../_shared/types.ts';

interface Painted { page_id: string; illustration_url: string | null; cached: boolean }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const t0 = Date.now();
  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);
  const body = await req.json().catch(() => ({}));
  const pageId: string | undefined = typeof body.page_id === 'string' ? body.page_id : undefined;
  const storylineId: string | undefined = typeof body.storyline_id === 'string' ? body.storyline_id : undefined;
  if (!pageId && !storylineId) return fail('page_id or storyline_id required');

  // Load the page(s) + their book (for the fellowship) in one go.
  let pages: Page[] = [];
  if (pageId) {
    const { data } = await admin.from('pages').select('*').eq('id', pageId).maybeSingle<Page>();
    if (!data) return fail('That chapter has vanished from the book. Pull to refresh.', 404);
    pages = [data];
  } else {
    const { data } = await admin.from('pages').select('*').eq('storyline_id', storylineId!).order('chapter_number');
    pages = (data ?? []) as Page[];
    if (!pages.length) return fail('That book has no chapters yet.', 404);
  }
  const { data: book } = await admin.from('storylines').select('id, fellowship_id').eq('id', pages[0].storyline_id).maybeSingle();
  if (!book) return fail('That book is missing. Pull to refresh.', 404);
  const { data: memberRows } = await admin.from('fellowship_members').select('user_id, profile:profiles(*)').eq('fellowship_id', book.fellowship_id);
  const members: MemberCtx[] = (memberRows ?? [])
    .map((r: { profile: Profile | Profile[] | null }) => (Array.isArray(r.profile) ? r.profile[0] : r.profile))
    .filter((p: Profile | null): p is Profile => !!p)
    .map(memberCtx);
  if (!members.some((m) => m.user_id === uid)) return fail('Only members of this fellowship can open its storybook.', 403);

  if (pageId && pages[0].status !== 'complete' && !pages[0].illustration_url) {
    return fail('Sage paints a chapter once every region is colored. Finish this page first!', 409);
  }
  if (!HAS_LLM && pages.every((p) => !p.illustration_url)) {
    return fail('Sage\'s paints are packed away right now (no image model). Try again later.', 503);
  }

  // At most 4 paintings at once (a 4-chapter book back-fills in one round).
  const todo = pages.filter((p) => p.status === 'complete' || p.illustration_url);
  const results: Painted[] = await Promise.all(todo.slice(0, 4).map(async (p): Promise<Painted> => {
    if (p.illustration_url) return { page_id: p.id, illustration_url: p.illustration_url, cached: true };
    const url = await paintChapter(p, book.fellowship_id, members).catch((e) => {
      console.error('[paint-chapter]', p.id, String(e));
      return null;
    });
    return { page_id: p.id, illustration_url: url, cached: false };
  }));
  console.log('[paint-chapter]', JSON.stringify({ pages: results.length, painted: results.filter((r) => !r.cached && r.illustration_url).length, ms: Date.now() - t0 }));

  if (pageId) {
    const r = results[0];
    if (!r?.illustration_url) return fail('The paint smudged. Tap to try again.', 502);
    return json(r);
  }
  return json({ pages: results });
});
