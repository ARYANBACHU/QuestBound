# EV status

## Environment
- Meta + SerpApi keys are **not available yet** → smoke tests skipped; code is built against the documented APIs
  (see EV-decisions.md). No `SUPABASE_ACCESS_TOKEN` in this environment → functions not deployed from here.
- Everything degrades gracefully with no keys: storyline uses the deterministic fallback book; proofs pass with
  confidence 0.5 (never block a group on an outage).

## Done
- Task 0: `_shared/llm.ts` adapted to Meta docs; `_shared/serp.ts` hardened (timeouts, stale cache).
- Task 1: `_shared/prompts.ts` (MUSE_PERSONA + every prompt), `_shared/interests.ts` (interest -> query map).

## In progress
- Task 2 generate-storyline

## Notes for teammates
- AB: `import { MUSE_PERSONA } from '../_shared/prompts.ts'` and `chatJSON` from `../_shared/llm.ts` in wizard-chat.
