#!/usr/bin/env bash
# Reinstala las herramientas de video (fuera del repo) y enlaza sus skills en .claude/skills.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"; HOME_DIR="$(dirname "$REPO")"
# 1) Video Editor Agent (mrpaidsocial)
VEA="$HOME_DIR/video-editor-agent"
[ -d "$VEA" ] || git clone --depth 1 https://github.com/mrpaidsocial/mrpaidsocial-video-editor-agent "$VEA"
python3 "$VEA/scripts/setup.py" --lane all --link-skills "$REPO"
grep -q '^ELEVENLABS_API_KEY=.\+' "$VEA/.env" || sed -i 's/^ELEVENLABS_API_KEY=.*/ELEVENLABS_API_KEY=proxy-injected/' "$VEA/.env"
# 2) Motion skills (iart-ai, MIT)
MS="$HOME_DIR/motion-skills"; mkdir -p "$MS" "$REPO/.claude/skills"
for p in tiktok-video-skills webgl-animation-skills explainer-video-skills kinetic-typography-skills motion-design-skills javascript-animation-skills; do
  [ -d "$MS/$p" ] || git clone -q --depth 1 "https://github.com/iart-ai/$p" "$MS/$p"
  for d in "$MS/$p"/skills/*/; do n=$(basename "$d"); [ -e "$REPO/.claude/skills/$n" ] || ln -s "$(realpath --relative-to="$REPO/.claude/skills" "$d")" "$REPO/.claude/skills/$n"; done
done
echo "Listo: $(ls "$REPO/.claude/skills" | wc -l) skills enlazadas."
# 3) FreeLLMAPI (MIT) — router de modelos gratis. Arranca con: cd ../freellmapi && npm run dev  (puerto 3001)
FL="$HOME_DIR/freellmapi"
[ -d "$FL" ] || git clone --depth 1 https://github.com/tashfeenahmed/freellmapi "$FL"
(cd "$FL" && npm install --no-audit --no-fund && { [ -f .env ] || printf "ENCRYPTION_KEY=%s\nPORT=3001\n" "$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" > .env; chmod 600 .env; })
# 4) Lemo-Opuscar (99 estilos de película en código; los videos hechos son tuyos, uso comercial OK)
LO="${LEMO_OPUSCAR_HOME:-$HOME/lemo-opuscar}"
[ -d "$LO" ] || git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar /tmp/lemo-bootstrap
sh "${LO}/plugin/skills/lemo-opuscar/scripts/setup.sh" deps 2>/dev/null || sh /tmp/lemo-bootstrap/plugin/skills/lemo-opuscar/scripts/setup.sh deps
[ -e "$REPO/.claude/skills/lemo-opuscar" ] || ln -s "$LO/plugin/skills/lemo-opuscar" "$REPO/.claude/skills/lemo-opuscar"
# Lemo pide ffmpeg 7+: si el del sistema es más viejo, usa el de imageio-ffmpeg
if [ "$(ffmpeg -version | sed -n '1s/^ffmpeg version n\{0,1\}\([0-9]*\)\..*/\1/p')" -lt 7 ] 2>/dev/null; then
  python3 -m venv "$HOME_DIR/.ff7" && "$HOME_DIR/.ff7/bin/pip" install -q imageio-ffmpeg
  ln -sf "$("$HOME_DIR/.ff7/bin/python" -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" /usr/local/bin/ffmpeg
fi
