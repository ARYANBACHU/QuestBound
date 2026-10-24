# Cross-team requests (append only; the Merge Agent applies or rejects each round)

Format:
## [INITIALS] short title
- What: exact change (file + diff or new export)
- Why: which feature needs it
- Status: open

## [EV] +1 AB's `demo` flag, plus optional response/recap extras
- What (`shared/types.ts`, all additive/optional):
  ```ts
  export interface GenerateStorylineRequest { fellowship_id: UUID; mode: 'first' | 'sequel'; demo?: boolean }
  export interface GenerateStorylineResponse {
    storyline_id: UUID;
    reused?: boolean; // a book was already active (mode 'first') or being written — same id returned
    serp?: { live: number; cached: number; stale: number; failed: number };
    adaptation?: { note: string; loved_types: string[]; skipped_types: string[]; callbacks: string[] } | null;
  }
  // BookRecap: add  serp?: { live: number; cached: number; stale: number; failed: number }
  ```
- Why: Task 6 instant demo book (already implemented server-side; `lib/api.ts` accepts `demo` via an intersection type
  until this lands). serp/adaptation feed the SerpApi pitch and the sequel "Muse noticed…" card.
- Status: open

## [EV] re: AD's React Compiler request — done on EV's side
- `lib/game.ts` now starts with `'use no memo'`, and `lib/mockStore.ts` writes are immutable (new arrays + rows via
  `patchMission/patchPage/addMessage/...`). MP may want the same directive in `lib/fellowship.ts` / `lib/chat.ts`.
- Status: done (EV files only)
