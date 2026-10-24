// Owner: AB. POST WizardChatRequest -> WizardChatResponse. Full spec: handoffs/AB.md §7.
import { preflight, json, fail } from '../_shared/cors.ts';
import { callerId } from '../_shared/db.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const uid = await callerId(req);
  if (!uid) return fail('Not signed in', 401);
  // TODO(AB): implement per handoffs/AB.md
  return json({ reply: 'The Wizard is still brewing his tea. Ask again soon!', actions: [] });
});
