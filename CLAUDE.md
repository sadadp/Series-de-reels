# Reglas del proyecto (Chef Michi)

- La cuenta NO es solo de comida mexicana: recetas fáciles de todo el mundo (México incluido).
- PRIORIDAD: explicar bien las recetas, con calidad. Que la gente realmente pueda seguir los pasos
  en su cocina. Lo viral es secundario. Nada de decir las cosas rápido.
  - Guion: todos los ingredientes con cantidad, cada paso con su "cómo" y su truco o el porqué
    (ej. "mueve sin parar para que no se hagan grumos"), en orden, sin saltarse nada.
  - Ritmo tranquilo: los tiempos se calculan con `python3 herramientas/guion.py <receta>`
    (~11 letras por segundo + pausa). Duración libre (60-120 s está bien si se entiende).
  - Cada receta tiene algo que la distinga (su secreto o truco) y se dice desde el inicio.
- Habla en español. Nada de palabras en inglés en los videos (ej. "panqueques", no "hot cakes").
- Cada vez que entregues un video terminado, entrega también su portada (`portadas/<video>-portada.png`
  1080×1920 y `portadas/<video>-youtube.png` 1280×720, con `node marca/generar.js portadas`) y sus captions para cada red
  (Instagram, TikTok, YouTube Shorts con título + descripción, Facebook) y guárdalas en
  `captions/<video>.md`. Instagram, TikTok y Shorts: SENCILLOS, sin receta (ya está en el video): gancho de 1 línea +
  pregunta que divida opiniones + 3 hashtags. Solo Facebook lleva la receta (ingredientes + pasos numerados).
- Voz de Michi: si el usuario sube su audio, úsalo tal cual (`voces/<receta>.wav`) y ajusta
  el video a sus tiempos. Si no, voz clonada con Chatterbox (`voces/michi-ref.wav`).
- Entregas en Google Drive, carpeta "Chef Michi" (IDs en `marca/drive.md`): una subcarpeta por receta
  con portada, miniatura de YouTube y captions (como Documento de Google). Crea la subcarpeta si no existe.
  El conector solo acepta ~3 MB por archivo: los videos se mandan al usuario aquí para que él los suba
  a su carpeta. Los videos NO se guardan en el repo.
- Todo en un paso: `bash hacer-reel.sh <receta>`. Kit de marca y textos de perfil: `marca/`.
