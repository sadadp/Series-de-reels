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
