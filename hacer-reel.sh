#!/usr/bin/env bash
# Todo en un paso: video 3D + voz + música + mezcla final.
# Uso: bash hacer-reel.sh panqueques-platano
set -e
R=${1:-panqueques-platano}
cd "$(dirname "$0")"
[ -d node_modules/three ] || npm install --silent
[ -f /root/.ccr/ca-bundle.crt ] && export SSL_CERT_FILE=/root/.ccr/ca-bundle.crt
if [ -f "voces/$R.wav" ]; then
  # voz propia (grabada/subida): se respetan sus tiempos
  cp "voces/$R-duraciones.json" "salida/$R-duraciones.json"
else
  rm -f "salida/$R-duraciones.json"
  node render.js "$R" --frame 0 >/dev/null          # guion con textos
  # voz de Michi: por defecto la clonada de voces/michi-ref.wav (cambia con REF=, TONO=, VEL=, EXAG=)
  python3 voz.py "$R" --motor chatterbox --ref "${REF:-voces/michi-ref.wav}" --vel "${VEL:-1.0}" --tono-factor "${TONO:-1.0}" --exag "${EXAG:-0.9}" --ajustar ${RESPETAR:+--respetar}
fi
node render.js "$R"
python3 musica.py "$R"
ffmpeg -loglevel error -y -i "salida/$R.mp4" -i "salida/$R-mezcla.wav" -c:v copy \
  -af "volume=3.6dB,alimiter=limit=0.89" -c:a aac -b:a 192k -ar 44100 -shortest "salida/$R-final.mp4"
echo "Listo: salida/$R-final.mp4"
