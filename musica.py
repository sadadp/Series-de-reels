#!/usr/bin/env python3
"""Música de fondo (pianito alegre generado por código, 100% propio) + efectos
de sonido sincronizados + voz, todo mezclado en un solo audio.

Uso: python3 musica.py hotcakes-platano [--bpm 116] [--vol 0.22] [--semilla 3]
Lee salida/<receta>-guion.json y salida/<receta>-voz.wav (si existe)
Escribe salida/<receta>-mezcla.wav
"""
import argparse, json, os
import numpy as np, soundfile as sf

SR = 44100
RAIZ = os.path.dirname(os.path.abspath(__file__))


def nota(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def piano(f, dur, vel=1.0):
    """Piano sencillo: armónicos con caída exponencial + ataque suave."""
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for h, a in [(1, 1.0), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)]:
        s += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h)) * np.exp(-t * (2.2 + h * 1.3))
    ataque = np.minimum(1, t / 0.004)
    salida = np.minimum(1, (dur - t) / 0.03).clip(0, 1)
    return s * ataque * salida * vel * 0.25


def pluck(f, dur, vel=1.0):
    """Bajo redondo tipo pizzicato."""
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return s * np.exp(-t * 5) * np.minimum(1, t / 0.006) * vel * 0.32


def ruido(dur, decay, seed):
    r = np.random.default_rng(seed)
    n = int(dur * SR); t = np.arange(n) / SR
    return r.standard_normal(n) * np.exp(-t * decay)


def pasa_altos(x, k=0.85):
    y = np.copy(x); y[1:] = x[1:] - k * x[:-1]
    return y


def suave(x, k=0.2):
    y = np.copy(x)
    for i in range(1, len(x)):
        y[i] = y[i - 1] + k * (x[i] - y[i - 1])
    return y


def poner(buf, clip, t):
    i = int(t * SR)
    if i >= len(buf) or i < 0: return
    j = min(len(buf), i + len(clip))
    buf[i:j] += clip[: j - i]


def xilofono(f, dur, vel=1.0):
    """Xilófono/glockenspiel: brillante, ataque rápido, caída corta."""
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 18) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 40)
    return s * np.exp(-t * 7) * np.minimum(1, t / 0.002) * vel * 0.3


def palmada(seed):
    r = ruido(0.12, 30, seed)
    r = pasa_altos(r, 0.7)
    return (r + 0.6 * np.roll(r, int(0.008 * SR)) + 0.4 * np.roll(r, int(0.016 * SR))) * 0.12


def bombo():
    n = int(0.25 * SR); t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.5


# melodía fija y pegajosa en Do mayor: (compás, tiempo, nota MIDI, duración en tiempos)
MELODIA = []
for c, fr in enumerate([
    [(0, 76), (.5, 79), (1, 84), (1.5, 79), (2, 81), (2.5, 79), (3, 76)],
    [(0, 77), (.5, 81), (1, 84), (1.5, 81), (2, 79), (3, 76)],
    [(0, 74), (.5, 79), (1, 83), (1.5, 79), (2, 81), (2.5, 79), (3, 77), (3.5, 74)],
    [(0, 76), (1, 72), (2, 79), (2.5, 81), (3, 79)],
    [(0, 81), (.5, 84), (1, 88), (1.5, 84), (2, 83), (2.5, 81), (3, 79)],
    [(0, 77), (.5, 81), (1, 84), (1.5, 86), (2, 84), (3, 81)],
    [(0, 83), (.5, 86), (1, 79), (1.5, 83), (2, 86), (2.5, 84), (3, 83), (3.5, 79)],
    [(0, 84), (1, 79), (1.5, 81), (2, 84)],
]):
    MELODIA += [(c, b, m) for b, m in fr]
ACORDES = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74], [60, 64, 67]]
RAICES = [36, 41, 43, 36, 45, 41, 43, 36]


def componer(dur, bpm, semilla):
    """Tema alegre: xilófono + piano, bajo saltarín, palmas en 2 y 4."""
    beat = 60 / bpm
    buf = np.zeros(int((dur + 2) * SR))
    compas = 0; t = 0.0
    while t < dur + 1:
        c = compas % 8
        intro = compas == 0  # primer compás más ligero
        # bajo saltarín: tónica-octava
        for b, m in [(0, RAICES[c]), (1, RAICES[c] + 12), (2, RAICES[c] + 7), (3, RAICES[c] + 12)]:
            poner(buf, pluck(nota(m), beat * 0.7, 0.9), t + b * beat)
        # acordes de "ukulele" en contratiempos
        for b in (0.5, 1.5, 2.5, 3.5):
            for j, m in enumerate(ACORDES[c]):
                poner(buf, piano(nota(m), beat * 0.35, 0.28), t + b * beat + j * 0.008)
        # melodía (xilófono + piano doblado)
        if not intro:
            for cc, b, m in MELODIA:
                if cc == c:
                    poner(buf, xilofono(nota(m), beat * 1.2, 0.9), t + b * beat)
                    poner(buf, piano(nota(m - 12), beat * 0.9, 0.35), t + b * beat)
        # batería suave
        for b in (0, 2):
            poner(buf, bombo(), t + b * beat)
        if not intro:
            for b in (1, 3):
                poner(buf, palmada(compas * 4 + b), t + b * beat)
        for b in np.arange(0, 4, 0.5):
            poner(buf, pasa_altos(ruido(0.04, 90, int(b * 10 + compas))) * (0.05 if b % 1 else 0.03), t + b * beat)
        t += 4 * beat; compas += 1
    return buf[: int(dur * SR)]


# ---------- efectos de sonido ----------
def sfx_ding():
    return piano(nota(88), 0.6, 0.9) + piano(nota(93), 0.6, 0.5)

def sfx_pop():
    n = int(0.18 * SR); t = np.arange(n) / SR
    f = 380 * np.exp(-t * 18) + 120
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * 0.7

def sfx_whoosh(dur=0.45):
    r = suave(ruido(dur, 0, 7), 0.08)
    n = len(r); env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return r * env * 2.2

def sfx_rebobinar(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 900 + 1400 * t / dur
    tono = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.08
    return (tono + suave(ruido(dur, 0, 3), 0.3) * 0.25) * np.minimum(1, (dur - t) / 0.05)

def sfx_chisporroteo(dur):
    r = pasa_altos(ruido(dur, 0, 11), 0.95)
    rng = np.random.default_rng(5)
    crep = np.zeros(len(r)); idx = rng.integers(0, len(r), int(dur * 60)); crep[idx] = rng.uniform(0.3, 1, len(idx))
    env = np.minimum(1, np.arange(len(r)) / (0.3 * SR)) * np.minimum(1, (len(r) - np.arange(len(r))) / (0.3 * SR))
    return (r * 0.05 + pasa_altos(crep, 0.5) * 0.35) * env

def sfx_brillo():
    s = np.zeros(int(0.9 * SR))
    for i, m in enumerate([84, 88, 91, 96]):
        poner(s, piano(nota(m), 0.5, 0.5), i * 0.07)
    return s

def sfx_mezcla(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return suave(ruido(dur, 0, 13), 0.05) * (0.6 + 0.4 * np.sin(2 * np.pi * 2 * t)) * 0.5


def efectos(guion, dur):
    buf = np.zeros(int(dur * SR))
    for g in guion:
        a, t0, d = g["accion"], g["ini"], g["fin"] - g["ini"]
        if a == "hook": poner(buf, sfx_brillo(), t0 + 0.1)
        elif a == "rewind": poner(buf, sfx_rebobinar(d), t0)
        elif a == "intro": poner(buf, sfx_whoosh(), t0)
        elif a == "presenta": poner(buf, sfx_whoosh(0.35) * 0.6, t0); poner(buf, sfx_ding(), t0 + 0.55)
        elif a == "drop":
            for n in range(2 if "huevos" in g["texto"].lower() else 1):
                poner(buf, sfx_pop(), t0 + 0.25 + n * 0.45 + 0.58)
        elif a == "stir": poner(buf, sfx_mezcla(d * 0.9), t0 + 0.1)
        elif a == "pour": poner(buf, sfx_chisporroteo(d + 1.5), t0 + 0.4)
        elif a == "flip": poner(buf, sfx_chisporroteo(d), t0); poner(buf, sfx_whoosh(0.3), t0 + d * 0.5)
        elif a == "serve":
            for n in range(4): poner(buf, sfx_pop() * 0.6, t0 + 0.4 + n * 0.18 + 0.2)
            poner(buf, sfx_brillo(), t0 + 1.4)
        elif a == "outro": poner(buf, sfx_brillo(), t0 + 0.1)
    return buf


def main():
    a = argparse.ArgumentParser()
    a.add_argument("receta"); a.add_argument("--bpm", type=float, default=128)
    a.add_argument("--vol", type=float, default=0.22); a.add_argument("--semilla", type=int, default=3)
    o = a.parse_args()
    guion = json.load(open(os.path.join(RAIZ, "salida", f"{o.receta}-guion.json")))
    dur = guion[-1]["fin"]

    musica = componer(dur, o.bpm, o.semilla)
    musica /= np.abs(musica).max() + 1e-9
    fx = efectos(guion, dur) * 0.5

    voz = np.zeros(len(musica))
    vpath = os.path.join(RAIZ, "salida", f"{o.receta}-voz.wav")
    if os.path.exists(vpath):
        v, vsr = sf.read(vpath, dtype="float64")
        if v.ndim > 1: v = v.mean(axis=1)
        v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
        voz[: min(len(v), len(voz))] = v[: len(voz)]
        voz /= np.abs(voz).max() + 1e-9

    # "ducking": baja la música cuando habla la voz
    env = np.abs(voz)
    w = int(0.05 * SR)
    env = np.convolve(env, np.ones(w) / w, mode="same")
    hablando = suave(np.convolve((env > 0.02).astype(float), np.ones(int(0.25 * SR)), mode="same").clip(0, 1)[::50], 0.05)
    hablando = np.repeat(hablando, 50)[: len(musica)]
    gan = o.vol * (1 - 0.55 * hablando)
    # fade in/out de la música
    n = len(musica); fade = np.minimum(1, np.arange(n) / (0.4 * SR)) * np.minimum(1, (n - np.arange(n)) / (1.2 * SR))

    mezcla = musica * gan * fade + fx + voz * 0.9
    mezcla /= max(1.0, np.abs(mezcla).max() / 0.95)
    out = os.path.join(RAIZ, "salida", f"{o.receta}-mezcla.wav")
    sf.write(out, mezcla.astype(np.float32), SR)
    print("Mezcla:", out)


if __name__ == "__main__":
    main()
