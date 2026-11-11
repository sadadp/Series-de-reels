#!/usr/bin/env python3
"""Genera la voz en off de una receta, alineada a cada paso.

Uso:
  python3 voz.py hotcakes-platano                                  # Kokoro em_alex
  python3 voz.py hotcakes-platano --motor edge --voz es-MX-JorgeNeural
  python3 voz.py hotcakes-platano --motor piper --voz es_MX-claude-high

Lee salida/<receta>-guion.json (lo crea render.js) y escribe salida/<receta>-voz.wav
"""
import argparse, json, os, subprocess, tempfile
import numpy as np, soundfile as sf

RAIZ = os.path.dirname(os.path.abspath(__file__))
SR = 24000
VOZ_DEF = {"kokoro": "em_alex", "edge": "es-MX-JorgeNeural", "piper": "es_MX-claude-high"}


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


def motor_edge(voz, vel):
    proxy = os.environ.get("HTTPS_PROXY")
    pct = f"{round((vel - 1) * 100):+d}%"
    def decir(texto):
        with tempfile.NamedTemporaryFile(suffix=".mp3") as t:
            cmd = ["edge-tts", "--voice", voz, f"--rate={pct}", "--text", texto, "--write-media", t.name]
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


def main():
    a = argparse.ArgumentParser()
    a.add_argument("receta")
    a.add_argument("--motor", choices=["kokoro", "edge", "piper"], default="kokoro")
    a.add_argument("--voz")
    a.add_argument("--vel", type=float, default=1.1)
    o = a.parse_args()
    voz = o.voz or VOZ_DEF[o.motor]
    decir = {"kokoro": motor_kokoro, "edge": motor_edge, "piper": motor_piper}[o.motor](voz, o.vel)

    guion = json.load(open(os.path.join(RAIZ, "salida", f"{o.receta}-guion.json")))
    total = np.zeros(int((guion[-1]["fin"] + 0.5) * SR), dtype=np.float32)
    for g in guion:
        s = decir(g["texto"])
        largo, hueco = len(s) / SR, g["fin"] - g["ini"]
        if largo > hueco:
            print(f"  ojo: '{g['texto']}' dura {largo:.1f}s pero el paso {hueco:.1f}s (sube dur)")
        i = int((g["ini"] + 0.1) * SR)
        total[i:i + len(s)] += s[: len(total) - i]
    out = os.path.join(RAIZ, "salida", f"{o.receta}-voz.wav")
    sf.write(out, total, SR)
    print(f"Voz ({o.motor}/{voz}): {out}")


if __name__ == "__main__":
    main()
