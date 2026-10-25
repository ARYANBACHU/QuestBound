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

Regenerate with `python3 assets/audio/synth.py <out-dir>` (needs numpy), then
`ffmpeg -i <out-dir>/bards.wav -codec:a libmp3lame -b:a 96k assets/audio/bards-loop.mp3`.
