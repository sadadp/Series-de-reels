"""Genera varias frases con Chatterbox (voz con emoción). Corre en el venv con torch.
Uso: python chatterbox_tts.py entrada.json   # [{"texto":..., "salida":...}, ...]
"""
import json, os, sys
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
import soundfile as sf
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

cfg = json.load(open(sys.argv[1]))
m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
for item in cfg["frases"]:
    w = m.generate(item["texto"], language_id="es", audio_prompt_path=cfg["ref"],
                   exaggeration=cfg.get("exageracion", 1.2), cfg_weight=cfg.get("cfg", 0.5),
                   temperature=cfg.get("temperatura", 0.7))
    y = w.squeeze(0).numpy()
    y = y / max(1e-9, abs(y).max()) * 0.85   # sin recortes: la IA a veces se pasa del máximo
    sf.write(item["salida"], y, m.sr, subtype="FLOAT")
    print("ok", item["texto"], flush=True)
