// Owner: AD. Sound effects for AD's screens — all through AB's helper (preloaded, honors Settings → Sound effects).
// [MERGE] round 3: AB's helper now rewinds before every replay (the B6 "silent 2nd flip" bug) and ships a dedicated
// 'pageBack' sound, so page turns use playSfx('page' | 'pageBack') again instead of a fresh one-shot player.
export { playSfx, type SfxName } from '@/components/shell/sfx';
