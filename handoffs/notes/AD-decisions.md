# AD decisions (round 2)
- Mission complete = scribble + settle + small sparkle only (no confetti): UI REVAMP's "one animation at a time" overrides
  UI UPGRADE's confetti-on-every-mission. Confetti plays after page turns and when the whole book completes.
- Chapter header narrative clamps to ONE line (P5 "header = title + one line + progress"); Read more expands. The Storybook
  reader clamps at 3 lines since it's a reading view.
- 100% coloring uses a mood wash over the whole inner picture area under the regions (no per-template sky/ground paths):
  guarantees zero white at 6/6 on every template without re-authoring art.
- Page flip direction: forward = current page turns away from the right edge; back = the previous page turns back in. Both
  pivot on the left spine, matching a real book.
- Mock-only verses: `useCompletions` stand-in gives colored bard missions a demo verse so the verse card is demoable.
- Built my own chunky `InkButton` on the shared gameButton tokens instead of waiting for AB's restyle, same props as AB's Button.

# AD decisions (round 3)
- B2: a book's shelf state comes from its pages only: all pages colored = "Finished ✦"; otherwise, storyline status
  'complete' or recap.abandoned = "Set aside · Chapter N of M"; else "Chapter N of M · X colored". `storyline.status`
  alone is never trusted (a replaced book is also 'complete'). Set-aside books end on Sage's bookmark recap (no "The End",
  no sequel button). The Coloring tab's "book done" also derives from pages.
- B3: the montage has ONE clock (shared value = slide index + progress); bars read it on the UI thread, every start
  bumps a token so stale timers can't advance. 5 s photos / 3 s title cards. Crossfade = previous slide kept underneath
  + FadeIn on the new one (no exiting layout animations inside the Modal — those were the "buggy" part on Android).
  Releasing a hold never skips.
- B6: page sounds use a fresh one-shot player per flip (AB's shared players can go silent on replay). Back flips play
  page.wav at 0.86× as 'pageBack' until AB ships a dedicated sound.
- U1: the crayon texture is a deterministic speck "grain" (paper tooth through wax) + a darker pressed-edge rim — no
  lines at all, so nothing can read as plaid. The wash's hatch texture is removed (plain mood wash).
- U1/U4: fills that happen while the Coloring tab isn't focused (mission screen on top, another tab) are queued: the
  region stays blank and the full reveal plays ~0.4 s after you land back on the page. Page turns and the book party
  wait the same way. So after AB's pack-opening, you return and watch your color go in.
- U2: added an optional `scenery` layer to PageArt (closed shapes under the regions, filled with the two mood tones,
  pale at first and rich at 6/6). Regions stay the only crayon-colored shapes. Art was drawn with a headless preview
  renderer (blank + all-colored side by side) and parallel helpers, then reviewed per page.
- U3: one chapter view in the reader: painting hero → "Your coloring page" thumbnail row (tap to see it full size) →
  tale entries. Unfinished chapters keep the coloring page as hero ("Sage paints this chapter once every region is
  colored"). `components/storybook/paint.ts` finds EV's `paintChapter` at runtime, so nothing breaks before G3 lands.
- U3 montage mark: a little reel unspooling from a book with a gold play notch + spark; label in Fraunces italic
  (14 / 18 pt) — reads as special without being another big button.
