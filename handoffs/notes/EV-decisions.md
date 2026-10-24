# EV decisions log

- **Meta Model API shape (from dev.meta.ai docs, not smoke-tested — no key yet):** base `https://api.meta.ai/v1`,
  `POST /chat/completions` (OpenAI-compatible, stateless). Structured output is
  `response_format: {type:'json_schema', json_schema:{name, schema}}` — there is NO `json_object` mode, so `llm.ts`
  sends json_schema. `reasoning_effort` is top-level (`minimal|low|medium|high|xhigh`; `none` = 400). We default to
  `minimal` for latency. Images: `{type:'image_url', image_url:{url}}` parts, **user messages only**.
  Image gen: `POST /images/generations` `{model:'muse-image-1.0', prompt, n, size, response_format:'b64_json', output_format:'png'}`
  -> `data[0].b64_json`. Newer text model ids exist (`muse-spark-1.3`); `LLM_MODEL` secret picks it.
- **Defensive LLM client:** if the API rejects optional params (400/422), `chat()` retries once with only
  `{model, messages}`. `HAS_LLM=false` (no key) skips straight to deterministic fallbacks — no waiting on timeouts.
- **SerpApi:** fresh cache (12 h) -> live (10 s timeout) -> **stale cache of any age** -> throw. Maps `ll` coords are
  rounded to 3 decimals so nearby fellowships share cache. Lens also reads `knowledge_graph` titles first.
  `serpStats` is reset per request (module state survives between requests in an isolate).
- **Storyline generation is split for speed:** 1 outline call, then all chapters' missions in parallel (one call each).
  A 24-mission single JSON blob would blow the 30 s budget. Each chapter falls back independently.
- **required_members enforcement is capped at the fellowship size** in submit-proof so a 1–2 person test group can
  still finish pages (stored value still follows the size rule, min 2 for gatherings).
