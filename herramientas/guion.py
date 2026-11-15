#!/usr/bin/env python3
"""Calcula los tiempos de un guion a ritmo tranquilo y escribe el guion para grabar.
Uso: python3 herramientas/guion.py <receta>
Lee recetas/<receta>.js (un paso por línea, en formato JSON), ajusta "dur" de cada paso
y escribe captions/<receta>-guion.md con el párrafo y los segundos de cada frase.
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LETRAS_POR_SEG = 11.5   # ritmo tranquilo
PAUSA = 0.9             # respiro entre frases
MINIMO = {"hook": 2.6, "rewind": 1.0, "intro": 2.0, "presenta": 1.8, "drop": 2.2, "stir": 2.2,
          "arma": 2.8, "baña": 2.2, "queso": 2.2, "hornea": 2.6, "serve": 3.0, "outro": 3.4}

receta = sys.argv[1]
ruta = os.path.join(RAIZ, "recetas", receta + ".js")
lineas = open(ruta).read().split("\n")
t, tabla, textos = 0.0, [], []
for i, l in enumerate(lineas):
    m = re.match(r"^(\s*)(\{.*\}),\s*$", l)
    if not m or '"accion"' not in l:
        continue
    paso = json.loads(m.group(2))
    txt = paso.get("texto", "")
    letras = sum(c.isalnum() for c in txt)
    d = 1.0 if not txt else max(MINIMO.get(paso["accion"], 2.2), letras / LETRAS_POR_SEG + PAUSA)
    if paso["accion"] == "drop":
        d = max(d, 1.2 + 0.5 * len(paso.get("ingredientes", [1])))
    paso["dur"] = round(d, 1)
    lineas[i] = m.group(1) + json.dumps(paso, ensure_ascii=False) + ","
    tabla.append((t, txt)); textos.append(txt); t += paso["dur"]
open(ruta, "w").write("\n".join(lineas))
md = f"# Guion — {receta} (≈{t:.0f} s)\n\n" + " ".join(x for x in textos if x) + "\n\n| Seg. | Frase |\n|---|---|\n"
md += "\n".join(f"| {s:.1f} | {x or '*(pausa 1 s)*'} |" for s, x in tabla) + f"\n| {t:.1f} | *(fin)* |\n"
open(os.path.join(RAIZ, "captions", receta + "-guion.md"), "w").write(md)
print(md)
