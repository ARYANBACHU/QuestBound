# ROUND 3 PREP — what landed on `main` before Round 3

Each agent: `git fetch origin && git merge origin/main` before starting Round 3. The plan is
`handoffs/notes/ROUND-3-PLAN.md`.

## Contracts changed
- **`shared/templates.ts` — 20 templates** (4 classics kept, same ids). The 16 new scenes: mermaid_lagoon,
  witch_cottage, beanstalk_sky, fairy_glen, ice_palace, pirate_cove, candy_village, starlit_tower, troll_bridge,
  cloud_kingdom, crystal_cave, owl_library, rose_garden, lantern_festival, swamp_hollow, unicorn_meadow.
  Every template has 6 regions, in order: 1 large, 2 medium, 3 small. **Region ids are unique across all 20.**
  New exports: `TEMPLATE_IDS`, `CLASSIC_TEMPLATES`, `isTemplateId()`. `DEFAULT_CHAPTER_TEMPLATES` is now only the
  fallback order (the 4 classics); see its doc comment for the G2 rule.
- **Deno mirror** `supabase/functions/_shared/types.ts`: `TemplateId`, `TEMPLATE_REGIONS`, `TEMPLATE_META` match
  `/shared` exactly (checked by script). New export `CLASSIC_TEMPLATE_IDS`.
- **`shared/theme.ts` — no more white.** `ink.paper` = `#F5E6EA` (soft peach-lavender blush), `ink.lavenderMist`
  = `#EADFF5`, mood `tint` / `tintStrong` are real colors, `SCREEN_GRADIENTS` have no white stop,
  `panel.parchment` = `#FFF4E4`, `scrim.paper*` match the new paper. `ink.muted` darkened to `#625B80` so hint text
  stays AA on the tints. `ink.page` stays white (only the coloring page itself). `MOOD_FOR_TEMPLATE` covers all 20
  ids (still 4 moods). There were no plaid/grid tokens in theme.
- **Migration `supabase/migrations/0004_round3.sql`**: replaces the `pages.template_id` CHECK with the 20 ids
  (idempotent).

## ⚠️ Migration NOT applied yet
This merge session could not reach `api.supabase.com` (blocked by the environment's network policy, no access
token). Until it runs, **any page insert with a new template id fails** in real mode. Repo owner: paste
`supabase/migrations/0004_round3.sql` into the Supabase SQL editor for project `jhqkjfhtekermlbnqtxe`, then verify:
`select pg_get_constraintdef(oid) from pg_constraint where conname = 'pages_template_id_check';` (lists 20 ids).
Nothing breaks before then: the engine still only picks the 4 classics.

## Integration fix (AD's folder)
- `assets/pages/placeholder.ts` + `assets/pages/index.ts`: `PAGE_ART` now fills any undrawn id with a simple
  storybook placeholder frame (3 small circles, 2 medium panels, 1 large hill). Without it, main didn't typecheck
  and the `__DEV__` art validator would throw at boot. AD: replace per id as art lands (U2); MP's pages go in
  `assets/pages/set-mp/`.

## Per owner, before Round 3 work
- **EV:** `_shared/book.ts` has `FALLBACK` and `FALLBACK_CHAPTER_TEXT` typed `Record<TemplateId, …>` with only the
  4 classics → Deno type errors now, and a runtime crash if a new template ever reaches `fallbackMission`. Add
  fallback missions + chapter text for all 16 as part of G1/G2, before the engine picks new templates.
  `generate-storyline/index.ts` still hard-codes the 4 classics (lines ~97 and ~281) — that's G2.
- **AD:** the "plaid" look is the crossing hatch `Pattern`s in `components/coloring/ColoringPage.tsx` (`washTex`
  + per-crayon `tex*` stripes at −28°/−32°). Replace with a soft wash / crayon grain as part of U1 / U8.
- **Everyone (U8):** screens that hard-code `ink.paper` or `ink.page` as a screen background should switch to the
  mood `SCREEN_GRADIENTS` / `MOODS[*].tint`; `ink.page` is for the coloring page only.
