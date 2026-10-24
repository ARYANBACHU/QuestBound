// Owner: EV. POST SubmitProofRequest -> SubmitProofResponse. Full spec: handoffs/EV.md §4.
import { preflight, json, fail } from '../_shared/cors.ts';
import { callerId } from '../_shared/db.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);
  const body = await req.json().catch(() => ({}));
  if (!body.mission_id) return fail('mission_id required');
  // TODO(EV): implement per handoffs/EV.md
  return json({ error: 'not implemented' }, 501);
});
