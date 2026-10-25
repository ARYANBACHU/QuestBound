// Owner: AD. Round 2: EV's real hooks landed in lib/game.ts — this file just re-exports them.
// useCompletions returns CompletionEntry (extends Completion; adds `mission` + `verse` for bard missions).
export { usePages, useCompletions, type CompletionEntry } from '@/lib/game';
