#!/usr/bin/env python3
"""Arma el video de presentación: Michi en 3D + cortes de las recetas + cierre.
Uso: python3 presentacion.py      -> salida/presentacion-final.mp4
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf

RAIZ = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, RAIZ)
import voz as V  # reutiliza la voz clonada (Chatterbox)

S = lambda *p: os.path.join(RAIZ, "salida", *p)
FUENTE = os.path.join(RAIZ, "engine", "fonts", "LuckiestGuy.ttf")
SR = V.SR

INICIO = ["¡Hola! Soy el chef Michi.", "¡Un gatito al que le encanta cocinar!"]
# (frase, receta, acción del corte, ¿contiene?, desfase, etiqueta en pantalla)
MONTAJE = [
    ("En esta cuenta cocinamos recetas fáciles y caseras,", "panqueques-platano", "drop", "huevitos", 0.1, "RECETAS FÁCILES"),
    ("panqueques esponjositos,", "panqueques-platano", "flip", "", 0.2, "PANQUEQUES"),
    ("enchiladas suizas,", "enchiladas-suizas", "queso", "", 0.0, "ENCHILADAS SUIZAS"),
    ("¡y hasta mole poblano!", "mole-poblano", "serve", "", 0.1, "MOLE POBLANO"),
]
CIERRE = "Sígueme, guarda las recetas y comenta qué quieres que cocine."


def sh(*a):
    subprocess.run(a, check=True, cwd=RAIZ)


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--voz", help="tu audio grabado (en vez de la voz IA)")
    ap.add_argument("--cortes", help="segundos donde empieza cada frase, ej. 0,2.8,5.1,8.4,10.4,12.1,14.3")
    o = ap.parse_args()
    propia = os.path.join(RAIZ, "voces", "presentacion-final.wav")
    if o.voz:
        # voz grabada: los tiempos de cada parte salen de donde empieza cada frase
        import shutil; shutil.copy(o.voz, propia)
        c = [float(x) for x in o.cortes.split(",")]
        total_audio = sf.info(o.voz).duration
        a1, a2 = c[1] - c[0], c[2] - c[1]
        mont = [c[i + 1] - c[i] for i in range(2, 6)]
        cierre = max(3.2, total_audio - c[6] + 0.3)
        clips = None
    else:
        if os.path.exists(propia): os.remove(propia)
        textos = INICIO + [m[0] for m in MONTAJE] + [CIERRE]
        clips = V.motor_chatterbox_lote(textos, os.path.join(RAIZ, "voces", "michi-ref.wav"), 0.9, 1.0, 1.08)
        largo = [len(c) / SR for c in clips]
        a1, a2 = max(1.8, largo[0] + 0.3), max(1.8, largo[1] + 0.3)
        mont = [max(1.6, l + 0.25) for l in largo[2:6]]
        cierre = max(3.2, largo[6] + 0.5)
    print("tiempos:", round(a1, 2), round(a2, 2), [round(m, 2) for m in mont], round(cierre, 2))

    # 1) Michi en 3D (inicio + cierre) con duraciones a la medida de la voz
    json.dump([round(a1, 2), round(a2, 2), round(cierre, 2)], open(S("presentacion-duraciones.json"), "w"))
    sh("node", "render.js", "presentacion")

    # 2) cortes de cada receta, sin subtítulos, con etiqueta
    partes = []
    for n, ((_, receta, accion, contiene, desf, etiqueta), d) in enumerate(zip(MONTAJE, mont)):
        guion = json.load(open(S(f"{receta}-guion.json")))
        g = next(g for g in guion if g["accion"] == accion and contiene in g["texto"])
        ini = g["ini"] + desf
        sh("node", "render.js", receta, "--desde", f"{ini:.2f}", "--hasta", f"{ini + d:.2f}", "--sin-subs", "--salida", f"pres-corte{n}")
        et = S(f"pres-corte{n}-et.mp4")
        sh("ffmpeg", "-loglevel", "error", "-y", "-i", S(f"pres-corte{n}.mp4"), "-vf",
           f"drawtext=fontfile={FUENTE}:text='{etiqueta}':fontsize=118:fontcolor=0xf4c430:borderw=12:bordercolor=0x3a1f0d:"
           f"shadowcolor=0x3a1f0d:shadowy=10:x=(w-tw)/2:y=300", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", et)
        partes.append(et)

    # 3) partir el 3D: saludo | cierre, y unir con los cortes
    a = a1 + a2
    sh("ffmpeg", "-loglevel", "error", "-y", "-i", S("presentacion.mp4"), "-t", f"{a:.3f}", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", S("pres-a.mp4"))
    sh("ffmpeg", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-i", S("presentacion.mp4"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", S("pres-c.mp4"))
    orden = [S("pres-a.mp4")] + partes + [S("pres-c.mp4")]
    ins = sum([["-i", f] for f in orden], [])
    filtro = "".join(f"[{i}:v]" for i in range(len(orden))) + f"concat=n={len(orden)}:v=1:a=0[v]"
    sh("ffmpeg", "-loglevel", "error", "-y", *ins, "-filter_complex", filtro, "-map", "[v]", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", S("presentacion-final-video.mp4"))

    # 4) voz en su lugar
    tiempos = [0, a1] + list(np.cumsum([0] + mont[:-1]) + a) + [a + sum(mont)]
    total = a + sum(mont) + cierre
    if clips is not None:
        pista = np.zeros(int((total + 0.5) * SR), dtype=np.float32)
        for c, t in zip(clips, tiempos):
            i = int((t + 0.08) * SR); pista[i:i + len(c)] += c[: len(pista) - i]
        sf.write(S("presentacion-final-voz.wav"), pista, SR)

    # 5) guion para música y efectos
    guion = [{"ini": 0, "fin": a1, "texto": INICIO[0], "accion": "intro"}, {"ini": a1, "fin": a, "texto": INICIO[1], "accion": "intro"}]
    for (txt, *_), t, d in zip(MONTAJE, tiempos[2:6], mont):
        guion.append({"ini": t, "fin": t + d, "texto": txt, "accion": "presenta"})
    guion.append({"ini": a + sum(mont), "fin": total, "texto": CIERRE, "accion": "outro"})
    json.dump(guion, open(S("presentacion-final-guion.json"), "w"), ensure_ascii=False, indent=1)
    sh("python3", "musica.py", "presentacion-final")
    sh("ffmpeg", "-loglevel", "error", "-y", "-i", S("presentacion-final-video.mp4"), "-i", S("presentacion-final-mezcla.wav"), "-c:v", "copy",
       "-af", "volume=3.6dB,alimiter=limit=0.89", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", S("presentacion-final.mp4"))
    with open(S("presentacion-final-guion.txt"), "w") as f:
        f.write("\n".join(f"[{g['ini']:.1f}s] {g['texto']}" for g in guion) + "\n")
    print(f"Listo: salida/presentacion-final.mp4 ({total:.1f}s)")


if __name__ == "__main__":
    main()
