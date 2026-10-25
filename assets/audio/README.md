# Questbound audio

All sounds here are **original**, synthesized from scratch for Questbound (no samples, no third-party
recordings) and released under **CC0 1.0 (public domain)**.

| File | What | Used by |
|---|---|---|
| `bards-loop.mp3` | "The Fellowship's Lute" — lute plucks + recorder + drone in D dorian, 34 s seamless loop | background music (`components/shell/music.tsx`) |
| `sfx/ping.wav` | soft glassy chime, 140 ms | Sage speaks (`playSfx('ping')`) |
| `sfx/crayon.wav` | waxy crayon scribble, 1.1 s | a region gets colored (`playSfx('crayon')`) |
| `sfx/page.wav` | paper swish + flap, 0.6 s | page turn (`playSfx('page')`) |
| `sfx/seal.wav` | wax thump + little gold chime, 0.5 s | mission sealed (`playSfx('seal')`) |
| `sfx/tap.wav` | tiny soft wooden tick, 45 ms | every button tap (default for `<Button>`) |
| `sfx/toggle.wav` | two quick rising blips, 90 ms | switches, chips, music toggle |
| `sfx/open.wav` | airy rising swish + soft chime, 240 ms | sheets, menus, Sage, mission cards |
| `sfx/close.wav` | the same swish, falling, 190 ms | closing sheets / menus / Sage |
| `sfx/send.wav` | quick upward "fwip", 170 ms | submit proof, ask Sage, chat send |
| `sfx/success.wav` | bell arpeggio C6 E6 G6, 0.5 s | saved, book written, posted |
| `sfx/error.wav` | gentle muted two-note fall, 0.3 s | errors and "not quite" verdicts |
| `sfx/reward.wav` | whoosh + sparkling rising arpeggio, 1 s | reward pack bursting open |
| `sfx/pageBack.wav` | page swish played backwards, 0.55 s | flipping back a page |

Regenerate with `python3 assets/audio/synth.py <out-dir>` and `python3 assets/audio/synth_r3.py assets/audio/sfx` (needs numpy), then
`ffmpeg -i <out-dir>/bards.wav -codec:a libmp3lame -b:a 96k assets/audio/bards-loop.mp3`.
