#!/usr/bin/env bash
# Instala Kokoro TTS (voz local, sin API key) + dependencias del MCP.
set -e
cd "$(dirname "$0")/kokoro-tts-mcp"
pip install -q kokoro-onnx soundfile boto3 python-dotenv flask flask-cors "mcp<2"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -f "$f" ] || curl -sSL -o "$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done
echo "Kokoro listo. Voces en español: em_alex, ef_dora, em_santa"
