# Round 3 UI sounds for Questbound — original, procedurally synthesized, released CC0 by the team.
# python3 assets/audio/synth_r3.py assets/audio/sfx   (needs numpy)
import numpy as np, wave, sys, os
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(11)

def save(name, x, peak_to=0.89):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) or 1) * peak_to
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def t(d): return np.arange(int(d * SR)) / SR
def lowpass(x, a):
    y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x):
        s += a * (v - s); y[i] = s
    return y
def fade(x, fin=0.002, fout=0.02):
    n = len(x); a = max(1, int(fin * SR)); b = max(1, int(fout * SR))
    e = np.ones(n); e[:a] = np.linspace(0, 1, a); e[n-b:] = np.linspace(1, 0, b); return x * e
def bell(f, d, decay=10, at=0.0, total=None):
    total = total or d + at
    out = np.zeros(int(total * SR)); tt = t(d)
    tone = (np.sin(2*np.pi*f*tt) + 0.35*np.sin(2*np.pi*f*2.01*tt) + 0.12*np.sin(2*np.pi*f*3.02*tt)) * np.exp(-tt*decay)
    s = int(at * SR); out[s:s+len(tone)] += tone[:len(out)-s]; return out
def chirp(f0, f1, d):
    tt = t(d); f = np.linspace(f0, f1, len(tt)); ph = 2*np.pi*np.cumsum(f)/SR; return np.sin(ph)
def hiss(d, a_lo=0.05, a_hi=0.3):
    n = rng.standard_normal(int(d*SR)); return lowpass(n - lowpass(n, a_lo), a_hi)

# tap — tiny soft wooden tick, 45 ms
tt = t(0.045)
tap = np.sin(2*np.pi*1650*tt)*np.exp(-tt*140) + 0.5*lowpass(rng.standard_normal(len(tt)), 0.4)*np.exp(-tt*300)
save('tap.wav', fade(tap, 0.0005, 0.01), 0.7)

# toggle — two quick rising blips, 90 ms
tog = np.zeros(int(0.09*SR))
for f, at in ((1180, 0.0), (1580, 0.04)):
    b = t(0.045); blip = np.sin(2*np.pi*f*b)*np.exp(-b*90); s = int(at*SR); tog[s:s+len(blip)] += blip
save('toggle.wav', fade(tog, 0.0005, 0.01), 0.7)

# open — airy rising swish + soft chime, 240 ms
d = 0.24; tt = t(d)
sw = hiss(d, 0.04, 0.25) * np.sin(np.pi*np.clip(tt/d, 0, 1))**2 * 0.5
op = sw + 0.6*chirp(660, 990, d)*np.exp(-((tt-0.12)/0.08)**2) + bell(1318.5, 0.14, 18, 0.1, d)*0.5
save('open.wav', fade(op, 0.003, 0.04), 0.75)

# close — the same, falling, 190 ms
d = 0.19; tt = t(d)
sw = hiss(d, 0.04, 0.2) * np.sin(np.pi*np.clip(tt/d, 0, 1))**2 * 0.5
cl = sw + 0.6*chirp(880, 520, d)*np.exp(-((tt-0.07)/0.07)**2)
save('close.wav', fade(cl, 0.003, 0.04), 0.7)

# send — quick upward "fwip" + tiny tick, 170 ms
d = 0.17; tt = t(d)
se = chirp(520, 1900, d)*np.exp(-((tt-0.06)/0.05)**2) + hiss(d, 0.1, 0.4)*np.exp(-((tt-0.05)/0.04)**2)*0.4
save('send.wav', fade(se, 0.002, 0.03), 0.72)

# success — little bell arpeggio C6 E6 G6, 520 ms
d = 0.52
su = bell(1046.5, 0.3, 9, 0.0, d) + bell(1318.5, 0.3, 9, 0.08, d) + 1.1*bell(1568, 0.36, 7, 0.16, d)
save('success.wav', fade(su, 0.002, 0.06), 0.8)

# error — gentle muted two-note fall (E4 → C4), 300 ms, never harsh
d = 0.3
def marimba(f, dd, at):
    out = np.zeros(int(d*SR)); tt = t(dd)
    tone = (np.sin(2*np.pi*f*tt) + 0.2*np.sin(2*np.pi*f*4*tt)*np.exp(-tt*60)) * np.exp(-tt*16)
    s = int(at*SR); out[s:s+len(tone)] += tone[:len(out)-s]; return out
er = marimba(329.6, 0.15, 0.0) + marimba(261.6, 0.2, 0.1)
save('error.wav', fade(er, 0.002, 0.05), 0.75)

# reward — pack bursts open: whoosh + sparkling rising arpeggio + shimmer tail, 1.0 s
d = 1.0; tt = t(d)
burst = hiss(d, 0.02, 0.35) * np.exp(-((tt-0.06)/0.05)**2) * 0.9
notes = [1046.5, 1318.5, 1568, 2093, 2637, 3136]
arp = sum(bell(f, 0.5, 8, 0.05 + i*0.055, d) * (0.8 + 0.08*i) for i, f in enumerate(notes))
sh = np.zeros(len(tt))
for k in range(26):  # random high sparkles
    at = 0.25 + rng.random()*0.6; f = 2600 + rng.random()*2400
    sh += bell(f, 0.12, 30, at, d) * 0.18
rw = burst + 0.7*arp + sh
save('reward.wav', fade(rw, 0.002, 0.15), 0.85)

# pageBack — the page swish played the other way: flap first, then the swish trailing off, 0.55 s
d = 0.55; tt = t(d)
n = rng.standard_normal(len(tt)); pb = lowpass(n - lowpass(n, 0.03), 0.22)
env = 0.55*np.exp(-((tt-0.08)/0.03)**2) + 0.85*np.exp(-((tt-0.3)/0.11)**2)
save('pageBack.wav', fade(pb*env, 0.004, 0.05), 0.8)
print('ok')
