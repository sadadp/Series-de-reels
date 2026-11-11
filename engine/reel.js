/* Motor de reels de cocina.
 * Todo se dibuja en SVG 1080x1920 y depende solo del tiempo t,
 * así cada cuadro se puede renderizar igual siempre (renderAt(t)).
 */
(() => {
  const R = window.RECETA;
  const W = 1080, H = 1920;
  const NS = "http://www.w3.org/2000/svg";

  // ---------- utilidades ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = p => (p = clamp(p), p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const easeIn = p => (p = clamp(p), p * p);
  const easeOutBack = p => { p = clamp(p); const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, p) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(lerp(v, B[i], clamp(p))).toString(16).padStart(2, "0")).join(""); };
  const $ = id => document.getElementById(id);
  const set = (id, attrs) => { const el = $(id); if (el) for (const k in attrs) el.setAttribute(k, attrs[k]); };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---------- paleta ----------
  const P = Object.assign({
    pared: "#f6f1e4", azul: "#2f5b9a", azulOscuro: "#1f3f70", amarillo: "#f4c430",
    madera: "#b9753d", maderaOscura: "#7a4a24", encimera: "#f1eee8", gato: "#f08a2c",
    gatoOscuro: "#c9661a", batter: "#efc77a", dorado: "#d58a2f",
  }, R.paleta || {});

  // ---------- línea de tiempo ----------
  let t0 = 0;
  const pasos = R.pasos.map(p => { const s = { ...p, inicio: t0 }; t0 += p.dur; return s; });
  const DURACION = t0;
  const BOWL = { x: 300, y: 1260 }, PAN = { x: 800, y: 1260 }, PLATE = { x: 300, y: 1260 };
  const zonaDe = a => ({ drop: "bowl", stir: "bowl", pour: "pan", flip: "pan", serve: "plate", hook: "hook", rewind: "intro", intro: "intro" }[a] || "wide");
  const CAMS = {
    wide:  { x: 540, y: 1000, z: 1.22 },
    bowl:  { x: 400, y: 1060, z: 1.55 },
    pan:   { x: 740, y: 1060, z: 1.55 },
    plate: { x: 400, y: 1060, z: 1.55 },
    hook:  { x: 300, y: 1150, z: 2.7 },
    intro: { x: 540, y: 760, z: 1.15 },
  };
  const CHEF_X = { wide: 560, bowl: 480, pan: 640, plate: 480, hook: 500, intro: 620 };
  // repisa de ingredientes: cada paso "presenta" ocupa un lugar
  const SHELF_Y = 1020;
  const presentas = pasos.filter(p => p.accion === "presenta");
  presentas.forEach((p, n) => { p.slot = 170 + n * 270; p.n = n; });
  const camDe = p => p.accion === "presenta" ? { x: Math.max(380, p.slot + 110), y: 960, z: 1.6 } : CAMS[zonaDe(p.accion)];
  const chefDe = p => p.accion === "presenta" ? p.slot + 190 : CHEF_X[zonaDe(p.accion)];
  // ¿en qué paso se usa (cae al tazón) cada ingrediente presentado?
  presentas.forEach(pr => {
    pr.usoI = pasos.findIndex(s => s.accion === "drop" && (s.ingrediente === pr.ingrediente || (s.ingredientes || []).includes(pr.ingrediente)));
  });

  function pasoEn(t) {
    let i = pasos.findIndex(p => t < p.inicio + p.dur);
    if (i < 0) i = pasos.length - 1;
    const p = pasos[i];
    return { i, p, u: t - p.inicio, k: clamp((t - p.inicio) / p.dur) };
  }

  // ---------- dibujos de ingredientes (centrados en 0,0, ~140px) ----------
  const INGR = {
    platano: `<path d="M-70,-30 C-40,40 40,50 75,-15 L68,-25 C30,20 -30,15 -55,-40 Z" fill="#f7d33c" stroke="#5a3a12" stroke-width="7" stroke-linejoin="round"/><path d="M-70,-30 l-12,-14 l14,-4 l12,12z" fill="#5a3a12"/><path d="M-40,0 C-10,25 30,25 55,0" fill="none" stroke="#e0b82a" stroke-width="6"/>`,
    huevo: `<ellipse cx="0" cy="0" rx="48" ry="62" fill="#fff8ea" stroke="#5a3a12" stroke-width="7"/><ellipse cx="-16" cy="-22" rx="10" ry="16" fill="#fff" opacity=".9"/>`,
    avena: `<path d="M-60,-30 L60,-30 L48,60 L-48,60 Z" fill="#c9844a" stroke="#5a3a12" stroke-width="7" stroke-linejoin="round"/><ellipse cx="0" cy="-32" rx="64" ry="26" fill="#ecd9a8" stroke="#5a3a12" stroke-width="7"/>${[...Array(9)].map((_, i) => `<ellipse cx="${-40 + (i % 5) * 20}" cy="${-38 + Math.floor(i / 5) * 12}" rx="8" ry="5" fill="#d4b878"/>`).join("")}<rect x="-30" y="5" width="60" height="26" rx="6" fill="#fff4dc"/>`,
    leche: `<rect x="-38" y="-50" width="76" height="110" rx="10" fill="#fff" stroke="#5a3a12" stroke-width="7"/><path d="M-38,-50 L-20,-80 L20,-80 L38,-50" fill="#fff" stroke="#5a3a12" stroke-width="7" stroke-linejoin="round"/><rect x="-38" y="-5" width="76" height="34" fill="#4d8de0"/>`,
    harina: `<path d="M-50,-60 L50,-60 L58,60 L-58,60 Z" fill="#f4ead2" stroke="#5a3a12" stroke-width="7" stroke-linejoin="round"/><path d="M-50,-60 l12,-14 l14,14 l14,-14 l14,14 l14,-14 l12,14" fill="#f4ead2" stroke="#5a3a12" stroke-width="6"/><circle cx="0" cy="8" r="20" fill="#f4c430"/>`,
    azucar: `<rect x="-45" y="-50" width="90" height="105" rx="14" fill="#ffffff" stroke="#5a3a12" stroke-width="7"/><rect x="-45" y="-20" width="90" height="40" fill="#e65a7a"/>`,
    mantequilla: `<path d="M-60,-10 L40,-30 L70,0 L-30,20 Z" fill="#ffe27a" stroke="#5a3a12" stroke-width="7" stroke-linejoin="round"/><path d="M-30,20 L70,0 L70,25 L-30,45 Z M-60,-10 L-30,20 L-30,45 L-60,15 Z" fill="#f2c94c" stroke="#5a3a12" stroke-width="7" stroke-linejoin="round"/>`,
    miel: `<path d="M-45,-30 Q-55,60 0,62 Q55,60 45,-30 Z" fill="#f3a712" stroke="#5a3a12" stroke-width="7"/><rect x="-36" y="-55" width="72" height="28" rx="8" fill="#b9753d" stroke="#5a3a12" stroke-width="7"/><rect x="-25" y="0" width="50" height="30" rx="6" fill="#fff4dc"/>`,
    canela: `<rect x="-60" y="-14" width="120" height="22" rx="10" fill="#9a5a2e" stroke="#5a3a12" stroke-width="6" transform="rotate(-18)"/><rect x="-60" y="-14" width="120" height="22" rx="10" fill="#b06a35" stroke="#5a3a12" stroke-width="6" transform="rotate(12) translate(0,18)"/>`,
  };

  // ---------- escena ----------
  function svgEscena() {
    const sparks = [...Array(14)].map((_, i) => {
      const x = 60 + rnd() * 960, y = 300 + rnd() * 1300, s = 0.5 + rnd() * 0.9;
      return `<path id="sp${i}" data-x="${x}" data-y="${y}" data-s="${s}" data-f="${rnd() * 6}" d="M0,-30 Q4,-4 30,0 Q4,4 0,30 Q-4,4 -30,0 Q-4,-4 0,-30Z" fill="#fff" stroke="#3a3a3a" stroke-width="2.5" opacity="0"/>`;
    }).join("");

    return `
<svg xmlns="${NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <pattern id="azulejo" width="150" height="150" patternUnits="userSpaceOnUse">
    <rect width="150" height="150" fill="${P.pared}"/>
    <rect width="150" height="150" fill="none" stroke="#dcd4c2" stroke-width="3"/>
    <g transform="translate(75,75)">
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<ellipse rx="9" ry="22" cy="-24" fill="${P.azul}" transform="rotate(${a})"/>`).join("")}
      <circle r="11" fill="${P.amarillo}"/>
    </g>
    ${[[0, 0], [150, 0], [0, 150], [150, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${P.azul}" stroke-width="9"/><circle cx="${x}" cy="${y}" r="9" fill="${P.azul}"/>`).join("")}
  </pattern>
  <pattern id="rayas" width="40" height="40" patternUnits="userSpaceOnUse">
    <rect width="40" height="20" fill="#fff1d2"/><rect y="20" width="40" height="20" fill="#7a4521"/>
  </pattern>
  <clipPath id="bowlClip"><path d="M-130,-118 Q-125,10 0,12 Q125,10 130,-118 Z"/></clipPath>
  <radialGradient id="vineta" cx="50%" cy="45%" r="75%"><stop offset="65%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".28"/></radialGradient>
</defs>

<g id="cam">
  <!-- pared -->
  <rect x="-600" y="-600" width="${W + 1200}" height="1900" fill="url(#azulejo)"/>
  <!-- letrero de la receta -->
  <g transform="translate(540,330)">
    <rect x="-330" y="-150" width="660" height="300" rx="26" fill="${P.maderaOscura}"/>
    <rect x="-310" y="-130" width="620" height="260" rx="18" fill="#263a33" stroke="#f6f1e4" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/>
    <text y="-58" text-anchor="middle" font-family="Lilita" font-size="40" letter-spacing="3" fill="#f6f1e4">${R.letrero || "RECETA DEL CHEF MICHI"}</text>
    <text y="30" text-anchor="middle" font-family="Luckiest" font-size="86" fill="${P.amarillo}" stroke="#3a1f0d" stroke-width="10" paint-order="stroke">${R.pizarron?.[0] || ""}</text>
    <text y="100" text-anchor="middle" font-family="Lilita" font-size="44" fill="#f6f1e4">${R.pizarron?.[1] || ""}</text>
  </g>
  <!-- repisa de ingredientes -->
  <rect x="-200" y="${SHELF_Y}" width="1500" height="26" rx="6" fill="${P.madera}"/>
  <rect x="-200" y="${SHELF_Y + 22}" width="1500" height="10" fill="${P.maderaOscura}" opacity=".5"/>
  ${[60, 520, 980].map(x => `<path d="M${x},${SHELF_Y + 26} l0,60 l-40,-60z" fill="${P.maderaOscura}"/>`).join("")}
  ${presentas.map(pr => {
    const cant = pr.cuantos || 1, et = (pr.etiqueta || "").toUpperCase(), ew = et.length * 21 + 44;
    const arte = [...Array(cant)].map((_, j) => `<g transform="translate(${(j - (cant - 1) / 2) * 80},0)">${INGR[pr.ingrediente] || INGR.huevo}</g>`).join("");
    return `<g id="item${pr.n}" opacity="0">
      <line id="hilo${pr.n}" x1="0" y1="-2000" x2="0" y2="-60" stroke="#5a3a12" stroke-width="4"/>
      <g transform="translate(0,-250)"><rect x="${-ew / 2}" y="-30" width="${ew}" height="60" rx="14" fill="#2a1a10" stroke="${P.amarillo}" stroke-width="4"/>
      <text y="13" text-anchor="middle" font-family="Lilita" font-size="38" fill="${P.amarillo}">${et}</text></g>
      <g transform="scale(0.85)">${arte}</g></g>`;
  }).join("")}

  <!-- gabinetes -->
  <rect x="-600" y="1320" width="${W + 1200}" height="900" fill="${P.azul}"/>
  ${[-520, -170, 180, 530, 880, 1230].map(x => `<rect x="${x}" y="1370" width="320" height="300" rx="16" fill="none" stroke="${P.azulOscuro}" stroke-width="10"/><rect x="${x + 110}" y="1420" width="100" height="16" rx="8" fill="${P.amarillo}"/><rect x="${x}" y="1710" width="320" height="300" rx="16" fill="none" stroke="${P.azulOscuro}" stroke-width="10"/>`).join("")}
  <!-- encimera -->
  <rect x="-600" y="1255" width="${W + 1200}" height="70" fill="${P.encimera}"/>
  <rect x="-600" y="1255" width="${W + 1200}" height="10" fill="#fff"/>
  <rect x="-600" y="1320" width="${W + 1200}" height="12" fill="#cfc8bb"/>

  <!-- estufa / sartén -->
  <g transform="translate(${PAN.x},${PAN.y})">
    <ellipse cx="0" cy="0" rx="130" ry="20" fill="#3a3a3a"/>
    <ellipse id="flama" cx="0" cy="-6" rx="90" ry="10" fill="#ff8a1f" opacity="0"/>
    <rect x="110" y="-58" width="170" height="24" rx="12" fill="#2b2b2b" transform="rotate(-6,110,-46)"/>
    <path d="M-125,-70 L125,-70 L110,-22 Q0,-8 -110,-22 Z" fill="#3b3f46"/>
    <ellipse cx="0" cy="-70" rx="125" ry="26" fill="#5b616b"/>
    <ellipse cx="0" cy="-68" rx="108" ry="19" fill="#2a2d33"/>
    <g id="hotcake" transform="translate(0,-70)">
      <ellipse id="hotcakeBody" cx="0" cy="0" rx="80" ry="15" fill="${P.batter}" stroke="#a8692a" stroke-width="4"/>
      <g id="burbujas">${[...Array(7)].map((_, i) => `<circle id="bb${i}" cx="${-50 + i * 16}" cy="${((i * 7) % 11) - 5}" r="4" fill="#fff6dd" stroke="#a8692a" stroke-width="2" opacity="0"/>`).join("")}</g>
    </g>
    <g id="vapor" opacity="0">${[-40, 0, 40].map((x, i) => `<path id="vp${i}" d="M${x},-110 q-15,-25 0,-50 q15,-25 0,-50" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".8"/>`).join("")}</g>
  </g>

  <!-- tazón -->
  <g id="bowl" transform="translate(${BOWL.x},${BOWL.y})">
    <ellipse cx="0" cy="0" rx="110" ry="14" fill="#000" opacity=".15"/>
    <ellipse cx="0" cy="-118" rx="130" ry="30" fill="#e7e2d8"/>
    <g clip-path="url(#bowlClip)">
      <ellipse id="relleno" cx="0" cy="0" rx="130" ry="28" fill="${P.batter}"/>
      <path id="remolino" d="M-60,0 q30,-14 60,0 t60,0" fill="none" stroke="#c99a52" stroke-width="7" stroke-linecap="round" opacity="0"/>
    </g>
    <path d="M-130,-118 Q-125,10 0,12 Q125,10 130,-118 Q125,-92 0,-88 Q-125,-92 -130,-118 Z" fill="#fbfaf6" stroke="#cfc8bb" stroke-width="4"/>
    <path d="M-100,-60 Q-90,-20 -50,-8" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  </g>

  <!-- plato final -->
  <g id="plato" transform="translate(${PLATE.x},${PLATE.y})" opacity="0">
    <ellipse cx="0" cy="-8" rx="160" ry="30" fill="#fbfaf6" stroke="#cfc8bb" stroke-width="5"/>
    <ellipse cx="0" cy="-14" rx="110" ry="18" fill="#efeae0"/>
    ${[0, 1, 2, 3].map(i => `<g id="pila${i}"><rect x="-95" y="${-48 - i * 32}" width="190" height="30" rx="15" fill="${P.dorado}" stroke="#7a4521" stroke-width="5"/><ellipse cx="0" cy="${-48 - i * 32}" rx="95" ry="12" fill="#e9a650" stroke="#7a4521" stroke-width="5"/></g>`).join("")}
    <path id="mielDrip" d="M-70,-150 Q0,-175 70,-150 L70,-120 Q60,-95 52,-118 Q40,-140 20,-120 L20,-80 Q10,-60 2,-80 L0,-130 Q-30,-140 -40,-110 Q-48,-90 -56,-112 Z" fill="#f3a712" stroke="#a0620e" stroke-width="4" opacity="0"/>
    <g id="mantequillaTop" opacity="0"><rect x="-26" y="-178" width="52" height="30" rx="6" fill="#ffe27a" stroke="#7a4521" stroke-width="4"/></g>
    <g id="canelaPolvo" opacity="0">${[...Array(16)].map((_, i) => `<circle cx="${-80 + rnd() * 160}" cy="${-160 + rnd() * 30}" r="3.5" fill="#7a4521"/>`).join("")}</g>
  </g>

  <!-- chef -->
  <g id="chef">${svgChef()}</g>

  <!-- ingredientes cayendo -->
  <g id="caida"></g>

  ${sparks}
</g>

<rect width="${W}" height="${H}" fill="url(#vineta)"/>

<!-- rebobinar -->
<g id="rew" opacity="0">
  <rect width="${W}" height="${H}" fill="#0b1a33" opacity=".35"/>
  ${[...Array(48)].map((_, i) => `<rect y="${i * 40}" width="${W}" height="6" fill="#fff" opacity=".07"/>`).join("")}
  <rect id="rewBarra" x="0" y="0" width="${W}" height="70" fill="#fff" opacity=".18"/>
  <g transform="translate(540,960)">
    <rect x="-150" y="-80" width="300" height="160" rx="80" fill="#000" opacity=".55"/>
    <path d="M-10,-45 L-90,0 L-10,45Z M80,-45 L0,0 L80,45Z" fill="#fff"/>
  </g>
</g>

<!-- título -->
<g id="titulo" transform="translate(540,220)" opacity="0">
  ${R.titulo.map((l, i) => `<text y="${i * 150}" text-anchor="middle" font-family="Luckiest" font-size="${l.length > 9 ? 128 : 160}" fill="#3a1f0d" stroke="#3a1f0d" stroke-width="44" stroke-linejoin="round" transform="translate(10,14)">${l}</text>
  <text y="${i * 150}" text-anchor="middle" font-family="Luckiest" font-size="${l.length > 9 ? 128 : 160}" fill="url(#rayas)" stroke="#3a1f0d" stroke-width="14" stroke-linejoin="round" paint-order="stroke">${l}</text>`).join("")}
</g>

<!-- subtítulos -->
<g id="subs" transform="translate(540,1560)"></g>

<!-- marca de agua -->
<text x="540" y="1840" text-anchor="middle" font-family="Baloo" font-weight="800" font-size="40" fill="#fff" opacity=".55">${R.usuario || ""}</text>
</svg>`;
  }

  function svgChef() {
    const c = P.gato, d = P.gatoOscuro;
    return `
  <ellipse cx="0" cy="2" rx="90" ry="14" fill="#000" opacity=".15"/>
  <g id="cuerpo">
    <!-- piernas -->
    <rect x="-50" y="-70" width="40" height="70" rx="16" fill="${c}"/><rect x="-50" y="-26" width="40" height="26" rx="12" fill="#fff"/>
    <rect x="10" y="-70" width="40" height="70" rx="16" fill="${c}"/><rect x="10" y="-26" width="40" height="26" rx="12" fill="#fff"/>
    <!-- cola -->
    <path id="cola" d="M60,-80 Q150,-90 140,-180" fill="none" stroke="${c}" stroke-width="26" stroke-linecap="round"/>
    <!-- filipina -->
    <path d="M-80,-200 Q-88,-60 -70,-55 L70,-55 Q88,-60 80,-200 Q0,-230 -80,-200 Z" fill="#fffdf6" stroke="#5a3a12" stroke-width="6"/>
    ${[-150, -115, -80].map(y => `<circle cx="-18" cy="${y}" r="7" fill="${P.amarillo}"/><circle cx="18" cy="${y}" r="7" fill="${P.amarillo}"/>`).join("")}
    <!-- brazo derecho (pantalla) con espátula -->
    <g id="brazoR" transform="translate(68,-180) rotate(-20)">
      <rect x="-18" y="0" width="36" height="105" rx="18" fill="#fffdf6" stroke="#5a3a12" stroke-width="6"/>
      <circle cx="0" cy="108" r="22" fill="${c}" stroke="#5a3a12" stroke-width="5"/>
      <g id="espatula" opacity="0" transform="translate(0,108) rotate(-70)">
        <rect x="-6" y="0" width="12" height="110" rx="6" fill="${P.maderaOscura}"/>
        <rect x="-28" y="100" width="56" height="60" rx="10" fill="#9aa3ad" stroke="#5a3a12" stroke-width="5"/>
      </g>
    </g>
    <!-- brazo izquierdo (pantalla) con cuchara -->
    <g id="brazoL" transform="translate(-68,-180) rotate(20)">
      <rect x="-18" y="0" width="36" height="105" rx="18" fill="#fffdf6" stroke="#5a3a12" stroke-width="6"/>
      <circle cx="0" cy="108" r="22" fill="${c}" stroke="#5a3a12" stroke-width="5"/>
      <g id="cuchara" opacity="0" transform="translate(0,108) rotate(60)">
        <rect x="-7" y="-10" width="14" height="140" rx="7" fill="${P.madera}" stroke="#5a3a12" stroke-width="4"/>
        <ellipse cx="0" cy="138" rx="22" ry="30" fill="${P.madera}" stroke="#5a3a12" stroke-width="4"/>
      </g>
    </g>
    <!-- pañuelo -->
    <path d="M-44,-212 Q0,-185 44,-212 L30,-190 Q0,-172 -30,-190 Z" fill="#d93b3b"/>
    <!-- cabeza -->
    <g id="cabeza" transform="translate(0,-285)">
      <path d="M-78,-40 L-70,-118 L-20,-72 Z" fill="${c}" stroke="#5a3a12" stroke-width="6" stroke-linejoin="round"/>
      <path d="M78,-40 L70,-118 L20,-72 Z" fill="${c}" stroke="#5a3a12" stroke-width="6" stroke-linejoin="round"/>
      <path d="M-62,-56 L-62,-96 L-34,-70 Z M62,-56 L62,-96 L34,-70 Z" fill="#f7b7a3"/>
      <ellipse cx="0" cy="0" rx="98" ry="84" fill="${c}" stroke="#5a3a12" stroke-width="6"/>
      <path d="M-20,-82 L-14,-55 M0,-84 L0,-52 M20,-82 L14,-55" stroke="${d}" stroke-width="9" stroke-linecap="round"/>
      <path d="M-96,-6 L-70,-2 M-94,18 L-70,12 M96,-6 L70,-2 M94,18 L70,12" stroke="${d}" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="0" cy="34" rx="50" ry="34" fill="#fff6ea"/>
      <g id="ojos">
        <g id="ojoAbierto">
          <ellipse id="ojoL" cx="-36" cy="-8" rx="11" ry="15" fill="#2a1a10"/><circle cx="-32" cy="-14" r="4" fill="#fff"/>
          <ellipse id="ojoR" cx="36" cy="-8" rx="11" ry="15" fill="#2a1a10"/><circle cx="40" cy="-14" r="4" fill="#fff"/>
        </g>
        <path id="ojoFeliz" d="M-50,-4 Q-36,-22 -22,-4 M22,-4 Q36,-22 50,-4" fill="none" stroke="#2a1a10" stroke-width="7" stroke-linecap="round" opacity="0"/>
      </g>
      <ellipse cx="-62" cy="22" rx="14" ry="9" fill="#ff9b8a" opacity=".7"/><ellipse cx="62" cy="22" rx="14" ry="9" fill="#ff9b8a" opacity=".7"/>
      <path d="M-9,16 L9,16 L0,26 Z" fill="#e8657a"/>
      <path id="boca" d="M-16,34 Q-8,44 0,34 Q8,44 16,34" fill="none" stroke="#2a1a10" stroke-width="5" stroke-linecap="round"/>
      <path id="bocaAbierta" d="M-18,34 Q0,70 18,34 Z" fill="#8a2a2a" stroke="#2a1a10" stroke-width="4" opacity="0"/>
      <path d="M-40,30 L-110,18 M-40,40 L-108,46 M40,30 L110,18 M40,40 L108,46" stroke="#5a3a12" stroke-width="3"/>
      <!-- gorro -->
      <g id="gorro" transform="translate(0,-82)">
        <rect x="-62" y="-22" width="124" height="40" rx="10" fill="#fff" stroke="#5a3a12" stroke-width="6"/>
        <path d="M-60,-20 Q-100,-70 -60,-100 Q-50,-150 0,-140 Q50,-150 60,-100 Q100,-70 60,-20 Z" fill="#fff" stroke="#5a3a12" stroke-width="6"/>
      </g>
    </g>
  </g>`;
  }

  // ---------- subtítulos: grupos de hasta 3 palabras ----------
  const subs = [];
  pasos.forEach(p => {
    const words = (p.texto || "").split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const grupos = [];
    for (let i = 0; i < words.length;) {
      let n = Math.min(3, words.length - i);
      if (words.length - i - n === 1) n = Math.max(2, n - 1); // evita palabra sola al final
      grupos.push(words.slice(i, i + n)); i += n;
    }
    const peso = g => g.reduce((s, w) => s + w.length + 3, 0);
    const total = grupos.reduce((s, g) => s + peso(g), 0);
    const usable = p.dur - 0.15;
    let t = p.inicio + 0.1;
    grupos.forEach(g => {
      const d = usable * peso(g) / total;
      const wt = []; let tw = t; g.forEach(w => { const dw = d * (w.length + 3) / peso(g); wt.push({ w, t: tw, d: dw }); tw += dw; });
      subs.push({ ini: t, fin: t + d, palabras: wt });
      t += d;
    });
  });

  // subtítulos arriba; abajo solo cuando se ve el título grande
  const SUB_Y = t => { const a = pasoEn(t).p.accion; return a === "outro" || a === "intro" ? 1560 : 330; };
  let subActual = -1;
  function renderSubs(t) {
    const idx = subs.findIndex(s => t >= s.ini && t < s.fin);
    const g = $("subs");
    if (idx !== subActual) {
      subActual = idx;
      g.innerHTML = "";
      if (idx < 0) return;
      const s = subs[idx];
      const txt = s.palabras.map(x => x.w.toUpperCase());
      // dos líneas si es muy largo
      const largo = txt.join(" ").length;
      const lineas = largo > 13 && txt.length > 1 ? [txt.slice(0, Math.ceil(txt.length / 2)), txt.slice(Math.ceil(txt.length / 2))] : [txt];
      let k = 0;
      lineas.forEach((ln, li) => {
        const y = (li - (lineas.length - 1) / 2) * 100;
        ln.forEach(() => {}); // posiciones por tspan
        const mk = (cls, extra) => `<text class="${cls}" y="${y}" text-anchor="middle" font-family="Baloo" font-weight="800" font-size="96" letter-spacing="-1" ${extra}>${ln.map((w, j) => `<tspan data-k="${k + j}">${w}${j < ln.length - 1 ? " " : ""}</tspan>`).join("")}</text>`;
        g.insertAdjacentHTML("beforeend", mk("sombra", `fill="#000" stroke="#000" stroke-width="30" stroke-linejoin="round" transform="translate(0,8)"`));
        g.insertAdjacentHTML("beforeend", mk("frente", `fill="#fff" stroke="#000" stroke-width="16" stroke-linejoin="round" paint-order="stroke"`));
        k += ln.length;
      });
    }
    if (idx < 0) return;
    const s = subs[idx];
    const pop = easeOutBack((t - s.ini) / 0.16);
    g.setAttribute("transform", `translate(540,${SUB_Y(t)}) scale(${lerp(0.7, 1, pop)})`);
    g.querySelectorAll(".frente tspan").forEach(ts => {
      const w = s.palabras[+ts.dataset.k];
      ts.setAttribute("fill", t >= w.t && t < w.t + w.d ? P.amarillo : "#fff");
    });
  }

  // ---------- estado del mundo en el tiempo t ----------
  function renderAt(t) {
    t = clamp(t, 0, DURACION - 1e-3);
    const { i, p, u, k } = pasoEn(t);

    // cámara: transición suave al cambiar de zona
    const prevP = i > 0 ? pasos[i - 1] : p;
    const ct = ease(u / (p.accion === "rewind" ? p.dur : 0.6));
    const A = camDe(prevP), B = camDe(p);
    let cx = lerp(A.x, B.x, ct), cy = lerp(A.y, B.y, ct), cz = lerp(A.z, B.z, ct);
    cz *= 1 + 0.03 * k; // zoom lento tipo "Ken Burns"
    if (p.accion === "intro") cz *= lerp(1.08, 1, ease(u / 1.2));
    if (p.accion === "hook") cz *= lerp(1.15, 1, ease(u / p.dur));
    if (p.accion === "rewind") { cx += Math.sin(t * 90) * 10; cy += Math.cos(t * 70) * 6; }
    set("cam", { transform: `translate(540,960) scale(${cz}) translate(${-cx},${-cy})` });

    // chef: posición, rebote, parpadeo
    const xA = chefDe(prevP), xB = chefDe(p);
    const chefX = lerp(xA, xB, ease(u / 0.6));
    const caminando = Math.abs(xA - xB) > 1 && u < 0.6;
    const bob = caminando ? Math.abs(Math.sin(t * 18)) * -14 : Math.sin(t * 3) * 4;
    set("chef", { transform: `translate(${chefX},${1262 + bob})` });
    set("cola", { d: `M60,-80 Q150,-90 ${140 + Math.sin(t * 4) * 18},-180` });
    const parpadeo = (t % 3.1) < 0.12;
    const feliz = p.accion === "outro" || p.accion === "serve" || p.accion === "hook" || p.accion === "rewind" || (p.accion === "intro" && u > 1.2);
    set("ojoAbierto", { opacity: feliz ? 0 : 1, transform: parpadeo ? "translate(0,-8) scale(1,0.1) translate(0,8)" : "" });
    set("ojoFeliz", { opacity: feliz ? 1 : 0 });
    const hablando = subs.some(s => t >= s.ini && t < s.fin) && Math.sin(t * 22) > 0;
    set("bocaAbierta", { opacity: hablando || feliz ? 1 : 0 });
    set("boca", { opacity: hablando || feliz ? 0 : 1 });
    set("cabeza", { transform: `translate(0,-285) rotate(${Math.sin(t * 2.2) * 4})` });

    // brazos
    let aL = 20, aR = -20;
    const conCuchara = ["drop", "stir"].includes(p.accion);
    const conEspatula = ["pour", "flip"].includes(p.accion);
    if (p.accion === "intro" || p.accion === "outro") aR = -150 + Math.sin(t * 10) * 25; // saluda
    if (conCuchara) aL = 55;
    if (p.accion === "stir") aL = 55 + Math.sin(u * 12) * 14;
    if (conEspatula) aR = -55;
    if (p.accion === "flip" && k > 0.45 && k < 0.65) aR = -55 - Math.sin((k - 0.45) / 0.2 * Math.PI) * 35;
    if (p.accion === "serve") { aL = 140 + Math.sin(t * 9) * 10; aR = -140 - Math.sin(t * 9) * 10; }
    set("brazoL", { transform: `translate(-68,-180) rotate(${aL})` });
    set("brazoR", { transform: `translate(68,-180) rotate(${aR})` });
    set("cuchara", { opacity: conCuchara ? 1 : 0 });
    set("espatula", { opacity: conEspatula ? 1 : 0 });

    // tazón: nivel y color
    let nivel = 0, color = P.batter, gotas = 0;
    const caida = [];
    pasos.forEach((s, j) => {
      if (j > i) return;
      const lu = j === i ? u : s.dur;
      if (s.accion === "drop") {
        const items = s.ingredientes || [s.ingrediente];
        items.forEach((ing, n) => {
          const tStart = 0.25 + n * 0.45;
          const q = (lu - tStart) / 0.6;
          if (q > 0 && q < 1.3 && j === i) caida.push({ ing, q, n, lado: n % 2 ? 1 : -1 });
          const lleno = clamp((lu - tStart - 0.55) / 0.4);
          nivel += lleno * (s.cantidad || 0.22) / items.length;
          if (lleno > 0) { color = s.color || color; gotas = 1; }
        });
      }
      if (s.accion === "stir") { color = mix(color, P.batter, clamp(lu / (s.dur * 0.8))); }
      if (s.accion === "pour") nivel -= 0.35 * clamp((lu - 0.3) / 1.2);
    });
    nivel = clamp(nivel, 0, 0.9);
    set("relleno", { cy: lerp(10, -100, nivel), fill: color, opacity: gotas ? 1 : 0 });
    const stirring = p.accion === "stir";
    set("remolino", { opacity: stirring ? 0.9 : 0, cy: 0, transform: `translate(0,${lerp(10, -100, nivel)}) translate(${Math.sin(u * 12) * 30},0)` });

    // ingredientes cayendo
    const cg = $("caida");
    cg.innerHTML = caida.map(({ ing, q, lado }) => {
      const qq = clamp(q);
      const y = lerp(BOWL.y - 950, BOWL.y - 110, easeIn(qq));
      const x = BOWL.x + lado * 20 * (1 - qq);
      const rot = (1 - qq) * 120 * lado;
      const sq = q > 1 ? clamp(1 - (q - 1) / 0.3) : 1;
      const sy = q > 0.95 ? lerp(1, 0.6, clamp((q - 0.95) / 0.1)) : 1;
      return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${1.05 * sq},${1.05 * sq * sy})">${INGR[ing] || INGR.huevo}</g>`;
    }).join("");

    // sartén / hot cake
    const pourI = pasos.findIndex(s => s.accion === "pour");
    const flipI = pasos.findIndex(s => s.accion === "flip");
    let r = 0, colHC = P.batter, flipY = 0, flipS = 1, burb = 0;
    if (pourI >= 0 && i >= pourI) r = i > pourI ? 1 : easeOutBack(clamp((u - 0.4) / 1.4));
    if (flipI >= 0 && i === flipI) {
      burb = clamp(k / 0.3) * (k < 0.5 ? 1 : 0);
      const q = clamp((k - 0.5) / 0.3);
      flipY = -170 * Math.sin(Math.PI * q);
      flipS = Math.cos(2 * Math.PI * q);
      if (q > 0.5) colHC = P.dorado;
    } else if (flipI >= 0 && i > flipI) colHC = P.dorado;
    const enHook = p.accion === "hook" || p.accion === "rewind";
    const enPlato = p.accion === "serve" || p.accion === "outro" || enHook;
    set("hotcake", { transform: `translate(0,${-70 + flipY}) scale(${Math.max(r, 0.001)},${Math.max(r, 0.001) * (Math.abs(flipS) < 0.12 ? 0.12 * Math.sign(flipS || 1) : flipS)})`, opacity: enPlato ? 0 : 1 });
    set("hotcakeBody", { fill: colHC });
    for (let b = 0; b < 7; b++) set("bb" + b, { opacity: burb * (0.5 + 0.5 * Math.sin(t * 9 + b * 1.7) > 0.3 ? 1 : 0) });
    const fuego = pourI >= 0 && i >= pourI && !enPlato;
    if (enHook) r = 0;
    set("flama", { opacity: fuego ? 0.55 + 0.25 * Math.sin(t * 20) : 0 });
    set("vapor", { opacity: fuego ? 0.7 : 0 });
    for (let v = 0; v < 3; v++) set("vp" + v, { transform: `translate(0,${-((t * 60 + v * 30) % 60)})`, opacity: 0.9 - ((t * 60 + v * 30) % 60) / 70 });

    // servir: tazón se va, plato aparece
    const serveI = pasos.findIndex(s => s.accion === "serve");
    let plato = 0;
    if (serveI >= 0 && i >= serveI) plato = i > serveI ? 1 : easeOutBack(clamp((u - 0.2) / 0.5));
    if (enHook) plato = 1;
    set("bowl", { opacity: plato > 0 ? 0 : 1 });
    set("plato", { opacity: plato > 0 ? 1 : 0, transform: `translate(${PLATE.x},${PLATE.y}) scale(${Math.max(plato, 0.001)})` });
    const su = i > serveI || enHook ? 99 : u;
    for (let n = 0; n < 4; n++) {
      const q = clamp((su - 0.4 - n * 0.18) / 0.25);
      set("pila" + n, { opacity: q > 0 ? 1 : 0, transform: `translate(0,${-120 * (1 - easeIn(q))})` });
    }
    const topping = R.toppings || ["miel", "canela"];
    set("mielDrip", { opacity: topping.includes("miel") ? clamp((su - 1.3) / 0.3) : 0 });
    set("mantequillaTop", { opacity: topping.includes("mantequilla") && su > 1.2 ? 1 : 0 });
    set("canelaPolvo", { opacity: topping.includes("canela") ? clamp((su - 1.9) / 0.3) : 0 });

    // destellos
    const brillo = enHook || p.accion === "intro" || p.accion === "serve" || p.accion === "outro" ? 1 : 0.35;
    document.querySelectorAll("[id^=sp]").forEach(el => {
      const f = +el.dataset.f, s = +el.dataset.s;
      const tw = Math.max(0, Math.sin(t * 2.4 + f));
      el.setAttribute("opacity", tw * brillo);
      el.setAttribute("transform", `translate(${el.dataset.x},${el.dataset.y}) rotate(${t * 40 + f * 30}) scale(${s * (0.4 + tw * 0.8)})`);
    });

    // ingredientes presentados en la repisa
    presentas.forEach(pr => {
      const j = pasos.indexOf(pr);
      const usado = pr.usoI >= 0 && i >= pr.usoI;
      if (i < j || usado || enHook) { set("item" + pr.n, { opacity: 0 }); return; }
      const q = i > j ? 1 : easeOutBack(clamp(u / 0.7));
      const y = lerp(SHELF_Y - 1100, SHELF_Y - 62, q);
      const sw = i === j ? Math.sin(u * 7) * 4 * (1 - clamp(u / 1.2)) : 0;
      set("item" + pr.n, { opacity: 1, transform: `translate(${pr.slot},${y}) rotate(${sw})` });
    });

    // efecto rebobinar
    set("rew", { opacity: p.accion === "rewind" ? 1 : 0 });
    if (p.accion === "rewind") set("rewBarra", { y: (t * 2600) % H });

    // título
    let tit = 0;
    if (p.accion === "outro") tit = easeOutBack(u / 0.5);
    const titWobble = Math.sin(t * 4) * 2;
    set("titulo", { opacity: tit > 0 ? 1 : 0, transform: `translate(540,480) rotate(${titWobble}) scale(${Math.max(tit, 0.001)})` });

    renderSubs(t);
  }

  // ---------- montar ----------
  document.getElementById("stage").innerHTML = svgEscena();
  window.DURACION = DURACION;
  window.renderAt = renderAt;
  window.getSubs = () => subs.map(s => ({ ini: s.ini, fin: s.fin, texto: s.palabras.map(x => x.w).join(" ") }));
  window.getGuion = () => pasos.map(p => ({ ini: p.inicio, fin: p.inicio + p.dur, texto: p.texto || "", accion: p.accion }));

  document.fonts.ready.then(() => {
    renderAt(0);
    window.LISTO = true;
    if (!document.body.classList.contains("preview")) return;
    // vista previa interactiva
    let playing = true, start = performance.now(), off = 0;
    const scrub = $("scrub"), lbl = $("time");
    $("play").onclick = () => { playing = !playing; if (playing) start = performance.now() - off * 1000; };
    scrub.oninput = () => { off = scrub.value / 1000 * DURACION; start = performance.now() - off * 1000; renderAt(off); lbl.textContent = off.toFixed(1) + "s"; };
    const loop = () => {
      if (playing) {
        off = ((performance.now() - start) / 1000) % DURACION;
        renderAt(off); scrub.value = off / DURACION * 1000; lbl.textContent = off.toFixed(1) + "s";
      }
      requestAnimationFrame(loop);
    };
    loop();
  });
})();
