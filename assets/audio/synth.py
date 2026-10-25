# Original procedurally-synthesized sounds for Questbound (released CC0 by the team).
import numpy as np, wave, sys, os
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(7)

def save(name, x, sr=SR):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x)) or 1
    x = x / peak * 0.89
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def t(dur, sr=SR): return np.arange(int(dur * sr)) / sr

def lowpass(x, a):  # one-pole
    y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x):
        s += a * (v - s); y[i] = s
    return y

def fade(x, fin=0.004, fout=0.02):
    n = len(x); a = int(fin * SR); b = int(fout * SR)
    env = np.ones(n); env[:a] = np.linspace(0, 1, a); env[n-b:] = np.linspace(1, 0, b)
    return x * env

# ping: soft glassy chime, 140 ms
tt = t(0.14)
ping = (np.sin(2*np.pi*1318.5*tt) + 0.45*np.sin(2*np.pi*1975.5*tt) + 0.18*np.sin(2*np.pi*2637*tt)) * np.exp(-tt*28)
save('ping.wav', fade(ping, 0.002, 0.03))

# crayon: waxy scribble strokes, 1.1 s
tt = t(1.1)
noise = rng.standard_normal(len(tt))
hp = noise - lowpass(noise, 0.08)            # remove rumble
band = lowpass(hp, 0.35)                     # soften hiss
strokes = (0.5 + 0.5*np.sin(2*np.pi*7.5*tt - np.pi/2))**1.6
grain = 0.7 + 0.3*(rng.random(len(tt)) > 0.6)
env = np.minimum(1, tt/0.05) * np.minimum(1, (1.1-tt)/0.25)
save('crayon.wav', band*strokes*grain*env)

# page: paper swish + soft flap, 0.6 s
tt = t(0.6)
noise = rng.standard_normal(len(tt))
sw = lowpass(noise - lowpass(noise, 0.03), 0.25)
env = np.exp(-((tt-0.22)/0.12)**2) + 0.5*np.exp(-((tt-0.45)/0.03)**2)
save('page.wav', fade(sw*env, 0.005, 0.05))

# seal: wax thump + little gold chime, 0.5 s
tt = t(0.5)
thump = np.sin(2*np.pi*(95 - 40*tt)*tt) * np.exp(-tt*18)
noise = lowpass(rng.standard_normal(len(tt)), 0.1) * np.exp(-tt*40) * 0.6
ch_t = np.clip(tt-0.08, 0, None)
chime = (np.sin(2*np.pi*1046.5*ch_t) + 0.4*np.sin(2*np.pi*1568*ch_t)) * np.exp(-ch_t*9) * (tt > 0.08) * 0.35
save('seal.wav', fade(thump + noise + chime, 0.002, 0.08))

# ---- music: gentle lute + recorder + drone in D dorian, seamless loop ----
BPM = 84; beat = 60 / BPM
bars = 16; beats_per_bar = 3
length = bars * beats_per_bar * beat
N = int(length * SR)
mix = np.zeros(N + SR * 4)

def note_hz(n):  # semitones from A4
    return 440 * 2 ** (n / 12)
D3, A3, D4 = -19, -12, -7
scale = {'D':-7,'E':-5,'F':-4,'G':-2,'A':0,'B':2,'C':3,'d':5,'e':7,'f':8,'g':10,'a':12}

def pluck(freq, dur, amp=0.5):
    n = int(dur * SR); p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.4985 * (buf[i % p] + buf[(i + 1) % p])
    return lowpass(out, 0.5) * amp

def recorder(freq, dur, amp=0.18):
    tt = t(dur)
    vib = 1 + 0.004*np.sin(2*np.pi*5*tt) * np.minimum(1, tt/0.3)
    ph = 2*np.pi*np.cumsum(freq*vib)/SR
    x = np.sin(ph) + 0.12*np.sin(2*ph) + 0.05*np.sin(3*ph)
    breath = lowpass(rng.standard_normal(len(tt)), 0.2) * 0.02
    env = np.minimum(1, tt/0.06) * np.minimum(1, np.maximum(0, (dur-tt))/0.12)
    return (x + breath) * env * amp

def add(x, start):
    i = int(start * SR); mix[i:i+len(x)] += x

# chord roots per bar (Dm Dm C Dm | F C Dm Am | Dm Dm C Dm | F C Am Dm)
chords = ['Dm','Dm','C','Dm','F','C','Dm','Am','Dm','Dm','C','Dm','F','C','Am','Dm']
tones = {'Dm':[D3, -14, A3], 'C':[-21, -17, -14], 'F':[-16, -12, -9], 'Am':[A3, -9, -5]}
for b, ch in enumerate(chords):
    r, th, fi = tones[ch]
    s = b * beats_per_bar * beat
    add(pluck(note_hz(r), beat*3, 0.42), s)
    add(pluck(note_hz(fi+12), beat*1.5, 0.22), s + beat)
    add(pluck(note_hz(th+12), beat*1.5, 0.22), s + beat*2)

melody = [  # (note, beats) over 16 bars of 3 beats = 48 beats
 ('A',2),('G',1),('F',1.5),('E',.5),('D',1), ('C',2),('D',1),('E',3),
 ('F',2),('G',1),('A',1.5),('G',.5),('F',1), ('E',2),('C',1),('D',3),
 ('d',2),('C',1),('A',2),('G',1), ('F',1),('G',1),('A',1),('E',3),
 ('F',1),('E',1),('D',1),('C',2),('E',1), ('D',3),('D',3),
]
pos = 0.0
for n, d in melody:
    add(recorder(note_hz(scale[n]+12), d*beat*0.95), pos*beat); pos += d

# soft drone D+A
tt = t(length)
drone = (np.sin(2*np.pi*note_hz(D3-12)*tt) + 0.6*np.sin(2*np.pi*note_hz(A3-12)*tt)) * 0.05
mix[:N] += drone
# wrap the ring-out tail to the start so the loop is seamless
tail = mix[N:]; mix = mix[:N]; mix[:len(tail)] += tail
save('bards.wav', mix)
print('ok', length)
