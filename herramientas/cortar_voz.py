"""Corta un audio (ElevenLabs/Voicestudio) en pasos de la receta con pausas.
Uso: python cortar_voz.py <receta> <audio> <palabras.json> <inicios>
  palabras.json: [[ini, fin, palabra], ...] (faster-whisper con word_timestamps)
  inicios: índices de palabra donde empieza cada paso, separados por coma; "-" = paso sin voz (rewind, 1 s)
Escribe voces/<receta>.wav, voces/<receta>-duraciones.json y pone esas duraciones en recetas/<receta>.js."""
import json, re, sys
import numpy as np, soundfile as sf, librosa

r, audio, pal, ini = sys.argv[1:5]
w = json.load(open(pal))
ini = [None if x == "-" else int(x) for x in ini.split(",")]
y, sr = librosa.load(audio, sr=44100, mono=True)
f = f"recetas/{r}.js"; src = open(f).read().split("\n")
filas = [n for n, l in enumerate(src) if re.match(r'^\s*\{.*"accion".*\},\s*$', l)]
assert len(filas) == len(ini), f"{len(filas)} pasos vs {len(ini)} inicios"
idx = [i for i in ini if i is not None]
out, durs = [], []
for n, fila in enumerate(filas):
    p = json.loads(src[fila].strip().rstrip(","))
    if ini[n] is None:
        out.append(np.zeros(sr)); d = 1.0
    else:
        j = ini[n]; jn = next((i for i in idx if i > j), len(w))
        a = max(0, w[j][0] - 0.06); b = w[jn - 1][1] + 0.18
        seg = y[int(a * sr):int(b * sr)].copy(); k = int(0.01 * sr)
        seg[:k] *= np.linspace(0, 1, k); seg[-k:] *= np.linspace(1, 0, k)
        d = round(len(seg) / sr + {"hook": 0.4, "outro": 1.6}.get(p["accion"], 0.7), 2)
        out.append(np.concatenate([seg, np.zeros(int(d * sr) - len(seg))]))
        print(f'{p["accion"]:12s} {d:5.2f}  {" ".join(x[2] for x in w[j:jn])}')
    durs.append(d); p["dur"] = d
    sangria = re.match(r"^\s*", src[fila]).group(0)
    src[fila] = sangria + json.dumps(p, ensure_ascii=False) + ","
a = np.concatenate(out); a = a / np.abs(a).max() * 0.89
sf.write(f"voces/{r}.wav", a, sr, subtype="PCM_16")
json.dump(durs, open(f"voces/{r}-duraciones.json", "w"))
open(f, "w").write("\n".join(src))
print("total", round(len(a) / sr, 1), "s")
