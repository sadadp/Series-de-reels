# Lo que tomamos de Lemo-Opuscar

Repositorio: https://github.com/lemomo-ai/lemo-opuscar (código MIT; sus guías son CC BY-NC, solo las leemos como referencia).
Copia local para consulta: `/home/user/lemomo-ai/lemo-opuscar` (no se guarda en este repo).

## Ya integrado
- `engine3d/post.js`: su módulo de posproceso (MIT, con crédito en la cabecera).
  - Por defecto (`post=lite`): color cálido + viñeta con CSS. Casi no cuesta tiempo de render.
  - `node render.js <receta> --post dof`: además profundidad de campo (fondo desenfocado). ~6× más lento.
  - `--post full`: además oclusión ambiental. ~9× más lento. Solo para tomas especiales.
  - `--sin-post`: sin nada.
- Poses de brazos mezcladas entre pasos (`poseBrazos` en `engine3d/reel3d.js`): ya no brincan de una pose a otra;
  llegan con suavidad y un pequeño rebote (anticipación y seguimiento).

## Ideas pendientes de sus guías
- Al menos 4 movimientos de cámara distintos por video y una toma "firma" que se recuerde.
- El personaje debe ocupar al menos un tercio de la altura del cuadro en los momentos clave.
- Que los subtítulos nunca tapen lo importante.
- Objetos sostenidos entre las dos manos cuando se usan ambas.
