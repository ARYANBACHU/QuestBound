# Cross-team requests (append only; the Merge Agent applies or rejects each round)

Format:
## [INITIALS] short title
- What: exact change (file + diff or new export)
- Why: which feature needs it
- Status: open

## [MP] Add `profiles` (and `fellowships`) to the realtime publication
- What: new migration `supabase/migrations/0002_mp_realtime.sql`:
  ```sql
  alter publication supabase_realtime add table public.profiles;
  alter publication supabase_realtime add table public.fellowships;
  ```
- Why: Friends tab / member list updates live when a friend changes their crest, color or name (onboarding
  happens right after joining, so B shows up as "Wanderer 🦉" on A's phone until a refresh otherwise).
  `lib/fellowship.ts` already subscribes; it's a no-op until this lands.
- Status: open
