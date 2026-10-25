-- QUESTBOUND round 2 (merge agent). Additive only; safe to re-run.
-- AB A1: "Shall the bards play?" music toggle. EV E2: book difficulty (easy / normal / hard).

alter table public.profiles
  add column if not exists music_enabled boolean not null default true;

alter table public.storylines
  add column if not exists difficulty text not null default 'normal';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'storylines_difficulty_check' and conrelid = 'public.storylines'::regclass
  ) then
    alter table public.storylines
      add constraint storylines_difficulty_check check (difficulty in ('easy', 'normal', 'hard'));
  end if;
end $$;
