# Herramientas instaladas para Claude

Estado al 20-nov-2026. "Global" = nivel usuario (`~/.claude/skills`, plugins de usuario o CLIs en el PATH): sirve en cualquier repo **de este mismo contenedor**. Un contenedor nuevo empieza vacío: ver "Que dure entre sesiones" al final.

## Instaladas

| Herramienta | Qué hace | Dónde | Licencia | Notas |
|---|---|---|---|---|
| grill-me | Te interroga sobre un plan hasta que no quede ninguna duda | skill global | sin licencia | Uso personal OK; no redistribuir |
| humanizer | Quita el "tono IA" a textos (captions, guiones) | plugin global | MIT | `humanizer@humanizer` |
| browser-use | Controla un navegador real (clics, formularios, capturas) | CLI + skill global | MIT | Para su agente propio pide llave (Browser Use Cloud u otro modelo) |
| graphify | Mapa de conocimiento de un repo (`/graphify .`) | CLI + skill global | MIT/Apache | El código se analiza local, sin llave |
| OpenMontage | Sistema de producción de video con agentes | `/home/user/OpenMontage` | **AGPL-3.0** | Se trabaja abriendo esa carpeta. Si lo modificas y lo ofreces como servicio, debes publicar tu código |
| GSAP 3.15 | Librería de animación JS (incl. SplitText, MorphSVG) | npm global + `/home/user/GSAP` | "no charge" de GSAP | En cada proyecto: `npm install gsap` |
| Video Editor Agent | 21 skills de edición de reels | skills globales | sin licencia | Uso personal OK |
| Motion skills (iart-ai) | 24 skills de motion graphics | skills globales | MIT | |
| Lemo-Opuscar | 99 estilos de película en código | skill global | código MIT; docs CC BY-NC + permiso para tus películas | Películas hechas = tuyas, uso comercial OK |
| Ponytail | Código mínimo, review y audit | skills globales | MIT | Hooks/barra no funcionan en la nube |
| SkillSpector | Escanea skills antes de instalar | `/home/user/SkillSpector` | Apache-2.0 | `skillspector scan <carpeta> --no-llm` |
| Agent-Reach | Leer YouTube, Reddit, X, GitHub | CLI + skill | MIT | Esta red bloquea YouTube/Reddit |
| FreeLLMAPI | Router de modelos gratis | `/home/user/freellmapi` | MIT | Red bloqueada; pide cuentas por proveedor |

## También instaladas (con tu permiso)

| Herramienta | Qué hace | Cómo quedó |
|---|---|---|
| GSD Core | Flujo por fases para proyectos | **El repo que mandaste (get-shit-done) está archivado**; instalé el nuevo, `open-gsd/gsd-core`, como plugin. Su instalador `npx` lo bloqueó la seguridad de la sesión |
| gstack | "Equipo virtual" (CEO, diseño, QA, release) | ~60 skills con prefijo `gstack-` (ej. `/gstack-review`). Sin navegador ni hooks; para las skills de navegador: `cd ~/.claude/skills/gstack && ./setup` |
| claude-mem | Memoria entre sesiones | Plugin, **telemetría apagada**. En la nube la memoria se borra con el contenedor |
| BMAD-METHOD | Agentes ágiles (analista, PM, arquitecto, dev, UX) | Skills globales v7 (alfa): `bmad-*`. Para el instalador estable v6: `npx bmad-method install` dentro de cada proyecto |
| i-have-adhd | Respuestas cortas y fáciles de leer | Plugin **apagado** (cambia todas las respuestas). Encender: `claude plugin enable i-have-adhd@i-have-adhd` |

## No recomendado

| Herramienta | Por qué |
|---|---|
| free-claude-code | Redirige Claude Code a otros modelos/proveedores. Instalado global, **cambia a qué modelo hablas en todas tus sesiones** y pide llaves de esos proveedores. Descargado, sin activar |

## Que dure entre sesiones

Esta nube borra el contenedor al terminar la sesión. El entorno **Series-de-reels** ya tiene un **script de inicio** (copia en `scripts/setup-entorno.sh`) que reinstala todo al arrancar cada sesión nueva. Para usarlo con otro repo, elige el entorno Series-de-reels al abrir la sesión, o pega el mismo script en el entorno Default (Settings → entorno → Edit → Setup script).
