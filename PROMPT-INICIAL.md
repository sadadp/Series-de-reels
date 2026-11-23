# Prompt inicial + todas las herramientas (para una sesión nueva)

## 1. Antes de abrir la sesión nueva
Las herramientas se instalan solas con el **script de inicio del entorno**. Tienes 2 caminos:
- **Fácil:** al abrir la sesión nueva (con el repo de ventas), elige el entorno **Series-de-reels**. Ya tiene el script y las llaves de ElevenLabs y Gemini.
- **Entorno propio para ventas:** crea un entorno nuevo (Settings → entornos → Nuevo) y pega en *Setup script* el contenido de [`scripts/setup-entorno.sh`](scripts/setup-entorno.sh). Las llaves (ElevenLabs, etc.) se agregan en *Network secrets* de ese entorno.

> La primera sesión tarda varios minutos en arrancar porque descarga todo.

## 2. Prompt para pegar al inicio
```text
Proyecto: sistema de ventas. Trabaja en español y responde corto.

AHORRO DE TOKENS (obligatorio)
- No leas archivos completos si no hace falta: primero /graphify . para mapear el repo, luego lee solo lo necesario. Archivos enormes (logs, CSV, JSON): skill headroom.
- Código mínimo: usa ponytail (nivel full). Nada de dependencias nuevas si ya existe algo en el repo o en la plataforma.
- No lances subagentes salvo que yo lo pida o sea trabajo largo e independiente.
- No repitas lo que ya dije ni resumas al final lo que acabas de hacer en detalle; dame el resultado y el siguiente paso.
- Recuerda decisiones con claude-mem (save_memory) para no volver a preguntarlas.

FLUJO
1. Idea/plan: /bmad-forge-idea o /grill-me para aterrizar la idea; /bmad-agent-analyst para mercado y competencia; /bmad-agent-pm para el PRD.
2. Arquitectura: /bmad-architecture o /gstack-plan-eng-review. Si es multi-fase: /gsd-new-project y /gsd-plan-phase.
3. Construir: /gsd-execute-phase o /bmad-build, siempre con ponytail.
4. Revisar: /gstack-review (o /ponytail-review) antes de cada commit grande; seguridad: /gstack-cso; QA: /gstack-qa.
5. Publicar: skills de vercel (deploy, env, storage) y /gstack-ship.
6. Ventas y marketing: social-media-skills (estrategia, captions, hooks, embudos, lead magnets, social selling, DM) y humanizer para que los textos no suenen a IA.
7. Investigación web: browser-use (navegar/llenar formularios) y agent-reach (YouTube, Reddit, X, GitHub).
8. Videos de venta: reel-style-clone, branded-ad-edit, sound-design, video-qa, remotion-video, lemo-opuscar; voces con ElevenLabs.

REGLAS
- Antes de instalar una skill nueva, escanéala: ~/SkillSpector/.venv/bin/skillspector scan <carpeta> --no-llm
- Pide confirmación antes de borrar algo, gastar créditos (ElevenLabs/APIs) o publicar.
- Commits pequeños y push al terminar cada parte.
```

## 3. Inventario completo
| Grupo | Para qué | Skills / comandos |
|---|---|---|
| **BMAD-METHOD** | Equipo ágil: analista, PM, arquitecto, dev, UX, PO | `bmad`, `bmad-agent-analyst`, `bmad-agent-pm`, `bmad-agent-po`, `bmad-agent-architect`, `bmad-agent-dev`, `bmad-agent-ux-designer`, `bmad-architecture`, `bmad-ux`, `bmad-build`, `bmad-build-auto`, `bmad-code-review`, `bmad-review`, `bmad-qa-generate-e2e-tests`, `bmad-brainstorming`, `bmad-forge-idea`, `bmad-deep-recon`, `bmad-advanced-elicitation`, `bmad-party-mode`, `bmad-ingest`, `bmad-shard-pro`, `bmad-project-context`, `bmad-retrospective`, `bmad-walkthrough`, `bmad-facilitate`, `bmad-customize` |
| **GSD Core** (plugin) | Proyecto por fases con commits atómicos | `/gsd-new-project`, `/gsd-plan-phase`, `/gsd-execute-phase`, `/gsd-verify-work`, `/gsd-quick`, `/gsd-fast`, `/gsd-debug`, `/gsd-code-review`, `/gsd-progress`, `/gsd-next`, `/gsd-ship`, `/gsd-help` (+70 más) |
| **gstack** | "Equipo virtual" de Garry Tan: planes, review, QA, seguridad, release | `gstack-*` (~60): `plan-ceo-review`, `plan-eng-review`, `plan-design-review`, `review`, `qa`, `cso`, `ship`, `verify`, `spec`, `health`, `retro`, `design-consultation`, `design-review`, `diagram`, `make-pdf`, `office-hours`, `context-save/restore`… |
| **Ponytail** | Código mínimo y revisiones | `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help` |
| **graphify** (CLI) | Mapa del repo para no leer todo | `/graphify .` |
| **claude-mem** (plugin) | Memoria entre sesiones (telemetría apagada) | `mem-search`, `make-plan`, `do`, `handoff`, `learn-codebase`, `smart-explore`… |
| **grill-me** | Te interroga hasta aterrizar un plan | `grill-me` |
| **humanizer** (plugin) | Textos que no suenan a IA | `humanizer` |
| **social-media-skills** (plugin) | Marketing y ventas en redes | estrategia, captions, hooks, `lead-magnets-and-funnels`, `social-selling-and-dm`, `email-and-newsletter`, `link-in-bio-and-traffic`, `analytics-and-reporting`, `campaign-and-launch-planning`, `ugc-and-influencer`, `social-proof-and-testimonials`… (≈100) |
| **vercel** (plugin) | Deploy, entorno, base de datos, IA | `vercel:deploy`, `vercel:env`, `vercel:nextjs`, `vercel:ai-sdk`, `vercel:vercel-storage`, `vercel:auth`… (necesita red a vercel) |
| **browser-use** (CLI) | Navegador real: clics, formularios, capturas | `browser-use` |
| **Agent-Reach** (CLI) | Leer YouTube, Reddit, X, GitHub | `agent-reach` (la red de este entorno bloquea YouTube/Reddit) |
| **headroom** (plugin) | Archivos gigantes sin leerlos completos | `headroom`, `headroom:peek` |
| **frontend-design** (plugin) | Diseño de interfaces con criterio | `frontend-design` |
| **Video Editor Agent** | Edición de reels y anuncios | `video-edit-pipeline`, `reel-style-clone`, `branded-ad-edit`, `reel-recut`, `sound-design`, `video-qa`, `hook-variations`, `edl-tighten`, `capcut-export`… (21) |
| **Motion skills** (iart-ai) | Motion graphics y video con código | `short-form-video`, `caption-animation`, `kinetic-typography`, `remotion-video`, `threejs-animation`, `explainer-video`, `countdown-video`, `soundtrack`… (24) |
| **Lemo-Opuscar** | 99 estilos de película en código | `lemo-opuscar` |
| **OpenMontage** | Producción de video con agentes (AGPL) | carpeta `~/OpenMontage` |
| **GSAP** | Librería de animación | `npm install gsap` |
| **SkillSpector** | Escáner de seguridad de skills | `~/SkillSpector/.venv/bin/skillspector scan <carpeta> --no-llm` |
| **caveman** (plugin) | Respuestas ultra cortas (ahorra tokens) | `/caveman:caveman` |
| **i-have-adhd** (plugin, apagado) | Respuestas fáciles de leer | `claude plugin enable i-have-adhd@i-have-adhd` |
| **ElevenLabs** (conector) | Voces, efectos, video con IA | herramientas `creative_*` (gasta créditos) |

**No instalados a propósito:** `free-claude-code` (cambia el modelo de todas tus sesiones) y FreeLLMAPI/Open Generative AI (descargados, necesitan llaves de pago o GPU).
