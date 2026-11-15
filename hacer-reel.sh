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
  python3 voz.py "$R" --motor chatterbox --ref "${REF:-voces/michi-ref.wav}" --vel "${VEL:-1.0}" --tono-factor "${TONO:-0.88}" --exag "${EXAG:-0.6}" --ajustar ${RESPETAR:+--respetar}
fi
node render.js "$R"
python3 musica.py "$R"
bash herramientas/masterizar.sh "salida/$R.mp4" "salida/$R-mezcla.wav" "salida/$R-final.mp4"
echo "Listo: salida/$R-final.mp4"
