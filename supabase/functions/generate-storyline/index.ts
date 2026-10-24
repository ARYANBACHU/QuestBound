// Owner: EV. POST { fellowship_id, mode: 'first' | 'sequel' } -> { storyline_id }
// Full spec: handoffs/EV.md §3. This stub only validates input so the client can wire up.
import { preflight, json, fail } from '../_shared/cors.ts';
import { callerId } from '../_shared/db.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);
  const { fellowship_id, mode } = await req.json().catch(() => ({}));
  if (!fellowship_id) return fail('fellowship_id required');
  // TODO(EV): implement per handoffs/EV.md
  return json({ error: 'not implemented', fellowship_id, mode }, 501);
});
