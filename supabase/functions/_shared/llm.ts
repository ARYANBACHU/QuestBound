// Owner: EV. OpenAI-compatible client pointed at Meta Model API (Muse). Swappable via secrets.
// Secrets: LLM_API_KEY (required), LLM_BASE_URL (default Meta), LLM_MODEL, IMAGE_MODEL.
// VERIFY base URL + model ids against dev.meta.ai docs in the first 10 minutes.
const BASE = Deno.env.get('LLM_BASE_URL') ?? 'https://api.meta.ai/v1';
const KEY = Deno.env.get('LLM_API_KEY') ?? '';
const MODEL = Deno.env.get('LLM_MODEL') ?? 'muse-spark-1.1';
const IMAGE_MODEL = Deno.env.get('IMAGE_MODEL') ?? 'muse-image-1.0';

export type ChatContent =
  | string
  | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[];
export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: ChatContent }

export async function chat(
  messages: ChatMsg[],
  opts: { json?: boolean; temperature?: number; timeoutMs?: number } = {},
): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45_000);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: opts.temperature ?? 0.8,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(t);
  }
}

/** Ask for JSON and parse defensively (strips ``` fences, grabs outermost {...}). */
export async function chatJSON<T>(messages: ChatMsg[], opts: { temperature?: number; timeoutMs?: number } = {}): Promise<T> {
  let raw = '';
  try {
    raw = await chat(messages, { ...opts, json: true });
  } catch (e) {
    // Some providers reject response_format; retry without it.
    console.warn('[chatJSON] retry without response_format', String(e));
    raw = await chat(messages, opts);
  }
  return parseJSON<T>(raw);
}

export function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON in model output: ${raw.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Muse Image. Returns a URL or base64 data; caller uploads base64 to the 'art' bucket. */
export async function generateImage(prompt: string): Promise<{ url?: string; b64?: string } | null> {
  try {
    const res = await fetch(`${BASE}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt, n: 1, size: '1024x1024' }),
    });
    if (!res.ok) throw new Error(`IMG ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const item = data.data?.[0] ?? {};
    return { url: item.url, b64: item.b64_json };
  } catch (e) {
    console.error('[generateImage]', String(e));
    return null;
  }
}
