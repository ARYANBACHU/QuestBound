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
