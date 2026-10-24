# Cross-team requests (append only; the Merge Agent applies or rejects each round)

Format:
## [INITIALS] short title
- What: exact change (file + diff or new export)
- Why: which feature needs it
- Status: open

## [AB] `demo` flag on GenerateStorylineRequest
- What: `shared/types.ts` → `export interface GenerateStorylineRequest { fellowship_id: UUID; mode: 'first' | 'sequel'; demo?: boolean }`
  (mirror in `supabase/functions/_shared/types.ts`).
- Why: Demo Tools "Summon instant demo book" (AB) → EV's instant demo book (EV.md Task 6). AB currently casts.
- Status: open
