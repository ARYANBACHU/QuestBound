// Owner: AD. Sound effects for AD's screens. Everything goes through AB's helper (preloaded, honors Settings →
// Sound effects) EXCEPT the page turns:
//  B6 — a reused player only reliably sounds the first time (seekTo(0) is async, so play() can start at the end and
//  stay silent; that's the "back flip has no sound" bug, since back is usually the 2nd flip). Page turns get a fresh
//  one-shot player each time, so every flip — forward or back — always plays.
//  'pageBack' is the same paper sound, pitched a little lower, until AB's U7 ships a dedicated pageBack sound.
import { createAudioPlayer } from 'expo-audio';
import { ensureAudioMode, playSfx as baseSfx, type SfxName as BaseSfx } from '@/components/shell/sfx';
import { getSoundSettings } from '@/components/shell/soundSettings';

export type SfxName = BaseSfx | 'pageBack';

const PAGE_WAV = require('@/assets/audio/sfx/page.wav');
const PAGE_VOLUME = 0.5;
const ONE_SHOT_MS = 2500; // page.wav is well under this; release the player afterwards
let lastPage = 0;

function pageTurn(back: boolean) {
  try {
    if (!getSoundSettings().sfx) return;
    const now = Date.now();
    if (now - lastPage < 120) return; // one sound per action, even if two flips fire together
    lastPage = now;
    ensureAudioMode();
    const p = createAudioPlayer(PAGE_WAV);
    p.volume = PAGE_VOLUME;
    if (back) {
      p.shouldCorrectPitch = false;
      p.setPlaybackRate(0.86); // a touch lower and slower: the page settling back down
    }
    p.play();
    setTimeout(() => { try { p.remove(); } catch {} }, ONE_SHOT_MS);
  } catch {
    // sound is a garnish — never break the app over it
  }
}

export function playSfx(name: SfxName) {
  if (name === 'page' || name === 'pageBack') return pageTurn(name === 'pageBack');
  baseSfx(name);
}
