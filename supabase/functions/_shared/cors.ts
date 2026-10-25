// Owner: EV. Shared HTTP helpers for all edge functions.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

export function fail(message: string, status = 400): Response {
  console.error('[fail]', status, message);
  return json({ error: message }, status);
}

/** A friendly error with a machine-readable `code` the app can route on (e.g. 'no_fellowship' → create/join). */
export function failCode(message: string, status: number, code: string): Response {
  console.error('[fail]', status, code, message);
  return json({ error: message, code }, status);
}

/**
 * V1: wrap a handler so an unexpected throw (bad JSON, DB hiccup, a bug) is never a bare 500. The app gets Sage's
 * friendly text + code 'retry' (503 = "try again"), and the logs keep the real error.
 */
export function safe(name: string, handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      return await handler(req);
    } catch (e) {
      console.error(`[${name}] unhandled`, e instanceof Error ? e.stack ?? e.message : String(e));
      return json({ error: 'Sage dropped the quill. Give it a moment and try again.', code: 'retry' }, 503);
    }
  };
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
