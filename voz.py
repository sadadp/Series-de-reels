#!/usr/bin/env python3
"""Genera la voz en off de una receta con Kokoro, alineada a cada paso.
Uso: python3 voz.py hotcakes-platano [--voz em_alex] [--vel 1.1]
Lee salida/<receta>-guion.json (lo crea render.js) y escribe salida/<receta>-voz.wav
"""
import json, sys, os, argparse
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

a = argparse.ArgumentParser()
a.add_argument("receta"); a.add_argument("--voz", default="em_alex"); a.add_argument("--vel", type=float, default=1.1)
o = a.parse_args()
raiz = os.path.dirname(os.path.abspath(__file__))
K = os.path.join(raiz, "herramientas", "kokoro-tts-mcp")
k = Kokoro(os.path.join(K, "kokoro-v1.0.onnx"), os.path.join(K, "voices-v1.0.bin"))
guion = json.load(open(os.path.join(raiz, "salida", f"{o.receta}-guion.json")))
sr = 24000
total = np.zeros(int((guion[-1]["fin"] + 0.5) * sr), dtype=np.float32)
for g in guion:
    s, sr = k.create(g["texto"], voice=o.voz, speed=o.vel, lang="es")
    largo = len(s) / sr; hueco = g["fin"] - g["ini"]
    if largo > hueco: print(f"  ojo: '{g['texto']}' dura {largo:.1f}s pero el paso {hueco:.1f}s (sube dur)")
    i = int((g["ini"] + 0.1) * sr)
    total[i:i + len(s)] += s[: len(total) - i]
out = os.path.join(raiz, "salida", f"{o.receta}-voz.wav")
sf.write(out, total, sr); print("Voz:", out)
