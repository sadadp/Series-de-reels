# Series de reels — cocina animada

Reels verticales (1080x1920, 30 fps) de recetas, estilo caricatura:
cocina de azulejos, chef gato animado, título rayado tipo "sticker"
y subtítulos grandes palabra por palabra (la palabra que suena se pinta amarilla).

## Uso

```bash
node render.js hotcakes-platano            # -> salida/hotcakes-platano.mp4 + .srt + guion
node render.js hotcakes-platano --frame 12 # un solo cuadro PNG para revisar
node render.js hotcakes-platano --audio voz.mp3   # mezcla voz/música
```

Vista previa en el navegador: abre `engine/reel.html?r=hotcakes-platano`.

## Voz en off (Kokoro, gratis y local)

```bash
bash herramientas/setup-voz.sh             # una vez por sesión: deps + modelo (~350 MB)
node render.js hotcakes-platano            # crea el video y salida/<receta>-guion.json
python3 voz.py hotcakes-platano --voz em_alex   # voz alineada a cada paso
ffmpeg -i salida/hotcakes-platano.mp4 -i salida/hotcakes-platano-voz.wav \
  -c:v copy -c:a aac -shortest salida/hotcakes-platano-con-voz.mp4
```

Tres motores (`--motor`):

| motor  | voces en español | ejemplo |
|--------|------------------|---------|
| kokoro | em_alex, ef_dora, em_santa | `--motor kokoro --voz ef_dora` |
| edge   | 45 voces neurales de 21 países (MX, US, ES, AR, CO…) | `--motor edge --voz es-MX-DaliaNeural` |
| piper  | es_MX-claude-high, es_MX-ald-medium, es_AR-daniela-high, es_ES-davefx/sharvard/carlfm | `--motor piper --voz es_MX-claude-high` |

Escucha muestras en `salida/voces/` (kokoro), `salida/voces/edge/` y `salida/voces/piper/`.
Edge necesita red a `speech.platform.bing.com`; Piper baja modelos de Hugging Face. Si una frase no cabe en su paso, `voz.py` avisa: sube `dur`.
También hay un servidor MCP (`.mcp.json` → `kokoro-tts`) con la herramienta `text_to_speech`.

## Skills instaladas (`.claude/skills/`)

- **Diseño** (ui-ux-pro-max-skill): ui-ux-pro-max, design, design-system, brand, banner-design, slides, ui-styling
- **Video** (Remotion): remotion-best-practices, -create, -render, -captions, -markup, -studio, -multimedia, …
- **Voz**: speech (OpenAI TTS, pide `OPENAI_API_KEY`), voiceover-narration-studio y voice-cloning-studio (servicio de pago beatra.ai)
- **OpenWhispr**: openwhispr-api, openwhispr-cli (solo sirven con la app OpenWhispr)

## Nueva receta

Copia `recetas/hotcakes-platano.js` y cambia título, pasos y textos.
Cada paso tiene `accion`, `dur` (segundos) y `texto` (subtítulo / guion de voz):

| accion  | qué pasa en pantalla                                   |
|---------|--------------------------------------------------------|
| hook    | abre con el plato terminado en primer plano (gancho)    |
| rewind  | efecto ⏪ de regreso al inicio (`texto: ""`)            |
| intro   | letrero "Receta del chef Michi", chef saluda           |
| presenta| ingrediente baja colgado a la repisa con etiqueta (`etiqueta`, `cuantos`) |
| drop    | ingrediente cae al tazón (`ingrediente` o `ingredientes`) |
| stir    | chef mezcla con cuchara                                 |
| pour    | masa a la sartén, fuego y vapor                         |
| flip    | burbujas y vuelta en el aire                            |
| serve   | pila en plato + toppings (`toppings`: miel, mantequilla, canela) |
| outro   | título final, chef feliz                                |

Ingredientes dibujados: platano, huevo, avena, leche, harina, azucar, mantequilla, miel, canela.

## Salida

- `salida/<receta>.mp4` — video sin audio (agrega voz con `--audio`)
- `salida/<receta>.srt` — subtítulos
- `salida/<receta>-guion.txt` — guion con tiempos para grabar la voz

Fuentes: Luckiest Guy, Lilita One, Baloo 2 (Google Fonts, licencia OFL/Apache).
