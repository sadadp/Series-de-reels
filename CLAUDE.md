# Reglas del proyecto (Chef Michi)

- La cuenta NO es solo de comida mexicana: recetas fáciles de todo el mundo (México incluido).
- Habla en español. Nada de palabras en inglés en los videos (ej. "panqueques", no "hot cakes").
- Cada vez que entregues un video terminado, entrega también su portada (`portadas/<video>-portada.png`
  1080×1920 y `portadas/<video>-youtube.png` 1280×720, con `node marca/generar.js portadas`) y sus captions para cada red
  (Instagram, TikTok, YouTube Shorts con título + descripción, Facebook) y guárdalas en
  `captions/<video>.md`. En recetas, el caption lleva la receta completa en texto
  (ingredientes + pasos), para que la guarden. Facebook: texto más largo y cercano.
- Voz de Michi: si el usuario sube su audio, úsalo tal cual (`voces/<receta>.wav`) y ajusta
  el video a sus tiempos. Si no, voz clonada con Chatterbox (`voces/michi-ref.wav`).
- Todo en un paso: `bash hacer-reel.sh <receta>`. Kit de marca y textos de perfil: `marca/`.
