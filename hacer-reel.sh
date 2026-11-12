#!/usr/bin/env bash
# Todo en un paso: video 3D + voz + música + mezcla final.
# Uso: bash hacer-reel.sh hotcakes-platano [voz] [vel] [tono]
set -e
R=${1:-hotcakes-platano}; VOZ=${2:-es-US-AlonsoNeural}; VEL=${3:-1.2}; TONO=${4:-+25Hz}
cd "$(dirname "$0")"
[ -d node_modules/three ] || npm install --silent
[ -f /root/.ccr/ca-bundle.crt ] && export SSL_CERT_FILE=/root/.ccr/ca-bundle.crt
node render.js "$R"
python3 voz.py "$R" --motor edge --voz "$VOZ" --vel "$VEL" --tono "$TONO"
python3 musica.py "$R"
ffmpeg -loglevel error -y -i "salida/$R.mp4" -i "salida/$R-mezcla.wav" -c:v copy \
  -af "volume=3.6dB,alimiter=limit=0.89" -c:a aac -b:a 192k -ar 44100 -shortest "salida/$R-final.mp4"
echo "Listo: salida/$R-final.mp4"
