// Owner: AD. Local no-op stand-in for AB's components/shell/sfx.ts (same signature). When AB's helper lands on
// main, replace this file's body with: export { playSfx } from '@/components/shell/sfx';
export type SfxName = 'ping' | 'crayon' | 'page' | 'seal';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function playSfx(_name: SfxName): void {
  // no-op until AB's preloaded expo-audio helper (respects the "Sound effects" setting) reaches main
}
