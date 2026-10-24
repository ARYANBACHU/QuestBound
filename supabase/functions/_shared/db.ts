// Owner: EV. Service-role client (bypasses RLS) + caller identity.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically into deployed edge functions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

/** Returns the calling user's id from the Authorization header, or null. */
export async function callerId(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/** Post a message into a fellowship's group chat (proclamation/system/wizard). */
export async function proclaim(
  fellowship_id: string,
  body: string,
  payload: Record<string, unknown> | null,
  kind: 'proclamation' | 'system' | 'wizard' = 'proclamation',
) {
  const { error } = await admin.from('messages').insert({ fellowship_id, user_id: null, kind, body, payload });
  if (error) console.error('[proclaim]', error.message);
}

/** Demo safety valve: secret DEMO_FORCE_PASS=1 makes every verification pass. */
export const DEMO_FORCE_PASS = Deno.env.get('DEMO_FORCE_PASS') === '1';
