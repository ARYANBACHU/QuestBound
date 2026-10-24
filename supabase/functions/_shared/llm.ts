// Owner: EV. OpenAI-compatible client pointed at Meta Model API (Muse). Swappable via secrets.
// Secrets: LLM_API_KEY (required), LLM_BASE_URL (default Meta), LLM_MODEL, IMAGE_MODEL.
//
// Built against dev.meta.ai docs (Oct 2026):
//  - POST {BASE}/chat/completions, Authorization: Bearer <key>. Stateless, OpenAI messages array.
//  - Images go in `user` messages only, as {type:'image_url', image_url:{url}} (public URL or data: URL).
//  - Structured output = response_format {type:'json_schema', json_schema:{name, schema}} (no json_object mode).
//  - reasoning_effort: 'minimal'|'low'|'medium'|'high'|'xhigh' ('none' is a 400 on Muse Spark). Lower = faster.
//  - POST {BASE}/images/generations {model:'muse-image-1.0', prompt, n, size, response_format, output_format}
//    -> data[0].b64_json (default) or .url. Default output is webp; we ask for png.
// If any optional param is rejected (HTTP 400), we retry once with only {model, messages} so the demo survives.
const BASE = (Deno.env.get('LLM_BASE_URL') ?? 'https://api.meta.ai/v1').replace(/\/+$/, '');
const KEY = Deno.env.get('LLM_API_KEY') ?? '';
const MODEL = Deno.env.get('LLM_MODEL') ?? 'muse-spark-1.1';
const IMAGE_MODEL = Deno.env.get('IMAGE_MODEL') ?? 'muse-image-1.0';

/** False when no key is configured: callers skip straight to their deterministic fallback. */
export const HAS_LLM = KEY.length > 0;

export type ChatContent =
  | string
  | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[];
export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: ChatContent }

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export interface ChatOpts {
  temperature?: number;
  timeoutMs?: number;
  reasoning?: ReasoningEffort; // default 'minimal' (we care about latency more than depth)
  maxTokens?: number;
  /** JSON Schema for structured output. Pass `true` for "any JSON object". */
  schema?: Record<string, unknown> | true;
  schemaName?: string;
}

async function post(body: Record<string, unknown>, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } finally {
    clearTimeout(t);
  }
}

export async function chat(messages: ChatMsg[], opts: ChatOpts = {}): Promise<string> {
  if (!HAS_LLM) throw new Error('LLM_API_KEY not set');
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const minimal = { model: MODEL, messages };
  const full: Record<string, unknown> = {
    ...minimal,
    temperature: opts.temperature ?? 0.8,
    reasoning_effort: opts.reasoning ?? 'minimal',
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.schema
      ? {
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: opts.schemaName ?? 'muse_output',
              schema: opts.schema === true ? { type: 'object', additionalProperties: true } : opts.schema,
            },
          },
        }
      : {}),
  };
  let res = await post(full, timeoutMs);
  if (res.status === 400 || res.status === 422) {
    // An optional param was rejected. Retry bare (the prompt itself still asks for JSON).
    console.warn('[llm] optional params rejected, retrying bare:', (await res.text()).slice(0, 300));
    res = await post(minimal, Math.max(3_000, timeoutMs - (Date.now() - started)));
  }
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  // Some providers return content parts.
  if (Array.isArray(content)) return content.map((p: { text?: string }) => p.text ?? '').join('');
  return '';
}

/** Ask for JSON and parse defensively (strips ``` fences, grabs outermost {...}). */
export async function chatJSON<T>(messages: ChatMsg[], opts: ChatOpts = {}): Promise<T> {
  const raw = await chat(messages, { ...opts, schema: opts.schema ?? true });
  return parseJSON<T>(raw);
}

export function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON in model output: ${raw.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Run a promise with a hard timeout; resolves to `fallback` on timeout or error. Never throws. */
export async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T, label = 'task'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[timeout] ${label} after ${ms}ms`);
          resolve(fallback);
        }, ms);
      }),
    ]);
  } catch (e) {
    console.warn(`[error] ${label}:`, String(e));
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** Muse Image. Returns a URL or base64 data; caller uploads base64 to the 'art' bucket. */
export async function generateImage(
  prompt: string,
  opts: { size?: string; timeoutMs?: number } = {},
): Promise<{ url?: string; b64?: string; mime: string } | null> {
  if (!HAS_LLM) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 90_000);
  try {
    const res = await fetch(`${BASE}/images/generations`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: opts.size ?? '1024x1024',
        response_format: 'b64_json',
        output_format: 'png',
      }),
    });
    if (!res.ok) throw new Error(`IMG ${res.status}: ${(await res.text()).slice(0, 500)}`);
    const data = await res.json();
    const item = data.data?.[0] ?? {};
    const fmt = (data.output_format as string | undefined) ?? 'png';
    return { url: item.url, b64: item.b64_json, mime: `image/${fmt === 'jpg' ? 'jpeg' : fmt}` };
  } catch (e) {
    console.error('[generateImage]', String(e));
    return null;
  } finally {
    clearTimeout(t);
  }
}
