-- 0004_round3.sql — Round 3: 20 coloring-page templates (shared/templates.ts).
-- Replaces the pages.template_id CHECK (0001 allowed only the 4 classics). Idempotent: safe to re-run.

do $$
declare c record;
begin
  -- drop whatever CHECK currently guards pages.template_id (0001 created it inline → pages_template_id_check)
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'pages' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%template_id%'
  loop
    execute format('alter table public.pages drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.pages add constraint pages_template_id_check check (template_id in (
    'castle_gate',
    'enchanted_forest',
    'dragon_peak',
    'royal_feast',
    'mermaid_lagoon',
    'witch_cottage',
    'beanstalk_sky',
    'fairy_glen',
    'ice_palace',
    'pirate_cove',
    'candy_village',
    'starlit_tower',
    'troll_bridge',
    'cloud_kingdom',
    'crystal_cave',
    'owl_library',
    'rose_garden',
    'lantern_festival',
    'swamp_hollow',
    'unicorn_meadow'
));

-- verify:
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'pages_template_id_check';
