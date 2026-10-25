-- 0005_v1.sql — V1 final round: per-book location enforcement.
-- geo_enforced = false (e.g. the UT Campus Demo) → missions show distance but never block on location.
-- Idempotent: safe to re-run.

alter table public.storylines
  add column if not exists geo_enforced boolean not null default true;
