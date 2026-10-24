# _dev — local test stack for the story engine (EV)

Runs the real edge functions against the real schema with **no keys and no Docker**:
Postgres 16 + PostgREST, plus `gateway.ts`, which stands in for Supabase (`/rest/v1`, `/auth/v1/user`,
`/storage/v1`, `/functions/v1/<name>`), the Meta Model API (`/llm/v1/...`) and SerpApi (`/serp/search.json`).
The fake LLM can misbehave on purpose (`messy` = wrong types/missing regions, `garbage` = non-JSON,
`slow` = 40 s, `down` = 503) to prove every fallback works.

```bash
cd supabase/functions/_dev
./dev.sh setup        # needs postgresql-16 installed; run as root (initdb runs as `postgres`)
./dev.sh start good   # or messy | garbage | slow | down
./dev.sh seed
./dev.sh loop demo    # plays all 24 missions (every proof type + gift handshake), checks page turns, recap, art, sequel
LLM_KEY= SERP_KEY= ./dev.sh start   # simulate missing secrets
```

Folders starting with `_` are not deployed by `supabase functions deploy`.
