# Render 3D del EP1 (gratis, sin APIs de video)

- `scene.js` + `index.html`: escena Three.js (playa, mar, ola, personajes, cámara POV, textos).
- `render.js`: graba cada cuadro con Chromium (Playwright). Uso: `npm i three@0.170.0` y luego `node render.js range 0 59 frames`.
- `sfx.py`: efectos de sonido hechos con numpy (mar, latido, rugido, tic-tac, golpe).
- Mezcla y video final: ffmpeg (voces de `../audio/` con adelay + sfx, loudnorm -14 LUFS, 1080x1920 H.264).
