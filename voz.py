#!/usr/bin/env python3
"""Genera la voz en off de una receta, alineada a cada paso.

Uso:
  python3 voz.py panqueques-platano                                  # Kokoro em_alex
  python3 voz.py panqueques-platano --motor edge --voz es-MX-JorgeNeural
  python3 voz.py panqueques-platano --motor edge --voz es-US-AlonsoNeural --vel 1.2 --tono +45Hz
  python3 voz.py panqueques-platano --motor piper --voz es_MX-claude-high

Lee salida/<receta>-guion.json (lo crea render.js) y escribe salida/<receta>-voz.wav
"""
import argparse, json, os, subprocess, tempfile
import numpy as np, soundfile as sf

RAIZ = os.path.dirname(os.path.abspath(__file__))
SR = 24000
# duración mínima por acción para que la animación se vea completa
MIN_DUR = {"hook": 1.8, "intro": 1.8, "presenta": 1.45, "drop": 1.7, "stir": 1.9, "pour": 2.0, "flip": 2.3, "serve": 2.7, "outro": 3.0}
VOZ_DEF = {"chatterbox": "michi", "kokoro": "em_alex", "edge": "es-MX-JorgeNeural", "piper": "es_MX-claude-high"}


def a_wav(entrada):
    """Convierte cualquier audio a mono SR con ffmpeg y lo devuelve como array."""
    with tempfile.NamedTemporaryFile(suffix=".wav") as t:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", entrada, "-ac", "1", "-ar", str(SR), t.name], check=True)
        s, _ = sf.read(t.name, dtype="float32")
    return s


def motor_kokoro(voz, vel):
    from kokoro_onnx import Kokoro
    K = os.path.join(RAIZ, "herramientas", "kokoro-tts-mcp")
    k = Kokoro(os.path.join(K, "kokoro-v1.0.onnx"), os.path.join(K, "voices-v1.0.bin"))
    def decir(texto):
        s, sr = k.create(texto, voice=voz, speed=vel, lang="es")
        assert sr == SR
        return s
    return decir


def motor_edge(voz, vel, tono="+0Hz"):
    proxy = os.environ.get("HTTPS_PROXY")
    pct = f"{round((vel - 1) * 100):+d}%"
    def decir(texto):
        with tempfile.NamedTemporaryFile(suffix=".mp3") as t:
            cmd = ["edge-tts", "--voice", voz, f"--rate={pct}", f"--pitch={tono}", "--text", texto, "--write-media", t.name]
            if proxy: cmd += ["--proxy", proxy]
            subprocess.run(cmd, check=True, capture_output=True)
            return a_wav(t.name)
    return decir


def motor_piper(voz, vel):
    modelo = os.path.join(RAIZ, "herramientas", "piper", voz + ".onnx")
    def decir(texto):
        with tempfile.NamedTemporaryFile(suffix=".wav") as t:
            subprocess.run(["python3", "-m", "piper", "-m", modelo, "-f", t.name, "--length-scale", str(1 / vel)],
                           input=texto.encode(), check=True, capture_output=True)
            return a_wav(t.name)
    return decir


VENV_CB = os.environ.get("VENV_CB", "/home/user/venv-cb/bin/python")


def motor_chatterbox_lote(textos, ref, exag, tono, vel):
    """Genera todas las frases de una vez (carga el modelo una sola vez) y les da
    el tono y la velocidad sin cambiar el timbre (rubberband con formantes)."""
    tmp = tempfile.mkdtemp()
    frases = [{"texto": t, "salida": os.path.join(tmp, f"{i}.wav")} for i, t in enumerate(textos)]
    cfg = os.path.join(tmp, "cfg.json")
    json.dump({"frases": frases, "ref": ref, "exageracion": exag}, open(cfg, "w"))
    subprocess.run([VENV_CB, os.path.join(RAIZ, "herramientas", "chatterbox_tts.py"), cfg], check=True, capture_output=True)
    salida = []
    for f in frases:
        pf = f["salida"] + ".pf.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f["salida"], "-af",
                        f"rubberband=tempo={vel}:pitch={tono}:formant=preserved:transients=smooth,highshelf=f=3500:g=1.5,"
                        "acompressor=threshold=-20dB:ratio=2:attack=10:release=120,silenceremove=start_periods=1:start_threshold=-45dB,"
                        "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", pf], check=True)
        salida.append(a_wav(pf))
    return salida


def main():
    a = argparse.ArgumentParser()
    a.add_argument("receta")
    a.add_argument("--motor", choices=["kokoro", "edge", "piper", "chatterbox"], default="kokoro")
    a.add_argument("--voz")
    a.add_argument("--vel", type=float, default=1.1)
    a.add_argument("--tono", default="+0Hz", help="solo edge, ej. +20Hz o -15Hz")
    a.add_argument("--ref", default=os.path.join(RAIZ, "herramientas", "voces", "michi-euforico.wav"), help="chatterbox: voz de referencia")
    a.add_argument("--exag", type=float, default=1.2, help="chatterbox: emoción")
    a.add_argument("--tono-factor", type=float, default=1.055, help="chatterbox: tono (1.0 = igual)")
    a.add_argument("--ajustar", action="store_true", help="ajusta la duración de cada paso a su frase (sin huecos)")
    o = a.parse_args()
    voz = o.voz or VOZ_DEF[o.motor]
    if o.motor != "chatterbox":
        decir = motor_edge(voz, o.vel, o.tono) if o.motor == "edge" else {"kokoro": motor_kokoro, "piper": motor_piper}[o.motor](voz, o.vel)

    guion = json.load(open(os.path.join(RAIZ, "salida", f"{o.receta}-guion.json")))
    if o.motor == "chatterbox":
        con = [g["texto"] for g in guion if g["texto"].strip()]
        gen = iter(motor_chatterbox_lote(con, o.ref, o.exag, o.tono_factor, o.vel))
        clips = [next(gen) if g["texto"].strip() else None for g in guion]
    else:
        clips = [decir(g["texto"]) if g["texto"].strip() else None for g in guion]

    if o.ajustar:
        # cada paso dura lo que dura su frase (+ respiro), sin bajar del mínimo de su animación
        durs = []
        for g, c in zip(guion, clips):
            base = g["fin"] - g["ini"]
            if c is None:
                durs.append(round(base, 2)); continue
            minimo = MIN_DUR.get(g["accion"], 1.5) + (0.5 if g["accion"] == "drop" and "huev" in g["texto"].lower() else 0)
            durs.append(round(max(minimo, len(c) / SR + 0.3), 2))
        json.dump(durs, open(os.path.join(RAIZ, "salida", f"{o.receta}-duraciones.json"), "w"))
        t = 0
        for g, d in zip(guion, durs):
            g["ini"], g["fin"] = t, t + d; t += d
        print(f"Duración ajustada: {t:.1f}s")

    total = np.zeros(int((guion[-1]["fin"] + 0.5) * SR), dtype=np.float32)
    for g, s in zip(guion, clips):
        if s is None:
            continue
        largo, hueco = len(s) / SR, g["fin"] - g["ini"]
        if largo > hueco:
            print(f"  ojo: '{g['texto']}' dura {largo:.1f}s pero el paso {hueco:.1f}s (sube dur)")
        i = int((g["ini"] + 0.08) * SR)
        total[i:i + len(s)] += s[: len(total) - i]
    out = os.path.join(RAIZ, "salida", f"{o.receta}-voz.wav")
    sf.write(out, total, SR)
    print(f"Voz ({o.motor}/{voz}): {out}")


if __name__ == "__main__":
    main()
