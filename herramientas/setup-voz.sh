#!/usr/bin/env bash
# Instala Kokoro TTS (voz local, sin API key) + dependencias del MCP.
set -e
cd "$(dirname "$0")/kokoro-tts-mcp"
pip install -q kokoro-onnx soundfile boto3 python-dotenv flask flask-cors "mcp<2"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -f "$f" ] || curl -sSL -o "$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done
echo "Kokoro listo. Voces en español: em_alex, ef_dora, em_santa"

# Edge-TTS (45 voces neurales en español, necesita speech.platform.bing.com)
pip install -q edge-tts piper-tts
# Piper (voces locales; modelos en Hugging Face)
mkdir -p ../piper && cd ../piper
for v in es_MX-claude-high es_MX-ald-medium es_AR-daniela-high es_ES-davefx-medium es_ES-sharvard-medium es_ES-carlfm-x_low; do
  IFS=- read L N Q <<< "$v"
  for e in onnx onnx.json; do
    [ -s "$v.$e" ] || curl -sSfL -o "$v.$e" "https://huggingface.co/rhasspy/piper-voices/resolve/main/${L%%_*}/$L/$N/$Q/$v.$e"
  done
done
echo "Piper listo."
