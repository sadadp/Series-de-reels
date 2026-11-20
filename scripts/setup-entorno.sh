#!/bin/bash
# Herramientas globales de Claude (skills, plugins, CLIs) para cada sesion nueva. Idempotente; nunca frena el arranque.
set +e
H=/home/user; S=/root/.claude/skills; mkdir -p "$S"
export PATH="/root/.local/bin:$PATH"
cl(){ [ -d "$2" ] || git clone -q --depth 1 "https://github.com/$1" "$2"; }
lnk(){ for d in "$1"/*/; do n=$(basename "$d"); [ -f "$d/SKILL.md" ] && [ ! -e "$S/$n" ] && ln -s "$d" "$S/$n"; done; }
command -v uv >/dev/null || pip install -q uv
# Video Editor Agent (21 skills de edicion)
cl mrpaidsocial/mrpaidsocial-video-editor-agent $H/video-editor-agent
python3 $H/video-editor-agent/scripts/setup.py --lane all >/dev/null 2>&1
sed -i 's/^ELEVENLABS_API_KEY=$/ELEVENLABS_API_KEY=proxy-injected/' $H/video-editor-agent/.env
lnk $H/video-editor-agent/.claude/skills
# Motion skills (iart-ai)
for p in tiktok webgl-animation explainer-video kinetic-typography motion-design javascript-animation; do
  [ "$p" = tiktok ] && p=tiktok-video
  cl iart-ai/$p-skills $H/motion-skills/$p-skills; lnk $H/motion-skills/$p-skills/skills
done
# Lemo-Opuscar (99 estilos) + ffmpeg 7+
cl lemomo-ai/lemo-opuscar /tmp/lemo-boot
sh /tmp/lemo-boot/plugin/skills/lemo-opuscar/scripts/setup.sh deps >/dev/null 2>&1
[ -e $S/lemo-opuscar ] || ln -s /root/lemo-opuscar/plugin/skills/lemo-opuscar $S/lemo-opuscar
if [ ! -x $H/.ff7/bin/python ]; then python3 -m venv $H/.ff7 && $H/.ff7/bin/pip install -q imageio-ffmpeg; fi
ln -sf "$($H/.ff7/bin/python -c 'import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())')" /usr/local/bin/ffmpeg
# Ponytail, grill-me
cl DietrichGebert/ponytail $H/ponytail; lnk $H/ponytail/skills
[ -d $S/grill-me ] || { cl RobMitt/grill-me-skill $S/grill-me && rm -rf $S/grill-me/.git; }
# SkillSpector (escaner de seguridad)
cl NVIDIA/SkillSpector $H/SkillSpector
[ -x $H/SkillSpector/.venv/bin/skillspector ] || { python3 -m venv $H/SkillSpector/.venv && $H/SkillSpector/.venv/bin/pip install -q -e $H/SkillSpector; }
# CLIs: Agent-Reach, graphify, browser-use
command -v agent-reach >/dev/null || { uv tool install https://github.com/Panniantong/Agent-Reach/releases/latest/download/agent-reach.zip && agent-reach setup >/dev/null; }
command -v graphify >/dev/null || { uv tool install graphifyy && graphify install >/dev/null; }
command -v browser-use >/dev/null || { uv tool install browser-use==1.0.6 && browser-use skill install >/dev/null; }
# gstack (prefijo gstack-, sin navegador ni hooks)
[ -d $S/gstack ] || { cl garrytan/gstack $S/gstack && (cd $S/gstack && ./setup --host claude --prefix --no-browser --no-plan-tune-hooks --no-timeline-stop-hook </dev/null >/dev/null); }
# BMAD (skills globales)
[ -d $S/bmad ] || for p in core-tools method; do npx -y skills add bmad-code-org/BMAD-METHOD/skills/$p --skill '*' --global --agent claude-code -y >/dev/null; done
# Plugins: humanizer, claude-mem (sin telemetria), GSD Core, i-have-adhd (apagado)
for m in blader/humanizer ayghri/i-have-adhd thedotmack/claude-mem open-gsd/gsd-core; do claude plugin marketplace add $m >/dev/null 2>&1; done
for p in humanizer@humanizer claude-mem@thedotmack gsd-core@gsd-core i-have-adhd@i-have-adhd; do claude plugin install $p --scope user >/dev/null 2>&1; done
claude plugin disable i-have-adhd@i-have-adhd --scope user >/dev/null 2>&1
npx -y claude-mem telemetry disable >/dev/null 2>&1
# OpenMontage (produccion de video) + GSAP + FreeLLMAPI (solo descarga)
cl OpenMontageInc/OpenMontage $H/OpenMontage
if [ ! -x $H/OpenMontage/.venv/bin/python ]; then python3 -m venv $H/OpenMontage/.venv && $H/OpenMontage/.venv/bin/pip install -q -r $H/OpenMontage/requirements.txt; fi
[ -d $H/OpenMontage/remotion-composer/node_modules ] || (cd $H/OpenMontage/remotion-composer && npm install --no-audit --no-fund >/dev/null)
npm ls -g gsap >/dev/null 2>&1 || npm i -g gsap@3.15.1 >/dev/null
cl greensock/GSAP $H/GSAP; cl tashfeenahmed/freellmapi $H/freellmapi
echo "Herramientas listas: $(ls $S | wc -l) skills de usuario."
exit 0
