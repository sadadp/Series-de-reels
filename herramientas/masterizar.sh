#!/usr/bin/env bash
# Une video + mezcla a -14 LUFS sin saturar (loudnorm en dos pasadas, pico máx. -1.5 dB).
# Uso: bash herramientas/masterizar.sh video.mp4 mezcla.wav salida.mp4
set -e
V="$1"; A="$2"; O="$3"
J=$(ffmpeg -hide_banner -i "$A" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -loglevel error -y -i "$V" -i "$A" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -c:a aac -b:a 192k -ar 44100 -shortest "$O"
