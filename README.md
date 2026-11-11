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

## Nueva receta

Copia `recetas/hotcakes-platano.js` y cambia título, pasos y textos.
Cada paso tiene `accion`, `dur` (segundos) y `texto` (subtítulo / guion de voz):

| accion  | qué pasa en pantalla                                   |
|---------|--------------------------------------------------------|
| intro   | plano abierto, título rebota, chef saluda              |
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
