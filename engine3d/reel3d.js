/* Motor 3D de reels de cocina (Three.js, estilo caricatura "toon").
 * Todo depende solo de t: renderAt(t) siempre da el mismo cuadro.
 * Capa 3D (canvas) + capa 2D (SVG) para subtítulos, título y efectos.
 */
import * as THREE from "three";
import { makePost } from "./post.js";

// fuentes listas antes de dibujar letreros y etiquetas
await Promise.all([document.fonts.load("64px Lilita"), document.fonts.load("140px Luckiest"), document.fonts.load("96px Baloo")]);

const R = window.RECETA;
const W = 1080, H = 1920;

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => (p = clamp(p), p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeIn = p => (p = clamp(p), p * p);
const easeOut = p => (p = clamp(p), 1 - (1 - p) * (1 - p));
const easeOutBack = p => { p = clamp(p); const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const bounce = p => { p = clamp(p); return Math.abs(Math.sin(p * Math.PI * 2.5)) * (1 - p); };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

const P = Object.assign({
  pared: "#f6f1e4", azul: "#2f5b9a", azulOscuro: "#1f3f70", amarillo: "#f4c430",
  madera: "#c07f43", maderaOscura: "#7a4a24", encimera: "#f3efe8", gato: "#f08a2c",
  gatoOscuro: "#c9661a", batter: "#efc77a", dorado: "#d58a2f", tinta: "#3a2414",
}, R.paleta || {});

// ---------- línea de tiempo ----------
let t0 = 0;
const pasos = R.pasos.map(p => { const s = { ...p, inicio: t0 }; t0 += p.dur; return s; });
const DURACION = t0;
const idxDe = a => pasos.findIndex(s => s.accion === a);
function pasoEn(t) {
  let i = pasos.findIndex(p => t < p.inicio + p.dur);
  if (i < 0) i = pasos.length - 1;
  const p = pasos[i];
  return { i, p, u: t - p.inicio, k: clamp((t - p.inicio) / p.dur) };
}

// ---------- posiciones ----------
const BOWL = V3(-1.5, 0, 0.2), PAN = V3(1.65, 0, 0.2), PLATE = V3(-1.5, 0, 0.2);
const SHELF_Y = 3.05, SHELF_Z = -1.9;
const presentas = pasos.filter(p => p.accion === "presenta");
presentas.forEach((p, n) => { p.n = n; p.slot = (n - (presentas.length - 1) / 2) * 2.6; });
presentas.forEach(pr => {
  pr.usoI = pasos.findIndex(s => (s.accion === "drop" && (s.ingrediente === pr.ingrediente || (s.ingredientes || []).includes(pr.ingrediente))) || (s.usa || []).includes(pr.ingrediente));
});

// cámaras: [posición, mirar]
const CAMS = {
  wide:  [V3(0, 3.4, 15), V3(0, 2.0, 0)],
  hook:  [V3(-0.5, 2.6, 5.6), V3(-1.2, 0.8, 0.2)],
  intro: [V3(0, 4.2, 12.5), V3(0, 3.4, 0)],
  bowl:  [V3(-0.6, 3.4, 8.6), V3(-0.7, 1.0, 0)],
  pan:   [V3(1.0, 3.4, 8.6), V3(0.9, 1.0, 0)],
  plate: [V3(-0.7, 2.8, 7.4), V3(-0.8, 1.1, 0)],
  outro: [V3(0, 3.6, 13), V3(0, 2.7, 0)],
  dish:  [V3(-1.0, 3.1, 6.6), V3(-1.45, 0.7, 0.2)],
  horno: [V3(-1.0, 2.0, 4.6), V3(-1.5, 0.5, 0.2)],
  hornoR: [V3(-1.0, 0.4, 5.6), V3(-1.5, -1.2, 1.4)],
  sala: [V3(0.6, 2.7, 9.0), V3(0.6, 1.35, 0)],
};
const zonaDe = a => ({ hook: "hook", rewind: "intro", intro: "intro", drop: "bowl", stir: "bowl", pour: "pan", flip: "pan", serve: "plate", outro: "outro", arma: "dish", "baña": "dish", queso: "dish", hornea: "horno", extiende: "dish", salsa: "dish", lava: "bowl", alina: "bowl", cocina: "pan", corta: "pan", remoja: "bowl", marina: "bowl", dora: "pan", pina: "pan", tortillas: "pan", ralla: "bowl", hierve: "pan", cuece: "pan", pasa: "pan", emulsiona: "pan", tip: "pan", esterilla: "dish", relleno: "dish", enrolla: "dish", rebana: "dish", activa: "bowl", amasa: "dish", reposa: "dish", estira: "dish", unta: "dish", hilo: "dish", acomoda: "dish", glasea: "dish", precalienta: "hornoR", base: "dish", rodajas: "dish", espiral: "dish", "aliña": "dish", tapa: "horno", destapa: "horno", bate: "bowl", galletas: "bowl", crema: "bowl", sofrito: "pan", leche: "pan", tomate: "pan", lento: "pan", cuecepasta: "pan", juntapasta: "pan", salsaroja: "bowl", salsaverde: "bowl", frijoles: "pan", huevo: "pan", bana: "pan", armadiv: "dish", hojas: "bowl", manteca: "bowl", masa: "bowl", flota: "bowl", vaporera: "pan", suda: "dish", rajas: "pan", cuecemaiz: "pan", cuececarne: "pan", cuela: "bowl", friesalsa: "pan", junta: "pan", claras: "bowl", molde: "dish", enfria: "dish", unta: "dish", fresas: "dish", mascarpone: "bowl", envuelve: "bowl", moja: "pan", refri: "bowl", cacao: "dish", frie: "pan", escurre: "dish", licua: "bowl", sofrie: "pan", calienta: "pan", asa: "pan", cebollitas: "pan", pica: "dish", secreto: "intro", pico: "dish", guacamole: "dish", capa: "dish" }[a] || "wide");
const zonaPaso = p => (R.platillo === "galletas" && p.accion === "sobras") ? "sala" : (R.platillo === "bolonesa" && p.accion === "sobras") ? "sala" : (R.platillo === "bolonesa" && p.accion === "carne") ? "pan" : (R.platillo === "divorciados" && p.accion === "sobras") ? "sala" : (R.platillo === "tamales" && p.accion === "sobras") ? "sala" : (R.platillo === "tamales" && p.accion === "salsa") ? "bowl" : (R.platillo === "tamales" && p.accion === "cuece") ? "pan" : (R.platillo === "azteca" && p.accion === "sobras") ? "sala" : (R.platillo === "azteca" && p.accion === "salsa") ? "bowl" : (R.platillo === "azteca" && p.accion === "hornea") ? "dish" : (R.platillo === "mostachon" && p.accion === "sobras") ? "sala" : (R.platillo === "mostachon" && ["hornea", "relleno"].includes(p.accion)) ? (p.accion === "hornea" ? "dish" : "bowl") : (R.platillo === "tiramisu" && p.accion === "hook") ? "sala" : (R.platillo === "tiramisu" && p.accion === "cafe") ? "pan" : (R.platillo === "lasana" && p.accion === "hornea") ? "dish" : (R.platillo === "lasana" && p.accion === "sobras") ? "sala" : (R.platillo === "lasana" && ["salsa", "bechamel"].includes(p.accion)) ? "pan" : (R.platillo === "lasana" && ["sofrie", "carne"].includes(p.accion)) ? "pan" : (R.platillo === "cerealgta" && ["hook", "juega", "control"].includes(p.accion)) ? "sala" : (R.platillo === "cerealgta" && ["prepara", "leche"].includes(p.accion)) ? "bowl" : (R.platillo === "chilaquiles" && p.accion === "baña") ? "pan" : (p.destino === "sarten" && ["drop", "stir"].includes(p.accion)) ? "pan" : zonaDe(p.accion);
const camDe = p => p.accion === "presenta" ? [V3(p.slot + 0.6, 3.2, 7.6), V3(p.slot + 0.6, 2.5, 0)] : CAMS[zonaPaso(p)];
const CHEF_X = { wide: 0, hook: 0.15, intro: 0, bowl: 0.1, pan: 0.15, plate: 0.15, outro: 0, dish: 0.25, horno: 0.35, hornoR: 1.4, sala: -0.2 };
const chefDe = p => p.accion === "presenta" ? p.slot + 1.3 : CHEF_X[zonaPaso(p)];

// ---------- renderer ----------
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(P.pared);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
// posproceso (de Lemo-Opuscar): oclusión ambiental, profundidad de campo, brillo y color. Se apaga con ?post=0
const MODO_POST = new URLSearchParams(location.search).get("post") || "lite"; // lite | dof | full | 0
const USAR_POST = MODO_POST === "dof" || MODO_POST === "full";
// "lite": color cálido y viñeta con CSS (sin costo de render)
if (MODO_POST !== "0") {
  canvas.style.filter = "saturate(1.08) contrast(1.05) sepia(0.05)";
  const vin = document.createElement("div");
  vin.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;background:radial-gradient(ellipse 75% 62% at 50% 46%, rgba(0,0,0,0) 55%, rgba(30,14,4,0.32) 100%)";
  canvas.insertAdjacentElement("afterend", vin);
}
let POST = null;
function armarPost() {
  POST = makePost(renderer, scene, camera, W, H, { ssaa: 1, ao: MODO_POST === "full", aoAmt: 0.55, aoRadius: 0.35 });
  POST.dof.maxCoc = MODO_POST === "lite" ? 0 : 7;
  POST.bloom.strength = 0.18; POST.bloom.threshold = 0.92; POST.bloom.radius = 0.4;
  const v = POST.vig.uniforms; v.amt.value = 0.22; v.warm.value = 0.35; v.contrast.value = 0.08; v.sat.value = 1.06;
}

scene.add(new THREE.HemisphereLight(0xfff6e6, 0x6a5a4a, 0.85));
const sol = new THREE.DirectionalLight(0xfff2dd, 1.7);
sol.position.set(4, 9, 7);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left: -7, right: 7, top: 8, bottom: -3, near: 1, far: 30 });
sol.shadow.bias = -0.0015; sol.shadow.radius = 4;
scene.add(sol);

// material toon con 3 tonos
const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const matCache = {};
const M = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  return matCache[key] ||= new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
};
const LINEA = new THREE.MeshBasicMaterial({ color: P.tinta, side: THREE.BackSide });
function mesh(geo, color, { sombra = true, contorno = 1.05, extra } = {}) {
  const m = new THREE.Mesh(geo, typeof color === "string" ? M(color, extra) : color);
  m.castShadow = sombra; m.receiveShadow = true;
  if (contorno) { const o = new THREE.Mesh(geo, LINEA); o.scale.setScalar(contorno); m.add(o); }
  return m;
}

// texturas dibujadas en canvas
function texCanvas(w, h, dibujar, repetir) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  dibujar(c.getContext("2d"), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  if (repetir) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...repetir); }
  return tx;
}
function dibujaAzulejo(g, w) {
  g.fillStyle = P.pared; g.fillRect(0, 0, w, w);
  g.strokeStyle = "#dcd4c2"; g.lineWidth = 6; g.strokeRect(0, 0, w, w);
  g.save(); g.translate(w / 2, w / 2); g.fillStyle = P.azul;
  for (let a = 0; a < 8; a++) { g.save(); g.rotate(a * Math.PI / 4); g.beginPath(); g.ellipse(0, -w * 0.16, w * 0.06, w * 0.15, 0, 0, 7); g.fill(); g.restore(); }
  g.fillStyle = P.amarillo; g.beginPath(); g.arc(0, 0, w * 0.075, 0, 7); g.fill(); g.restore();
  g.strokeStyle = P.azul; g.lineWidth = w * 0.06;
  for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { g.beginPath(); g.arc(x, y, w * 0.17, 0, 7); g.stroke(); g.fillStyle = P.azul; g.beginPath(); g.arc(x, y, w * 0.06, 0, 7); g.fill(); }
}
function etiquetaTex(texto, { fondo = "#2a1a10", color = P.amarillo, borde = P.amarillo, fuente = "Lilita", tam = 64 } = {}) {
  const c = document.createElement("canvas"); const g = c.getContext("2d");
  const lineas = texto.split("\n");
  g.font = `${tam}px ${fuente}`; const w = Math.ceil(Math.max(...lineas.map(l => g.measureText(l).width))) + tam * 1.2, h = Math.ceil(tam * (0.5 + 1.2 * lineas.length));
  c.width = w; c.height = h;
  g.font = `${tam}px ${fuente}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = fondo; g.strokeStyle = borde; g.lineWidth = tam * 0.12;
  const r = tam * 1.7 * 0.3; g.beginPath(); g.roundRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2, r); g.fill(); g.stroke();
  g.fillStyle = color; lineas.forEach((l, n) => g.fillText(l, w / 2, h / 2 + (n - (lineas.length - 1) / 2) * tam * 1.2 + tam * 0.05));
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return { tx, aspecto: w / h, lineas: lineas.length };
}
// parte una etiqueta larga en dos renglones (en la coma más cercana a la mitad)
function partirEtiqueta(t, max = 22) {
  if (t.length <= max) return t;
  const comas = [...t.matchAll(/,|\+| y /g)].map(m => m.index);
  if (!comas.length) return t;
  const c = comas.reduce((a, b) => Math.abs(b - t.length / 2) < Math.abs(a - t.length / 2) ? b : a);
  const sep = t[c] === "," ? 1 : 0;
  return t.slice(0, c + sep).trim() + "\n" + t.slice(c + sep).trim();
}

// ---------- cocina ----------
function cocina() {
  const g = new THREE.Group();
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshToonMaterial({ map: texCanvas(256, 256, dibujaAzulejo, [26, 13]), gradientMap: grad }));
  pared.position.set(0, 5, -2.6); pared.receiveShadow = true; g.add(pared);
  // encimera
  const top = mesh(new THREE.BoxGeometry(40, 0.32, 4.2), P.encimera, { contorno: 0 }); top.position.set(0, -0.16, -0.5); g.add(top);
  const borde = mesh(new THREE.BoxGeometry(40, 0.08, 0.1), "#ffffff", { contorno: 0 }); borde.position.set(0, 0, 1.58); g.add(borde);
  // gabinetes
  const gab = mesh(new THREE.BoxGeometry(40, 8, 3.8), P.azul, { contorno: 0 }); gab.position.set(0, -4.32, -0.6); g.add(gab);
  for (let i = -6; i <= 6; i++) {
    const puerta = mesh(new THREE.BoxGeometry(2.5, 2.4, 0.08), P.azulOscuro, { contorno: 0 }); puerta.position.set(i * 2.9, -1.7, 1.33); g.add(puerta);
    const panel = mesh(new THREE.BoxGeometry(2.2, 2.1, 0.06), P.azul, { contorno: 0 }); panel.position.set(i * 2.9, -1.7, 1.38); g.add(panel);
    const asa = mesh(new THREE.CapsuleGeometry(0.06, 0.6, 4, 8), P.amarillo, { contorno: 0 }); asa.rotation.z = Math.PI / 2; asa.position.set(i * 2.9, -0.85, 1.48); g.add(asa);
  }
  // repisa
  const rep = mesh(new THREE.BoxGeometry(14, 0.18, 0.9), P.madera); rep.position.set(0, SHELF_Y - 0.09, SHELF_Z); g.add(rep);
  for (const x of [-5.5, 0, 5.5]) { const s = mesh(new THREE.BoxGeometry(0.16, 0.5, 0.7), P.maderaOscura, { contorno: 0 }); s.position.set(x, SHELF_Y - 0.4, SHELF_Z - 0.05); g.add(s); }
  // letrero
  const tx = texCanvas(1024, 470, (c, w, h) => {
    c.fillStyle = P.maderaOscura; c.beginPath(); c.roundRect(0, 0, w, h, 40); c.fill();
    c.fillStyle = "#263a33"; c.beginPath(); c.roundRect(28, 28, w - 56, h - 56, 26); c.fill();
    c.setLineDash([4, 26]); c.lineCap = "round"; c.strokeStyle = "#f6f1e4"; c.lineWidth = 8; c.beginPath(); c.roundRect(44, 44, w - 88, h - 88, 20); c.stroke();
    c.textAlign = "center"; c.fillStyle = "#f6f1e4"; c.font = "54px Lilita"; c.fillText(R.letrero || "RECETA DEL CHEF MICHI", w / 2, 130);
    { let fs = 140; c.font = `${fs}px Luckiest`; while (c.measureText(R.pizarron?.[0] || "").width > w - 120 && fs > 60) { fs -= 6; c.font = `${fs}px Luckiest`; } } c.lineWidth = 16; c.strokeStyle = "#3a1f0d"; c.setLineDash([]); c.strokeText(R.pizarron?.[0] || "", w / 2, 290); c.fillStyle = P.amarillo; c.fillText(R.pizarron?.[0] || "", w / 2, 290);
    c.fillStyle = "#f6f1e4"; c.font = "70px Lilita"; c.fillText(R.pizarron?.[1] || "", w / 2, 395);
  });
  const letrero = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.1, 0.15), [M(P.maderaOscura), M(P.maderaOscura), M(P.maderaOscura), M(P.maderaOscura), new THREE.MeshToonMaterial({ map: tx, gradientMap: grad }), M(P.maderaOscura)]);
  letrero.position.set(0, 5.4, -2.45); letrero.castShadow = true; g.add(letrero);
  // estufa
  const hornilla = mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.08, 40), "#2b2b2b", { contorno: 0 }); hornilla.position.set(PAN.x, 0.04, PAN.z); g.add(hornilla);
  return g;
}
const COCINA = cocina(); scene.add(COCINA);

// ---------- objetos ----------
// tazón (perfil de revolución)
const perfilTazon = [];
for (let i = 0; i <= 12; i++) { const y = i / 12 * 0.95; perfilTazon.push(new THREE.Vector2(0.5 + 0.48 * Math.sqrt(y / 0.95), y)); }
for (let i = 12; i >= 0; i--) { const y = i / 12 * 0.95; perfilTazon.push(new THREE.Vector2(0.44 + 0.47 * Math.sqrt(y / 0.95), Math.max(0.06, y))); }
const radioTazon = h => 0.44 + 0.47 * Math.sqrt(clamp(h / 0.95));
const tazon = new THREE.Group();
tazon.add(mesh(new THREE.LatheGeometry(perfilTazon, 48), "#fbfaf6", { contorno: 1.025, extra: { side: THREE.DoubleSide } }));
const franja = mesh(new THREE.TorusGeometry(0.97, 0.035, 8, 48), P.azul, { contorno: 0 }); franja.rotation.x = Math.PI / 2; franja.position.y = 0.8; tazon.add(franja);
const relleno = new THREE.Mesh(new THREE.CircleGeometry(1, 40), M(P.batter)); relleno.rotation.x = -Math.PI / 2; tazon.add(relleno);
const remolino = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 30, Math.PI * 1.5), M("#c99a52")); remolino.rotation.x = -Math.PI / 2; tazon.add(remolino);
tazon.position.copy(BOWL); scene.add(tazon);

// sartén
const sarten = new THREE.Group();
const perfilSarten = [new THREE.Vector2(0, 0.05), new THREE.Vector2(0.85, 0.05), new THREE.Vector2(1.0, 0.28), new THREE.Vector2(0.95, 0.28), new THREE.Vector2(0.82, 0.1), new THREE.Vector2(0, 0.1)];
sarten.add(mesh(new THREE.LatheGeometry(perfilSarten, 48), "#40454e", { contorno: 1.02 }));
const mango = mesh(new THREE.CapsuleGeometry(0.09, 1.1, 4, 10), "#2b2b2b"); mango.rotation.z = Math.PI / 2 - 0.12; mango.position.set(1.55, 0.3, 0); sarten.add(mango);
const hotcake = new THREE.Group();
const hcCuerpo = mesh(new THREE.CylinderGeometry(0.68, 0.7, 0.14, 40), P.batter, { contorno: 1.03 });
hotcake.add(hcCuerpo);
const burbujas = [];
for (let b = 0; b < 9; b++) {
  const bb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M("#fff3d6"));
  const a = hash(b) * 6.28, r = 0.15 + hash(b + 9) * 0.45; bb.position.set(Math.cos(a) * r, 0.075, Math.sin(a) * r);
  hotcake.add(bb); burbujas.push(bb);
}
sarten.add(hotcake);
const llama = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 6, 30), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.8 }));
llama.rotation.x = Math.PI / 2; llama.position.y = 0.02; sarten.add(llama);
sarten.position.copy(PAN); sarten.position.y = 0.08; scene.add(sarten);

// plato con pila
const plato = new THREE.Group();
plato.add(mesh(new THREE.CylinderGeometry(1.15, 0.85, 0.12, 48), "#fbfaf6", { contorno: 1.02 }));
const pila = [];
for (let n = 0; n < 4; n++) {
  const hc = mesh(new THREE.CylinderGeometry(0.75, 0.77, 0.2, 40), n % 2 ? "#d9913a" : P.dorado, { contorno: 1.03 });
  plato.add(hc); pila.push(hc);
}
const mantequilla = mesh(new THREE.BoxGeometry(0.36, 0.16, 0.3), "#ffe27a"); plato.add(mantequilla);
const miel = new THREE.Group();
const mielTapa = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("#f3a712", { transparent: true, opacity: 0.92 }));
mielTapa.scale.set(1.02, 0.12, 1.02); miel.add(mielTapa);
const gotas = [];
for (let d = 0; d < 7; d++) {
  const a = d / 7 * 6.28 + 0.3, gota = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), M("#f3a712"));
  gota.position.set(Math.cos(a) * 0.74, -0.12, Math.sin(a) * 0.74); miel.add(gota); gotas.push(gota);
}
plato.add(miel);
const canelaPolvo = new THREE.Group();
for (let c = 0; c < 26; c++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), M("#7a4521")); const a = hash(c * 3) * 6.28, r = hash(c * 7) * 0.6; p.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); canelaPolvo.add(p); }
plato.add(canelaPolvo);
plato.position.copy(PLATE); plato.position.y = 0.06; scene.add(plato);

// salsa / bechamel dentro del sartén
const sartenRelleno = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 40), M("#fbf6ea"));
sartenRelleno.position.y = 0.14; sarten.add(sartenRelleno);
const sartenRemolino = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 30, Math.PI * 1.5), M("#e7dcc4")); sartenRemolino.rotation.x = -Math.PI / 2; sartenRemolino.position.y = 0.17; sarten.add(sartenRemolino);

// enchiladas (rollos) reutilizables
const COLOR_SALSA = "#5f9e3a", COLOR_BECH = "#fbf6ea";
function rollo() {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.19, 0.19, 1.15, 20), "#f1dca0", { contorno: 1.04 }); t.rotation.x = Math.PI / 2; g.add(t);
  for (const z of [-0.58, 0.58]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), M("#e9cfa3")); c.position.z = z * 1.001; if (z < 0) c.rotation.y = Math.PI; g.add(c); }
  return g;
}
// refractario (en el lugar del tazón)
const refractario = new THREE.Group();
const refBase = mesh(new THREE.BoxGeometry(2.5, 0.42, 1.55), "#fbfaf6", { contorno: 1.02 }); refBase.position.y = 0.21; refractario.add(refBase);
const refFranja = mesh(new THREE.BoxGeometry(2.52, 0.08, 1.57), P.azul, { contorno: 0 }); refFranja.position.y = 0.33; refractario.add(refFranja);
const refDentro = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, 1.35), M("#e6dccb")); refDentro.position.y = 0.43; refractario.add(refDentro);
const rollosRef = [];
for (let n = 0; n < 4; n++) { const r = rollo(); r.position.set(-0.78 + n * 0.52, 0.6, 0); refractario.add(r); rollosRef.push(r); }
const capaSalsa = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 1.3), M(COLOR_SALSA)); capaSalsa.position.y = 0.72; refractario.add(capaSalsa);
const capaBech = new THREE.Group();
for (let n = 0; n < 9; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 10), M(COLOR_BECH)); b.scale.set(1, 0.22, 0.9); b.position.set(-0.85 + (n % 5) * 0.42 + (n > 4 ? 0.2 : 0), 0.8, n > 4 ? 0.25 : -0.2); capaBech.add(b); }
refractario.add(capaBech);
const quesoRef = new THREE.Group(), quesoPiezas = [];
for (let n = 0; n < 70; n++) { const q = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.14, 3, 6), M("#ffd75e")); q.position.set((hash(n) - 0.5) * 2.1, 0.9 + hash(n + 9) * 0.05, (hash(n + 3) - 0.5) * 1.15); q.rotation.set(Math.PI / 2, 0, hash(n + 5) * 6); quesoRef.add(q); quesoPiezas.push(q); }
refractario.add(quesoRef);
const gratinado = new THREE.Group();
for (let n = 0; n < 16; n++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.16 + hash(n) * 0.12, 14, 8), M(n % 2 ? "#e0a03a" : "#c97f2a")); g.scale.set(1, 0.15, 0.8); g.position.set((hash(n + 1) - 0.5) * 2.0, 0.93, (hash(n + 2) - 0.5) * 1.05); gratinado.add(g); }
refractario.add(gratinado);
const burbujasRef = [];
for (let n = 0; n < 12; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M("#fff3c4")); b.position.set((hash(n + 4) - 0.5) * 1.9, 0.95, (hash(n + 6) - 0.5) * 1.0); refractario.add(b); burbujasRef.push(b); }
const brilloHorno = new THREE.PointLight(0xff8a1f, 0, 6); brilloHorno.position.set(0, 2.2, 1.2); refractario.add(brilloHorno);
refractario.position.copy(BOWL); refractario.visible = false; scene.add(refractario);

// plato de enchiladas servido
const platoEnch = new THREE.Group();
const rollosPlato = [];
for (let n = 0; n < 3; n++) { const r = rollo(); r.scale.setScalar(1.1); r.position.set(-0.45 + n * 0.45, 0.32, 0); r.rotation.y = 0.15; platoEnch.add(r); rollosPlato.push(r); }
const salsaPlato = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(COLOR_SALSA)); salsaPlato.scale.set(1.15, 0.35, 0.95); salsaPlato.position.y = 0.2; platoEnch.add(salsaPlato);
const bechPlato = new THREE.Group();
for (let n = 0; n < 5; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), M(COLOR_BECH)); b.scale.set(1.2, 0.25, 0.8); b.position.set(-0.6 + n * 0.3, 0.5, (hash(n) - 0.5) * 0.3); bechPlato.add(b); }
platoEnch.add(bechPlato);
const cremaPlato = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 30, Math.PI * 3), M("#ffffff")); cremaPlato.rotation.x = -Math.PI / 2; cremaPlato.position.y = 0.6; platoEnch.add(cremaPlato);
const cebollas = [];
for (let n = 0; n < 6; n++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 16), M("#e9c7ef")); c.rotation.x = -Math.PI / 2 + 0.3; c.position.set((hash(n + 1) - 0.5) * 1.1, 0.62, (hash(n + 2) - 0.5) * 0.6); platoEnch.add(c); cebollas.push(c); }
const cilantros = [];
for (let n = 0; n < 10; n++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), M("#3f9b3f", { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2 + hash(n) * 0.6; c.position.set((hash(n + 4) - 0.5) * 1.2, 0.64, (hash(n + 5) - 0.5) * 0.6); platoEnch.add(c); cilantros.push(c); }

plato.add(platoEnch);
// plato de mole: piezas bañadas, ajonjolí y arroz
const platoMole = new THREE.Group();
const piezasMole = [];
for (let n = 0; n < 2; n++) { const pz = pieza(); pz.position.set(-0.25 + n * 0.45, 0.32, n ? 0.18 : -0.15); pz.rotation.y = n ? -0.5 : 0.4; platoMole.add(pz); piezasMole.push(pz); }
const salsaMole = new THREE.Mesh(new THREE.SphereGeometry(0.8, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("#4b2215")); salsaMole.scale.set(1.0, 0.45, 0.85); salsaMole.position.set(0.05, 0.12, 0); platoMole.add(salsaMole);
const brilloMole = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6), new THREE.MeshBasicMaterial({ color: 0x8a5a3a, transparent: true, opacity: 0.5 })); brilloMole.scale.set(1.4, 0.15, 0.6); brilloMole.position.set(-0.2, 0.47, 0.2); platoMole.add(brilloMole);
const semillas = [];
for (let n = 0; n < 45; n++) { const sm = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), M("#f3e3bf")); sm.scale.set(1, 0.5, 1.6); const a = hash(n + 11) * 6.28, r = hash(n + 13) * 0.6; sm.position.set(0.05 + Math.cos(a) * r, 0.5 - r * 0.35, Math.sin(a) * r * 0.8); sm.rotation.y = hash(n) * 6; platoMole.add(sm); semillas.push(sm); }
const arroz = new THREE.Group();
for (let n = 0; n < 40; n++) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M(n % 7 ? "#fff8ec" : "#f08a2c")); const r = hash(n + 20) * 0.32, ang = hash(n + 21) * 6.28; a.position.set(Math.cos(ang) * r, 0.15 + (0.32 - r) * 0.7, Math.sin(ang) * r); arroz.add(a); }
arroz.position.set(-0.75, 0.05, -0.25); platoMole.add(arroz);
plato.add(platoMole);
const ESMOLE = R.platillo === "mole";

// ---------- pizza ----------
const ESPIZZA = R.platillo === "pizza";

// ---------- sushi ----------
const ESSUSHI = R.platillo === "sushi";
const COL_NORI = "#1f3a26", COL_ARROZ = "#fbf8f0";
// olla para cocer el arroz (en la estufa)
const olla = new THREE.Group();
olla.add(mesh(new THREE.CylinderGeometry(0.8, 0.72, 0.85, 36), "#9aa3ad", { contorno: 1.02 }));
const tapa = new THREE.Group(); tapa.position.y = 0.45; olla.add(tapa);
tapa.add(mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.06, 36), "#b8c0c8", { contorno: 1.02 }));
const perilla = mesh(new THREE.SphereGeometry(0.1, 12, 8), "#2b2b2b"); perilla.position.y = 0.08; tapa.add(perilla);
for (const s2 of [-1, 1]) { const a = mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 14, Math.PI), "#2b2b2b", { contorno: 0 }); a.position.set(s2 * 0.82, 0.2, 0); a.rotation.z = s2 > 0 ? -Math.PI / 2 : Math.PI / 2; olla.add(a); }
olla.position.copy(PAN); olla.position.y = 0.48; olla.visible = false; scene.add(olla);
// tabla de cortar con cuchillo y tiras
const tabla2 = new THREE.Group();
tabla2.add(mesh(new THREE.BoxGeometry(2.1, 0.12, 1.3), "#d8a46a", { contorno: 1.02 }));
const cuchillo = new THREE.Group();
const hoja = mesh(new THREE.BoxGeometry(0.9, 0.24, 0.025), "#d6dde3"); hoja.position.x = 0.1; cuchillo.add(hoja);
const mangoC = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.08), "#2b2b2b"); mangoC.position.x = 0.75; cuchillo.add(mangoC);
tabla2.add(cuchillo);
const TIRAS = [["#5aa83c", 0.07], ["#b7d36b", 0.08], ["#f2814f", 0.08]];
const tiras = TIRAS.map(([c, r], n) => { const t = mesh(new THREE.CapsuleGeometry(r, 1.0, 4, 10), c); t.rotation.z = Math.PI / 2; t.position.set(-0.1, 0.15, -0.35 + n * 0.32); tabla2.add(t); return t; });
tabla2.position.copy(PAN); tabla2.position.y = 0.08; tabla2.visible = false; scene.add(tabla2);
// esterilla, alga, arroz, relleno y rollo (en el lugar del tazón)
const mesa = new THREE.Group();
const esterilla = new THREE.Group(); mesa.add(esterilla);
for (let i = 0; i < 14; i++) { const v = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8), "#d9b77a", { contorno: 0 }); v.rotation.z = Math.PI / 2; v.position.set(0, 0.06, -0.85 + i * 0.13); esterilla.add(v); }
const hojaNori = mesh(new THREE.BoxGeometry(1.8, 0.03, 1.5), COL_NORI, { contorno: 1.01 }); hojaNori.position.y = 0.14; mesa.add(hojaNori);
const capaArroz = new THREE.Group(); capaArroz.position.y = 0.19; mesa.add(capaArroz);
capaArroz.add(mesh(new THREE.BoxGeometry(1.72, 0.08, 1.15), COL_ARROZ, { contorno: 0 }));
for (let n = 0; n < 60; n++) { const gr = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), M("#ffffff")); gr.scale.set(1.5, 0.7, 1); gr.position.set((hash(n + 70) - 0.5) * 1.65, 0.05, (hash(n + 71) - 0.5) * 1.1); capaArroz.add(gr); }
const lineaRelleno = TIRAS.map(([c, r], n) => { const t = mesh(new THREE.CapsuleGeometry(r, 1.4, 4, 10), c); t.rotation.z = Math.PI / 2; t.position.set(0, 0.3, 0.2 + n * 0.12 - 0.12); mesa.add(t); return t; });
const queso2 = mesh(new THREE.CapsuleGeometry(0.06, 1.4, 4, 10), "#fffaf0"); queso2.rotation.z = Math.PI / 2; queso2.position.set(0, 0.3, 0.32); mesa.add(queso2); lineaRelleno.push(queso2);
const rollo2 = new THREE.Group(); mesa.add(rollo2);
const rolloCuerpo = mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.8, 28), COL_NORI, { contorno: 1.03 }); rolloCuerpo.rotation.z = Math.PI / 2; rollo2.add(rolloCuerpo);
// piezas (corte del rollo)
function piezaSushi() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 24), COL_NORI, { contorno: 1.04 }));
  const ar = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.205, 24), M(COL_ARROZ)); g.add(ar);
  [["#f2814f", 0, 0.06, 0.09], ["#5aa83c", -0.1, -0.05, 0.05], ["#b7d36b", 0.1, -0.06, 0.05], ["#fffaf0", 0.0, -0.13, 0.04]].forEach(([c, x, z, r]) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.21, 12), M(c)); d.position.set(x, 0, z); g.add(d); });
  return g;
}
const piezasRollo = [];
for (let n = 0; n < 8; n++) { const pz = piezaSushi(); pz.rotation.z = Math.PI / 2; pz.position.set(-0.79 + n * 0.225, 0, 0); rollo2.add(pz); piezasRollo.push(pz); }
const gotasAgua = [];
for (let n = 0; n < 5; n++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M("#9fd7ff", { transparent: true, opacity: 0.8 })); g.position.set(-0.7 + n * 0.35, 0.18, -0.6); mesa.add(g); gotasAgua.push(g); }
mesa.position.copy(BOWL); mesa.visible = false; scene.add(mesa);
// botella de vinagre que se vierte
const botella = vinagre(); botella.visible = false; scene.add(botella);
const chorro = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), M("#efe6c4", { transparent: true, opacity: 0.8 })); chorro.visible = false; scene.add(chorro);
// plato de sushi
const platoSushi = new THREE.Group();
const piezasPlato = [];
for (let n = 0; n < 8; n++) { const pz = piezaSushi(); pz.position.set(-0.55 + (n % 4) * 0.36, 0.2, n < 4 ? -0.18 : 0.22); piezasPlato.push(pz); platoSushi.add(pz); }
const soya = new THREE.Group(); soya.position.set(0.85, 0.12, 0.35);
soya.add(mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.14, 20), "#ffffff", { contorno: 1.04 }));
const soyaL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 20), M("#3a1f10")); soyaL.position.y = 0.06; soya.add(soyaL);
platoSushi.add(soya);
const jengibre = new THREE.Group(); jengibre.position.set(0.8, 0.12, -0.3);
for (let n = 0; n < 5; n++) { const pe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6), M("#f6b8b0")); pe.scale.set(1, 0.18, 0.7); pe.position.set((hash(n) - 0.5) * 0.15, n * 0.025, (hash(n + 1) - 0.5) * 0.15); pe.rotation.y = n; jengibre.add(pe); }
platoSushi.add(jengibre);
const wasabi = mesh(new THREE.SphereGeometry(0.1, 12, 8), "#8bc34a"); wasabi.scale.set(1, 0.7, 1); wasabi.position.set(0.55, 0.15, -0.5); platoSushi.add(wasabi);
plato.add(platoSushi);

// ---------- tacos al pastor ----------
const ESTACOS = R.platillo === "tacos";
const COL_ADOBO = "#b5321f";
const chilesRemojo = new THREE.Group();
for (let n = 0; n < 3; n++) { const c = chileSeco(); c.position.set(-0.3 + n * 0.3, 0, (n - 1) * 0.2); c.rotation.y = n; chilesRemojo.add(c); }
chilesRemojo.position.set(BOWL.x, 0.7, BOWL.z); chilesRemojo.visible = false; scene.add(chilesRemojo);
const carneBowl = new THREE.Group();
for (let n = 0; n < 3; n++) { const c = mesh(new THREE.BoxGeometry(0.75, 0.06, 0.45), COL_ADOBO, { contorno: 1.03 }); c.position.set((n - 1) * 0.15, n * 0.05, (n - 1) * 0.1); c.rotation.y = n * 0.5; carneBowl.add(c); }
carneBowl.position.set(BOWL.x, 0.75, BOWL.z); carneBowl.visible = false; scene.add(carneBowl);
const carneSarten = new THREE.Group(); carneSarten.position.y = 0.16; sarten.add(carneSarten); carneSarten.visible = false;
const filetes = [];
for (let n = 0; n < 4; n++) { const f = mesh(new THREE.BoxGeometry(0.62, 0.05, 0.36), COL_ADOBO, { contorno: 1.03 }); f.position.set((n % 2 - 0.5) * 0.7, 0, (Math.floor(n / 2) - 0.5) * 0.48); f.rotation.y = n * 0.4; carneSarten.add(f); filetes.push(f); }
const pinaSarten = new THREE.Group(); pinaSarten.position.y = 0.17; sarten.add(pinaSarten); pinaSarten.visible = false;
const aros = [];
for (let n = 0; n < 3; n++) { const a = mesh(new THREE.TorusGeometry(0.22, 0.09, 8, 20), "#f2c84b", { contorno: 1.04 }); a.rotation.x = Math.PI / 2; a.position.set(-0.45 + n * 0.45, 0, (n % 2) * 0.2 - 0.1); pinaSarten.add(a); aros.push(a); }
// tabla para picar la carne
const tablaT = new THREE.Group();
tablaT.add(mesh(new THREE.BoxGeometry(2.1, 0.12, 1.3), "#d8a46a", { contorno: 1.02 }));
const cuchilloT = new THREE.Group();
const hojaT = mesh(new THREE.BoxGeometry(0.9, 0.24, 0.025), "#d6dde3"); hojaT.position.x = 0.1; cuchilloT.add(hojaT);
const mangoT = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.08), "#2b2b2b"); mangoT.position.x = 0.75; cuchilloT.add(mangoT);
tablaT.add(cuchilloT);
const cubos = [];
for (let n = 0; n < 30; n++) { const c = mesh(new THREE.BoxGeometry(0.11, 0.08, 0.11), n % 3 ? "#8a2a17" : "#a3341f", { contorno: 0 }); c.position.set((hash(n + 90) - 0.5) * 0.9, 0.11 + hash(n + 91) * 0.08, (hash(n + 92) - 0.5) * 0.6); c.rotation.y = hash(n) * 3; tablaT.add(c); cubos.push(c); }
const bloqueCarne = mesh(new THREE.BoxGeometry(0.9, 0.12, 0.55), "#8a2a17", { contorno: 1.03 }); bloqueCarne.position.y = 0.12; tablaT.add(bloqueCarne);
tablaT.position.copy(PAN); tablaT.position.y = 0.08; tablaT.visible = false; scene.add(tablaT);
// comal con tortillas
const comal = new THREE.Group();
comal.add(mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.06, 40), "#2b2b2b", { contorno: 1.02 }));
const tortisComal = [];
for (let n = 0; n < 3; n++) { const t2 = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 28), "#f1dca0", { contorno: 1.04 }); t2.position.set(-0.5 + n * 0.5, 0.05, (n % 2) * 0.35 - 0.15); comal.add(t2); tortisComal.push(t2); }
comal.position.copy(PAN); comal.position.y = 0.06; comal.visible = false; scene.add(comal);
// plato de tacos
const platoTacos = new THREE.Group();
function taco() {
  const g = new THREE.Group();
  const tor = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 24, 1, true, Math.PI / 2, Math.PI), "#f1dca0", { contorno: 1.03, extra: { side: THREE.DoubleSide } });
  tor.rotation.z = Math.PI / 2; tor.position.y = 0.4; g.add(tor);
  for (let n = 0; n < 14; n++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), M(n % 3 ? "#8a2a17" : "#a3341f")); c.position.set((hash(n + 120) - 0.5) * 0.75, 0.42 + hash(n + 121) * 0.1, (hash(n + 122) - 0.5) * 0.3); c.rotation.y = n; g.add(c); }
  for (let n = 0; n < 6; n++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), M("#fbf6ff")); c.position.set((hash(n + 140) - 0.5) * 0.7, 0.55, (hash(n + 141) - 0.5) * 0.25); g.add(c); }
  for (let n = 0; n < 6; n++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.045, 5), M("#3f9b3f", { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.position.set((hash(n + 150) - 0.5) * 0.7, 0.58, (hash(n + 151) - 0.5) * 0.25); g.add(c); }
  for (let n = 0; n < 3; n++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.09), M("#f2c84b")); c.position.set(-0.25 + n * 0.25, 0.57, 0.05); g.add(c); }
  return g;
}
const tacosPlato = [];
for (let n = 0; n < 3; n++) { const tc = taco(); tc.position.set(0, 0.06, -0.45 + n * 0.45); tc.rotation.y = 0.1; platoTacos.add(tc); tacosPlato.push(tc); }
const limon = mesh(new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI), "#9ccc3a"); limon.rotation.y = 1; limon.position.set(0.85, 0.15, 0.4); platoTacos.add(limon);
plato.add(platoTacos);

// ---------- pasta Alfredo ----------
const ESALFREDO = R.platillo === "alfredo";
const COL_PASTA = "#f3dc8c", COL_CREMA = "#f7ebc4";
function nidoPasta(radio, n, sem) {
  const g = new THREE.Group(), tubos = [];
  for (let i = 0; i < n; i++) {
    const pts = [];
    for (let k = 0; k < 7; k++) { const a = (k / 6) * Math.PI * 2.2 + hash(i + sem) * 6; const r = radio * (0.35 + 0.6 * hash(i * 7 + k + sem)); pts.push(V3(Math.cos(a) * r, 0.04 + hash(i + k * 3 + sem) * 0.18, Math.sin(a) * r)); }
    const tb = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 6), COL_PASTA, { contorno: 0 });
    tb.scale.set(1, 1, 1); g.add(tb); tubos.push(tb);
  }
  g.userData.tubos = tubos; return g;
}
// rallador + queso (en el lugar del tazón)
const rallador = new THREE.Group();
const rallCuerpo = mesh(new THREE.BoxGeometry(0.5, 1.0, 0.04), "#c9d0d6", { contorno: 1.03 }); rallador.add(rallCuerpo);
for (let i = 0; i < 15; i++) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.025, 6), M("#4a4f55")); h.position.set(((i % 3) - 1) * 0.12, -0.35 + Math.floor(i / 3) * 0.17, 0.025); rallador.add(h); }
const quesoRall = queso(); quesoRall.scale.setScalar(0.8); rallador.add(quesoRall);
rallador.position.set(BOWL.x + 0.15, 1.75, BOWL.z + 0.2); rallador.rotation.x = -0.35; rallador.visible = false; scene.add(rallador);
const montonQueso = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M("#fff3cf")); montonQueso.scale.y = 0.45; montonQueso.position.set(BOWL.x, 0.12, BOWL.z); montonQueso.visible = false; scene.add(montonQueso);
// pasta en la olla y en el sartén
const pastaOlla = new THREE.Group();
for (let i = 0; i < 16; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.0, 0.012), M(COL_PASTA)); v.position.set((hash(i + 3) - 0.5) * 0.3, 0.6, (hash(i + 5) - 0.5) * 0.3); v.rotation.z = (hash(i) - 0.5) * 0.6; pastaOlla.add(v); }
pastaOlla.position.copy(PAN); pastaOlla.visible = false; scene.add(pastaOlla);
const nidoSarten = nidoPasta(0.72, 16, 11); nidoSarten.position.y = 0.14; sarten.add(nidoSarten); nidoSarten.visible = false;
const quesoNieve = [];
for (let n = 0; n < 40; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.02), M("#fff3cf")); q.position.set((hash(n + 300) - 0.5) * 1.2, 0.35, (hash(n + 301) - 0.5) * 1.0); q.rotation.y = hash(n) * 3; sarten.add(q); quesoNieve.push(q); }
const vaso = new THREE.Group();
vaso.add(mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.35, 14, 1, true), "#cfe8ff", { extra: { side: THREE.DoubleSide, transparent: true, opacity: 0.6 } }));
vaso.position.set(PAN.x + 0.5, 1.4, PAN.z); vaso.visible = false; scene.add(vaso);
// plato
const platoAlfredo = new THREE.Group();
const nidoPlato = nidoPasta(0.7, 22, 41); nidoPlato.position.y = 0.08; platoAlfredo.add(nidoPlato);
const quesoPlato = [], pimienta = [];
for (let n = 0; n < 30; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.02), M("#fff3cf")); q.position.set((hash(n + 400) - 0.5) * 0.9, 0.3, (hash(n + 401) - 0.5) * 0.8); q.rotation.y = hash(n) * 3; platoAlfredo.add(q); quesoPlato.push(q); }
for (let n = 0; n < 25; n++) { const pm = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), M("#2b2b2b")); pm.position.set((hash(n + 500) - 0.5) * 0.9, 0.31, (hash(n + 501) - 0.5) * 0.8); platoAlfredo.add(pm); pimienta.push(pm); }
plato.add(platoAlfredo);

// ---------- roles de canela ----------
const ESROLES = R.platillo === "roles";
const COL_MASA_R = "#f3dfb5", COL_DORADO_R = "#d08a3c", COL_GLASE = "#fffaf0";
const texEspiral = texCanvas(256, 256, (g, w) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, w);
  g.strokeStyle = "#8a4b1f"; g.lineWidth = 15; g.lineCap = "round"; g.beginPath();
  for (let a = 0; a < Math.PI * 7; a += 0.05) { const r = 6 + a * 5.4; const x = w / 2 + Math.cos(a) * r, y = w / 2 + Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
});
const matRolLado = new THREE.MeshToonMaterial({ color: COL_MASA_R, gradientMap: grad });
const matRolTapa = new THREE.MeshToonMaterial({ color: COL_MASA_R, gradientMap: grad, map: texEspiral });
function rolCanela(r = 0.3, h = 0.26) {
  const geo = new THREE.CylinderGeometry(r, r, h, 28);
  const m = new THREE.Mesh(geo, [matRolLado, matRolTapa, matRolTapa]); m.castShadow = m.receiveShadow = true;
  const o = new THREE.Mesh(geo, LINEA); o.scale.setScalar(1.05); m.add(o);
  return m;
}
function canelaRaja() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 10), i % 2 ? "#8a4b1f" : "#9b5a2a"); c.rotation.z = Math.PI / 2; c.position.set(0, i * 0.11, (i - 1) * 0.07); g.add(c); }
  const cinta = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), "#e65a7a", { contorno: 0 }); cinta.rotation.y = Math.PI / 2; cinta.position.y = 0.1; g.add(cinta);
  return g;
}
function quesoCremaTina() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.32, 24), "#ffffff"));
  const tapaQ = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 24), "#4d8de0"); tapaQ.position.y = 0.2; g.add(tapaQ);
  const fr = mesh(new THREE.CylinderGeometry(0.345, 0.31, 0.1, 24), "#f4c430", { contorno: 0 }); fr.position.y = -0.02; g.add(fr);
  return g;
}
const rolesG = new THREE.Group(); rolesG.position.copy(BOWL); rolesG.visible = false; scene.add(rolesG);
// jarra con leche y levadura (espuma)
const jarra = new THREE.Group();
jarra.add(mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.8, 24, 1, true), "#cfe8ff", { contorno: 1.03, extra: { side: THREE.DoubleSide, transparent: true, opacity: 0.55 } }));
const lecheJ = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.5, 24), M("#fbf6ea")); lecheJ.position.y = -0.14; jarra.add(lecheJ);
const espuma = new THREE.Group(); jarra.add(espuma);
for (let n = 0; n < 9; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.13 + hash(n + 60) * 0.06, 12, 8), M(n % 3 ? "#f4e6c4" : "#efd9a8")); const a = n / 9 * 6.28; b.position.set(Math.cos(a) * 0.2 * (n % 2 ? 1 : 0.4), 0, Math.sin(a) * 0.2 * (n % 2 ? 1 : 0.4)); b.scale.y = 0.6; espuma.add(b); }
jarra.position.set(BOWL.x + 1.25, 0.4, BOWL.z + 0.35); jarra.visible = false; scene.add(jarra);
// tabla de madera
const tablaR = mesh(new THREE.BoxGeometry(2.9, 0.1, 1.9), "#c58a4a", { contorno: 1.02 }); tablaR.position.y = 0.05; rolesG.add(tablaR);
const bolaR = mesh(new THREE.SphereGeometry(0.55, 28, 18), COL_MASA_R); bolaR.position.y = 0.45; rolesG.add(bolaR);
const trapo = mesh(new THREE.SphereGeometry(0.95, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), "#4d8de0", { contorno: 1.02, extra: { side: THREE.DoubleSide } });
const trapoRaya = mesh(new THREE.TorusGeometry(0.86, 0.05, 6, 40), "#ffffff", { contorno: 0 }); trapoRaya.rotation.x = Math.PI / 2; trapoRaya.position.y = 0.32; trapo.add(trapoRaya);
trapo.position.y = 0.1; rolesG.add(trapo);
const lamina = mesh(new THREE.BoxGeometry(2.4, 0.07, 1.5), COL_MASA_R, { contorno: 1.02 }); lamina.position.y = 0.14; rolesG.add(lamina);
const capaMant = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, 1.3), M("#ffe9a6")); capaMant.position.set(0, 0.185, 0.05); rolesG.add(capaMant);
const granos = [];
for (let n = 0; n < 90; n++) { const gr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), M(n % 3 ? "#8a4b1f" : "#b0703a")); gr.position.set((hash(n + 700) - 0.5) * 2.2, 0.2, (hash(n + 701) - 0.5) * 1.15 + 0.05); gr.rotation.y = hash(n) * 3; rolesG.add(gr); granos.push(gr); }
const rodillo = new THREE.Group();
const rodCuerpo = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.7, 20), "#d9a066"); rodCuerpo.rotation.z = Math.PI / 2; rodillo.add(rodCuerpo);
for (const sx of [-1, 1]) { const mg = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10), "#a86f35"); mg.rotation.z = Math.PI / 2; mg.position.x = sx * 1.05; rodillo.add(mg); }
rodillo.position.y = 0.34; rolesG.add(rodillo);
// tronco enrollado = 12 rodajas
const rodajas = [];
for (let n = 0; n < 12; n++) { const r = rolCanela(0.3, 0.18); r.rotation.z = Math.PI / 2; r.position.set(-1.1 + n * 0.2, 0.42, 0); rolesG.add(r); rodajas.push(r); }
const hiloD = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6), M("#ffffff")); hiloD.rotation.x = Math.PI / 2; rolesG.add(hiloD);
const hiloD2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), M("#ffffff")); rolesG.add(hiloD2);
// molde con 12 roles
const molde = new THREE.Group();
const moldeBase = mesh(new THREE.BoxGeometry(2.5, 0.12, 1.9), "#5a5f68", { contorno: 1.02 }); moldeBase.position.y = 0.06; molde.add(moldeBase);
for (const [w, d, x, z] of [[2.5, 0.08, 0, 0.91], [2.5, 0.08, 0, -0.91], [0.08, 1.9, 1.21, 0], [0.08, 1.9, -1.21, 0]]) { const pa = mesh(new THREE.BoxGeometry(w, 0.42, d), "#6b717b", { contorno: 1.02 }); pa.position.set(x, 0.24, z); molde.add(pa); }
const rolesMolde = [], glaseMolde = [];
for (let n = 0; n < 12; n++) {
  const r = rolCanela(0.27, 0.3); r.position.set(-0.87 + (n % 4) * 0.58, 0.28, -0.56 + Math.floor(n / 4) * 0.56); molde.add(r); rolesMolde.push(r);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(COL_GLASE)); gl.scale.y = 0.35; gl.position.copy(r.position); gl.position.y = 0.43; molde.add(gl); glaseMolde.push(gl);
}
const moldeLuz = new THREE.PointLight(0xff8a1f, 0, 6); moldeLuz.position.set(0, 2, 1.2); molde.add(moldeLuz);
molde.visible = false; rolesG.add(molde);
const tazonGlase = new THREE.Group();
tazonGlase.add(mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.34, 24, 1, true), "#fbfaf6", { contorno: 1.03, extra: { side: THREE.DoubleSide } }));
const glaseT = new THREE.Mesh(new THREE.CircleGeometry(0.39, 24), M(COL_GLASE)); glaseT.rotation.x = -Math.PI / 2; glaseT.position.y = 0.1; tazonGlase.add(glaseT);
tazonGlase.position.set(BOWL.x + 1.75, 0.2, BOWL.z + 0.6); tazonGlase.visible = false; scene.add(tazonGlase);
// plato servido
const platoRoles = new THREE.Group(), rolesPlato = [];
for (let n = 0; n < 4; n++) {
  const g = new THREE.Group(); const r = rolCanela(0.36, 0.34); g.add(r);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(COL_GLASE)); gl.scale.y = 0.4; gl.position.y = 0.16; g.add(gl);
  for (let d = 0; d < 4; d++) { const gt = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.12, 3, 6), M(COL_GLASE)); const a = d * 1.6 + n; gt.position.set(Math.cos(a) * 0.35, 0.08, Math.sin(a) * 0.35); g.add(gt); }
  g.position.set([-0.38, 0.38, 0, 0][n], 0.25 + (n === 3 ? 0.34 : 0), [-0.25, -0.25, 0.32, 0][n]); platoRoles.add(g); rolesPlato.push(g);
}
plato.add(platoRoles);

// ---------- ratatouille ----------
const ESRATA = R.platillo === "ratatouille";
const VERD = [ // [lado, cara]
  ["#5b2a6e", "#f1ead0"], ["#3f8f2f", "#e3efc0"], ["#c8361f", "#f0644a"], ["#e8b820", "#fbf0b0"],
].map(([a, b]) => [new THREE.MeshToonMaterial({ color: a, gradientMap: grad }), new THREE.MeshToonMaterial({ color: b, gradientMap: grad })]);
const geoRodaja = new THREE.CylinderGeometry(0.15, 0.15, 0.035, 20);
function rodajaV(tipo) {
  const [l, c] = VERD[tipo]; const m = new THREE.Mesh(geoRodaja, [l, c, c]); m.castShadow = true;
  const o = new THREE.Mesh(geoRodaja, LINEA); o.scale.setScalar(1.06); m.add(o); return m;
}
function berenjena() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.26, 18, 14), "#5b2a6e"); b.scale.set(1, 1.7, 1); g.add(b);
  const c = mesh(new THREE.ConeGeometry(0.16, 0.16, 6), "#3f8f2f"); c.position.y = 0.46; c.rotation.x = Math.PI; g.add(c);
  const t = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6), "#3f8f2f", { contorno: 0 }); t.position.y = 0.58; g.add(t);
  return g;
}
function pimiento() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const l = mesh(new THREE.SphereGeometry(0.18, 14, 10), "#d8321c"); l.scale.set(1, 1.3, 1); l.position.set(Math.cos(i * 1.57) * 0.1, 0, Math.sin(i * 1.57) * 0.1); g.add(l); }
  const t = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.16, 6), "#3f8f2f", { contorno: 0 }); t.position.y = 0.28; g.add(t);
  return g;
}
function cebolla() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.25, 18, 14), "#e9d3a8"); b.scale.y = 0.9; g.add(b);
  const p = mesh(new THREE.ConeGeometry(0.08, 0.18, 8), "#d9b97f", { contorno: 0 }); p.position.y = 0.27; g.add(p);
  return g;
}
function ajo() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const d = mesh(new THREE.SphereGeometry(0.1, 10, 8), "#f6f0e2"); d.scale.set(0.8, 1.3, 0.8); d.position.set(Math.cos(i * 1.26) * 0.08, 0, Math.sin(i * 1.26) * 0.08); d.rotation.z = Math.cos(i * 1.26) * 0.3; g.add(d); }
  const p = mesh(new THREE.ConeGeometry(0.05, 0.14, 6), "#efe4c8", { contorno: 0 }); p.position.y = 0.17; g.add(p);
  return g;
}
// horno (puerta en el gabinete)
const hornoR = new THREE.Group();
hornoR.add(mesh(new THREE.BoxGeometry(2.3, 1.7, 0.1), "#2b2f36", { contorno: 1.01 }));
const ventanaH = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.9), new THREE.MeshBasicMaterial({ color: 0x1a1a1a })); ventanaH.position.set(0, -0.1, 0.06); hornoR.add(ventanaH);
const asaH = mesh(new THREE.CapsuleGeometry(0.05, 1.4, 4, 8), "#c9d0d6"); asaH.rotation.z = Math.PI / 2; asaH.position.set(0, 0.62, 0.14); hornoR.add(asaH);
const perillaH = new THREE.Group();
perillaH.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 20), "#c9d0d6")); perillaH.children[0].rotation.x = Math.PI / 2;
const marcaP = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.02), M("#c8361f")); marcaP.position.set(0, 0.08, 0.07); perillaH.add(marcaP);
perillaH.position.set(-0.85, 0.62, 0.1); hornoR.add(perillaH);
const texTemp = texCanvas(256, 128, (g, w, h) => { g.fillStyle = "#1b1b1b"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff8a1f"; g.font = "bold 92px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("190°", w / 2, h / 2 + 4); });
const pantallaH = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: texTemp })); pantallaH.position.set(0.7, 0.62, 0.06); hornoR.add(pantallaH);
const luzH = new THREE.PointLight(0xff8a1f, 0, 4); luzH.position.set(0, 0, 0.8); hornoR.add(luzH);
hornoR.position.set(BOWL.x, -1.55, 1.42); hornoR.visible = false; scene.add(hornoR);
// refractario redondo con salsa y espiral
const rataG = new THREE.Group(); rataG.position.copy(BOWL); rataG.visible = false; scene.add(rataG);
const refRed = mesh(new THREE.CylinderGeometry(1.2, 1.05, 0.32, 48), "#fbfaf6", { contorno: 1.02 }); refRed.position.y = 0.16; rataG.add(refRed);
const refRedBanda = mesh(new THREE.TorusGeometry(1.17, 0.035, 6, 48), P.azul, { contorno: 0 }); refRedBanda.rotation.x = Math.PI / 2; refRedBanda.position.y = 0.22; rataG.add(refRedBanda);
const salsaR = new THREE.Mesh(new THREE.CircleGeometry(1.08, 40), M("#c8361f")); salsaR.rotation.x = -Math.PI / 2; salsaR.position.y = 0.325; rataG.add(salsaR);
const espiralR = [];
{ let n = 0; for (let k = 0; k < 4; k++) { const rad = 0.92 - k * 0.24, cnt = Math.max(1, Math.round(2 * Math.PI * rad / 0.11)); for (let j = 0; j < cnt; j++) {
  const a = j / cnt * Math.PI * 2 + k * 0.4, s = rodajaV(n % 4);
  const piv = new THREE.Group(); piv.position.set(Math.cos(a) * rad, 0.42, Math.sin(a) * rad); piv.rotation.y = -a + Math.PI / 2;
  s.rotation.x = 1.15; piv.add(s); rataG.add(piv); espiralR.push(piv); n++; } } }
const hierbas = [];
for (let n = 0; n < 50; n++) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), M(n % 2 ? "#3f7f2a" : "#6a9a3a")); const a = hash(n + 900) * 6.28, r = Math.sqrt(hash(n + 901)) * 1.0; h.position.set(Math.cos(a) * r, 0.52, Math.sin(a) * r); rataG.add(h); hierbas.push(h); }
const aluminio = mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.14, 40), "#d4d9de", { contorno: 1.02 }); aluminio.position.y = 0.6; rataG.add(aluminio);
const luzR = new THREE.PointLight(0xff8a1f, 0, 6); luzR.position.set(0, 2, 1.2); rataG.add(luzR);
// tabla con verduras para rebanar
const tablaV = new THREE.Group(); tablaV.position.copy(BOWL); tablaV.visible = false; scene.add(tablaV);
{ const tb = mesh(new THREE.BoxGeometry(2.6, 0.1, 1.6), "#c58a4a", { contorno: 1.02 }); tb.position.y = 0.05; tablaV.add(tb); }
const troncosV = [], pilasV = [];
for (let k = 0; k < 4; k++) {
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 20), VERD[k]); tr.rotation.z = Math.PI / 2; tr.position.set(-0.35, 0.25, -0.55 + k * 0.37);
  const o = new THREE.Mesh(tr.geometry, LINEA); o.scale.setScalar(1.05); tr.add(o); tablaV.add(tr); troncosV.push(tr);
  const pila = []; for (let j = 0; j < 6; j++) { const s = rodajaV(k); s.rotation.z = Math.PI / 2 - 0.5; s.position.set(0.45 + j * 0.07, 0.24, -0.55 + k * 0.37); tablaV.add(s); pila.push(s); } pilasV.push(pila);
}
const cuchilloV = new THREE.Group();
cuchilloV.add(mesh(new THREE.BoxGeometry(0.5, 0.2, 0.02), "#c9d0d6")); const mangoV = mesh(new THREE.BoxGeometry(0.4, 0.09, 0.06), "#2b2b2b"); mangoV.position.x = 0.45; cuchilloV.add(mangoV);
cuchilloV.rotation.y = Math.PI / 2; tablaV.add(cuchilloV);
// plato servido
const platoRata = new THREE.Group();
{ const n0 = []; for (let k = 0; k < 2; k++) { const rad = 0.62 - k * 0.3, cnt = Math.round(2 * Math.PI * rad / 0.11); for (let j = 0; j < cnt; j++) { const a = j / cnt * 6.28, s = rodajaV((j + k) % 4); const piv = new THREE.Group(); piv.position.set(Math.cos(a) * rad, 0.18, Math.sin(a) * rad); piv.rotation.y = -a + Math.PI / 2; s.rotation.x = 1.15; piv.add(s); platoRata.add(piv); } } }
const salsaPR = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), M("#c8361f")); salsaPR.rotation.x = -Math.PI / 2; salsaPR.position.y = 0.07; platoRata.add(salsaPR);
const albahacas = [];
for (let n = 0; n < 4; n++) { const h = mesh(new THREE.SphereGeometry(0.12, 10, 6), "#2e8b3a", { contorno: 1.06 }); h.scale.set(1, 0.25, 0.6); h.position.set(Math.cos(n * 1.6) * 0.15, 0.4, Math.sin(n * 1.6) * 0.15); h.rotation.y = n; platoRata.add(h); albahacas.push(h); }
plato.add(platoRata);
// ---------- chilaquiles ----------
const ESCHILA = R.platillo === "chilaquiles";
const COL_TORTI = "#f1dca0", COL_TOTO = "#dc9a32", COL_SALCH = "#a8281a";
const geoGajo = (r, h) => new THREE.CylinderGeometry(r, r, h, 8, 1, false, 0, Math.PI / 4);
function totopo() { const m = mesh(geoGajo(0.32, 0.04), COL_TORTI, { contorno: 1.05 }); return m; }
// tabla con tortillas que se cortan en 8 triángulos
const tablaCh = new THREE.Group(); tablaCh.position.copy(PAN); tablaCh.position.y = 0.08; tablaCh.visible = false; scene.add(tablaCh);
{ const tb = mesh(new THREE.BoxGeometry(2.3, 0.12, 1.5), "#c58a4a", { contorno: 1.02 }); tablaCh.add(tb); }
for (let n = 0; n < 3; n++) { const d = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 32), COL_TORTI, { contorno: 1.03 }); d.position.set(0.65, 0.08 + n * 0.035, -0.2); d.rotation.y = n; tablaCh.add(d); }
const gajosT = [];
for (let n = 0; n < 8; n++) { const piv = new THREE.Group(); piv.position.set(-0.35, 0.09, 0.05); piv.rotation.y = n * Math.PI / 4; const g = mesh(geoGajo(0.55, 0.035), COL_TORTI, { contorno: 1.03 }); piv.add(g); tablaCh.add(piv); gajosT.push(piv); }
const cuchilloCh = new THREE.Group();
{ const h = mesh(new THREE.BoxGeometry(1.2, 0.22, 0.025), "#d6dde3"); cuchilloCh.add(h); const m = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.08), "#2b2b2b"); m.position.x = 0.8; cuchilloCh.add(m); }
tablaCh.add(cuchilloCh);
// aceite y totopos en el sartén
const aceiteCh = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.04, 40), M("#f2c14e", { transparent: true, opacity: 0.45 })); aceiteCh.position.y = 0.12; aceiteCh.visible = false; sarten.add(aceiteCh);
const totSarten = new THREE.Group(); totSarten.position.y = 0.17; totSarten.visible = false; sarten.add(totSarten);
const totosS = [];
for (let n = 0; n < 12; n++) { const tt = totopo(); const a = hash(n + 300) * 6.28, r = 0.15 + hash(n + 301) * 0.45; tt.position.set(Math.cos(a) * r - 0.15, (n % 3) * 0.03, Math.sin(a) * r - 0.15); tt.rotation.set((hash(n + 302) - 0.5) * 0.4, hash(n + 303) * 6.28, (hash(n + 304) - 0.5) * 0.4); totSarten.add(tt); totosS.push(tt); }
const burbCh = [];
for (let n = 0; n < 16; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M("#fff3c4")); const a = hash(n + 320) * 6.28, r = 0.1 + hash(n + 321) * 0.65; b.position.set(Math.cos(a) * r, 0.18, Math.sin(a) * r); b.visible = false; sarten.add(b); burbCh.push(b); }
// plato con papel absorbente (escurrir)
const escurreCh = new THREE.Group(); escurreCh.position.copy(BOWL); escurreCh.position.y = 0.06; escurreCh.visible = false; scene.add(escurreCh);
escurreCh.add(mesh(new THREE.CylinderGeometry(1.15, 0.85, 0.12, 48), "#fbfaf6", { contorno: 1.02 }));
{ const pp = mesh(new THREE.BoxGeometry(1.35, 0.02, 1.35), "#ffffff", { contorno: 1.01 }); pp.position.y = 0.08; pp.rotation.y = 0.3; escurreCh.add(pp);
  for (let n = 0; n < 6; n++) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.005, 0.015), M("#e3e6ea")); l.position.set(0, 0.095, -0.55 + n * 0.22); pp.add(l); } }
const totosE = [];
for (let n = 0; n < 18; n++) { const tt = totopo(); tt.material = M(COL_TOTO); const a = hash(n + 340) * 6.28, r = Math.sqrt(hash(n + 341)) * 0.45; tt.position.set(Math.cos(a) * r - 0.1, 0.12 + (n / 18) * 0.25, Math.sin(a) * r - 0.1); tt.rotation.set((hash(n + 342) - 0.5) * 0.8, hash(n + 343) * 6.28, (hash(n + 344) - 0.5) * 0.8); tt.userData.y0 = tt.position.y; escurreCh.add(tt); totosE.push(tt); }
const salCh = [];
for (let n = 0; n < 30; n++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), M("#ffffff")); s.position.set((hash(n + 360) - 0.5) * 0.8 - 0.1, 0.4, (hash(n + 361) - 0.5) * 0.8 - 0.1); escurreCh.add(s); salCh.push(s); }
const salero = sal(); salero.rotation.z = 2.4; escurreCh.add(salero);
// agua de la olla con chiles y jitomates
const aguaOlla = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.04, 36), M("#cfe3ee")); aguaOlla.position.y = 0.32; aguaOlla.visible = false; olla.add(aguaOlla);
const enOlla = [];
for (let n = 0; n < 7; n++) { const o = n < 4 ? chileSeco() : jitomate(); o.scale.setScalar(n < 4 ? 0.8 : 0.75); o.userData.x = Math.cos(n * 0.9) * 0.4; o.userData.z = Math.sin(n * 0.9) * 0.35; o.visible = false; olla.add(o); enOlla.push(o); }
const burbOlla = [];
for (let n = 0; n < 12; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M("#ffffff", { transparent: true, opacity: 0.8 })); b.position.set(Math.cos(n * 2.1) * hash(n + 380) * 0.6, 0.35, Math.sin(n * 2.1) * hash(n + 381) * 0.6); b.visible = false; olla.add(b); burbOlla.push(b); }
// licuadora
const licuadora = new THREE.Group(); licuadora.position.copy(BOWL); licuadora.visible = false; scene.add(licuadora);
{ const base = mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.6, 24), "#d9342b", { contorno: 1.03 }); base.position.y = 0.3; licuadora.add(base);
  const bot = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), "#2b2b2b", { contorno: 0 }); bot.rotation.x = Math.PI / 2; bot.position.set(0, 0.32, 0.62); licuadora.add(bot);
  const tapaL = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24), "#2b2b2b", { contorno: 1.03 }); tapaL.position.y = 2.15; licuadora.add(tapaL); }
const vasoL = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.4, 1.5, 24, 1, true), M("#dff1ff", { transparent: true, opacity: 0.35, side: THREE.DoubleSide })); vasoL.position.y = 1.35; licuadora.add(vasoL);
{ const o = new THREE.Mesh(vasoL.geometry, LINEA); o.scale.setScalar(1.02); vasoL.add(o); }
const liquidoL = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.39, 1, 24), M(COL_SALCH)); licuadora.add(liquidoL);
const trozosL = [];
for (let n = 0; n < 8; n++) { const o = n < 4 ? chileSeco() : jitomate(); o.scale.setScalar(0.55); o.position.set(Math.cos(n * 1.7) * 0.2, 0.85 + (n % 4) * 0.15, Math.sin(n * 1.7) * 0.15); licuadora.add(o); trozosL.push(o); }
const remL = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 30, Math.PI * 1.5), M("#d0503a")); remL.rotation.x = -Math.PI / 2; licuadora.add(remL);
// plato de chilaquiles
const platoChila = new THREE.Group();
const totosP = [];
for (let n = 0; n < 44; n++) { const tt = totopo(); tt.scale.setScalar(1.15); tt.material = M(n % 5 ? COL_SALCH : n % 2 ? "#c4552a" : "#d07a2e"); const a = n * 2.4, r = Math.sqrt((n + 0.5) / 44) * 0.68; tt.position.set(Math.cos(a) * r, 0.1 + (0.68 - r) * 0.55 + hash(n + 402) * 0.05, Math.sin(a) * r * 0.85); tt.rotation.set(0.35 + hash(n + 403) * 0.5, -a + Math.PI / 2 + (hash(n + 404) - 0.5) * 1.2, (hash(n + 405) - 0.5) * 0.5); tt.userData.y0 = tt.position.y; platoChila.add(tt); totosP.push(tt); }
const cremaCh = [];
for (let n = 0; n < 3; n++) { const c = mesh(new THREE.TorusGeometry(0.14 + n * 0.08, 0.028, 6, 24, Math.PI * 1.2), "#fffaf0", { contorno: 0 }); c.rotation.set(-Math.PI / 2 + 0.2, 0, n * 1.9); c.position.set(-0.1 + n * 0.08, 0.5 - n * 0.03, -0.05 + n * 0.05); platoChila.add(c); cremaCh.push(c); }
const quesoCh = [];
for (let n = 0; n < 24; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), M("#fffdf5")); const a = hash(n + 420) * 6.28, r = Math.sqrt(hash(n + 421)) * 0.5; q.position.set(Math.cos(a) * r, 0.5 - r * 0.3, Math.sin(a) * r * 0.85); q.rotation.y = n; q.userData.y0 = q.position.y; platoChila.add(q); quesoCh.push(q); }
const cebollaCh = [], cilantroCh = [];
for (let n = 0; n < 6; n++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 16), M("#c770c9")); c.rotation.x = -Math.PI / 2 + 0.3; const a = n * 1.05 + 0.3; c.position.set(Math.cos(a) * 0.36, 0.42, Math.sin(a) * 0.3); platoChila.add(c); cebollaCh.push(c); }
for (let n = 0; n < 12; n++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), M("#3f9b3f", { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2 + hash(n + 440) * 0.6; const a = hash(n + 441) * 6.28, r = 0.15 + hash(n + 442) * 0.4; c.position.set(Math.cos(a) * r, 0.5 - r * 0.2, Math.sin(a) * r * 0.85); platoChila.add(c); cilantroCh.push(c); }
const huevoCh = new THREE.Group(); huevoCh.position.set(0.1, 0.55, 0.05);
{ const cl = mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.04, 20), "#ffffff", { contorno: 1.04 }); cl.scale.set(1, 1, 0.85); huevoCh.add(cl);
  const ye = mesh(new THREE.SphereGeometry(0.12, 16, 10), "#ffb21f", { contorno: 1.06 }); ye.scale.y = 0.6; ye.position.set(0.04, 0.04, 0); huevoCh.add(ye); }
platoChila.add(huevoCh);
plato.add(platoChila);
// ---------- tacos de carne asada ----------
const ESCARNE = R.platillo === "carneasada";
const COL_CRUDA = "#c9625a", COL_ASADA = "#6e3a1e";
function naranja() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.28, 20, 14), "#f28c1f"); g.add(b);
  const h = mesh(new THREE.SphereGeometry(0.1, 10, 6), "#3f8f2f", { contorno: 1.06 }); h.scale.set(1, 0.3, 0.6); h.position.set(0.08, 0.28, 0); h.rotation.z = -0.4; g.add(h);
  const lim = mesh(new THREE.SphereGeometry(0.17, 14, 10), "#8cc63f"); lim.scale.set(1.2, 1, 1); lim.position.set(0.42, -0.1, 0.1); g.add(lim);
  return g;
}
function cebollita() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.13, 14, 10), "#f6f1e4"); b.scale.set(1.3, 1, 1); g.add(b);
  const t = mesh(new THREE.CapsuleGeometry(0.04, 0.55, 4, 8), "#4f9e34"); t.rotation.z = Math.PI / 2; t.position.x = 0.42; g.add(t);
  return g;
}
function fileteCA() {
  const g = new THREE.Group();
  const c = mesh(new THREE.BoxGeometry(0.85, 0.07, 0.45), COL_CRUDA, { contorno: 1.03 }); g.add(c); g.userData.cuerpo = c;
  const marcas = [];
  for (let n = 0; n < 4; n++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.005, 0.47), M("#2a1508")); m.position.set(-0.3 + n * 0.2, 0.038, 0); m.rotation.y = 0.5; g.add(m); marcas.push(m); }
  g.userData.marcas = marcas; return g;
}
const colorCarne = v => M("#" + new THREE.Color(COL_CRUDA).lerp(new THREE.Color(COL_ASADA), clamp(v)).getHexString());
// parrilla (en lugar del sartén)
const parrilla = new THREE.Group(); parrilla.position.copy(PAN); parrilla.position.y = 0.08; parrilla.visible = false; scene.add(parrilla);
parrilla.add(mesh(new THREE.BoxGeometry(2.1, 0.1, 1.5), "#33363d", { contorno: 1.02 }));
for (let n = 0; n < 9; n++) { const r = mesh(new THREE.BoxGeometry(0.05, 0.06, 1.4), "#25272c", { contorno: 0 }); r.position.set(-0.92 + n * 0.23, 0.07, 0); parrilla.add(r); }
{ const m = mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), "#2b2b2b"); m.rotation.z = Math.PI / 2; m.position.set(1.45, 0.05, 0); parrilla.add(m); }
const brasa = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.02, 1.55), new THREE.MeshBasicMaterial({ color: 0xff7a1f, transparent: true, opacity: 0.8 })); brasa.position.y = -0.05; parrilla.add(brasa);
const filetesG = [0, 1].map(n => { const f = fileteCA(); f.position.set(-0.45, 0.14, n ? 0.3 : -0.3); f.rotation.y = n ? -0.15 : 0.1; parrilla.add(f); return f; });
const cebollitasG = [];
for (let n = 0; n < 4; n++) { const c = cebollita(); c.position.set(0.25, 0.22, -0.5 + n * 0.32); c.rotation.y = 0.15; parrilla.add(c); cebollitasG.push(c); }
const tortisG = [];
for (let n = 0; n < 3; n++) { const t2 = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 28), "#f1dca0", { contorno: 1.04 }); t2.position.set(-0.5 + n * 0.5, 0.13, (n % 2) * 0.35 - 0.15); parrilla.add(t2); tortisG.push(t2); }
const gotaCA = mesh(new THREE.SphereGeometry(0.07, 12, 8), "#8fd0ff", { contorno: 1.08 }); gotaCA.scale.y = 1.3; parrilla.add(gotaCA);
const salpicas = [];
for (let n = 0; n < 8; n++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M("#cfeaff")); parrilla.add(s); salpicas.push(s); }
// tazón con carne marinándose
const marinaCA = new THREE.Group(); marinaCA.position.set(BOWL.x, 0.62, BOWL.z); marinaCA.visible = false; scene.add(marinaCA);
const filetesM = [0, 1, 2].map(n => { const f = fileteCA(); f.scale.setScalar(0.8); f.position.set((n - 1) * 0.12, n * 0.06, (n - 1) * 0.08); f.rotation.y = n * 0.6; f.userData.marcas.forEach(m => m.visible = false); marinaCA.add(f); return f; });
const jugoM = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 8), M("#f2a33a", { transparent: true, opacity: 0.85 })); jugoM.position.set(0.15, 1.0, 0); marinaCA.add(jugoM);
const naranjaM = naranja(); naranjaM.children[2].visible = false; naranjaM.scale.setScalar(0.8); naranjaM.position.set(0.15, 1.95, 0); marinaCA.add(naranjaM);
// tabla: reposo y picado
const tablaCA = new THREE.Group(); tablaCA.position.copy(BOWL); tablaCA.position.y = 0.06; tablaCA.visible = false; scene.add(tablaCA);
tablaCA.add(mesh(new THREE.BoxGeometry(2.4, 0.12, 1.5), "#c58a4a", { contorno: 1.02 }));
const fileteT = fileteCA(); fileteT.position.set(-0.15, 0.1, 0); fileteT.scale.set(1.3, 1, 1.4); fileteT.userData.cuerpo.material = M(COL_ASADA); tablaCA.add(fileteT);
const fibras = [];
for (let n = 0; n < 5; n++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.004, 0.012), M("#a0603a")); f.position.set(0, 0.04, -0.17 + n * 0.085); fileteT.add(f); fibras.push(f); }
const tirasCA = [];
for (let n = 0; n < 8; n++) { const tr = mesh(new THREE.BoxGeometry(0.1, 0.09, 0.6), COL_ASADA, { contorno: 1.04 }); tr.position.set(-0.6 + n * 0.16, 0.11, 0); tablaCA.add(tr); tirasCA.push(tr); const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.092, 0.58), M("#b0573a")); tr.add(c); }
const cubosCA = [];
for (let n = 0; n < 36; n++) { const c = mesh(new THREE.BoxGeometry(0.11, 0.08, 0.11), n % 3 ? "#6e3a1e" : "#8a4a28", { contorno: 0 }); c.position.set((hash(n + 500) - 0.5) * 1.0 - 0.15, 0.1 + hash(n + 501) * 0.06, (hash(n + 502) - 0.5) * 0.6); c.rotation.y = hash(n) * 3; tablaCA.add(c); cubosCA.push(c); }
const cuchilloCA = new THREE.Group();
{ const h = mesh(new THREE.BoxGeometry(1.0, 0.22, 0.025), "#d6dde3"); cuchilloCA.add(h); const m = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.08), "#2b2b2b"); m.position.x = 0.7; cuchilloCA.add(m); }
tablaCA.add(cuchilloCA);
const vaporT = [];
for (let n = 0; n < 6; n++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); tablaCA.add(v); vaporT.push(v); }
// plato de tacos de carne asada
const platoCA = new THREE.Group();
const tacosCA = [];
for (let n = 0; n < 3; n++) {
  const g = new THREE.Group(); const a = n * 2.1 + 0.4; g.position.set(Math.cos(a) * 0.48, 0.08, Math.sin(a) * 0.4); platoCA.add(g);
  const tor = [0, 1].map(k => { const d = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 28), "#f1dca0", { contorno: 1.04 }); d.position.set(k * 0.05, k * 0.035, -k * 0.03); g.add(d); return d; });
  const carneT = []; for (let k = 0; k < 14; k++) { const c = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), k % 3 ? "#6e3a1e" : "#8a4a28", { contorno: 0 }); const aa = hash(k + n * 30 + 520) * 6.28, r = Math.sqrt(hash(k + n * 30 + 521)) * 0.24; c.position.set(Math.cos(aa) * r, 0.1 + hash(k + 522) * 0.04, Math.sin(aa) * r); c.rotation.y = k; c.userData.y0 = c.position.y; g.add(c); carneT.push(c); }
  const ceb = []; for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), M("#fbf6ff")); const aa = hash(k + n * 30 + 540) * 6.28, r = hash(k + 541) * 0.2; c.position.set(Math.cos(aa) * r, 0.17, Math.sin(aa) * r); g.add(c); ceb.push(c); }
  const cil = []; for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.045, 5), M("#3f9b3f", { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; const aa = hash(k + n * 30 + 560) * 6.28, r = hash(k + 561) * 0.2; c.position.set(Math.cos(aa) * r, 0.19, Math.sin(aa) * r); g.add(c); cil.push(c); }
  const sal = []; for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M(n === 1 ? "#4f9e34" : "#b5321f")); c.scale.y = 0.4; c.position.set((hash(k + n * 9 + 580) - 0.5) * 0.3, 0.2, (hash(k + n * 9 + 581) - 0.5) * 0.3); g.add(c); sal.push(c); }
  tacosCA.push({ g, tor, carneT, ceb, cil, sal });
}
const limonesCA = [0, 1].map(n => { const l = mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI), "#9ccc3a"); l.rotation.set(-Math.PI / 2, 0, n * 0.8); l.position.set(0.15 + n * 0.25, 0.1, 0.62); platoCA.add(l); return l; });
const cebPlato = [0, 1, 2].map(n => { const c = cebollita(); c.children[0].material = M("#e2c48e"); c.children[1].material = M("#3d7a26"); c.scale.setScalar(0.8); c.position.set(-0.75, 0.12, -0.25 + n * 0.22); c.rotation.y = -0.3; platoCA.add(c); return c; });
plato.add(platoCA);
// ---------- nachos (noche de estreno) ----------
const ESNACHOS = R.platillo === "nachos";
const COL_QUESO_N = "#ffcf3a", COL_FRIJOL = "#5a2f1c";
function totoposBolsa() {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.55, 0.75, 0.22), "#f08a1c"); g.add(b);
  const v = new THREE.Mesh(new THREE.CircleGeometry(0.16, 3), M("#ffe08a")); v.position.set(0, 0.05, 0.115); v.rotation.z = Math.PI / 2; g.add(v);
  for (let n = 0; n < 3; n++) { const tt = mesh(geoGajo(0.22, 0.03), "#e8b04a", { contorno: 1.05 }); tt.position.set(-0.12 + n * 0.12, 0.42, 0); tt.rotation.set(Math.PI / 2, 0, n * 0.6); g.add(tt); }
  return g;
}
function aguacate() {
  const g = new THREE.Group();
  const a = mesh(new THREE.SphereGeometry(0.24, 18, 14), "#3d5a1e"); a.scale.set(1, 1.3, 0.9); g.add(a);
  const m = new THREE.Group(); m.position.set(0.42, -0.05, 0.05); g.add(m);
  const c = mesh(new THREE.SphereGeometry(0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), "#3d5a1e"); c.scale.set(1, 1.3, 0.9); c.rotation.x = -Math.PI / 2; m.add(c);
  const pulpa = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), M("#c9dc6a")); pulpa.scale.set(1, 1.3, 1); pulpa.position.z = 0.005; m.add(pulpa);
  const hueso = mesh(new THREE.SphereGeometry(0.08, 12, 8), "#7a4a24", { contorno: 1.06 }); hueso.position.z = 0.03; m.add(hueso);
  return g;
}
// lista de la noche: cobija, control y café
const cobija = new THREE.Group();
for (let n = 0; n < 3; n++) { const c = mesh(new THREE.BoxGeometry(0.9, 0.13, 0.6), n % 2 ? "#e8b820" : "#c8361f", { contorno: 1.03 }); c.position.y = n * 0.13; cobija.add(c); }
const controlG = new THREE.Group();
{ const b = mesh(new THREE.CapsuleGeometry(0.16, 0.45, 6, 12), "#2b2f36"); b.rotation.z = Math.PI / 2; b.scale.set(1, 1, 0.6); controlG.add(b);
  [[-0.2, "#4d8de0"], [0.2, "#e65a7a"]].forEach(([x, c]) => { const s = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), c, { contorno: 0 }); s.position.set(x, 0.1, 0.02); controlG.add(s); }); }
const cafeN = new THREE.Group();
{ const j = mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 18), "#a8582c"); cafeN.add(j); const a = mesh(new THREE.TorusGeometry(0.11, 0.035, 6, 12), "#a8582c", { contorno: 0 }); a.position.x = 0.24; a.rotation.z = Math.PI / 2; cafeN.add(a);
  const l = new THREE.Mesh(new THREE.CircleGeometry(0.19, 16), M("#3a1f10")); l.rotation.x = -Math.PI / 2; l.position.y = 0.2; cafeN.add(l); }
const listaN = [cobija, controlG, cafeN];
listaN.forEach((o, n) => { o.position.set([-1.75, -0.95, 0.75][n], 0.25, [0.9, 0.9, 1.2][n]); o.visible = false; scene.add(o); });
const palomitas = listaN.map(o => { const tx = texCanvas(128, 128, (g, w, h) => { g.fillStyle = "#3f9b3f"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.strokeStyle = "#ffffff"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(36, 66); g.lineTo(56, 86); g.lineTo(92, 44); g.stroke(); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); m.visible = false; scene.add(m); return m; });
// tele con "GTA VI"
const tele = new THREE.Group(); tele.position.set(1.45, 0.3, -0.3); tele.scale.setScalar(0.72); tele.visible = false; scene.add(tele);
tele.add(mesh(new THREE.BoxGeometry(2.0, 1.25, 0.12), "#1b1b1f", { contorno: 1.02 }));
{ const pata = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.35), "#1b1b1f"); pata.position.y = -0.66; tele.add(pata); }
tele.children[0].position.y = 0.0;
const texTele = texCanvas(512, 320, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#ff5fa2"); gr.addColorStop(0.55, "#ffb35a"); gr.addColorStop(1, "#3ec6d8"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ffe36b"; g.beginPath(); g.arc(w / 2, h * 0.62, 70, Math.PI, 0); g.fill();
  g.fillStyle = "#1b2a4a"; for (let n = 0; n < 9; n++) { const x = 20 + n * 56, hh = 40 + (n * 37) % 70; g.fillRect(x, h * 0.62 - hh, 34, hh + 200); }
  g.font = "bold 120px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 14; g.strokeStyle = "#2a0f2e"; g.strokeText("GTA VI", w / 2, h * 0.32); g.fillStyle = "#ffffff"; g.fillText("GTA VI", w / 2, h * 0.32);
});
const pantallaTV = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 1.1), new THREE.MeshBasicMaterial({ map: texTele })); pantallaTV.position.set(0, 0.62, 0.065); tele.add(pantallaTV);
tele.children[0].position.y = 0.62;
const luzTV = new THREE.PointLight(0xff8ac0, 0, 5); luzTV.position.set(0, 0.7, 1.2); tele.add(luzTV);
// tabla del pico de gallo
const tablaN = new THREE.Group(); tablaN.position.copy(BOWL); tablaN.position.y = 0.06; tablaN.visible = false; scene.add(tablaN);
tablaN.add(mesh(new THREE.BoxGeometry(2.3, 0.12, 1.4), "#c58a4a", { contorno: 1.02 }));
const pilasN = [["#d9342b", -0.6], ["#fbf6ff", 0.0], ["#3f9b3f", 0.6]].map(([c, x], k) => { const arr = []; for (let n = 0; n < 16; n++) { const cu = new THREE.Mesh(k === 2 ? new THREE.CircleGeometry(0.05, 5) : new THREE.BoxGeometry(0.08, 0.07, 0.08), M(c, k === 2 ? { side: THREE.DoubleSide } : {})); if (k === 2) cu.rotation.x = -Math.PI / 2 + hash(n) * 0.5; cu.position.set(x + (hash(n + 600 + k * 20) - 0.5) * 0.35, 0.1 + hash(n + 601) * 0.06, (hash(n + 602 + k * 20) - 0.5) * 0.35); tablaN.add(cu); arr.push(cu); } return arr; });
const cuchilloN = new THREE.Group();
{ const h = mesh(new THREE.BoxGeometry(0.9, 0.2, 0.025), "#d6dde3"); cuchilloN.add(h); const m = mesh(new THREE.BoxGeometry(0.4, 0.09, 0.07), "#2b2b2b"); m.position.x = 0.62; cuchilloN.add(m); }
tablaN.add(cuchilloN);
const limonN = mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI), "#9ccc3a"); limonN.rotation.x = Math.PI / 2; tablaN.add(limonN);
// guacamole
const guacG = new THREE.Group(); guacG.position.copy(BOWL); guacG.position.y = 0.06; guacG.visible = false; scene.add(guacG);
{ const mc = mesh(new THREE.CylinderGeometry(0.85, 0.6, 0.55, 24), "#4a4a4f", { contorno: 1.03 }); mc.position.y = 0.27; guacG.add(mc); }
const guacMasa = mesh(new THREE.SphereGeometry(0.72, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), "#9cc23e", { contorno: 0 }); guacMasa.position.y = 0.5; guacG.add(guacMasa);
const mitadesA = [0, 1].map(n => { const a = aguacate().children[1]; a.position.set(-0.25 + n * 0.5, 0.75, 0); a.rotation.x = -Math.PI / 2; a.scale.setScalar(1.3); guacG.add(a); return a; });
const tenedor = new THREE.Group();
{ const m = mesh(new THREE.BoxGeometry(0.06, 0.7, 0.03), "#c9d0d6"); m.position.y = 0.35; tenedor.add(m); for (let n = 0; n < 4; n++) { const d = mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), "#c9d0d6", { contorno: 0 }); d.position.set(-0.05 + n * 0.033, -0.1, 0); tenedor.add(d); } }
guacG.add(tenedor);
// charola con capas
const charola = new THREE.Group(); charola.position.copy(BOWL); charola.position.y = 0.06; charola.visible = false; scene.add(charola);
charola.add(mesh(new THREE.BoxGeometry(2.3, 0.08, 1.5), "#b8c0c8", { contorno: 1.02 }));
{ for (const [x, z, w, d] of [[0, 0.74, 2.3, 0.06], [0, -0.74, 2.3, 0.06], [1.13, 0, 0.06, 1.5], [-1.13, 0, 0.06, 1.5]]) { const b = mesh(new THREE.BoxGeometry(w, 0.16, d), "#b8c0c8", { contorno: 0 }); b.position.set(x, 0.08, z); charola.add(b); } }
const capasN = [0, 1].map(k => {
  const tot = [], fri = [], que = [];
  for (let n = 0; n < 22; n++) { const tt = totopo(); tt.material = M("#e8b04a"); tt.position.set((hash(n + 700 + k * 50) - 0.5) * 1.8, 0.1 + k * 0.12 + hash(n + 701) * 0.03, (hash(n + 702 + k * 50) - 0.5) * 1.1); tt.rotation.set((hash(n + 703) - 0.5) * 0.5, hash(n + 704 + k) * 6.28, (hash(n + 705) - 0.5) * 0.5); tt.userData.y0 = tt.position.y; charola.add(tt); tot.push(tt); }
  for (let n = 0; n < 9; n++) { const f = mesh(new THREE.SphereGeometry(0.12, 12, 8), COL_FRIJOL, { contorno: 0 }); f.scale.y = 0.4; f.position.set((hash(n + 720 + k * 30) - 0.5) * 1.6, 0.16 + k * 0.12, (hash(n + 721 + k * 30) - 0.5) * 1.0); charola.add(f); fri.push(f); }
  for (let n = 0; n < 40; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), M(COL_QUESO_N)); q.position.set((hash(n + 740 + k * 60) - 0.5) * 1.8, 0.2 + k * 0.12, (hash(n + 741 + k * 60) - 0.5) * 1.1); q.rotation.y = hash(n + 742) * 3; q.userData.y0 = q.position.y; charola.add(q); que.push(q); }
  return { tot, fri, que };
});
const quesoDerretido = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.03, 1.2), M("#f6b62e", { transparent: true, opacity: 0.85 })); quesoDerretido.position.y = 0.35; charola.add(quesoDerretido);
const burbN = [];
for (let n = 0; n < 12; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M("#ffe27a")); b.position.set((hash(n + 800) - 0.5) * 1.6, 0.37, (hash(n + 801) - 0.5) * 1.0); charola.add(b); burbN.push(b); }
const luzCh = new THREE.PointLight(0xff8a1f, 0, 6); luzCh.position.set(0, 2, 1.2); charola.add(luzCh);
// plato final de nachos
const platoN = new THREE.Group();
const totP = [];
for (let n = 0; n < 40; n++) { const tt = totopo(); tt.scale.setScalar(1.1); tt.material = M(n % 6 ? "#e8b04a" : "#d99a36"); const a = n * 2.4, r = Math.sqrt((n + 0.5) / 40) * 0.7; tt.position.set(Math.cos(a) * r, 0.1 + (0.7 - r) * 0.5 + hash(n + 820) * 0.05, Math.sin(a) * r * 0.85); tt.rotation.set(0.35 + hash(n + 821) * 0.5, -a + Math.PI / 2 + (hash(n + 822) - 0.5) * 1.2, (hash(n + 823) - 0.5) * 0.5); tt.userData.y0 = tt.position.y; platoN.add(tt); totP.push(tt); }
const quesoP = mesh(new THREE.SphereGeometry(0.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), "#f6b62e", { contorno: 0 }); quesoP.scale.set(1, 0.3, 0.85); quesoP.position.y = 0.32; platoN.add(quesoP);
const picoP = []; for (let n = 0; n < 20; n++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.07), M(["#d9342b", "#fbf6ff", "#3f9b3f"][n % 3])); const a = hash(n + 840) * 6.28, r = Math.sqrt(hash(n + 841)) * 0.45; c.position.set(Math.cos(a) * r, 0.48 - r * 0.2, Math.sin(a) * r * 0.85); platoN.add(c); picoP.push(c); }
const guacP = mesh(new THREE.SphereGeometry(0.2, 16, 10), "#9cc23e", { contorno: 1.05 }); guacP.scale.set(1, 0.55, 1); guacP.position.set(0.05, 0.5, 0.0); platoN.add(guacP);
const cremaP = [0, 1, 2].map(n => { const c = mesh(new THREE.TorusGeometry(0.16 + n * 0.09, 0.025, 6, 24, Math.PI * 1.1), "#fffaf0", { contorno: 0 }); c.rotation.set(-Math.PI / 2 + 0.2, 0, n * 2); c.position.set(-0.1, 0.5 - n * 0.03, 0); platoN.add(c); return c; });
const jalaP = []; for (let n = 0; n < 7; n++) { const j = mesh(new THREE.TorusGeometry(0.06, 0.028, 6, 14), "#4f9e34", { contorno: 1.06 }); j.rotation.x = -Math.PI / 2 + 0.3; const a = n * 0.9 + 0.2; j.position.set(Math.cos(a) * 0.4, 0.45, Math.sin(a) * 0.32); platoN.add(j); jalaP.push(j); }
plato.add(platoN);
// ---------- día uno de GTA VI: cereal ----------
const ESCEREAL = R.platillo === "cerealgta";
const COLS_CER = ["#f2a33a", "#e65a7a", "#f6d33c", "#6fbf4a", "#4d8de0"];
const cerealSup = new THREE.Mesh(new THREE.CircleGeometry(1, 40), M("#e8c27a")); cerealSup.rotation.x = -Math.PI / 2; cerealSup.visible = false; tazon.add(cerealSup);
const piezasCer = [];
for (let n = 0; n < 46; n++) { const c = mesh(new THREE.TorusGeometry(0.055, 0.025, 6, 12), COLS_CER[n % 5], { contorno: 1.15 }); c.userData.r = Math.sqrt(hash(n + 900)) * 0.82; c.userData.a = hash(n + 901) * 6.28; c.rotation.set(-Math.PI / 2 + (hash(n + 902) - 0.5) * 0.8, 0, hash(n + 903) * 3); c.visible = false; tazon.add(c); piezasCer.push(c); }
const cajaCer = new THREE.Group();
{ const b = mesh(new THREE.BoxGeometry(0.6, 0.9, 0.22), "#e65a7a"); cajaCer.add(b);
  const tx = texCanvas(128, 192, (g, w, h) => { g.fillStyle = "#ffd75e"; g.fillRect(0, 0, w, h); g.fillStyle = "#e65a7a"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.fillText("CEREAL", w / 2, 46); COLS_CER.forEach((c, k) => { g.strokeStyle = c; g.lineWidth = 9; g.beginPath(); g.arc(28 + (k % 3) * 36, 100 + Math.floor(k / 3) * 40, 13, 0, 7); g.stroke(); }); });
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.78), new THREE.MeshBasicMaterial({ map: tx })); fr.position.z = 0.115; cajaCer.add(fr); }
cajaCer.visible = false; scene.add(cajaCer);
const lecheCer = leche(); lecheCer.visible = false; scene.add(lecheCer);
const chorroCer = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), M("#fbfaf6")); chorroCer.visible = false; scene.add(chorroCer);
const cayendo = [];
for (let n = 0; n < 14; n++) { const c = mesh(new THREE.TorusGeometry(0.055, 0.025, 6, 12), COLS_CER[n % 5], { contorno: 1.15 }); c.visible = false; scene.add(c); cayendo.push(c); }
// ---------- lasaña con bechamel ----------
const ESLASANA = R.platillo === "lasana";
const COL_LAMINA = "#f3e2a4", COL_BOLO = "#a8321c", COL_BECH_L = "#f7f0dc", COL_QUESO_L = "#ffd75e";
// objetos en la mano: se mantienen derechos aunque el brazo gire (contra-rotación)
function enMano(obj) { const g = new THREE.Group(); g.rotation.order = "ZYX"; g.add(obj); g.visible = false; return g; }
const enderezar = (g, f, a) => g.rotation.set(-f, 0, a);
// plato de cereal en la mano y cucharita
const platoCer = new THREE.Group();
{ const pr = []; for (let i = 0; i <= 8; i++) { const y = i / 8 * 0.3; pr.push(new THREE.Vector2(0.12 + 0.2 * Math.sqrt(y / 0.3), y)); } for (let i = 8; i >= 0; i--) { const y = i / 8 * 0.3; pr.push(new THREE.Vector2(0.1 + 0.19 * Math.sqrt(y / 0.3), Math.max(0.03, y))); }
  platoCer.add(mesh(new THREE.LatheGeometry(pr, 28), "#fbfaf6", { contorno: 1.04, extra: { side: THREE.DoubleSide } }));
  const lc = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), M("#fbfaf6")); lc.rotation.x = -Math.PI / 2; lc.position.y = 0.22; platoCer.add(lc);
  for (let n = 0; n < 12; n++) { const c = mesh(new THREE.TorusGeometry(0.035, 0.016, 6, 10), COLS_CER[n % 5], { contorno: 0 }); const a = hash(n + 1200) * 6.28, r = Math.sqrt(hash(n + 1201)) * 0.2; c.position.set(Math.cos(a) * r, 0.235, Math.sin(a) * r); c.rotation.x = -Math.PI / 2; platoCer.add(c); } }
platoCer.position.set(0, -0.12, 0.1);
const manoCer = enMano(platoCer);
const cucharita = new THREE.Group();
{ const m = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), "#c9d0d6"); m.position.y = 0.0; cucharita.add(m); const c = mesh(new THREE.SphereGeometry(0.06, 10, 8), "#c9d0d6"); c.scale.set(1, 0.4, 1.3); c.position.set(0, -0.22, 0.04); cucharita.add(c);
  const bocado = mesh(new THREE.TorusGeometry(0.03, 0.014, 6, 10), "#f2a33a", { contorno: 0 }); bocado.position.set(0, -0.2, 0.05); cucharita.add(bocado); }
const manoCuch = enMano(cucharita);
// caja de puré, cartón de leche, cucharón, batidor, lámina, puño de queso
const cajaPure = new THREE.Group();
{ cajaPure.add(mesh(new THREE.BoxGeometry(0.3, 0.45, 0.2), "#c8361f")); const e = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.12, 0.21), M("#f3e2a4")); cajaPure.add(e); }
cajaPure.position.y = -0.15;
const manoPure = enMano(cajaPure);
const lecheL = leche(); lecheL.scale.setScalar(0.9); lecheL.position.y = -0.1;
const manoLeche = enMano(lecheL);
const cucharon = new THREE.Group();
{ const m = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), "#c9d0d6"); m.position.y = -0.3; cucharon.add(m); const c = mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), "#c9d0d6", { extra: { side: THREE.DoubleSide } }); c.position.y = -0.78; cucharon.add(c);
  const cont = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), M(COL_BECH_L)); cont.rotation.x = -Math.PI / 2; cont.position.y = -0.79; cucharon.add(cont); cucharon.userData.cont = cont; }
const batidor = new THREE.Group();
{ const m = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), "#2b2b2b"); m.position.y = -0.2; batidor.add(m); for (let n = 0; n < 4; n++) { const a = mesh(new THREE.TorusGeometry(0.12, 0.012, 4, 16), "#c9d0d6", { contorno: 0 }); a.scale.set(1, 2.2, 1); a.rotation.y = n * Math.PI / 4; a.position.y = -0.7; batidor.add(a); } }
const laminaMano = mesh(new THREE.BoxGeometry(0.9, 0.025, 0.6), COL_LAMINA, { contorno: 1.03 }); laminaMano.position.set(0, -0.08, 0.15);
const manoLamina = enMano(laminaMano);
const punoQueso = new THREE.Group();
for (let n = 0; n < 10; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.025), M(COL_QUESO_L)); q.position.set((hash(n + 1220) - 0.5) * 0.15, -0.08 + hash(n + 1221) * 0.06, (hash(n + 1222) - 0.5) * 0.15); q.rotation.y = n; punoQueso.add(q); }
const manoQueso = enMano(punoQueso);



// sartén: verduras, carne y salsa
const verdL = [];
for (let n = 0; n < 30; n++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), M(["#f6efe0", "#f08a2c", "#f3ead2"][n % 3])); const a = hash(n + 1240) * 6.28, r = Math.sqrt(hash(n + 1241)) * 0.62; c.userData.p = [Math.cos(a) * r, Math.sin(a) * r]; c.visible = false; sarten.add(c); verdL.push(c); }
const carneL = [];
for (let n = 0; n < 44; n++) { const c = mesh(new THREE.SphereGeometry(0.06 + hash(n + 1260) * 0.03, 7, 5), "#d98a86", { contorno: 0 }); c.scale.y = 0.6; const a = hash(n + 1261) * 6.28, r = Math.sqrt(hash(n + 1262)) * 0.62; c.userData.p = [Math.cos(a) * r, Math.sin(a) * r]; c.visible = false; sarten.add(c); carneL.push(c); }
const bloqueMolida = mesh(new THREE.SphereGeometry(0.32, 14, 10), "#d98a86"); bloqueMolida.scale.y = 0.45; bloqueMolida.visible = false; sarten.add(bloqueMolida);
const chorroL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), M("#fbfaf6")); chorroL.visible = false; scene.add(chorroL);
const burbL = [];
for (let n = 0; n < 12; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M("#c8452a")); b.position.set(Math.cos(n * 2.3) * hash(n + 1280) * 0.6, 0.2, Math.sin(n * 2.3) * hash(n + 1281) * 0.6); b.visible = false; sarten.add(b); burbL.push(b); }
// olla de la bechamel
const bechOlla = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.04, 32), M(COL_BECH_L)); bechOlla.position.y = 0.14; bechOlla.visible = false; sarten.add(bechOlla);
const mantL = mesh(new THREE.BoxGeometry(0.36, 0.14, 0.24), "#ffe27a"); mantL.visible = false; sarten.add(mantL);
const grumos = [];
for (let n = 0; n < 14; n++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), M("#e8dcb8")); g.position.set(Math.cos(n * 1.9) * hash(n + 1300) * 0.55, 0.23, Math.sin(n * 1.9) * hash(n + 1301) * 0.55); g.visible = false; sarten.add(g); grumos.push(g); }
const remBech = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 30, Math.PI * 1.5), M("#e6dcc0")); remBech.rotation.x = -Math.PI / 2; remBech.visible = false; sarten.add(remBech);
// refractario rectangular con capas
const refL = new THREE.Group(); refL.position.copy(BOWL); refL.position.y = 0.06; refL.visible = false; scene.add(refL);
{ const base = mesh(new THREE.BoxGeometry(2.2, 0.08, 1.45), "#fbfaf6", { contorno: 1.02 }); base.position.y = 0.04; refL.add(base);
  for (const [x, z, w, d] of [[0, 0.7, 2.2, 0.06], [0, -0.7, 2.2, 0.06], [1.07, 0, 0.06, 1.45], [-1.07, 0, 0.06, 1.45]]) { const b = mesh(new THREE.BoxGeometry(w, 0.48, d), "#fbfaf6", { contorno: 1.01 }); b.position.set(x, 0.24, z); refL.add(b); }
  for (const [x, z, w, d] of [[0, 0.735, 2.22, 0.02], [0, -0.735, 2.22, 0.02], [1.105, 0, 0.02, 1.47], [-1.105, 0, 0.02, 1.47]]) { const b = mesh(new THREE.BoxGeometry(w, 0.06, d), P.azul, { contorno: 0 }); b.position.set(x, 0.36, z); refL.add(b); } }
// capas: [tipo, altura]
const capasL = []; let yL = 0.08;
const pushCapa = (tipo, h) => { const col = { lam: COL_LAMINA, bol: COL_BOLO, bech: COL_BECH_L, que: COL_QUESO_L }[tipo]; const m = mesh(new THREE.BoxGeometry(2.0, h, 1.28), col, { contorno: 0 }); m.position.y = yL + h / 2; m.userData = { tipo, y0: yL + h / 2, h }; refL.add(m); capasL.push(m); yL += h; return m; };
pushCapa("bech", 0.03);
for (let k = 0; k < 3; k++) { pushCapa("lam", 0.03); pushCapa("bol", 0.06); pushCapa("bech", 0.04); pushCapa("que", 0.02); }
const capaTopBech = pushCapa("bech", 0.05);
const quesoTop = [];
for (let n = 0; n < 90; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), M(COL_QUESO_L)); q.position.set((hash(n + 1320) - 0.5) * 1.9, yL + 0.015 + hash(n + 1321) * 0.02, (hash(n + 1322) - 0.5) * 1.2); q.rotation.y = hash(n + 1323) * 3; q.userData.y0 = q.position.y; refL.add(q); quesoTop.push(q); }
const gratin = mesh(new THREE.BoxGeometry(2.0, 0.04, 1.28), "#f2b94a", { contorno: 0 }); gratin.position.y = yL + 0.03; refL.add(gratin);
const manchas = [];
for (let n = 0; n < 26; n++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.05 + hash(n + 1340) * 0.06, 10), M("#b9652a")); m.rotation.x = -Math.PI / 2; m.position.set((hash(n + 1341) - 0.5) * 1.8, yL + 0.055, (hash(n + 1342) - 0.5) * 1.1); refL.add(m); manchas.push(m); }
const aluL = mesh(new THREE.BoxGeometry(2.3, 0.05, 1.55), "#d4d9de", { contorno: 1.02 }); aluL.position.y = 0.66; refL.add(aluL);
const cortesL = [];
for (const [w, d, x, z] of [[0.02, 1.3, -0.33, 0], [0.02, 1.3, 0.33, 0], [2.0, 0.02, 0, 0]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), M("#7a3a1a")); c.position.set(x, yL + 0.06, z); refL.add(c); cortesL.push(c); }
const luzL = new THREE.PointLight(0xff8a1f, 0, 6); luzL.position.set(0, 2, 1.2); refL.add(luzL);
const vaporL = [];
for (let n = 0; n < 6; n++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); refL.add(v); vaporL.push(v); }
// cronómetro
const relojL = new THREE.Group(); relojL.position.set(BOWL.x + 0.85, 0.32, BOWL.z + 0.95); relojL.visible = false; scene.add(relojL);
relojL.add(mesh(new THREE.SphereGeometry(0.28, 20, 14), "#e65a7a"));
{ const c = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), M("#ffffff")); c.position.z = 0.27; relojL.add(c); }
const agujaL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.17, 0.01), M("#2b2b2b")); agujaL.geometry.translate(0, 0.08, 0); agujaL.position.z = 0.285; relojL.add(agujaL);
// plato servido: cuadro de lasaña con capas
const platoL = new THREE.Group();
const cuadroL = new THREE.Group(); platoL.add(cuadroL);
{ let y = 0.08; const capas = [["bech", 0.04], ["lam", 0.04], ["bol", 0.1], ["bech", 0.06], ["lam", 0.04], ["bol", 0.1], ["bech", 0.06], ["lam", 0.04], ["bol", 0.1], ["bech", 0.07], ["que", 0.05]];
  capas.forEach(([tp, h]) => { const m = mesh(new THREE.BoxGeometry(0.75, h, 0.6), { lam: COL_LAMINA, bol: COL_BOLO, bech: COL_BECH_L, que: "#f2b94a" }[tp], { contorno: 1.01 }); m.position.y = y + h / 2; cuadroL.add(m); y += h; });
  for (let n = 0; n < 8; n++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.04 + hash(n + 1360) * 0.04, 8), M("#b9652a")); m.rotation.x = -Math.PI / 2; m.position.set((hash(n + 1361) - 0.5) * 0.6, y + 0.005, (hash(n + 1362) - 0.5) * 0.45); cuadroL.add(m); }
  cuadroL.userData.top = y; }
cuadroL.rotation.y = 0.5;
const parmL = [];
for (let n = 0; n < 30; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.03), M("#fffbe8")); q.position.set((hash(n + 1380) - 0.5) * 0.6, cuadroL.userData.top + 0.01, (hash(n + 1381) - 0.5) * 0.45); q.userData.y0 = q.position.y; cuadroL.add(q); parmL.push(q); }
const albL = mesh(new THREE.SphereGeometry(0.1, 10, 6), "#2e8b3a", { contorno: 1.06 }); albL.scale.set(1, 0.25, 0.6); albL.position.y = cuadroL.userData.top + 0.03; cuadroL.add(albL);
plato.add(platoL);
// ---------- tiramisú (sin horno) ----------
const ESTIRA = R.platillo === "tiramisu";
const COL_SOLETA = "#e9c27a", COL_SOLETA_M = "#a8703c", COL_CREMA_T = "#fbf3e2", COL_CACAO = "#5a3220", COL_CAFE = "#3a1f10";
function soletaM(col) { const m = mesh(new THREE.CapsuleGeometry(0.07, 0.36, 4, 10), col || COL_SOLETA, { contorno: 1.06 }); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, 0.75); return m; }
function cafe() {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.36, 20), "#a8582c"); g.add(t);
  const a = mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12), "#a8582c", { contorno: 0 }); a.position.x = 0.28; a.rotation.z = Math.PI / 2; g.add(a);
  const l = new THREE.Mesh(new THREE.CircleGeometry(0.23, 18), M(COL_CAFE)); l.rotation.x = -Math.PI / 2; l.position.y = 0.17; g.add(l);
  for (let n = 0; n < 3; n++) { const v = mesh(new THREE.TorusGeometry(0.06, 0.018, 4, 10, Math.PI), "#ffffff", { contorno: 0 }); v.position.set(-0.08 + n * 0.08, 0.32 + n * 0.06, 0); v.rotation.z = n % 2 ? 0 : Math.PI; g.add(v); }
  return g;
}
function soletas() {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.6, 0.12, 0.42), "#f6f0e2"); g.add(b);
  for (let n = 0; n < 4; n++) { const s = soletaM(); s.rotation.set(Math.PI / 2, 0, Math.PI / 2); s.position.set(0, 0.12 + (n % 2) * 0.05, -0.12 + n * 0.08); s.scale.setScalar(0.8); g.add(s); }
  const e = mesh(new THREE.BoxGeometry(0.61, 0.05, 0.43), "#e65a7a", { contorno: 0 }); e.position.y = -0.02; g.add(e);
  return g;
}
// tazón del café (a la derecha, en la estufa apagada)
const tazCafe = new THREE.Group(); tazCafe.position.set(PAN.x, 0.05, PAN.z); tazCafe.visible = false; scene.add(tazCafe);
{ const pr = []; for (let i = 0; i <= 10; i++) { const y = i / 10 * 0.5; pr.push(new THREE.Vector2(0.35 + 0.35 * Math.sqrt(y / 0.5), y)); } for (let i = 10; i >= 0; i--) { const y = i / 10 * 0.5; pr.push(new THREE.Vector2(0.31 + 0.34 * Math.sqrt(y / 0.5), Math.max(0.04, y))); }
  tazCafe.add(mesh(new THREE.LatheGeometry(pr, 36), "#fbfaf6", { contorno: 1.03, extra: { side: THREE.DoubleSide } }));
  const b = mesh(new THREE.TorusGeometry(0.69, 0.025, 6, 36), P.azul, { contorno: 0 }); b.rotation.x = Math.PI / 2; b.position.y = 0.42; tazCafe.add(b); }
const cafeLiq = new THREE.Mesh(new THREE.CircleGeometry(1, 32), M(COL_CAFE)); cafeLiq.rotation.x = -Math.PI / 2; tazCafe.add(cafeLiq);
const vaporT2 = [];
for (let n = 0; n < 5; n++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); tazCafe.add(v); vaporT2.push(v); }
const platoSol = new THREE.Group(); platoSol.position.set(PAN.x - 0.15, 0.06, PAN.z + 0.95); platoSol.visible = false; scene.add(platoSol);
platoSol.add(mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.06, 28), "#fbfaf6", { contorno: 1.03 }));
const solMojadas = [];
for (let n = 0; n < 6; n++) { const s = soletaM(COL_SOLETA_M); s.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.2); s.position.set(-0.1 + (n % 3) * 0.04, 0.08 + Math.floor(n / 3) * 0.1, -0.2 + (n % 3) * 0.18); platoSol.add(s); solMojadas.push(s); }
// objetos en la mano
const jarraCafe = new THREE.Group();
{ const c = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 16), "#dff1ff", { extra: { transparent: true, opacity: 0.55 } }); jarraCafe.add(c);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.3, 16), M(COL_CAFE)); l.position.y = -0.05; jarraCafe.add(l);
  const t = mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.08, 16), "#2b2b2b"); t.position.y = 0.25; jarraCafe.add(t); }
jarraCafe.position.y = -0.12;
const manoJarra = enMano(jarraCafe);
const solMano = soletaM(COL_SOLETA); solMano.rotation.set(0, 0, 0); solMano.position.y = -0.2;
const manoSoleta = enMano(solMano);
const solMano2 = soletaM(COL_SOLETA_M); solMano2.rotation.set(Math.PI / 2, 0, 0); solMano2.position.set(0, -0.08, 0.12);
const manoSoleta2 = enMano(solMano2);
const batidorL = new THREE.Group();
{ const m = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), "#2b2b2b"); m.position.y = -0.2; batidorL.add(m); for (let n = 0; n < 4; n++) { const a = mesh(new THREE.TorusGeometry(0.12, 0.012, 4, 16), "#c9d0d6", { contorno: 0 }); a.scale.set(1, 2.2, 1); a.rotation.y = n * Math.PI / 4; a.position.y = -0.7; batidorL.add(a); }
  const pico = mesh(new THREE.ConeGeometry(0.08, 0.18, 10), "#fdf0cf", { contorno: 1.06 }); pico.position.y = -0.98; pico.rotation.x = Math.PI; batidorL.add(pico); batidorL.userData.pico = pico; }
batidorL.visible = false;
const colador = new THREE.Group();
{ const r = mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 24), "#c9d0d6", { contorno: 0 }); r.rotation.x = Math.PI / 2; colador.add(r);
  const m = mesh(new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), "#9aa3ad", { extra: { side: THREE.DoubleSide, transparent: true, opacity: 0.85 } }); colador.add(m);
  const c = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), M(COL_CACAO)); c.rotation.x = -Math.PI / 2; c.position.y = -0.04; colador.add(c);
  const mg = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), "#2b2b2b"); mg.rotation.z = Math.PI / 2; mg.position.x = 0.4; colador.add(mg); }
colador.position.y = -0.1;
const manoColador = enMano(colador);
// tazón: mascarpone y crema batida
const masaT = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(COL_CREMA_T)); masaT.scale.y = 0.3; masaT.visible = false; tazon.add(masaT);
const picosT = [];
for (let n = 0; n < 9; n++) { const c = mesh(new THREE.ConeGeometry(0.07, 0.16, 8), "#fdf0cf", { contorno: 1.06 }); const a = n * 0.7, r = 0.15 + hash(n + 1500) * 0.4; c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); c.rotation.z = (hash(n + 1501) - 0.5) * 0.6; c.visible = false; tazon.add(c); picosT.push(c); }
const gotasVain = [];
for (let n = 0; n < 4; n++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M("#4a2a12")); g.visible = false; tazon.add(g); gotasVain.push(g); }
const cucharadas = [];
for (let n = 0; n < 3; n++) { const c = mesh(new THREE.SphereGeometry(0.22, 14, 10), "#fffaf0", { contorno: 1.06 }); c.scale.y = 0.6; c.visible = false; tazon.add(c); cucharadas.push(c); }
// refractario con capas de soletas y crema
const refT = new THREE.Group(); refT.position.copy(BOWL); refT.position.y = 0.06; refT.visible = false; scene.add(refT);
{ const base = mesh(new THREE.BoxGeometry(2.0, 0.07, 1.35), "#fbfaf6", { contorno: 1.02 }); base.position.y = 0.035; refT.add(base);
  for (const [x, z, w, d] of [[0, 0.65, 2.0, 0.05], [0, -0.65, 2.0, 0.05], [0.975, 0, 0.05, 1.35], [-0.975, 0, 0.05, 1.35]]) { const b = mesh(new THREE.BoxGeometry(w, 0.42, d), "#fbfaf6", { contorno: 1.01 }); b.position.set(x, 0.21, z); refT.add(b); }
  for (const [x, z, w, d] of [[0, 0.68, 2.02, 0.02], [0, -0.68, 2.02, 0.02], [1.0, 0, 0.02, 1.37], [-1.0, 0, 0.02, 1.37]]) { const b = mesh(new THREE.BoxGeometry(w, 0.05, d), "#e65a7a", { contorno: 0 }); b.position.set(x, 0.32, z); refT.add(b); } }
const capasT = [0, 1].map(k => {
  const sol = [];
  for (let n = 0; n < 16; n++) { const s = soletaM(COL_SOLETA_M); const x = -0.77 + (n % 8) * 0.22, z = n < 8 ? -0.28 : 0.28; s.position.set(x, 0.13 + k * 0.25, z); s.userData.y0 = s.position.y; refT.add(s); sol.push(s); }
  const cr = mesh(new THREE.BoxGeometry(1.88, 0.12, 1.22), COL_CREMA_T, { contorno: 0 }); cr.position.y = 0.26 + k * 0.25; cr.userData.y0 = cr.position.y; refT.add(cr);
  return { sol, cr };
});
const cacaoTop = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.02, 1.22), M(COL_CACAO, { transparent: true, opacity: 1 })); cacaoTop.position.y = 0.58; refT.add(cacaoTop);
const plastico = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.55), new THREE.MeshBasicMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); plastico.rotation.x = -Math.PI / 2; plastico.position.y = 0.66; refT.add(plastico);
// refrigerador que aparece alrededor del refractario
const refri = new THREE.Group(); refri.position.set(BOWL.x, 0, BOWL.z - 0.2); refri.visible = false; scene.add(refri);
{ const blanco = "#eef3f6"; for (const [x, y, z, w, h, d] of [[0, 1.2, -0.95, 2.7, 2.4, 0.1], [-1.3, 1.2, 0, 0.1, 2.4, 2.0], [1.3, 1.2, 0, 0.1, 2.4, 2.0], [0, 2.4, 0, 2.7, 0.1, 2.0], [0, 0.0, 0, 2.7, 0.06, 2.0]]) { const b = mesh(new THREE.BoxGeometry(w, h, d), blanco, { contorno: 1.01 }); b.position.set(x, y, z); refri.add(b); }
  const rej = mesh(new THREE.BoxGeometry(2.5, 0.03, 1.8), "#c9d0d6", { contorno: 0 }); rej.position.y = 1.45; refri.add(rej);
  const luz = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })); luz.position.set(0, 2.33, -0.85); refri.add(luz); }
const puertaRefri = new THREE.Group(); puertaRefri.position.set(-1.35, 1.2, 1.0); refri.add(puertaRefri);
{ const p = mesh(new THREE.BoxGeometry(2.7, 2.4, 0.12), "#e65a7a", { contorno: 1.01 }); p.position.x = 1.35; puertaRefri.add(p);
  const asa = mesh(new THREE.CapsuleGeometry(0.05, 0.8, 4, 8), "#c9d0d6"); asa.position.set(2.45, 0, 0.12); puertaRefri.add(asa); }
const relojT = new THREE.Group(); relojT.visible = false; scene.add(relojT);
relojT.add(mesh(new THREE.SphereGeometry(0.3, 20, 14), "#4d8de0"));
{ const c = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), M("#ffffff")); c.position.z = 0.29; relojT.add(c); }
const agujaT = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.01), M("#2b2b2b")); agujaT.geometry.translate(0, 0.085, 0); agujaT.position.z = 0.305; relojT.add(agujaT);
relojT.position.set(BOWL.x + 0.55, 2.15, BOWL.z + 1.2);
// plato servido
const platoT = new THREE.Group();
const cuadroT = new THREE.Group(); platoT.add(cuadroT); cuadroT.rotation.y = 0.45;
{ let y = 0.08; [["sol", 0.13], ["cr", 0.12], ["sol", 0.13], ["cr", 0.12], ["ca", 0.02]].forEach(([tp, h]) => { const m = mesh(new THREE.BoxGeometry(0.75, h, 0.6), { sol: COL_SOLETA_M, cr: COL_CREMA_T, ca: COL_CACAO }[tp], { contorno: 1.01 }); m.position.y = y + h / 2; cuadroT.add(m); y += h; }); cuadroT.userData.top = y; }
const granoCafe = mesh(new THREE.SphereGeometry(0.06, 10, 8), "#3a1f10", { contorno: 1.08 }); granoCafe.scale.set(1, 0.6, 1.3); granoCafe.position.set(0.1, cuadroT.userData.top + 0.03, 0.05); cuadroT.add(granoCafe);
const cacaoPolvo = [];
for (let n = 0; n < 20; n++) { const q = new THREE.Mesh(new THREE.CircleGeometry(0.02, 6), M(COL_CACAO)); q.rotation.x = -Math.PI / 2; q.position.set((hash(n + 1520) - 0.5) * 1.3, 0.075, (hash(n + 1521) - 0.5) * 0.9); platoT.add(q); cacaoPolvo.push(q); }
plato.add(platoT);
// ---------- mostachón de fresa ----------
const ESMOST = R.platillo === "mostachon";
const COL_BASE_M = "#e8d2a6", COL_DORADO_M = "#c98f45", COL_RELL_M = "#fbf3e2";
function rodajaFresa() {
  const g = new THREE.Group();
  const r = mesh(new THREE.SphereGeometry(0.12, 14, 10), "#d9342b", { contorno: 1.08 }); r.scale.set(1, 0.22, 1.25); g.add(r);
  const c = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), M("#ff8f86")); c.rotation.x = -Math.PI / 2; c.scale.set(1, 1.3, 1); c.position.y = 0.03; g.add(c);
  return g;
}
function fresas() {
  const g = new THREE.Group();
  const cesta = mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.22, 18), "#7fb3e0"); g.add(cesta);
  for (let n = 0; n < 6; n++) { const f = mesh(new THREE.SphereGeometry(0.11, 12, 10), "#d9342b"); f.scale.set(1, 1.25, 1); const a = n * 1.05; f.position.set(Math.cos(a) * 0.2, 0.18 + (n % 2) * 0.06, Math.sin(a) * 0.2); g.add(f);
    const h = mesh(new THREE.ConeGeometry(0.06, 0.06, 5), "#3f8f2f", { contorno: 0 }); h.position.set(f.position.x, f.position.y + 0.14, f.position.z); h.rotation.x = Math.PI; g.add(h); }
  return g;
}
// plato con cuadro de lasaña (en la mano) y tenedor
const platoLas = new THREE.Group();
{ platoLas.add(mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.04, 24), "#fbfaf6", { contorno: 1.04 }));
  let y = 0.03; [["#f3e2a4", 0.025], ["#a8321c", 0.05], ["#f7f0dc", 0.03], ["#f3e2a4", 0.025], ["#a8321c", 0.05], ["#f2b94a", 0.03]].forEach(([c, h]) => { const m = mesh(new THREE.BoxGeometry(0.3, h, 0.24), c, { contorno: 1.01 }); m.position.y = y + h / 2; platoLas.add(m); y += h; }); }
platoLas.position.set(0, -0.1, 0.1);
const manoLas = enMano(platoLas);
const lataLC = new THREE.Group();
{ lataLC.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 16), "#4d8de0")); const e = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.1, 16), M("#ffffff")); lataLC.add(e); }
lataLC.position.y = -0.12;
const manoLata = enMano(lataLC);
const fresaMano = rodajaFresa(); fresaMano.position.set(0, -0.1, 0.12); fresaMano.rotation.x = 0.4;
const manoFresa = enMano(fresaMano);
// molde redondo con base, relleno y fresas
const moldeM = new THREE.Group(); moldeM.position.copy(BOWL); moldeM.position.y = 0.06; moldeM.visible = false; scene.add(moldeM);
{ const fondo = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.04, 40), "#9aa3ad", { contorno: 1.02 }); fondo.position.y = 0.02; moldeM.add(fondo);
  const aro = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.36, 40, 1, true), "#b8c0c8", { contorno: 1.02, extra: { side: THREE.DoubleSide } }); aro.position.y = 0.2; moldeM.add(aro); moldeM.userData.aro = aro; }
const baseM = mesh(new THREE.CylinderGeometry(0.97, 0.97, 1, 40), COL_BASE_M, { contorno: 0 }); moldeM.add(baseM);
const migasM = [];
for (let n = 0; n < 40; n++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.025 + hash(n + 1600) * 0.02, 6), M(n % 2 ? "#a8703c" : "#c98f45")); m.rotation.x = -Math.PI / 2; const a = hash(n + 1601) * 6.28, r = Math.sqrt(hash(n + 1602)) * 0.9; m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); moldeM.add(m); migasM.push(m); }
const rellM = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 40), COL_RELL_M, { contorno: 1.01 }); moldeM.add(rellM);
const fresasM = [];
{ [[0.76, 16], [0.5, 11], [0.25, 6], [0, 1]].forEach(([r, c], k) => { for (let j = 0; j < c; j++) { const a = j / c * Math.PI * 2 + k * 0.3, f = rodajaFresa(); f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); f.rotation.y = -a; moldeM.add(f); fresasM.push(f); } }); }
const vapM = [];
for (let n = 0; n < 5; n++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); moldeM.add(v); vapM.push(v); }
const luzM = new THREE.PointLight(0xff8a1f, 0, 6); luzM.position.set(0, 2, 1.2); moldeM.add(luzM);
const migasTaz = [];
for (let n = 0; n < 30; n++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), M(n % 3 ? "#d9b47a" : "#7a4a24")); const a = hash(n + 1620) * 6.28, r = Math.sqrt(hash(n + 1621)) * 0.55; m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.visible = false; tazon.add(m); migasTaz.push(m); }
// rebanada servida
const platoM = new THREE.Group();
const rebM = new THREE.Group(); platoM.add(rebM); rebM.rotation.y = -0.6;
{ const ang = Math.PI / 3.5; const b = mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.25, 16, 1, false, 0, ang), COL_DORADO_M, { contorno: 1.02 }); b.position.y = 0.2; rebM.add(b);
  const c = mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.13, 16, 1, false, 0, ang), COL_RELL_M, { contorno: 1.02 }); c.position.y = 0.39; rebM.add(c);
  for (let n = 0; n < 4; n++) { const f = rodajaFresa(); const a = ang * (0.25 + (n % 2) * 0.45), r = 0.3 + Math.floor(n / 2) * 0.32; f.position.set(Math.sin(a) * r, 0.47, Math.cos(a) * r); rebM.add(f); }
  rebM.position.set(0.15, 0, -0.15); }
const fresaEntera = mesh(new THREE.SphereGeometry(0.14, 14, 10), "#d9342b", { contorno: 1.06 }); fresaEntera.scale.set(1, 1.25, 1); fresaEntera.position.set(0.6, 0.2, 0.35); platoM.add(fresaEntera);
plato.add(platoM);
// ---------- pozole rojo ----------
const ESPOZ = R.platillo === "pozole";
const COL_CALDO_P = "#b5321c", COL_BARRO = "#b0603a";
function maiz() {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.6, 16), "#f3ead2"); g.add(b);
  const e = mesh(new THREE.CylinderGeometry(0.33, 0.37, 0.16, 16), "#3f8f2f", { contorno: 0 }); g.add(e);
  for (let n = 0; n < 9; n++) { const k = mesh(new THREE.SphereGeometry(0.06, 8, 6), "#fff6dc", { contorno: 1.1 }); const a = n * 0.7, r = hash(n + 1700) * 0.22; k.position.set(Math.cos(a) * r, 0.33 + hash(n + 1701) * 0.05, Math.sin(a) * r); g.add(k); }
  return g;
}
function lechuga() {
  const g = new THREE.Group();
  for (let n = 0; n < 7; n++) { const h = mesh(new THREE.SphereGeometry(0.22, 12, 8), n % 2 ? "#7cc142" : "#5aa83c", { contorno: 1.04 }); h.scale.set(1, 0.7, 1); const a = n * 0.9; h.position.set(Math.cos(a) * 0.1, n * 0.03, Math.sin(a) * 0.1); h.rotation.set(a, n, 0); g.add(h); }
  return g;
}
function grano() { // grano de maíz que "florea": tres lóbulos que se abren
  const g = new THREE.Group(); const l = [];
  for (let k = 0; k < 3; k++) { const s = mesh(new THREE.SphereGeometry(0.045, 8, 6), "#f6efd8", { contorno: 1.12 }); s.position.set(Math.cos(k * 2.09) * 0.02, 0, Math.sin(k * 2.09) * 0.02); g.add(s); l.push(s); }
  g.userData.l = l; return g;
}
const perfilOlla = (r1, r0, h) => { const p = []; for (let i = 0; i <= 10; i++) { const y = i / 10 * h; p.push(new THREE.Vector2(r0 + (r1 - r0) * Math.sin(i / 10 * Math.PI / 2), y)); } p.push(new THREE.Vector2(r1 - 0.05, h)); for (let i = 10; i >= 0; i--) { const y = i / 10 * h; p.push(new THREE.Vector2(r0 - 0.05 + (r1 - r0) * Math.sin(i / 10 * Math.PI / 2), Math.max(0.05, y))); } return p; };
// cazuela de barro (maíz, junta, hierve)
const cazuela = new THREE.Group(); cazuela.position.set(PAN.x, 0.08, PAN.z); cazuela.visible = false; scene.add(cazuela);
cazuela.add(mesh(new THREE.LatheGeometry(perfilOlla(1.0, 0.72, 0.6), 40), COL_BARRO, { contorno: 1.025, extra: { side: THREE.DoubleSide } }));
for (const s2 of [-1, 1]) { const a = mesh(new THREE.TorusGeometry(0.13, 0.045, 6, 14, Math.PI), COL_BARRO, { contorno: 1.05 }); a.position.set(s2 * 1.02, 0.45, 0); a.rotation.z = s2 > 0 ? -Math.PI / 2 : Math.PI / 2; cazuela.add(a); }
{ const b = mesh(new THREE.TorusGeometry(0.98, 0.03, 6, 40), "#f3ead2", { contorno: 0 }); b.rotation.x = Math.PI / 2; b.position.y = 0.5; cazuela.add(b); }
const caldoC = new THREE.Mesh(new THREE.CircleGeometry(0.93, 36), M("#d8e6ea")); caldoC.rotation.x = -Math.PI / 2; caldoC.position.y = 0.52; cazuela.add(caldoC);
const granosC = [];
for (let n = 0; n < 34; n++) { const g = grano(); const a = n * 2.4, r = Math.sqrt((n + 0.5) / 34) * 0.8; g.position.set(Math.cos(a) * r, 0.54, Math.sin(a) * r); g.rotation.y = n; cazuela.add(g); granosC.push(g); }
const carneC = [];
for (let n = 0; n < 8; n++) { const c = mesh(new THREE.BoxGeometry(0.2, 0.12, 0.16), "#d9b38c", { contorno: 1.05 }); const a = n * 0.8 + 0.3, r = 0.25 + (n % 2) * 0.35; c.position.set(Math.cos(a) * r, 0.56, Math.sin(a) * r); c.rotation.y = n; c.userData.y0 = 0.56; cazuela.add(c); carneC.push(c); }
const burbC = [];
for (let n = 0; n < 14; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M("#ffffff", { transparent: true, opacity: 0.8 })); b.position.set(Math.cos(n * 2.3) * hash(n + 1720) * 0.75, 0.55, Math.sin(n * 2.3) * hash(n + 1721) * 0.75); cazuela.add(b); burbC.push(b); }
const cebAjo = [mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#f3ead2", { contorno: 1.04 }), mesh(new THREE.SphereGeometry(0.09, 10, 8), "#f6f0e2", { contorno: 1.06 }), mesh(new THREE.SphereGeometry(0.09, 10, 8), "#f6f0e2", { contorno: 1.06 })];
cebAjo.forEach((m, n) => { m.position.set(-0.4 + n * 0.3, 0.54, 0.3 - n * 0.2); cazuela.add(m); });
const vapC = [];
for (let n = 0; n < 6; n++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); cazuela.add(v); vapC.push(v); }
// olla roja (carne)
const ollaRoja = new THREE.Group(); ollaRoja.position.set(PAN.x, 0.08, PAN.z); ollaRoja.visible = false; scene.add(ollaRoja);
ollaRoja.add(mesh(new THREE.LatheGeometry(perfilOlla(0.85, 0.78, 0.62), 40), "#d93b3b", { contorno: 1.025, extra: { side: THREE.DoubleSide } }));
for (const s2 of [-1, 1]) { const a = mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 14, Math.PI), "#2b2b2b", { contorno: 0 }); a.position.set(s2 * 0.88, 0.48, 0); a.rotation.z = s2 > 0 ? -Math.PI / 2 : Math.PI / 2; ollaRoja.add(a); }
const caldoR = new THREE.Mesh(new THREE.CircleGeometry(0.78, 32), M("#e6d8b8")); caldoR.rotation.x = -Math.PI / 2; caldoR.position.y = 0.54; ollaRoja.add(caldoR);
const carneR = [];
for (let n = 0; n < 7; n++) { const c = mesh(new THREE.BoxGeometry(0.22, 0.13, 0.17), "#e8a39a", { contorno: 1.05 }); const a = n * 0.9, r = 0.2 + (n % 2) * 0.3; c.position.set(Math.cos(a) * r, 0.57, Math.sin(a) * r); c.rotation.y = n; ollaRoja.add(c); carneR.push(c); }
{ const h = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), "#f6efe0"); h.rotation.z = Math.PI / 2; h.position.set(0.15, 0.6, -0.25); ollaRoja.add(h); carneR.push(h); }
const espumaR = [];
for (let n = 0; n < 16; n++) { const e = mesh(new THREE.SphereGeometry(0.08 + hash(n + 1740) * 0.05, 10, 6), "#f4ecdc", { contorno: 1.04 }); e.scale.y = 0.45; const a = hash(n + 1741) * 6.28, r = Math.sqrt(hash(n + 1742)) * 0.65; e.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r); ollaRoja.add(e); espumaR.push(e); }
// tazón: chiles en remojo y salsa colada
const chilesTaz = [];
for (let n = 0; n < 7; n++) { const c = chileSeco(); c.scale.setScalar(1.05); const a = n * 0.9, r = 0.15 + (n % 2) * 0.25; c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); c.rotation.y = a; c.visible = false; tazon.add(c); chilesTaz.push(c); }
const pellejos = new THREE.Group();
for (let n = 0; n < 10; n++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.04), M("#5a1a10")); p.position.set((hash(n + 1760) - 0.5) * 0.25, -0.02, (hash(n + 1761) - 0.5) * 0.25); p.rotation.y = n; pellejos.add(p); }
colador.add(pellejos); pellejos.visible = false;
// plato hondo de pozole
const platoP = new THREE.Group();
{ const pr = []; for (let i = 0; i <= 10; i++) { const y = i / 10 * 0.45; pr.push(new THREE.Vector2(0.45 + 0.45 * Math.sin(i / 10 * Math.PI / 2), y)); } pr.push(new THREE.Vector2(0.86, 0.45)); for (let i = 10; i >= 0; i--) { const y = i / 10 * 0.45; pr.push(new THREE.Vector2(0.41 + 0.44 * Math.sin(i / 10 * Math.PI / 2), Math.max(0.05, y))); }
  const tz = mesh(new THREE.LatheGeometry(pr, 36), COL_BARRO, { contorno: 1.03, extra: { side: THREE.DoubleSide } }); tz.position.y = 0.06; platoP.add(tz);
  const b = mesh(new THREE.TorusGeometry(0.88, 0.025, 6, 36), "#f3ead2", { contorno: 0 }); b.rotation.x = Math.PI / 2; b.position.y = 0.42; platoP.add(b); }
const caldoP = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), M(COL_CALDO_P)); caldoP.rotation.x = -Math.PI / 2; caldoP.position.y = 0.44; platoP.add(caldoP);
const topP = { maiz: [], carne: [], lech: [], rab: [], ceb: [], ore: [] };
for (let n = 0; n < 16; n++) { const g = grano(); g.userData.l.forEach((s, k) => s.position.multiplyScalar(2.2)); const a = n * 2.4, r = Math.sqrt((n + 0.5) / 16) * 0.6; g.position.set(Math.cos(a) * r, 0.46, Math.sin(a) * r); platoP.add(g); topP.maiz.push(g); }
for (let n = 0; n < 4; n++) { const c = mesh(new THREE.BoxGeometry(0.17, 0.1, 0.14), "#9a4a2a", { contorno: 1.05 }); const a = n * 1.6 + 0.4; c.position.set(Math.cos(a) * 0.35, 0.48, Math.sin(a) * 0.3); c.rotation.y = n; platoP.add(c); topP.carne.push(c); }
for (let n = 0; n < 22; n++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.03), M(n % 2 ? "#9ad25a" : "#c8e88a")); const a = hash(n + 1780) * 6.28, r = Math.sqrt(hash(n + 1781)) * 0.45; l.position.set(Math.cos(a) * r - 0.1, 0.52, Math.sin(a) * r - 0.05); l.rotation.y = hash(n + 1782) * 3; platoP.add(l); topP.lech.push(l); }
for (let n = 0; n < 5; n++) { const r = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), "#fff4f6", { contorno: 1.08 }); const o = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 4, 14), M("#d9346a")); o.rotation.x = Math.PI / 2; r.add(o); const a = n * 1.25; r.position.set(Math.cos(a) * 0.3 + 0.15, 0.54, Math.sin(a) * 0.25); platoP.add(r); topP.rab.push(r); }
for (let n = 0; n < 10; n++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), M("#fbf6ff")); c.position.set((hash(n + 1800) - 0.5) * 0.5 + 0.1, 0.55, (hash(n + 1801) - 0.5) * 0.4); platoP.add(c); topP.ceb.push(c); }
for (let n = 0; n < 20; n++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 0.025), M("#4f7a2a")); c.position.set((hash(n + 1820) - 0.5) * 0.7, 0.56, (hash(n + 1821) - 0.5) * 0.55); platoP.add(c); topP.ore.push(c); }
const limonP = mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI), "#9ccc3a"); limonP.rotation.set(-Math.PI / 2, 0, 0.5); limonP.position.set(0.95, 0.12, 0.45); platoP.add(limonP);
const tostadaP = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 28), "#e8b04a", { contorno: 1.04 }); tostadaP.position.set(-0.95, 0.12, 0.45); tostadaP.rotation.z = 0.15; platoP.add(tostadaP);
plato.add(platoP);
// ---------- pastel azteca ----------
const ESAZT = R.platillo === "azteca";
const COL_TORT_A = "#ecca84", COL_POLLO_A = "#ead2a6", COL_RAJA = "#2f6b2a", COL_SALSA_A = "#c23a22", COL_CREMA_A = "#fbf6ea", COL_QUESO_A = "#ffd75e";
function poblano(col) { const g = new THREE.Group(); const c = mesh(new THREE.CapsuleGeometry(0.13, 0.42, 6, 12), col || "#2f6b2a"); c.scale.set(1, 1, 0.75); c.rotation.z = Math.PI / 2 - 0.15; g.add(c); const t = mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 6), "#6b8e23", { contorno: 0 }); t.position.set(0.33, 0.06, 0); t.rotation.z = -1.0; g.add(t); return g; }
// pozole en la mano (lo del video anterior)
const platoPoz = new THREE.Group();
{ const pr = []; for (let i = 0; i <= 8; i++) { const y = i / 8 * 0.24; pr.push(new THREE.Vector2(0.14 + 0.18 * Math.sin(i / 8 * Math.PI / 2), y)); } pr.push(new THREE.Vector2(0.31, 0.24)); for (let i = 8; i >= 0; i--) { const y = i / 8 * 0.24; pr.push(new THREE.Vector2(0.12 + 0.17 * Math.sin(i / 8 * Math.PI / 2), Math.max(0.03, y))); }
  platoPoz.add(mesh(new THREE.LatheGeometry(pr, 26), COL_BARRO, { contorno: 1.04, extra: { side: THREE.DoubleSide } }));
  const c = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), M(COL_CALDO_P)); c.rotation.x = -Math.PI / 2; c.position.y = 0.2; platoPoz.add(c);
  for (let n = 0; n < 8; n++) { const k = mesh(new THREE.SphereGeometry(0.035, 8, 6), "#f6efd8", { contorno: 1.12 }); const a = n * 2.4, r = Math.sqrt((n + 0.5) / 8) * 0.2; k.position.set(Math.cos(a) * r, 0.215, Math.sin(a) * r); platoPoz.add(k); }
  for (let n = 0; n < 5; n++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.02), M("#9ad25a")); l.position.set((hash(n + 1900) - 0.5) * 0.25, 0.225, (hash(n + 1901) - 0.5) * 0.2); l.rotation.y = n; platoPoz.add(l); } }
platoPoz.position.set(0, -0.12, 0.1);
const manoPoz = enMano(platoPoz);
const tortMano = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.025, 24), COL_TORT_A, { contorno: 1.04 }); tortMano.position.set(0, -0.06, 0.2);
const manoTort = enMano(tortMano);
// flama directa con poblanos
const flamaA = new THREE.Group(); flamaA.position.set(PAN.x, 0.1, PAN.z); flamaA.visible = false; scene.add(flamaA);
{ const quem = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.08, 24), "#2b2b2b", { contorno: 1.03 }); flamaA.add(quem);
  for (let n = 0; n < 4; n++) { const r = mesh(new THREE.BoxGeometry(1.3, 0.05, 0.06), "#3a3d44", { contorno: 0 }); r.rotation.y = n * Math.PI / 4; r.position.y = 0.28; flamaA.add(r); } }
const lenguas = [];
for (let n = 0; n < 12; n++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), new THREE.MeshBasicMaterial({ color: n % 2 ? 0x4da6ff : 0xff9a2a, transparent: true, opacity: 0.85 })); const a = n / 12 * 6.28; l.position.set(Math.cos(a) * 0.32, 0.15, Math.sin(a) * 0.32); flamaA.add(l); lenguas.push(l); }
const poblanosF = [0, 1, 2].map(n => { const p2 = poblano(); p2.position.set(-0.35 + n * 0.35, 0.42, (n - 1) * 0.12); p2.rotation.y = n * 0.4; flamaA.add(p2); return p2; });
const manchasPob = poblanosF.map(pb => { const arr = []; for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M("#1b1b16")); m.scale.set(1.2, 0.5, 1); m.position.set(-0.2 + k * 0.08, 0.1 + (k % 2) * 0.02, (k % 3 - 1) * 0.06); pb.add(m); arr.push(m); } return arr; });
// bolsa para sudar y tabla de rajas
const sudaA = new THREE.Group(); sudaA.position.copy(BOWL); sudaA.position.y = 0.06; sudaA.visible = false; scene.add(sudaA);
{ const tb = mesh(new THREE.BoxGeometry(2.3, 0.1, 1.4), "#c58a4a", { contorno: 1.02 }); tb.position.y = 0.05; sudaA.add(tb); }
const bolsaA = new THREE.Group(); sudaA.add(bolsaA);
{ const b = mesh(new THREE.BoxGeometry(1.1, 0.5, 0.7), "#dff1ff", { extra: { transparent: true, opacity: 0.45 } }); b.position.y = 0.35; bolsaA.add(b); const z = mesh(new THREE.BoxGeometry(1.12, 0.04, 0.72), "#4d8de0", { contorno: 0 }); z.position.y = 0.6; bolsaA.add(z);
  for (let n = 0; n < 3; n++) { const p2 = poblano("#3a4a22"); p2.position.set(-0.3 + n * 0.3, 0.25 + (n % 2) * 0.1, 0); p2.scale.setScalar(0.85); bolsaA.add(p2); }
  bolsaA.userData.gotas = []; for (let n = 0; n < 8; n++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), M("#cfe8ff")); g.position.set(-0.45 + n * 0.13, 0.4 + (n % 3) * 0.08, 0.36); bolsaA.add(g); bolsaA.userData.gotas.push(g); } }
bolsaA.position.x = -0.35;
const rajasT = [];
for (let n = 0; n < 14; n++) { const r = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), COL_RAJA, { contorno: 1.05 }); r.position.set(0.55 + (hash(n + 1920) - 0.5) * 0.3, 0.13 + (n % 3) * 0.04, -0.3 + n * 0.045); r.rotation.y = (hash(n + 1921) - 0.5) * 0.6; sudaA.add(r); rajasT.push(r); }
const pobPelado = poblano("#3f8f2f"); pobPelado.position.set(0.55, 0.22, 0); sudaA.add(pobPelado);
const cuchilloA = new THREE.Group();
{ const h = mesh(new THREE.BoxGeometry(0.9, 0.2, 0.025), "#d6dde3"); cuchilloA.add(h); const m = mesh(new THREE.BoxGeometry(0.4, 0.09, 0.07), "#2b2b2b"); m.position.x = 0.62; cuchilloA.add(m); }
sudaA.add(cuchilloA);
// sartén: rajas con elote
const rajasS = [];
for (let n = 0; n < 34; n++) { const tipo = n % 3; const m = tipo === 2 ? mesh(new THREE.SphereGeometry(0.04, 8, 6), "#f2c84b", { contorno: 1.1 }) : mesh(new THREE.BoxGeometry(0.28, 0.035, 0.045), tipo ? "#f3ead2" : COL_RAJA, { contorno: 1.06 }); const a = hash(n + 1940) * 6.28, r = Math.sqrt(hash(n + 1941)) * 0.6; m.userData.p = [Math.cos(a) * r, Math.sin(a) * r]; m.rotation.y = hash(n + 1942) * 3; m.visible = false; sarten.add(m); rajasS.push(m); }
// tortillas al aceite + pila escurriendo
const tortAceite = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.025, 24), COL_TORT_A, { contorno: 1.04 }); tortAceite.visible = false; sarten.add(tortAceite);
const pilaTort = new THREE.Group(); pilaTort.position.set(PAN.x - 0.15, 0.06, PAN.z + 1.0); pilaTort.visible = false; scene.add(pilaTort);
pilaTort.add(mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.05, 26), "#ffffff", { contorno: 1.03 }));
const tortsPila = [];
for (let n = 0; n < 6; n++) { const t2 = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.022, 24), "#e2b468", { contorno: 1.04 }); t2.position.set((hash(n + 1960) - 0.5) * 0.05, 0.05 + n * 0.025, 0); pilaTort.add(t2); tortsPila.push(t2); }
// refractario con capas
const refA = new THREE.Group(); refA.position.copy(BOWL); refA.position.y = 0.06; refA.visible = false; scene.add(refA);
{ const base = mesh(new THREE.BoxGeometry(2.2, 0.08, 1.45), "#fbfaf6", { contorno: 1.02 }); base.position.y = 0.04; refA.add(base);
  for (const [x, z, w, d] of [[0, 0.7, 2.2, 0.06], [0, -0.7, 2.2, 0.06], [1.07, 0, 0.06, 1.45], [-1.07, 0, 0.06, 1.45]]) { const b = mesh(new THREE.BoxGeometry(w, 0.48, d), "#fbfaf6", { contorno: 1.01 }); b.position.set(x, 0.24, z); refA.add(b); }
  for (const [x, z, w, d] of [[0, 0.735, 2.22, 0.02], [0, -0.735, 2.22, 0.02], [1.105, 0, 0.02, 1.47], [-1.105, 0, 0.02, 1.47]]) { const b = mesh(new THREE.BoxGeometry(w, 0.06, d), "#3f8f2f", { contorno: 0 }); b.position.set(x, 0.36, z); refA.add(b); } }
const capasA = []; let yA = 0.08;
const pushCapaA = (tipo, h) => { const col = { sal: COL_SALSA_A, tor: COL_TORT_A, pol: COL_POLLO_A, raj: COL_RAJA, cre: COL_CREMA_A, que: COL_QUESO_A }[tipo]; const m = mesh(new THREE.BoxGeometry(2.0, h, 1.28), col, { contorno: 0 }); m.position.y = yA + h / 2; m.userData = { tipo, y0: yA + h / 2, h }; refA.add(m); capasA.push(m); yA += h; return m; };
pushCapaA("sal", 0.025);
for (let k = 0; k < 3; k++) { pushCapaA("tor", 0.03); pushCapaA("pol", 0.04); pushCapaA("raj", 0.025); pushCapaA("cre", 0.02); pushCapaA("que", 0.02); pushCapaA("sal", 0.02); }
const capasTopA = [pushCapaA("tor", 0.03), pushCapaA("sal", 0.02), pushCapaA("cre", 0.02)];
const elotesA = [];
for (let n = 0; n < 40; n++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), M("#f2c84b")); e.position.set((hash(n + 1980) - 0.5) * 1.8, 0, (hash(n + 1981) - 0.5) * 1.1); refA.add(e); elotesA.push(e); }
const quesoTopA = [];
for (let n = 0; n < 90; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), M(COL_QUESO_A)); q.position.set((hash(n + 2000) - 0.5) * 1.9, yA + 0.015 + hash(n + 2001) * 0.02, (hash(n + 2002) - 0.5) * 1.2); q.rotation.y = hash(n + 2003) * 3; q.userData.y0 = q.position.y; refA.add(q); quesoTopA.push(q); }
const gratinA = mesh(new THREE.BoxGeometry(2.0, 0.04, 1.28), "#f2b94a", { contorno: 0 }); gratinA.position.y = yA + 0.03; refA.add(gratinA);
const manchasA = [];
for (let n = 0; n < 24; n++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.05 + hash(n + 2020) * 0.06, 10), M("#b9652a")); m.rotation.x = -Math.PI / 2; m.position.set((hash(n + 2021) - 0.5) * 1.8, yA + 0.055, (hash(n + 2022) - 0.5) * 1.1); refA.add(m); manchasA.push(m); }
const luzA = new THREE.PointLight(0xff8a1f, 0, 6); luzA.position.set(0, 2, 1.2); refA.add(luzA);
// rebanada servida
const platoA = new THREE.Group();
const cuadroA = new THREE.Group(); platoA.add(cuadroA); cuadroA.rotation.y = 0.5;
{ let y = 0.08; [["sal", 0.03], ["tor", 0.04], ["pol", 0.06], ["raj", 0.04], ["cre", 0.03], ["tor", 0.04], ["pol", 0.06], ["raj", 0.04], ["sal", 0.03], ["tor", 0.04], ["que", 0.05]].forEach(([tp, h]) => { const m = mesh(new THREE.BoxGeometry(0.75, h, 0.6), { sal: COL_SALSA_A, tor: COL_TORT_A, pol: COL_POLLO_A, raj: COL_RAJA, cre: COL_CREMA_A, que: "#f2b94a" }[tp], { contorno: 1.01 }); m.position.y = y + h / 2; cuadroA.add(m); y += h; }); cuadroA.userData.top = y;
  for (let n = 0; n < 7; n++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.04 + hash(n + 2040) * 0.04, 8), M("#b9652a")); m.rotation.x = -Math.PI / 2; m.position.set((hash(n + 2041) - 0.5) * 0.6, y + 0.005, (hash(n + 2042) - 0.5) * 0.45); cuadroA.add(m); } }
const cremaA = mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 24, Math.PI * 1.2), "#fffaf0", { contorno: 0 }); cremaA.rotation.x = -Math.PI / 2 + 0.2; cremaA.position.y = cuadroA.userData.top + 0.03; cuadroA.add(cremaA);
const rajaTop = mesh(new THREE.BoxGeometry(0.4, 0.04, 0.06), COL_RAJA, { contorno: 1.05 }); rajaTop.position.set(0.05, cuadroA.userData.top + 0.04, 0.1); rajaTop.rotation.y = 0.6; cuadroA.add(rajaTop);
plato.add(platoA);
// ---------- tamales verdes ----------
const ESTAM = R.platillo === "tamales";
const COL_HOJA = "#e6d290", COL_MASA_T = "#f3dca0", COL_VERDE_S = "#5f9e3a";
const formaHoja = (() => { const s = new THREE.Shape(); s.moveTo(0, -0.55); s.bezierCurveTo(0.32, -0.45, 0.34, 0.2, 0.06, 0.62); s.lineTo(-0.06, 0.62); s.bezierCurveTo(-0.34, 0.2, -0.32, -0.45, 0, -0.55); return s; })();
const geoHoja = new THREE.ShapeGeometry(formaHoja, 16);
function hojaMaiz(col) { const m = new THREE.Mesh(geoHoja, M(col || COL_HOJA, { side: THREE.DoubleSide })); m.castShadow = true; const o = new THREE.Mesh(geoHoja, new THREE.MeshBasicMaterial({ color: P.tinta, side: THREE.BackSide })); o.scale.setScalar(1.03); o.position.z = -0.003; m.add(o); return m; }
function tamal() { // tamal envuelto
  const g = new THREE.Group();
  const c = mesh(new THREE.CapsuleGeometry(0.11, 0.38, 6, 12), COL_HOJA, { contorno: 1.05 }); c.scale.set(1, 1, 0.75); g.add(c);
  for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.4, 0.005), M("#c9b06a")); l.position.set(-0.06 + k * 0.04, 0, 0.083); g.add(l); }
  return g;
}
// tiramisú en la mano (lo del video anterior)
const platoTir = new THREE.Group();
{ platoTir.add(mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.04, 24), "#fbfaf6", { contorno: 1.04 }));
  let y = 0.03; [[COL_SOLETA_M, 0.04], [COL_CREMA_T, 0.04], [COL_SOLETA_M, 0.04], [COL_CREMA_T, 0.04], [COL_CACAO, 0.01]].forEach(([c, h]) => { const m = mesh(new THREE.BoxGeometry(0.28, h, 0.22), c, { contorno: 1.01 }); m.position.y = y + h / 2; platoTir.add(m); y += h; }); }
platoTir.position.set(0, -0.1, 0.1);
const manoTir = enMano(platoTir);
const bolitaMano = mesh(new THREE.SphereGeometry(0.07, 12, 10), COL_MASA_T, { contorno: 1.08 }); bolitaMano.position.set(0, -0.1, 0.12);
const manoBolita = enMano(bolitaMano);
// tazón: hojas en remojo, manteca y masa
const hojasTaz = [];
for (let n = 0; n < 6; n++) { const h = hojaMaiz(); h.rotation.set(-Math.PI / 2 + (hash(n + 2100) - 0.5) * 0.4, 0, n * 1.05); h.scale.setScalar(0.75); h.visible = false; tazon.add(h); hojasTaz.push(h); }
const mantecaB = mesh(new THREE.BoxGeometry(0.5, 0.25, 0.35), "#fbf6ea", { contorno: 1.04 }); mantecaB.visible = false; tazon.add(mantecaB);
const trozosMasa = [];
for (let n = 0; n < 8; n++) { const m = mesh(new THREE.SphereGeometry(0.12, 10, 8), COL_MASA_T, { contorno: 1.06 }); m.scale.y = 0.7; m.position.set((hash(n + 2120) - 0.5) * 0.6, 0, (hash(n + 2121) - 0.5) * 0.5); m.visible = false; tazon.add(m); trozosMasa.push(m); }
// vaso con agua para la prueba
const vasoT = new THREE.Group(); vasoT.position.set(BOWL.x + 1.25, 0.06, BOWL.z + 0.65); vasoT.visible = false; scene.add(vasoT);
{ const v = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.95, 24, 1, true), M("#dff1ff", { transparent: true, opacity: 0.35, side: THREE.DoubleSide })); v.position.y = 0.475; vasoT.add(v); const o = new THREE.Mesh(v.geometry, LINEA); o.scale.setScalar(1.03); v.add(o);
  const f = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 24), "#dff1ff", { contorno: 1.03, extra: { transparent: true, opacity: 0.5 } }); f.position.y = 0.02; vasoT.add(f);
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.75, 24), M("#9fd3f5", { transparent: true, opacity: 0.25 })); a.position.y = 0.42; vasoT.add(a);
  const sup = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), M("#bfe3f8", { transparent: true, opacity: 0.6 })); sup.rotation.x = -Math.PI / 2; sup.position.y = 0.8; vasoT.add(sup); }
const bolitaV = mesh(new THREE.SphereGeometry(0.13, 14, 10), "#f0c870", { contorno: 1.1 }); vasoT.add(bolitaV);
const burbV = [];
for (let n = 0; n < 6; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), M("#ffffff", { transparent: true, opacity: 0.8 })); vasoT.add(b); burbV.push(b); }
// armado: una hoja grande que se unta y se dobla
const armaT = new THREE.Group(); armaT.position.copy(BOWL); armaT.position.y = 0.06; armaT.visible = false; scene.add(armaT);
{ const tb = mesh(new THREE.BoxGeometry(2.3, 0.1, 1.4), "#c58a4a", { contorno: 1.02 }); tb.position.y = 0.05; armaT.add(tb); }
const hojaGrande = new THREE.Group(); hojaGrande.position.set(-0.35, 0.11, 0.05); hojaGrande.rotation.x = -Math.PI / 2; armaT.add(hojaGrande);
const mitades = [-1, 1].map(s2 => { const piv = new THREE.Group(); piv.position.x = s2 * 0.02; hojaGrande.add(piv); const h = hojaMaiz(); h.scale.set(1.3, 1.3, 1); piv.add(h); return { piv, h, s2 }; });
// recortamos visualmente: cada mitad es una hoja completa escalada a la mitad
mitades.forEach(({ h, s2 }) => { h.scale.set(0.65, 1.3, 1); h.position.x = s2 * 0.2; });
const masaUnta = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.7), M(COL_MASA_T, { side: THREE.DoubleSide })); masaUnta.position.set(0, -0.1, 0.006); hojaGrande.add(masaUnta);
const rellenoT = mesh(new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), COL_VERDE_S, { contorno: 1.06 }); rellenoT.position.set(0, -0.1, 0.05); hojaGrande.add(rellenoT);
const tamalHecho = tamal(); tamalHecho.rotation.z = Math.PI / 2; tamalHecho.position.set(-0.35, 0.22, 0.05); armaT.add(tamalHecho);
const pilaTam = [];
for (let n = 0; n < 6; n++) { const t2 = tamal(); t2.rotation.z = Math.PI / 2; t2.rotation.y = 0.1; t2.position.set(0.65, 0.2 + Math.floor(n / 3) * 0.2, -0.35 + (n % 3) * 0.3); armaT.add(t2); pilaTam.push(t2); }
// vaporera con tamales parados, moneda y tapa
const vapT = new THREE.Group(); vapT.position.set(PAN.x, 0.08, PAN.z); vapT.visible = false; scene.add(vapT);
vapT.add(mesh(new THREE.LatheGeometry(perfilOlla(0.95, 0.9, 0.55), 40), "#9aa3ad", { contorno: 1.025, extra: { side: THREE.DoubleSide } }));
for (const s2 of [-1, 1]) { const a = mesh(new THREE.TorusGeometry(0.13, 0.045, 6, 14, Math.PI), "#2b2b2b", { contorno: 0 }); a.position.set(s2 * 0.97, 0.42, 0); a.rotation.z = s2 > 0 ? -Math.PI / 2 : Math.PI / 2; vapT.add(a); }
const aguaVap = new THREE.Mesh(new THREE.CircleGeometry(0.88, 32), M("#9fd3f5")); aguaVap.rotation.x = -Math.PI / 2; aguaVap.position.y = 0.18; vapT.add(aguaVap);
const monedaT = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 20), "#e6b422", { contorno: 1.1 }); vapT.add(monedaT);
const rejillaT = new THREE.Group(); rejillaT.position.y = 0.28; vapT.add(rejillaT);
{ const r = mesh(new THREE.TorusGeometry(0.82, 0.02, 4, 32), "#c9d0d6", { contorno: 0 }); r.rotation.x = Math.PI / 2; rejillaT.add(r); for (let n = 0; n < 5; n++) { const b = mesh(new THREE.BoxGeometry(1.6, 0.015, 0.02), "#c9d0d6", { contorno: 0 }); b.position.z = -0.6 + n * 0.3; rejillaT.add(b); } }
const tamVap = [];
{ [[0.6, 10], [0.3, 6], [0, 1]].forEach(([r, c]) => { for (let j = 0; j < c; j++) { const a = j / c * Math.PI * 2, t2 = tamal(); t2.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r); t2.rotation.set((Math.sin(a) * 0.25) * (r > 0 ? 1 : 0), 0, -(Math.cos(a) * 0.25) * (r > 0 ? 1 : 0)); vapT.add(t2); tamVap.push(t2); } }); }
const hojasTapa = [];
for (let n = 0; n < 5; n++) { const h = hojaMaiz(); h.rotation.set(-Math.PI / 2, 0, n * 1.25); h.position.y = 0.85; h.scale.setScalar(1.2); vapT.add(h); hojasTapa.push(h); }
const tapaVap = new THREE.Group(); vapT.add(tapaVap);
{ tapaVap.add(mesh(new THREE.SphereGeometry(0.98, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), "#b8c0c8", { contorno: 1.02 })); tapaVap.children[0].scale.y = 0.35; const p2 = mesh(new THREE.SphereGeometry(0.1, 12, 8), "#2b2b2b"); p2.position.y = 0.38; tapaVap.add(p2); }
// plato servido: un tamal abierto en su hoja y otro cerrado
const platoTm = new THREE.Group();
const abierto = new THREE.Group(); abierto.position.set(-0.15, 0.08, 0); abierto.rotation.y = 0.5; platoTm.add(abierto);
{ const h = hojaMaiz(); h.rotation.x = -Math.PI / 2; h.scale.setScalar(1.4); abierto.add(h);
  const m = mesh(new THREE.CapsuleGeometry(0.17, 0.5, 6, 14), COL_MASA_T, { contorno: 1.04 }); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, 0.7); m.position.y = 0.12; abierto.add(m);
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.55), M(COL_VERDE_S)); v.position.y = 0.24; abierto.add(v); }
const salsaTm = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), M(COL_VERDE_S)); salsaTm.rotation.x = -Math.PI / 2; salsaTm.position.set(0.55, 0.075, 0.25); platoTm.add(salsaTm);
const cerrado = tamal(); cerrado.rotation.set(Math.PI / 2, 0, 0.4); cerrado.position.set(0.55, 0.2, -0.35); platoTm.add(cerrado);
plato.add(platoTm);
// ---------- huevos divorciados ----------
const ESDIV = R.platillo === "divorciados";
const COL_ROJA = "#c23a22", COL_VERDE_D = "#5f9e3a", COL_FRIJOL_D = "#5a2f1c";
function huevoFrito(r) {
  const g = new THREE.Group();
  const cl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.03, 24), M("#ffffff", { transparent: true, opacity: 0.6 })); cl.scale.set(1, 1, 0.85); g.add(cl);
  const borde = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.012, 4, 24), M("#e8c27a")); borde.rotation.x = Math.PI / 2; borde.scale.set(1, 0.85, 1); g.add(borde);
  const ye = mesh(new THREE.SphereGeometry(r * 0.38, 16, 10), "#ffb21f", { contorno: 1.06 }); ye.scale.y = 0.6; ye.position.set(r * 0.08, 0.03, 0); g.add(ye);
  g.userData = { cl, ye }; return g;
}
// tamal en la mano (lo del video anterior)
const platoTamM = new THREE.Group();
{ platoTamM.add(mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.04, 24), "#fbfaf6", { contorno: 1.04 }));
  const h = hojaMaiz(); h.rotation.x = -Math.PI / 2; h.scale.setScalar(0.45); h.position.y = 0.03; platoTamM.add(h);
  const m = mesh(new THREE.CapsuleGeometry(0.07, 0.2, 4, 10), COL_MASA_T, { contorno: 1.05 }); m.rotation.x = Math.PI / 2; m.position.y = 0.08; platoTamM.add(m);
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.22), M(COL_VERDE_S)); v.position.y = 0.14; platoTamM.add(v); }
platoTamM.position.set(0, -0.1, 0.1);
const manoTamM = enMano(platoTamM);
const platitoH = new THREE.Group();
{ platitoH.add(mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.05, 20), "#fbfaf6", { contorno: 1.05 })); const hu = huevoFrito(0.13); hu.position.y = 0.04; hu.userData.cl.material = M("#f4f6f8", { transparent: true, opacity: 0.75 }); platitoH.add(hu); }
platitoH.position.set(0, -0.1, 0.1);
const manoPlatito = enMano(platitoH);
// huevos en el sartén
const huevosS = [-1, 1].map(s2 => { const h = huevoFrito(0.32); h.position.set(s2 * 0.33, 0.16, 0); h.visible = false; sarten.add(h); return h; });
const gotasAceite = [];
for (let n = 0; n < 8; n++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), M("#f2c14e")); g.visible = false; sarten.add(g); gotasAceite.push(g); }
// plato armado
const platoD = new THREE.Group();
const tortD = [-1, 1].map(s2 => { const t2 = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 26), "#e2b468", { contorno: 1.04 }); t2.position.set(s2 * 0.42, 0.09, 0); platoD.add(t2); return t2; });
const huevosD = [-1, 1].map(s2 => { const h = huevoFrito(0.3); h.userData.cl.material = M("#ffffff"); h.position.set(s2 * 0.42, 0.12, 0); platoD.add(h); return h; });
const salsasD = [[-1, COL_ROJA], [1, COL_VERDE_D]].map(([s2, c]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 24), M(c)); m.scale.set(1, 1, 0.85); m.position.set(s2 * 0.42, 0.14, 0); platoD.add(m); return m; });
const yemasD = huevosD.map(h => { const y = mesh(new THREE.SphereGeometry(0.11, 14, 10), "#ffb21f", { contorno: 1.06 }); y.scale.y = 0.6; y.position.set(h.position.x + 0.03, 0.17, 0); platoD.add(y); return y; });
const frijolD = mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 10), COL_FRIJOL_D, { contorno: 1.04 }); frijolD.rotation.x = Math.PI / 2; frijolD.scale.set(1, 1, 0.5); frijolD.position.set(0, 0.12, 0); platoD.add(frijolD);
const quesoD = [];
for (let n = 0; n < 22; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.05), M("#fffdf5")); q.position.set((hash(n + 2200) - 0.5) * 1.5, 0.19, (hash(n + 2201) - 0.5) * 0.6); q.userData.y0 = 0.19; platoD.add(q); quesoD.push(q); }
const cilD = [];
for (let n = 0; n < 8; n++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.045, 5), M("#3f9b3f", { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.position.set((hash(n + 2220) - 0.5) * 1.4, 0.2, (hash(n + 2221) - 0.5) * 0.5); platoD.add(c); cilD.push(c); }
plato.add(platoD);
// ---------- pasta a la boloñesa ----------
const ESBOLO = R.platillo === "bolonesa";
const COL_BOLO_S = "#a8321c";
// huevos divorciados en la mano (lo del video anterior)
const platoDivM = new THREE.Group();
{ platoDivM.add(mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.04, 24), "#fbfaf6", { contorno: 1.04 }));
  [[-1, COL_ROJA], [1, COL_VERDE_D]].forEach(([s2, c]) => { const t2 = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 18), "#e2b468", { contorno: 1.05 }); t2.position.set(s2 * 0.13, 0.04, 0); platoDivM.add(t2); const sa = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 18), M(c)); sa.position.set(s2 * 0.13, 0.055, 0); platoDivM.add(sa); const y = mesh(new THREE.SphereGeometry(0.04, 10, 8), "#ffb21f", { contorno: 1.08 }); y.scale.y = 0.6; y.position.set(s2 * 0.13, 0.07, 0); platoDivM.add(y); });
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.22), M(COL_FRIJOL_D)); f.position.y = 0.05; platoDivM.add(f); }
platoDivM.position.set(0, -0.1, 0.1);
const manoDivM = enMano(platoDivM);
// tapa del sartén (a medias)
const tapaS = new THREE.Group(); tapaS.visible = false; sarten.add(tapaS);
{ const t2 = mesh(new THREE.SphereGeometry(0.98, 30, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#c9d0d6", { contorno: 1.02, extra: { transparent: true, opacity: 0.9 } }); t2.scale.y = 0.25; tapaS.add(t2); const p2 = mesh(new THREE.SphereGeometry(0.08, 10, 8), "#2b2b2b"); p2.position.y = 0.27; tapaS.add(p2); }
// olla para la pasta: agua
const aguaPasta = new THREE.Mesh(new THREE.CircleGeometry(0.76, 32), M("#cfe3ee")); aguaPasta.rotation.x = -Math.PI / 2; aguaPasta.position.y = 0.38; aguaPasta.visible = false; olla.add(aguaPasta);
const tazaAgua = new THREE.Group(); tazaAgua.position.set(PAN.x - 0.15, 0.06, PAN.z + 1.0); tazaAgua.visible = false; scene.add(tazaAgua);
{ const t2 = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.32, 18), "#fbfaf6", { contorno: 1.04 }); t2.position.y = 0.16; tazaAgua.add(t2); const a = mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 12), "#fbfaf6", { contorno: 0 }); a.position.set(0.22, 0.18, 0); a.rotation.z = Math.PI / 2; tazaAgua.add(a);
  const l = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), M("#e8dcc0")); l.rotation.x = -Math.PI / 2; l.position.y = 0.3; tazaAgua.add(l); }
// plato servido
const platoB = new THREE.Group();
const nidoB = nidoPasta(0.62, 20, 77); nidoB.position.y = 0.08; platoB.add(nidoB);
const salsaB = mesh(new THREE.SphereGeometry(0.4, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), COL_BOLO_S, { contorno: 0 }); salsaB.scale.set(1, 0.4, 1); salsaB.position.y = 0.22; platoB.add(salsaB);
const carneB = [];
for (let n = 0; n < 16; n++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), M("#6a2a14")); const a = hash(n + 2300) * 6.28, r = Math.sqrt(hash(n + 2301)) * 0.33; c.position.set(Math.cos(a) * r, 0.36 - r * 0.25, Math.sin(a) * r); platoB.add(c); carneB.push(c); }
const parmB = [];
for (let n = 0; n < 34; n++) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.012), M("#fffbe8")); const a = hash(n + 2320) * 6.28, r = Math.sqrt(hash(n + 2321)) * 0.4; q.position.set(Math.cos(a) * r, 0.4 - r * 0.2, Math.sin(a) * r); q.rotation.y = n; q.userData.y0 = q.position.y; platoB.add(q); parmB.push(q); }
const albB = mesh(new THREE.SphereGeometry(0.1, 10, 6), "#2e8b3a", { contorno: 1.06 }); albB.scale.set(1, 0.25, 0.6); albB.position.set(0.05, 0.42, -0.05); platoB.add(albB);
plato.add(platoB);
// ---------- panqueques de galleta con crema ----------
const ESGAL = R.platillo === "galletas";
const COL_GALLETA = "#2a1a14";
function galletaM() { const g = new THREE.Group(); [-1, 1].forEach(s2 => { const d = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 22), COL_GALLETA, { contorno: 1.05 }); d.position.y = s2 * 0.045; g.add(d); }); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.045, 22), M("#fbf6ea")); g.add(c); return g; }
function galleta() { const g = new THREE.Group(); for (let n = 0; n < 3; n++) { const k = galletaM(); k.position.set((n - 1) * 0.12, n * 0.06, 0); k.rotation.z = (n - 1) * 0.3; g.add(k); } return g; }
// boloñesa en la mano (lo del video anterior)
const platoBoloM = new THREE.Group();
{ platoBoloM.add(mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.04, 24), "#fbfaf6", { contorno: 1.04 }));
  const n2 = nidoPasta(0.2, 8, 91); n2.position.y = 0.03; n2.userData.tubos.forEach(tb => tb.material = M("#e8b862")); platoBoloM.add(n2);
  const s2 = mesh(new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), COL_BOLO_S, { contorno: 0 }); s2.scale.y = 0.45; s2.position.y = 0.08; platoBoloM.add(s2); }
platoBoloM.position.set(0, -0.1, 0.1);
const manoBoloM = enMano(platoBoloM);
const galMano = galletaM(); galMano.rotation.x = Math.PI / 2; galMano.position.set(0, -0.08, 0.12);
const manoGal = enMano(galMano);
// trozos de galleta en el tazón
const trozosGal = [];
for (let n = 0; n < 22; n++) { const t2 = mesh(new THREE.BoxGeometry(0.09, 0.05, 0.07), n % 4 ? COL_GALLETA : "#fbf6ea", { contorno: 1.06 }); t2.rotation.set(hash(n + 2500) * 3, hash(n + 2501) * 3, 0); const a = hash(n + 2502) * 6.28, r = Math.sqrt(hash(n + 2503)) * 0.55; t2.userData.p = [Math.cos(a) * r, Math.sin(a) * r]; t2.visible = false; tazon.add(t2); trozosGal.push(t2); }
// motitas de galleta en el panqueque del sartén y en la pila
const motas = (parent, r, y, n0, cnt) => { const arr = []; for (let n = 0; n < cnt; n++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.03 + hash(n + n0) * 0.025, 6), M(COL_GALLETA)); m.rotation.x = -Math.PI / 2; const a = hash(n + n0 + 1) * 6.28, rr = Math.sqrt(hash(n + n0 + 2)) * r; m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); m.visible = false; parent.add(m); arr.push(m); } return arr; };
const motasHC = [...motas(hotcake, 0.6, 0.073, 2520, 16), ...motas(hotcake, 0.6, -0.073, 2560, 16).map(m => { m.rotation.x = Math.PI / 2; return m; })];
const motasPila = pila.map((hc, k) => motas(hc, 0.66, 0.101, 2600 + k * 40, 14)).flat();
const cremaCapas = pila.slice(0, 3).map((hc, k) => { const r2 = mesh(new THREE.TorusGeometry(0.66, 0.05, 6, 30), "#fffaf0", { contorno: 0 }); r2.rotation.x = Math.PI / 2; r2.visible = false; plato.add(r2); return r2; });
const cremaTop = new THREE.Group(); cremaTop.visible = false; plato.add(cremaTop);
{ const b = mesh(new THREE.SphereGeometry(0.28, 16, 10), "#fffaf0", { contorno: 1.04 }); b.scale.y = 0.55; cremaTop.add(b); const p2 = mesh(new THREE.ConeGeometry(0.12, 0.2, 10), "#fffaf0", { contorno: 1.05 }); p2.position.y = 0.2; cremaTop.add(p2); }
const galTop = [0, 1, 2].map(n => { const g = galletaM(); g.scale.setScalar(0.9); const a = n * 2.1; g.position.set(Math.cos(a) * 0.38, 0.06, Math.sin(a) * 0.32); g.rotation.set(1.1, -a + Math.PI / 2, 0); cremaTop.add(g); return g; });
const migasTop = [];
for (let n = 0; n < 14; n++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.04), M(COL_GALLETA)); const a = hash(n + 2700) * 6.28, r = 0.2 + hash(n + 2701) * 0.35; m.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); m.rotation.y = n; cremaTop.add(m); migasTop.push(m); }
const texT180 = texCanvas(256, 128, (g, w, h) => { g.fillStyle = "#1b1b1b"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff8a1f"; g.font = "bold 92px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("180°", w / 2, h / 2 + 4); });
if (ESLASANA) pantallaH.material.map = texT180;
if (ESNACHOS) { const tx200 = texCanvas(256, 128, (g, w, h) => { g.fillStyle = "#1b1b1b"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff8a1f"; g.font = "bold 92px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("200°", w / 2, h / 2 + 4); }); pantallaH.material.map = tx200; }
const COL_MASA = "#f3e4c4", COL_SALSA_P = "#c8361f";
const pizza = new THREE.Group();
const tabla = mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.07, 48), "#c58a4a", { contorno: 1.02 }); tabla.position.y = 0.035; pizza.add(tabla);
const mangoPala = mesh(new THREE.BoxGeometry(1.0, 0.07, 0.3), "#a86f35"); mangoPala.position.set(1.75, 0.035, 0); pizza.add(mangoPala);
const masaBola = mesh(new THREE.SphereGeometry(0.45, 24, 16), COL_MASA); masaBola.scale.y = 0.7; masaBola.position.y = 0.35; pizza.add(masaBola);
const pizzaCuerpo = new THREE.Group(); pizzaCuerpo.position.y = 0.12; pizza.add(pizzaCuerpo);
const CUNA = Math.PI / 4; // la rebanada que sale al final
const disco = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 48, 1, false, CUNA, Math.PI * 2 - CUNA), COL_MASA, { contorno: 1.02 }); pizzaCuerpo.add(disco);
const orilla = mesh(new THREE.TorusGeometry(1.08, 0.1, 10, 48, Math.PI * 2 - CUNA), COL_MASA, { contorno: 1.03 }); orilla.rotation.x = Math.PI / 2; orilla.rotation.z = -Math.PI / 2 - CUNA; orilla.position.y = 0.04; pizzaCuerpo.add(orilla);
const salsaP = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.03, 48, 1, false, CUNA, Math.PI * 2 - CUNA), M(COL_SALSA_P)); salsaP.position.y = 0.055; pizzaCuerpo.add(salsaP);
const mozz = [], hojas = [], doradoP = [];
for (let n = 0; n < 14; n++) {
  const a = CUNA + 0.2 + hash(n + 30) * (Math.PI * 2 - CUNA - 0.4), r = 0.2 + hash(n + 31) * 0.65;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8), M("#fff7e6")); m.scale.set(1, 0.35, 1); m.position.set(Math.sin(a) * r, 0.1, Math.cos(a) * r); pizzaCuerpo.add(m); mozz.push(m);
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), M("#d9953a")); d.rotation.x = -Math.PI / 2; d.position.set(m.position.x + 0.04, 0.16, m.position.z); pizzaCuerpo.add(d); doradoP.push(d);
}
for (let n = 0; n < 8; n++) {
  const a = CUNA + 0.3 + hash(n + 50) * (Math.PI * 2 - CUNA - 0.6), r = 0.25 + hash(n + 51) * 0.55;
  const h = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10), M("#2e8b3a", { side: THREE.DoubleSide })); h.scale.set(0.6, 1, 1); h.rotation.set(-Math.PI / 2, 0, hash(n) * 6); h.position.set(Math.sin(a) * r, 0.17, Math.cos(a) * r); pizzaCuerpo.add(h); hojas.push(h);
}
// rebanada
const rebanada = new THREE.Group(); pizzaCuerpo.add(rebanada);
const rebDisco = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 12, 1, false, 0, CUNA), COL_MASA, { contorno: 1.02 }); rebanada.add(rebDisco);
const rebOrilla = mesh(new THREE.TorusGeometry(1.08, 0.1, 10, 8, CUNA), COL_MASA, { contorno: 1.03 }); rebOrilla.rotation.x = Math.PI / 2; rebOrilla.rotation.z = -Math.PI / 2; rebOrilla.position.y = 0.04; rebanada.add(rebOrilla);
const rebSalsa = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.03, 12, 1, false, 0, CUNA), M(COL_SALSA_P)); rebSalsa.position.y = 0.055; rebanada.add(rebSalsa);
const rebQueso = [];
for (let n = 0; n < 3; n++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), M("#fff3d9")); m.scale.set(1.2, 0.3, 1.2); const a = CUNA * (0.3 + n * 0.2), r = 0.35 + n * 0.22; m.position.set(Math.sin(a) * r, 0.09, Math.cos(a) * r); rebanada.add(m); rebQueso.push(m); }
const hilos = [];
for (let n = 0; n < 4; n++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), M("#fff3d9")); pizzaCuerpo.add(h); hilos.push(h); }
const pizzaLuz = new THREE.PointLight(0xff8a1f, 0, 6); pizzaLuz.position.set(0, 2.2, 1.2); pizza.add(pizzaLuz);
pizza.position.copy(BOWL); pizza.visible = false; scene.add(pizza);
const ESENCH = R.platillo === "enchiladas";
// ---------- ingredientes 3D ----------
function platano() {
  const g = new THREE.Group();
  const curva = new THREE.CatmullRomCurve3([V3(-0.55, 0.25, 0), V3(-0.25, -0.05, 0), V3(0.2, -0.08, 0), V3(0.55, 0.2, 0)]);
  const cuerpo = mesh(new THREE.TubeGeometry(curva, 24, 0.16, 12), "#f7d33c");
  g.add(cuerpo);
  for (const [p, s] of [[curva.getPoint(0), 1], [curva.getPoint(1), -1]]) {
    const punta = mesh(new THREE.ConeGeometry(0.1, 0.18, 8), "#5a3a12", { contorno: 0 }); punta.position.copy(p); punta.rotation.z = s * 0.9; g.add(punta);
  }
  return g;
}
function huevo() {
  const m = mesh(new THREE.SphereGeometry(0.3, 24, 18), "#fff4e2"); m.scale.set(0.82, 1, 0.82); return m;
}
function avena() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.5, 28), "#c9844a"));
  const monte = mesh(new THREE.SphereGeometry(0.41, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), "#ecd9a8", { contorno: 0 }); monte.scale.y = 0.4; monte.position.y = 0.25; g.add(monte);
  for (let i = 0; i < 18; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), M("#d4b878")); const a = hash(i) * 6.28, r = hash(i + 4) * 0.32; o.scale.set(1, 0.5, 0.7); o.position.set(Math.cos(a) * r, 0.27 + 0.13 * (1 - r / 0.4), Math.sin(a) * r); g.add(o); }
  const et = mesh(new THREE.CylinderGeometry(0.425, 0.38, 0.2, 28, 1, true), "#fff4dc", { contorno: 0 }); et.position.y = -0.03; g.add(et);
  return g;
}
function tortilla() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const d = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.035, 32), "#f1dca0", { contorno: 1.02 }); d.position.y = i * 0.045; d.rotation.y = i; g.add(d); }
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.03 + hash(i) * 0.03, 8), M("#c9964e")); m.rotation.x = -Math.PI / 2; m.position.set(Math.cos(i * 2.3) * 0.32 * hash(i + 2), 0.16, Math.sin(i * 2.3) * 0.32 * hash(i + 5)); g.add(m); }
  return g;
}
function pollo() {
  const g = new THREE.Group();
  const plat = mesh(new THREE.CylinderGeometry(0.48, 0.36, 0.14, 28), "#fbfaf6", { contorno: 1.03 }); g.add(plat);
  for (let i = 0; i < 26; i++) { const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 3, 6), M(i % 3 ? "#e9cfa3" : "#d8b47d")); const a = hash(i) * 6.28, r = hash(i + 7) * 0.3; h.position.set(Math.cos(a) * r, 0.12 + hash(i + 3) * 0.12, Math.sin(a) * r); h.rotation.set(hash(i + 1) * 3, hash(i + 2) * 3, hash(i + 4) * 3); g.add(h); }
  return g;
}
function tomate() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.26, 20, 14), "#7cb342"); b.scale.y = 0.85; g.add(b);
  for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), M("#c9c58a", { side: THREE.DoubleSide })); h.position.set(Math.cos(i * 1.26) * 0.08, 0.22, Math.sin(i * 1.26) * 0.08); h.rotation.set(Math.sin(i * 1.26) * 0.8, 0, -Math.cos(i * 1.26) * 0.8); g.add(h); }
  return g;
}
function chile() {
  const g = new THREE.Group();
  const c = mesh(new THREE.CapsuleGeometry(0.09, 0.45, 6, 12), "#3f8f2f"); c.rotation.z = Math.PI / 2 - 0.2; g.add(c);
  const t = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.14, 6), "#6b8e23", { contorno: 0 }); t.position.set(0.34, 0.1, 0); t.rotation.z = -0.9; g.add(t);
  return g;
}
function leche() {
  const g = new THREE.Group();
  const caja = mesh(new THREE.BoxGeometry(0.42, 0.7, 0.42), "#ffffff"); caja.position.y = 0.1; g.add(caja);
  const franjaL = mesh(new THREE.BoxGeometry(0.43, 0.22, 0.43), "#4d8de0", { contorno: 0 }); franjaL.position.y = 0.05; g.add(franjaL);
  const techo = mesh(new THREE.CylinderGeometry(0.0, 0.3, 0.2, 4), "#ffffff"); techo.rotation.y = Math.PI / 4; techo.position.y = 0.55; g.add(techo);
  return g;
}
function queso() {
  const g = new THREE.Group();
  const q = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 24, 1, false, 0, Math.PI * 0.45), "#ffd75e"); g.add(q);
  for (let i = 0; i < 4; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.035 + hash(i) * 0.02, 8, 6), M("#e8b93c")); h.position.set(Math.sin(0.3 + i * 0.25) * (0.15 + hash(i + 1) * 0.2), (hash(i + 3) - 0.5) * 0.2, Math.cos(0.3 + i * 0.25) * (0.15 + hash(i + 1) * 0.2)); g.add(h); }
  return g;
}
function mantequillaBloque() { const m = mesh(new THREE.BoxGeometry(0.42, 0.2, 0.28), "#ffe27a"); return m; }
function harina() {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.6, 20), "#f6f0e2"); g.add(b);
  const banda = mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.16, 20), "#e65a7a", { contorno: 0 }); g.add(banda);
  const polvo = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M("#ffffff")); polvo.scale.y = 0.4; polvo.position.y = 0.3; g.add(polvo);
  return g;
}
function chileSeco() {
  const g = new THREE.Group();
  const c = mesh(new THREE.CapsuleGeometry(0.13, 0.42, 6, 12), "#5a1f17"); c.scale.set(1, 1, 0.55); c.rotation.z = Math.PI / 2 - 0.3; g.add(c);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 4, 12, Math.PI), M("#3e140f")); r.position.set(-0.2 + i * 0.13, 0.06 - i * 0.04, 0.05); r.rotation.z = -0.3; g.add(r); }
  const t = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 8), "#7a6a3a", { contorno: 0 }); t.position.set(0.34, 0.12, 0); t.rotation.z = -1.2; g.add(t);
  return g;
}
function chocolate() {
  const g = new THREE.Group();
  const d = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 32), "#5a2e1a"); g.add(d);
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.02, 0.025), M("#3e1f10")); l.position.y = 0.085; l.rotation.y = i * Math.PI / 4; g.add(l); }
  return g;
}
function ajonjoli() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.22, 24), "#d9a066"));
  for (let i = 0; i < 40; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), M("#f3e3bf")); const a = hash(i) * 6.28, r = hash(i + 9) * 0.34; s.scale.set(1, 0.5, 1.6); s.position.set(Math.cos(a) * r, 0.12 + hash(i + 2) * 0.04, Math.sin(a) * r); s.rotation.y = hash(i + 3) * 6; g.add(s); }
  for (let i = 0; i < 5; i++) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M("#b07040")); a.scale.set(1.4, 0.6, 0.9); a.position.set(Math.cos(i * 1.3) * 0.2, 0.17, Math.sin(i * 1.3) * 0.2); a.rotation.y = i; g.add(a); }
  return g;
}
function pieza() {
  const g = new THREE.Group();
  const carne = mesh(new THREE.SphereGeometry(0.28, 20, 14), "#d7a46a"); carne.scale.set(1.25, 0.85, 0.9); g.add(carne);
  const hueso = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 10), "#f6efe0"); hueso.rotation.z = Math.PI / 2; hueso.position.x = 0.45; g.add(hueso);
  const nudo = mesh(new THREE.SphereGeometry(0.08, 10, 8), "#f6efe0"); nudo.position.x = 0.64; g.add(nudo);
  return g;
}
function agua() {
  const g = new THREE.Group();
  const v = mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.62, 24, 1, true), "#cfe8ff", { extra: { side: THREE.DoubleSide, transparent: true, opacity: 0.6 } }); g.add(v);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.4, 24), M("#7fc4ff", { transparent: true, opacity: 0.7 })); l.position.y = -0.1; g.add(l);
  const asa = mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16, Math.PI), "#cfe8ff", { contorno: 0 }); asa.position.x = 0.32; asa.rotation.z = -Math.PI / 2; g.add(asa);
  return g;
}
function jitomate() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.27, 22, 16), "#d9342b"); b.scale.y = 0.85; g.add(b);
  for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), M("#3f8f2f")); h.position.set(Math.cos(i * 1.26) * 0.07, 0.22, Math.sin(i * 1.26) * 0.07); h.rotation.set(Math.sin(i * 1.26) * 1.2, 0, -Math.cos(i * 1.26) * 1.2); g.add(h); }
  return g;
}
function arrozBolsa() {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), "#f7f3ea"); g.add(b);
  const e = mesh(new THREE.BoxGeometry(0.56, 0.24, 0.31), "#d93b3b", { contorno: 0 }); e.position.y = 0.05; g.add(e);
  const c = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), M("#ffffff")); c.position.set(0, 0.05, 0.16); g.add(c);
  return g;
}
function vinagre() {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.62, 18), "#e9dfb8", { extra: { transparent: true, opacity: 0.85 } }); g.add(b);
  const cu = mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.2, 14), "#e9dfb8"); cu.position.y = 0.4; g.add(cu);
  const t = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 14), "#d93b3b", { contorno: 0 }); t.position.y = 0.53; g.add(t);
  const et = mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.22, 18, 1, true), "#ffffff", { contorno: 0 }); et.position.y = -0.05; g.add(et);
  return g;
}
function nori() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const h = mesh(new THREE.BoxGeometry(0.7, 0.025, 0.6), "#1f3a26", { contorno: 1.02 }); h.position.y = i * 0.03; h.rotation.y = i * 0.08; g.add(h); }
  return g;
}
function salmon() {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.75, 0.2, 0.4), "#f2814f"); g.add(b);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.205, 0.405), M("#ffd2bd")); r.position.x = -0.3 + i * 0.15; r.rotation.y = 0.4; g.add(r); }
  return g;
}
function carne() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.BoxGeometry(0.7, 0.05, 0.42), i % 2 ? "#e8a39a" : "#dc8f86", { contorno: 1.03 }); c.position.y = i * 0.06; c.rotation.y = i * 0.25; g.add(c); }
  return g;
}
function achiote() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.22, 0.32), "#c4371e"));
  const e = mesh(new THREE.BoxGeometry(0.51, 0.1, 0.33), "#f4c430", { contorno: 0 }); g.add(e);
  return g;
}
function especias() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.18, 20), "#7a4a24"));
  for (let i = 0; i < 3; i++) { const a = mesh(new THREE.SphereGeometry(0.1, 10, 8), "#f6efe0"); a.scale.set(0.8, 1.2, 0.8); a.position.set(-0.12 + i * 0.12, 0.17, 0.02); g.add(a); }
  const ce = mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI), "#e9c7ef"); ce.position.set(0.15, 0.14, -0.1); g.add(ce);
  return g;
}
function pinaFruta() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.3, 18, 14), "#e0a526"); b.scale.set(0.85, 1.15, 0.85); g.add(b);
  for (let i = 0; i < 6; i++) { const h = mesh(new THREE.ConeGeometry(0.06, 0.32, 4), "#3f8f2f", { contorno: 0 }); h.position.set(Math.cos(i) * 0.06, 0.42, Math.sin(i) * 0.06); h.rotation.set(Math.sin(i) * 0.5, 0, -Math.cos(i) * 0.5); g.add(h); }
  return g;
}
function pastaSeca() {
  const g = new THREE.Group();
  for (let i = 0; i < 14; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.9, 0.012), M("#f3dc8c")); v.position.set((i % 7 - 3) * 0.045, 0, Math.floor(i / 7) * 0.03); v.rotation.z = (hash(i) - 0.5) * 0.08; g.add(v); }
  const cinta = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16, 1, true), "#2f5b9a", { contorno: 0, extra: { side: THREE.DoubleSide } }); g.add(cinta);
  return g;
}
function sal() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.5, 16), "#ffffff", { extra: { transparent: true, opacity: 0.9 } }));
  const t = mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#b8c0c8"); t.position.y = 0.25; g.add(t);
  return g;
}
const FABRICA = { pasta: pastaSeca, sal, carne, achiote, especias, pina: pinaFruta, arroz: arrozBolsa, vinagre, nori, salmon, agua, jitomate, platano, huevo, avena, tortilla, pollo, tomate, chile, leche, queso, mantequilla: mantequillaBloque, harina, chileSeco, chocolate, ajonjoli, pieza, canela: canelaRaja, quesoCrema: quesoCremaTina, berenjena, pimiento, cebolla, ajo, naranja, cebollita, totopos: totoposBolsa, aguacate, cafe, soletas, fresas, maiz, lechuga, galleta };
const fabrica = n => (FABRICA[n] || huevo)();

// cascarón partido: dos mitades + yema + clara
function huevoRoto() {
  const g = new THREE.Group();
  const mat = M("#fff4e2", { side: THREE.DoubleSide });
  const arriba = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), mat);
  const abajo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), mat);
  for (const m of [arriba, abajo]) { m.scale.set(0.82, 1, 0.82); m.castShadow = true; const o = new THREE.Mesh(m.geometry, LINEA); o.scale.setScalar(1.05); m.add(o); }
  const clara = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 12), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad, transparent: true, opacity: 0.9 }));
  const yema = mesh(new THREE.SphereGeometry(0.13, 20, 14), "#ffb21f", { contorno: 1.06 });
  g.add(arriba, abajo, clara, yema);
  Object.assign(g.userData, { arriba, abajo, clara, yema });
  return g;
}

// ingredientes de la repisa (con hilo y etiqueta)
const repisa = presentas.map(pr => {
  const g = new THREE.Group();
  const cant = pr.cuantos || 1;
  for (let j = 0; j < cant; j++) { const it = fabrica(pr.ingrediente); it.position.x = (j - (cant - 1) / 2) * 0.62; g.add(it); }
  const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 20, 4), M("#5a3a12")); hilo.position.y = 10.6; g.add(hilo);
  const { tx, aspecto, lineas } = etiquetaTex(partirEtiqueta((pr.etiqueta || "").toUpperCase()));
  const alto = lineas > 1 ? 0.7 : 0.42, ancho = Math.min(alto * aspecto, 2.0);
  const et = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho / aspecto), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
  et.position.set(0.3, 1.25 + (lineas > 1 ? 0.12 : 0), 0.05); g.add(et);
  g.visible = false; scene.add(g);
  return g;
});

// ingredientes que caen al tazón (se crean por paso)
const caidas = [];
pasos.forEach((s, j) => {
  if (s.accion !== "drop") return;
  (s.ingredientes || [s.ingrediente]).forEach((ing, n) => {
    const obj = ing === "huevo" ? huevoRoto() : fabrica(ing);
    obj.visible = false; scene.add(obj);
    caidas.push({ j, n, ing, obj, lado: n % 2 ? 1 : -1, sarten: s.destino === "sarten" });
  });
});

// cuchara y espátula
const cuchara = new THREE.Group();
const palo = mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.3, 10), P.madera); palo.position.y = -0.55; cuchara.add(palo);
const cazo = mesh(new THREE.SphereGeometry(0.17, 16, 12), P.madera); cazo.scale.set(1, 1.3, 0.5); cazo.position.y = -1.25; cuchara.add(cazo);
const espatula = new THREE.Group();
const palo2 = mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.0, 10), P.maderaOscura); palo2.position.y = -0.45; espatula.add(palo2);
const pala = mesh(new THREE.BoxGeometry(0.45, 0.5, 0.04), "#9aa3ad"); pala.position.y = -1.1; espatula.add(pala);

// ---------- chef gato ----------
function chef() {
  const c = P.gato, raiz = new THREE.Group(), cuerpo = new THREE.Group(); raiz.add(cuerpo);
  const piernas = [];
  for (const s of [-1, 1]) {
    const pierna = mesh(new THREE.CapsuleGeometry(0.13, 0.22, 4, 10), c); pierna.position.set(s * 0.2, 0.24, 0); cuerpo.add(pierna); piernas.push(pierna);
    const pata = mesh(new THREE.SphereGeometry(0.15, 14, 10), "#ffffff"); pata.scale.set(1, 0.6, 1.3); pata.position.set(0, -0.2, 0.06); pierna.add(pata);
  }
  const torso = mesh(new THREE.CapsuleGeometry(0.42, 0.45, 6, 18), "#fffdf6"); torso.position.y = 0.88; torso.scale.set(1, 1, 0.85); cuerpo.add(torso);
  for (const y of [0.7, 0.9, 1.1]) for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M(P.amarillo)); b.position.set(s * 0.11, y, 0.37); cuerpo.add(b); }
  const panuelo = mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 20), "#d93b3b"); panuelo.rotation.x = Math.PI / 2; panuelo.position.y = 1.32; cuerpo.add(panuelo);
  // cola (cadena de esferas)
  const cola = [];
  for (let i = 0; i < 9; i++) { const s = mesh(new THREE.SphereGeometry(0.1 - i * 0.004, 10, 8), i > 6 ? P.gatoOscuro : c, { contorno: 0 }); cuerpo.add(s); cola.push(s); }
  // brazos
  const brazos = {};
  for (const s of [-1, 1]) {
    const hombro = new THREE.Group(); hombro.position.set(s * 0.46, 1.18, 0); cuerpo.add(hombro);
    const manga = mesh(new THREE.CapsuleGeometry(0.11, 0.36, 4, 10), "#fffdf6"); manga.position.y = -0.25; hombro.add(manga);
    const mano = mesh(new THREE.SphereGeometry(0.13, 14, 10), c); mano.position.y = -0.52; hombro.add(mano);
    const agarre = new THREE.Group(); agarre.position.y = -0.55; hombro.add(agarre);
    brazos[s] = { hombro, agarre };
  }
  brazos[-1].agarre.add(cuchara); brazos[1].agarre.add(espatula);
  // cabeza
  const cabeza = new THREE.Group(); cabeza.position.y = 1.78; cuerpo.add(cabeza);
  const craneo = mesh(new THREE.SphereGeometry(0.5, 32, 24), c); craneo.scale.set(1.08, 0.94, 0.95); cabeza.add(craneo);
  for (const x of [-0.12, 0, 0.12]) { const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 3, 6), M(P.gatoOscuro)); r.position.set(x, 0.36, 0.3); r.rotation.x = -0.7; cabeza.add(r); }
  const orejas = [];
  for (const s of [-1, 1]) {
    const oreja = mesh(new THREE.ConeGeometry(0.17, 0.32, 4), c); oreja.position.set(s * 0.32, 0.43, 0); oreja.rotation.z = -s * 0.35; cabeza.add(oreja); orejas.push(oreja);
    const dentro = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), M("#f7b7a3")); dentro.position.set(0, -0.02, 0.06); oreja.add(dentro);
  }
  const hocico = mesh(new THREE.SphereGeometry(0.22, 20, 14), "#fff6ea", { contorno: 0 }); hocico.scale.set(1.25, 0.8, 0.8); hocico.position.set(0, -0.14, 0.38); cabeza.add(hocico);
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), M("#e8657a")); nariz.scale.set(1.3, 0.8, 0.8); nariz.position.set(0, -0.04, 0.55); cabeza.add(nariz);
  const boca = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0x7a1f1f })); boca.scale.set(1, 0.3, 0.5); boca.position.set(0, -0.2, 0.55); cabeza.add(boca);
  const ojos = [], felices = [];
  for (const s of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: 0x2a1a10 })); ojo.scale.set(0.9, 1.25, 0.5); ojo.position.set(s * 0.19, 0.06, 0.45); cabeza.add(ojo); ojos.push(ojo);
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); brillo.position.set(0.25, 0.35, 0.7); ojo.add(brillo);
    const feliz = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1a10 })); feliz.position.set(s * 0.19, 0.03, 0.47); cabeza.add(feliz); felices.push(feliz);
    const chapa = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), new THREE.MeshBasicMaterial({ color: 0xff9b8a, transparent: true, opacity: 0.6 })); chapa.position.set(s * 0.32, -0.12, 0.42); chapa.rotation.y = s * 0.5; cabeza.add(chapa);
    for (const dy of [-0.02, 0.05]) { const big = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 3), M("#5a3a12")); big.rotation.z = Math.PI / 2 + s * dy * 3; big.position.set(s * 0.42, -0.12 + dy, 0.4); cabeza.add(big); }
  }
  // gorro
  const gorro = new THREE.Group(); gorro.position.y = 0.42; cabeza.add(gorro);
  const banda = mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.22, 24), "#ffffff"); gorro.add(banda);
  for (const [x, y, z, r] of [[0, 0.38, 0, 0.32], [-0.22, 0.3, 0, 0.24], [0.22, 0.3, 0, 0.24], [0, 0.3, 0.18, 0.24], [0, 0.3, -0.18, 0.24]]) { const b = mesh(new THREE.SphereGeometry(r, 18, 12), "#ffffff", { contorno: 1.04 }); b.position.set(x, y, z); gorro.add(b); }
  return { raiz, cuerpo, piernas, cola, brazos, cabeza, orejas, ojos, felices, boca, gorro };
}
const CH = chef();
scene.add(CH.raiz);
// lasaña: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoCer, manoLamina, manoQueso);
CH.brazos[1].agarre.add(manoCuch, manoPure, manoLeche, cucharon, batidor);
cucharon.visible = false; batidor.visible = false;
// tiramisú: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoColador, batidorL, manoSoleta2);
CH.brazos[1].agarre.add(manoJarra, manoSoleta);
// mostachón: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoLas, manoLata, manoFresa);
// pastel azteca: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoPoz, manoTort);
// tamales: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoTir, manoBolita);
// huevos divorciados: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoTamM);
CH.brazos[1].agarre.add(manoPlatito);
// boloñesa: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoDivM);
// galletas: objetos que Michi sostiene
CH.brazos[-1].agarre.add(manoBoloM, manoGal);

// ---------- partículas (deterministas) ----------
const POOL = [];
const geoPart = { esfera: new THREE.SphereGeometry(1, 8, 6), cuadro: new THREE.PlaneGeometry(1, 1.6), estrella: new THREE.OctahedronGeometry(1, 0) };
for (let i = 0; i < 420; i++) {
  const m = new THREE.Mesh(geoPart.esfera, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide }));
  m.visible = false; scene.add(m); POOL.push(m);
}
const RAFAGAS = [];
const COL_SALSA_P_R = "#c8361f";
const rafaga = (t, o) => RAFAGAS.push({ t, ...o });
const CONFETI = ["#ff5d73", "#ffd23f", "#3bceac", "#4d8de0", "#ff9f1c", "#b388eb"];

function armarRafagas() {
  pasos.forEach((s, j) => {
    const a = s.accion, ti = s.inicio;
    if (a === "hook") { rafaga(ti + 0.15, { origen: V3(-1.5, 1.3, 0.4), n: 40, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.6, g: -0.4, vida: 1.6, tam: 0.05 }); }
    if (a === "intro") rafaga(ti + 0.2, { origen: V3(0, 5.4, -2.2), n: 60, colores: CONFETI, tipo: "cuadro", vel: 3.2, g: -4, vida: 2.2, tam: 0.07, arriba: 2.5 });
    if (a === "presenta") rafaga(ti + 0.7, { origen: V3(s.slot, SHELF_Y + 0.3, SHELF_Z + 0.2), n: 22, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.4, g: -0.5, vida: 1.0, tam: 0.05 });
    if (a === "serve") rafaga(ti + 0.8, { origen: V3(PLATE.x, 1.4, PLATE.z), n: 70, colores: CONFETI, tipo: "cuadro", vel: 3, g: -4, vida: 2.2, tam: 0.06, arriba: 3 });
    if (a === "outro") { rafaga(ti + 0.1, { origen: V3(-2, 2, 0.5), n: 70, colores: CONFETI, tipo: "cuadro", vel: 3.6, g: -4, vida: 2.6, tam: 0.07, arriba: 4 }); rafaga(ti + 0.25, { origen: V3(2, 2, 0.5), n: 70, colores: CONFETI, tipo: "cuadro", vel: 3.6, g: -4, vida: 2.6, tam: 0.07, arriba: 4 }); }
    if (a === "arma" && !["lasana", "azteca"].includes(R.platillo)) for (let n = 0; n < 4; n++) rafaga(ti + 0.75 + n * 0.4, { origen: V3(BOWL.x - 0.78 + n * 0.52, 0.8, BOWL.z), n: 10, colores: ["#e9cfa3", "#f1dca0"], tipo: "esfera", vel: 1.2, g: -6, vida: 0.6, tam: 0.04, arriba: 1.5 });
    if (a === "baña" && R.platillo !== "chilaquiles") rafaga(ti + 0.4, { origen: V3(BOWL.x, 0.9, BOWL.z), n: 30, colores: [s.capa === "bechamel" ? COLOR_BECH : COLOR_SALSA], tipo: "esfera", vel: 1.8, g: -7, vida: 0.8, tam: 0.05, arriba: 2 });
    if (a === "ralla") rafaga(ti + 0.5, { origen: V3(BOWL.x, 1.3, BOWL.z), n: 50, colores: ["#fff3cf", "#ffffff"], tipo: "cuadro", vel: 0.5, g: -4, vida: 1.0, tam: 0.025 });
    if (a === "hierve" || a === "cuece") rafaga(ti + 0.5, { origen: V3(PAN.x, 1.1, PAN.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.5, g: 1.3, vida: 1.6, tam: 0.08 });
    if (a === "tip") rafaga(ti + 0.6, { origen: V3(PAN.x, 0.4, PAN.z), n: 20, colores: ["#cfe8ff", "#ffffff"], tipo: "esfera", vel: 1.2, g: -6, vida: 0.7, tam: 0.04, arriba: 1.5 });
    if (a === "dora") rafaga(ti + 1.5, { origen: V3(PAN.x, 0.4, PAN.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.5, g: 1.2, vida: 1.4, tam: 0.07 });
    if (a === "remoja") rafaga(ti + 0.4, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 20, colores: ["#ffffff"], tipo: "esfera", vel: 0.4, g: 1, vida: 1.6, tam: 0.07 });
    if (a === "lava") rafaga(ti + 0.5, { origen: V3(BOWL.x, 0.9, BOWL.z), n: 30, colores: ["#bfe3f5", "#ffffff"], tipo: "esfera", vel: 1.4, g: -6, vida: 0.8, tam: 0.04, arriba: 2 });
    if (a === "cocina") rafaga(ti + s.dur * 0.4, { origen: V3(PAN.x, 1.2, PAN.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.4, vida: 1.6, tam: 0.08 });
    if (a === "corta" && R.platillo !== "chilaquiles") for (let n = 0; n < 3; n++) rafaga(ti + 0.6 + n * 0.6, { origen: V3(PAN.x, 0.4, PAN.z), n: 8, colores: [["#5aa83c", "#b7d36b", "#f2814f"][n]], tipo: "cuadro", vel: 1, g: -6, vida: 0.6, tam: 0.03 });
    if (a === "serve" && R.platillo === "sushi") rafaga(ti + 2.0, { origen: V3(PLATE.x, 1.4, PLATE.z), n: 30, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.4, g: -0.5, vida: 1.2, tam: 0.05 });
    if (a === "extiende" && R.platillo === "pizza") rafaga(ti + 1.6, { origen: V3(BOWL.x, 0.4, BOWL.z), n: 40, colores: ["#ffffff", "#f3e4c4"], tipo: "esfera", vel: 1.4, g: -0.8, vida: 1.2, tam: 0.06 });
    if (a === "salsa" && !["lasana", "azteca", "tamales"].includes(R.platillo)) rafaga(ti + 0.3, { origen: V3(BOWL.x, 0.4, BOWL.z), n: 24, colores: [COL_SALSA_P_R], tipo: "esfera", vel: 1.5, g: -7, vida: 0.7, tam: 0.04, arriba: 1.6 });
    if (a === "queso" && R.platillo === "pizza") rafaga(ti + 0.1, { origen: V3(BOWL.x, 3.0, BOWL.z), n: 40, colores: ["#fff7e6", "#2e8b3a"], tipo: "cuadro", vel: 0.7, g: -5, vida: 1.2, tam: 0.04 });
    else if (a === "queso") rafaga(ti + 0.2, { origen: V3(BOWL.x, 3.2, BOWL.z), n: 60, colores: ["#ffd75e", "#ffe48a"], tipo: "cuadro", vel: 0.8, g: -5, vida: 1.2, tam: 0.04 });
    if (a === "hornea") rafaga(ti + s.dur * 0.6, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.2, vida: 1.4, tam: 0.07 });
    if (a === "serve" && R.platillo === "mole") rafaga(ti + 1.5, { origen: V3(PLATE.x, 2.6, PLATE.z), n: 50, colores: ["#f3e3bf"], tipo: "esfera", vel: 0.5, g: -5, vida: 1.0, tam: 0.025 });
    if (R.platillo === "galletas") {
      if (a === "galletas") rafaga(ti + 0.8, { origen: V3(BOWL.x, 1.5, BOWL.z), n: 40, colores: ["#2a1a14", "#fbf6ea"], tipo: "cuadro", vel: 0.5, g: -4, vida: 1.0, tam: 0.03 });
      if (a === "crema") rafaga(ti + s.dur - 1.2, { origen: V3(BOWL.x, 1.3, BOWL.z), n: 24, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.0, g: -0.4, vida: 1.0, tam: 0.045 });
    }
    if (R.platillo === "bolonesa") {
      if (a === "carne") rafaga(ti + 1.6, { origen: V3(PAN.x, 0.5, PAN.z), n: 22, colores: ["#ffffff", "#e8e2d6"], tipo: "esfera", vel: 0.5, g: 1.3, vida: 1.4, tam: 0.08 });
      if (a === "leche") rafaga(ti + 3.6, { origen: V3(PAN.x, 0.6, PAN.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.3, vida: 1.6, tam: 0.09 });
      if (a === "cuecepasta") rafaga(ti + 0.8, { origen: V3(PAN.x, 1.8, PAN.z), n: 40, colores: ["#ffffff"], tipo: "cuadro", vel: 0.4, g: -5, vida: 0.9, tam: 0.02 });
      if (a === "serve") rafaga(ti + 1.4, { origen: V3(PLATE.x, 1.6, PLATE.z), n: 50, colores: ["#fffbe8", "#fff3cf"], tipo: "cuadro", vel: 0.5, g: -4, vida: 1.0, tam: 0.02 });
    }
    if (R.platillo === "divorciados") {
      if (a === "huevo") [2.6, 6.8].forEach(d0 => rafaga(ti + d0, { origen: V3(PAN.x, 0.45, PAN.z), n: 14, colores: ["#fff3c4", "#f2c14e"], tipo: "esfera", vel: 1.2, g: -6, vida: 0.5, tam: 0.025, arriba: 1.3 }));
      if (a === "bana") rafaga(ti + s.dur - 1.5, { origen: V3(PAN.x, 0.9, PAN.z), n: 30, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.2, g: -0.5, vida: 1.1, tam: 0.05 });
      if (a === "armadiv") rafaga(ti + 7.2, { origen: V3(PLATE.x, 1.2, PLATE.z), n: 30, colores: ["#c23a22", "#5f9e3a", "#ffffff"], tipo: "estrella", vel: 1.2, g: -0.5, vida: 1.1, tam: 0.05 });
    }
    if (R.platillo === "tamales") {
      if (a === "manteca") rafaga(ti + s.dur - 1.2, { origen: V3(BOWL.x, 1.3, BOWL.z), n: 24, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.0, g: -0.4, vida: 1.0, tam: 0.045 });
      if (a === "flota") rafaga(ti + 3.8, { origen: V3(BOWL.x + 1.25, 1.2, BOWL.z + 0.65), n: 40, colores: ["#ffffff", "#fff3b0", "#9fd3f5"], tipo: "estrella", vel: 1.4, g: -0.5, vida: 1.3, tam: 0.05 });
      if (a === "arma") rafaga(ti + 8.0, { origen: V3(BOWL.x - 0.35, 0.6, BOWL.z), n: 24, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.0, g: -0.4, vida: 1.0, tam: 0.045 });
      if (a === "cuece") rafaga(ti + 1.5, { origen: V3(PAN.x, 1.2, PAN.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.3, vida: 1.6, tam: 0.08 });
    }
    if (R.platillo === "azteca") {
      if (a === "asa") for (let n = 0; n < 3; n++) rafaga(ti + 1 + n * 1.8, { origen: V3(PAN.x, 0.7, PAN.z), n: 16, colores: ["#3a3a3a", "#6a6a6a"], tipo: "esfera", vel: 0.5, g: 1.2, vida: 1.2, tam: 0.05 });
      if (a === "tortillas") for (let n = 0; n < 5; n++) rafaga(ti + 0.3 + n * 1.4, { origen: V3(PAN.x, 0.45, PAN.z), n: 12, colores: ["#fff3c4", "#f2c14e"], tipo: "esfera", vel: 1.2, g: -6, vida: 0.5, tam: 0.025, arriba: 1.3 });
      if (a === "hornea") rafaga(ti + s.dur - 1.2, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.2, vida: 1.4, tam: 0.07 });
      if (a === "serve") rafaga(ti + 2.2, { origen: V3(PLATE.x, 1.4, PLATE.z), n: 24, colores: ["#fffaf0"], tipo: "esfera", vel: 0.8, g: -5, vida: 0.8, tam: 0.03 });
    }
    if (R.platillo === "pozole") {
      if (a === "cuecemaiz") rafaga(ti + s.dur - 2.5, { origen: V3(PAN.x, 1.2, PAN.z), n: 30, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.2, g: -0.5, vida: 1.2, tam: 0.05 });
      if (a === "friesalsa") for (let n = 0; n < 3; n++) rafaga(ti + 0.8 + n * 2.2, { origen: V3(PAN.x, 0.45, PAN.z), n: 14, colores: ["#a8281a", "#c94a2e"], tipo: "esfera", vel: 1.3, g: -6, vida: 0.6, tam: 0.03, arriba: 1.4 });
      if (a === "junta") rafaga(ti + s.dur - 1.6, { origen: V3(PAN.x, 2.0, PAN.z), n: 40, colores: ["#ffffff"], tipo: "cuadro", vel: 0.4, g: -5, vida: 0.9, tam: 0.02 });
      if (a === "hierve") rafaga(ti + 0.6, { origen: V3(PAN.x - 0.2, 2.0, PAN.z), n: 60, colores: ["#4f7a2a", "#6a9a3a"], tipo: "cuadro", vel: 0.5, g: -4, vida: 1.3, tam: 0.025 });
    }
    if (R.platillo === "mostachon") {
      if (a === "claras") rafaga(ti + 3.4, { origen: V3(BOWL.x, 1.5, BOWL.z), n: 40, colores: ["#ffffff", "#f6f0e2"], tipo: "esfera", vel: 0.5, g: -4, vida: 1.0, tam: 0.025 });
      if (a === "claras") rafaga(ti + s.dur - 1.0, { origen: V3(BOWL.x, 1.8, BOWL.z), n: 30, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.2, g: -0.5, vida: 1.0, tam: 0.05 });
      if (a === "hornea") rafaga(ti + s.dur - 1.2, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.2, vida: 1.4, tam: 0.07 });
      if (a === "fresas") rafaga(ti + s.dur - 0.6, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#ffffff", "#ff8f86"], tipo: "estrella", vel: 1.2, g: -0.5, vida: 1.0, tam: 0.05 });
    }
    if (R.platillo === "tiramisu") {
      if (a === "bate") rafaga(ti + s.dur - 1.2, { origen: V3(BOWL.x, 1.3, BOWL.z), n: 24, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.0, g: -0.4, vida: 1.0, tam: 0.045 });
      if (a === "moja") for (let n = 0; n < 3; n++) rafaga(ti + n * 2.8 + 0.5, { origen: V3(PAN.x, 0.55, PAN.z), n: 10, colores: ["#3a1f10", "#6a3a1a"], tipo: "esfera", vel: 0.9, g: -6, vida: 0.5, tam: 0.03, arriba: 1.2 });
      if (a === "refri") rafaga(ti + 3.3, { origen: V3(BOWL.x, 2.0, BOWL.z + 1.0), n: 40, colores: ["#dff1ff", "#ffffff"], tipo: "estrella", vel: 1.2, g: -0.6, vida: 1.4, tam: 0.05 });
      if (a === "cacao") rafaga(ti + 0.6, { origen: V3(BOWL.x, 1.4, BOWL.z), n: 70, colores: ["#5a3220", "#7a4a30"], tipo: "cuadro", vel: 0.4, g: -4, vida: 1.2, tam: 0.02 });
      if (a === "cacao") rafaga(ti + 2.4, { origen: V3(BOWL.x, 1.4, BOWL.z), n: 70, colores: ["#5a3220", "#7a4a30"], tipo: "cuadro", vel: 0.4, g: -4, vida: 1.2, tam: 0.02 });
    }
    if (R.platillo === "lasana") {
      if (a === "sofrie") for (let n = 0; n < 3; n++) rafaga(ti + 1 + n * 2.4, { origen: V3(PAN.x, 0.45, PAN.z), n: 14, colores: ["#fff3c4", "#f2c14e"], tipo: "esfera", vel: 1.2, g: -6, vida: 0.6, tam: 0.025, arriba: 1.3 });
      if (a === "bechamel") rafaga(ti + 1.9, { origen: V3(PAN.x, 1.4, PAN.z), n: 50, colores: ["#ffffff", "#f6f0e2"], tipo: "esfera", vel: 0.6, g: -3, vida: 1.2, tam: 0.03 });
      if (a === "bechamel") rafaga(ti + 10.8, { origen: V3(PAN.x, 1.5, PAN.z), n: 30, colores: ["#8a5a2a", "#a0703a"], tipo: "cuadro", vel: 0.4, g: -5, vida: 0.9, tam: 0.02 });
      if (a === "queso") rafaga(ti + 1.6, { origen: V3(BOWL.x, 1.6, BOWL.z), n: 40, colores: ["#ffd75e", "#ffe48a"], tipo: "cuadro", vel: 0.8, g: -5, vida: 1.0, tam: 0.035 });
      if (a === "hornea") rafaga(ti + 4.6, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.2, vida: 1.4, tam: 0.07 });
      if (a === "reposa") rafaga(ti + s.dur - 0.8, { origen: V3(BOWL.x + 0.85, 0.8, BOWL.z + 0.95), n: 24, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.2, g: -0.5, vida: 1.0, tam: 0.045 });
    }
    if (R.platillo === "cerealgta") {
      if (a === "hook") rafaga(ti + 0.3, { origen: V3(1.45, 1.4, 0), n: 40, colores: ["#ff5fa2", "#3ec6d8", "#ffe36b"], tipo: "estrella", vel: 1.6, g: -0.5, vida: 1.4, tam: 0.05 });
      if (a === "prepara") rafaga(ti + 3.6, { origen: V3(BOWL.x, 1.2, BOWL.z), n: 24, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.1, g: -0.5, vida: 1.0, tam: 0.045 });
      if (a === "control") rafaga(ti + 1.0, { origen: V3(-0.1, 1.9, 0.6), n: 16, colores: COLS_CER, tipo: "cuadro", vel: 1.0, g: -5, vida: 0.7, tam: 0.03 });
    }
    if (R.platillo === "nachos") {
      if (a === "intro") [0.3, 1.7, 3.7].forEach((d0, n) => rafaga(ti + d0 + 0.4, { origen: V3([-1.75, -0.95, 0.75][n], 0.6, 1.0), n: 18, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.1, g: -0.5, vida: 0.9, tam: 0.045 }));
      if (a === "secreto") rafaga(ti + 0.4, { origen: V3(0, 3.4, 0.4), n: 40, colores: ["#ffffff", "#fff3b0", "#ff5fa2"], tipo: "estrella", vel: 1.6, g: -0.5, vida: 1.3, tam: 0.05 });
      if (a === "pico") rafaga(ti + s.dur - 1.2, { origen: V3(BOWL.x, 0.7, BOWL.z), n: 20, colores: ["#d9f27a", "#ffffff"], tipo: "esfera", vel: 1.1, g: -6, vida: 0.6, tam: 0.03, arriba: 1.2 });
      if (a === "capa") rafaga(ti + s.dur * 0.68, { origen: V3(BOWL.x, 1.6, BOWL.z), n: 40, colores: ["#ffcf3a", "#ffe48a"], tipo: "cuadro", vel: 0.8, g: -5, vida: 1.0, tam: 0.035 });
      if (a === "outro") rafaga(ti + 1.2, { origen: V3(1.45, 1.4, 0), n: 40, colores: ["#ff5fa2", "#3ec6d8", "#ffe36b"], tipo: "estrella", vel: 1.6, g: -0.5, vida: 1.4, tam: 0.05 });
    }
    if (R.platillo === "carneasada") {
      if (a === "calienta") rafaga(ti + s.dur * 0.6, { origen: V3(PAN.x + 0.1, 0.4, PAN.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.4, vida: 1.2, tam: 0.07 });
      if (a === "asa") for (let n = 0; n < 3; n++) rafaga(ti + 1 + n * 2.6, { origen: V3(PAN.x - 0.45, 0.45, PAN.z), n: 22, colores: ["#ffffff", "#e8e2d6"], tipo: "esfera", vel: 0.5, g: 1.3, vida: 1.5, tam: 0.08 });
      if (a === "cebollitas") rafaga(ti + 1.4, { origen: V3(PAN.x + 0.25, 1.3, PAN.z), n: 30, colores: ["#ffffff"], tipo: "cuadro", vel: 0.4, g: -5, vida: 0.9, tam: 0.025 });
      if (a === "pica") for (let n = 0; n < 4; n++) rafaga(ti + 1.5 + n * 0.9, { origen: V3(BOWL.x + 0.2 - n * 0.25, 0.4, BOWL.z), n: 8, colores: ["#8a4a28", "#b0573a"], tipo: "cuadro", vel: 1, g: -6, vida: 0.6, tam: 0.03 });
      if (a === "arma") rafaga(ti + s.dur - 1.5, { origen: V3(PLATE.x, 1.2, PLATE.z), n: 40, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.4, g: -0.5, vida: 1.2, tam: 0.05 });
    }
    if (R.platillo === "chilaquiles") {
      if (a === "corta") for (let n = 0; n < 3; n++) rafaga(ti + s.dur * [0.24, 0.51, 0.78][n], { origen: V3(PAN.x - 0.35, 0.4, PAN.z + 0.05), n: 10, colores: ["#f1dca0", "#e8c97e"], tipo: "cuadro", vel: 1, g: -6, vida: 0.6, tam: 0.03 });
      if (a === "frie") for (let n = 0; n < 3; n++) rafaga(ti + 1 + n * 2.2, { origen: V3(PAN.x, 0.45, PAN.z), n: 16, colores: ["#fff3c4", "#f2c14e"], tipo: "esfera", vel: 1.3, g: -6, vida: 0.6, tam: 0.025, arriba: 1.4 });
      if (a === "sofrie") for (let n = 0; n < 3; n++) rafaga(ti + 0.8 + n * 2.5, { origen: V3(PAN.x, 0.45, PAN.z), n: 16, colores: ["#a8281a", "#c94a2e"], tipo: "esfera", vel: 1.3, g: -6, vida: 0.6, tam: 0.03, arriba: 1.4 });
      if (a === "baña") rafaga(ti + 2.3, { origen: V3(PAN.x, 0.5, PAN.z), n: 26, colores: ["#a8281a", "#c94a2e"], tipo: "esfera", vel: 1.6, g: -7, vida: 0.7, tam: 0.04, arriba: 1.8 });
      if (a === "baña") rafaga(ti + s.dur - 1.2, { origen: V3(PAN.x, 1.0, PAN.z), n: 30, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.4, g: -0.5, vida: 1.2, tam: 0.05 });
      if (a === "escurre") rafaga(ti + 3.6, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 20, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.0, g: -0.5, vida: 1.0, tam: 0.04 });
    }
    if (R.platillo === "ratatouille") {
      if (a === "base") rafaga(ti + 0.4, { origen: V3(BOWL.x, 0.6, BOWL.z), n: 24, colores: ["#c8361f", "#e0573a"], tipo: "esfera", vel: 1.4, g: -7, vida: 0.7, tam: 0.04, arriba: 1.6 });
      if (a === "rodajas") for (let n = 0; n < 4; n++) rafaga(ti + 0.5 + (n + 0.5) * (s.dur - 1.0) / 4, { origen: V3(BOWL.x + 0.2, 0.4, BOWL.z - 0.55 + n * 0.37), n: 10, colores: [["#f1ead0", "#e3efc0", "#f0644a", "#fbf0b0"][n]], tipo: "cuadro", vel: 1, g: -6, vida: 0.6, tam: 0.03 });
      if (a === "espiral") rafaga(ti + s.dur - 0.6, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.4, g: -0.5, vida: 1.2, tam: 0.05 });
      if (a === "aliña") rafaga(ti + 0.8, { origen: V3(BOWL.x, 1.2, BOWL.z), n: 30, colores: ["#d9c23a", "#f2e27a"], tipo: "esfera", vel: 1.2, g: -6, vida: 0.8, tam: 0.035, arriba: 1 });
      if (a === "destapa") rafaga(ti + 1.0, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#ffffff"], tipo: "esfera", vel: 0.6, g: 1.2, vida: 1.4, tam: 0.07 });
    }
    if (R.platillo === "roles") {
      if (a === "activa") rafaga(ti + s.dur * 0.6, { origen: V3(BOWL.x + 1.25, 0.9, BOWL.z + 0.35), n: 24, colores: ["#fff7e0", "#f4e6c4"], tipo: "esfera", vel: 0.4, g: 0.8, vida: 1.6, tam: 0.05 });
      if (a === "amasa") for (let n = 0; n < 3; n++) rafaga(ti + 0.8 + n * 1.6, { origen: V3(BOWL.x, 0.7, BOWL.z), n: 18, colores: ["#ffffff", "#f6f0e2"], tipo: "esfera", vel: 1.0, g: -1, vida: 1.0, tam: 0.05, arriba: 1 });
      if (a === "reposa") rafaga(ti + s.dur * 0.5, { origen: V3(BOWL.x, 1.2, BOWL.z), n: 24, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.2, g: -0.4, vida: 1.2, tam: 0.05 });
      if (a === "unta") rafaga(ti + 2.6, { origen: V3(BOWL.x, 1.6, BOWL.z), n: 40, colores: ["#8a4b1f", "#b0703a"], tipo: "cuadro", vel: 0.6, g: -5, vida: 1.0, tam: 0.03 });
      if (a === "hilo") rafaga(ti + s.dur - 0.5, { origen: V3(BOWL.x, 0.8, BOWL.z), n: 30, colores: ["#ffffff", "#fff3b0"], tipo: "estrella", vel: 1.4, g: -0.5, vida: 1.2, tam: 0.05 });
      if (a === "glasea") rafaga(ti + 2.6, { origen: V3(BOWL.x, 1.0, BOWL.z), n: 30, colores: ["#fffaf0", "#ffffff"], tipo: "esfera", vel: 1.2, g: -5, vida: 0.8, tam: 0.04, arriba: 1.5 });
    }
    if (a === "flip") rafaga(ti + s.dur * 0.5, { origen: V3(PAN.x, 0.4, PAN.z), n: 26, colores: ["#fff3d6", "#efc77a"], tipo: "esfera", vel: 1.8, g: -6, vida: 0.9, tam: 0.04, arriba: 2 });
  });
  // salpicaduras al caer cada ingrediente
  caidas.forEach(c => {
    const s = pasos[c.j], tl = s.inicio + 0.25 + c.n * 0.5 + 0.55;
    const col = c.ing === "avena" ? ["#f4ead2", "#ffffff"] : [s.color || P.batter, "#fff3c4"];
    const DO = c.sarten ? PAN : BOWL;
    rafaga(tl, { origen: V3(DO.x, c.sarten ? 0.35 : 0.7, DO.z), n: c.ing === "avena" ? 40 : 26, colores: col, tipo: "esfera", vel: c.ing === "avena" ? 1.2 : 2.2, g: c.ing === "avena" ? -0.6 : -7, vida: c.ing === "avena" ? 1.4 : 0.8, tam: c.ing === "avena" ? 0.07 : 0.045, arriba: 2.4 });
    if (c.ing === "huevo") rafaga(tl - 0.12, { origen: V3(BOWL.x + c.lado * 0.1, 1.15, BOWL.z), n: 10, colores: ["#fff4e2"], tipo: "cuadro", vel: 1.5, g: -6, vida: 0.7, tam: 0.05, arriba: 1.5 });
  });
}
armarRafagas();

function particulas(t) {
  let k = 0;
  for (const r of RAFAGAS) {
    const e = t - r.t;
    if (e < 0 || e > r.vida) continue;
    for (let i = 0; i < r.n && k < POOL.length; i++, k++) {
      const m = POOL[k], h1 = hash(i + r.t * 13), h2 = hash(i * 3.1 + r.t), h3 = hash(i * 7.7 + r.t * 2);
      const th = h1 * Math.PI * 2, ph = Math.acos(2 * h2 - 1), v = r.vel * (0.4 + 0.6 * h3);
      const d = V3(Math.sin(ph) * Math.cos(th), Math.abs(Math.cos(ph)) + (r.arriba ? r.arriba * 0.3 : 0), Math.sin(ph) * Math.sin(th)).multiplyScalar(v);
      m.geometry = geoPart[r.tipo];
      m.position.set(r.origen.x + d.x * e, r.origen.y + d.y * e + 0.5 * r.g * e * e, r.origen.z + d.z * e);
      const vida = e / r.vida, tam = r.tam * (r.tipo === "estrella" ? Math.sin(vida * Math.PI) * 1.6 : 1 - vida * 0.4);
      m.scale.setScalar(Math.max(tam, 0.001));
      m.rotation.set(e * 6 * h1, e * 5 * h2, e * 4 * h3);
      m.material.color.set(r.colores[i % r.colores.length]);
      m.material.opacity = 1 - Math.pow(vida, 3);
      m.visible = true;
    }
  }
  for (; k < POOL.length; k++) POOL[k].visible = false;
}

// vapor
const vapor = [];
for (let i = 0; i < 8; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })); scene.add(v); vapor.push(v); }

// ---------- capa 2D: subtítulos, título, rebobinar ----------
const ov = document.getElementById("ov");
ov.innerHTML = `
<defs>
  <pattern id="rayas" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="#fff1d2"/><rect y="20" width="40" height="20" fill="#7a4521"/></pattern>
  <radialGradient id="vineta" cx="50%" cy="45%" r="75%"><stop offset="65%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".25"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#vineta)"/>
<g id="rew" opacity="0">
  <rect width="${W}" height="${H}" fill="#0b1a33" opacity=".35"/>
  ${[...Array(48)].map((_, i) => `<rect y="${i * 40}" width="${W}" height="6" fill="#fff" opacity=".07"/>`).join("")}
  <rect id="rewBarra" width="${W}" height="70" fill="#fff" opacity=".18"/>
  <g transform="translate(540,960)"><rect x="-150" y="-80" width="300" height="160" rx="80" fill="#000" opacity=".55"/><path d="M-10,-45 L-90,0 L-10,45Z M80,-45 L0,0 L80,45Z" fill="#fff"/></g>
</g>
<g id="flash" opacity="0"><rect width="${W}" height="${H}" fill="#fff"/></g>
<g id="titulo" opacity="0">
  ${R.titulo.map((l, i) => `<text y="${i * 150}" text-anchor="middle" font-family="Luckiest" font-size="${l.length > 9 ? 128 : 160}" fill="#3a1f0d" stroke="#3a1f0d" stroke-width="44" stroke-linejoin="round" transform="translate(10,14)">${l}</text>
  <text y="${i * 150}" text-anchor="middle" font-family="Luckiest" font-size="${l.length > 9 ? 128 : 160}" fill="url(#rayas)" stroke="#3a1f0d" stroke-width="14" stroke-linejoin="round" paint-order="stroke">${l}</text>`).join("")}
</g>
<g id="cta" opacity="0">
  <path d="M-200,-120 h400 a60,60 0 0 1 60,60 v110 a60,60 0 0 1 -60,60 h-230 l-80,70 l10,-70 h-100 a60,60 0 0 1 -60,-60 v-110 a60,60 0 0 1 60,-60z" fill="#fff" stroke="#3a1f0d" stroke-width="14" stroke-linejoin="round"/>
  <circle cx="-110" cy="-5" r="26" fill="#ff5d73"/><circle cx="0" cy="-5" r="26" fill="${P.amarillo}"/><circle cx="110" cy="-5" r="26" fill="#3bceac"/>
</g>
<g id="subs"></g>
<text x="540" y="1840" text-anchor="middle" font-family="Baloo" font-weight="800" font-size="40" fill="#fff" opacity=".6">${R.usuario || ""}</text>`;
const $ = id => document.getElementById(id);
const set = (id, a) => { const el = $(id); for (const k in a) el.setAttribute(k, a[k]); };

const subs = [];
pasos.forEach(p => {
  const words = (p.texto || "").split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const grupos = [];
  for (let i = 0; i < words.length;) { let n = Math.min(3, words.length - i); if (words.length - i - n === 1) n = Math.max(2, n - 1); grupos.push(words.slice(i, i + n)); i += n; }
  const peso = g => g.reduce((s, w) => s + w.length + 3, 0), total = grupos.reduce((s, g) => s + peso(g), 0);
  let t = p.inicio + 0.1;
  grupos.forEach(g => {
    const d = (p.dur - 0.15) * peso(g) / total, wt = []; let tw = t;
    g.forEach(w => { const dw = d * (w.length + 3) / peso(g); wt.push({ w, t: tw, d: dw }); tw += dw; });
    subs.push({ ini: t, fin: t + d, palabras: wt }); t += d;
  });
});
let subActual = -1;
function renderSubs(t, accion) {
  const idx = subs.findIndex(s => t >= s.ini && t < s.fin), g = $("subs");
  if (idx !== subActual) {
    subActual = idx; g.innerHTML = "";
    if (idx < 0) return;
    const txt = subs[idx].palabras.map(x => x.w.toUpperCase());
    const lineas = txt.join(" ").length > 13 && txt.length > 1 ? [txt.slice(0, Math.ceil(txt.length / 2)), txt.slice(Math.ceil(txt.length / 2))] : [txt];
    let k = 0;
    lineas.forEach((ln, li) => {
      const y = (li - (lineas.length - 1) / 2) * 100;
      const mk = (cls, extra) => `<text class="${cls}" y="${y}" text-anchor="middle" font-family="Baloo" font-weight="800" font-size="96" letter-spacing="-1" ${extra}>${ln.map((w, j) => `<tspan data-k="${k + j}">${w}${j < ln.length - 1 ? " " : ""}</tspan>`).join("")}</text>`;
      g.insertAdjacentHTML("beforeend", mk("sombra", `fill="#000" stroke="#000" stroke-width="30" stroke-linejoin="round" transform="translate(0,8)"`));
      g.insertAdjacentHTML("beforeend", mk("frente", `fill="#fff" stroke="#000" stroke-width="16" stroke-linejoin="round" paint-order="stroke"`));
      k += ln.length;
    });
  }
  if (idx < 0) return;
  const s = subs[idx], pop = easeOutBack((t - s.ini) / 0.16);
  const y = ["outro", "intro", "presenta"].includes(accion) ? 1560 : 330;
  g.setAttribute("transform", `translate(540,${y}) rotate(${Math.sin(t * 5) * 1.2}) scale(${lerp(0.6, 1, pop)})`);
  g.querySelectorAll(".frente tspan").forEach(ts => { const w = s.palabras[+ts.dataset.k]; ts.setAttribute("fill", t >= w.t && t < w.t + w.d ? P.amarillo : "#fff"); });
}

// ---------- estado en el tiempo t ----------
const tmpA = V3(0, 0, 0), tmpB = V3(0, 0, 0);
// pose de los brazos para un paso (se mezcla con la del paso anterior para que no brinque)
function poseBrazos(p, u, k, t) {
  const enSarten = p.destino === "sarten" && ["drop", "stir"].includes(p.accion);
  const conCuchara = (["drop", "stir"].includes(p.accion) && !enSarten) || ["arma", "baña", "salsa", "lava", "alina", "remoja", "marina"].includes(p.accion), conEspatula = ["pour", "flip", "dora", "pina", "tortillas", "pasa", "emulsiona"].includes(p.accion) || enSarten;
  let aL = 0.25, aR = -0.25, fL = 0, fR = 0;
  if (["intro", "outro", "hook"].includes(p.accion)) { aR = -2.5 + Math.sin(t * 10) * 0.35; }
  if (p.accion === "presenta") { aL = 0.4; aR = -2.2 + Math.sin(t * 6) * 0.2; fR = -0.4; }
  if (conCuchara) { aL = 1.15; fL = 0.5; }
  if (p.accion === "stir" && !enSarten) { aL = 1.15 + Math.sin(u * 11) * 0.12; fL = 0.5 + Math.cos(u * 11) * 0.35; }
  if (p.accion === "drop") aL += Math.sin(u * 14) * 0.08 * (u > 0.8 ? 1 : 0);
  if (conEspatula) { aR = -1.1; fR = 0.6; }
  if (p.accion === "stir" && enSarten) { aR = -1.1 - Math.sin(u * 11) * 0.12; fR = 0.6 + Math.cos(u * 11) * 0.35; }
  if (p.accion === "arma") { aL = 1.1 + Math.abs(Math.sin(u * 6)) * 0.3; fL = 0.5; }
  if (p.accion === "baña") { aL = 1.3 + Math.sin(u * 8) * 0.1; fL = 0.7; }
  if (p.accion === "queso") { aL = 1.7 + Math.sin(t * 22) * 0.12; aR = -1.7 - Math.sin(t * 22 + 1) * 0.12; fL = fR = 0.5; }
  if (p.accion === "hornea") { aR = -2.3 + Math.sin(t * 8) * 0.2; }
  if (p.accion === "extiende") { const v = clamp((u - 0.5) / 1.1); aL = 1.2 + Math.sin(Math.PI * v) * 1.3; aR = -1.2 - Math.sin(Math.PI * v) * 1.3; fL = fR = 0.4; }
  if (p.accion === "ralla") { aL = 1.6 + Math.sin(u * 14) * 0.15; fL = 0.4; }
  if (["pasa", "emulsiona", "tip"].includes(p.accion)) { aR = -1.1 - Math.sin(u * 10) * 0.15; fR = 0.6 + Math.cos(u * 10) * 0.25; }
  if (["remoja", "marina"].includes(p.accion)) { aL = 1.15 + Math.sin(u * 8) * 0.12; fL = 0.5; }
  if (["dora", "pina", "tortillas"].includes(p.accion)) { aR = -1.1 - Math.sin(u * 6) * 0.1; fR = 0.6; }
  if (["lava", "alina"].includes(p.accion)) { aL = 1.15 + Math.sin(u * 11) * 0.12; fL = 0.5 + Math.cos(u * 11) * 0.35; }
  if (p.accion === "cocina") { aR = -1.4 + Math.sin(t * 6) * 0.15; fR = 0.4; }
  if (["corta", "rebana"].includes(p.accion)) { aR = -1.2 - Math.abs(Math.sin(u * 14)) * 0.4; fR = 0.5; }
  if (["esterilla", "extiende", "relleno"].includes(p.accion)) { aL = 1.1 + Math.sin(u * 6) * 0.15; aR = -1.1 - Math.sin(u * 6) * 0.15; fL = fR = 0.5; }
  if (p.accion === "enrolla") { aL = 1.3 + Math.sin(u * 4) * 0.2; aR = -1.3 - Math.sin(u * 4) * 0.2; fL = fR = 0.7; }
  if (ESRATA) {
    if (p.accion === "precalienta") { aR = -1.6 + Math.sin(u * 3) * 0.1; fR = 0.3; }
    if (p.accion === "base") { aL = 1.25 + Math.sin(u * 9) * 0.12; fL = 0.6 + Math.cos(u * 9) * 0.3; }
    if (p.accion === "rodajas") { aR = -1.2 - Math.abs(Math.sin(u * 12)) * 0.4; fR = 0.5; aL = 1.0; fL = 0.4; }
    if (p.accion === "espiral") { aL = 1.1 + Math.abs(Math.sin(u * 7)) * 0.3; fL = 0.5; }
    if (p.accion === "aliña") { aL = 1.2 + Math.sin(u * 10) * 0.15; fL = 0.5 + Math.cos(u * 10) * 0.3; }
    if (["tapa", "destapa"].includes(p.accion)) { aL = 1.3; aR = -1.3; fL = fR = 0.6; }
  }
  if (ESGAL) {
    if (p.accion === "sobras") { const ph = (u % 1.8) / 1.8, sube = Math.sin(Math.PI * clamp((ph - 0.15) / 0.55)); aL = 0.35; fL = -1.2; aR = 0.4 + sube * 0.25; fR = -1.0 - sube * 1.1; }
    if (p.accion === "galletas") { if (u < 4) { aL = 1.0 + Math.sin(t * 14) * 0.05; fL = -0.5; aR = 0.6; fR = -0.9 + Math.sin(t * 14) * 0.05; } else { aL = 1.15 + Math.abs(Math.sin(u * 3)) * 0.3; fL = 0.5 - Math.sin(u * 3) * 0.4; } }
    if (p.accion === "crema") { const lev = clamp((u - (p.dur - 1.5)) / 0.5); aL = 1.15 + Math.sin(u * 12) * 0.12 * (1 - lev) + lev * 0.45; fL = (0.5 + Math.cos(u * 12) * 0.35) * (1 - lev) + lev * 0.1; }
  }
  if (ESBOLO) {
    if (p.accion === "sobras") { const ph = (u % 1.8) / 1.8, sube = Math.sin(Math.PI * clamp((ph - 0.15) / 0.55)); aL = 0.35; fL = -1.2; aR = 0.4 + sube * 0.25; fR = -1.0 - sube * 1.1; }
    if (p.accion === "sofrito") { aR = -1.05 - Math.sin(u * 8) * 0.14; fR = 0.75 + Math.cos(u * 8) * 0.3; }
    if (p.accion === "carne") { const quieto = u > 1.2 && u < 4.5; aR = quieto ? -0.4 : -1.05; fR = quieto ? 0 : 0.7 + Math.abs(Math.sin(u * 7)) * 0.45; }
    if (["leche", "tomate"].includes(p.accion)) { const v = u > 0.4 && u < (p.accion === "leche" ? 3.2 : 2.8); aR = v ? -1.2 : -1.05 - Math.sin(u * 6) * 0.12; fR = v ? -0.5 : 0.75 + Math.cos(u * 6) * 0.25; }
    if (p.accion === "lento") { const v = u > 1 && u < 2.6; aR = v ? -1.3 : -0.3; fR = v ? -0.3 : 0; aL = -0.3; fL = -1.2; }
    if (p.accion === "cuecepasta") { const v = u > 2.5 && u < 4.5; aR = v ? -1.2 : -1.05 - Math.sin(u * 4) * 0.1; fR = v ? -0.5 : 0.75; }
    if (p.accion === "juntapasta") { aR = -1.05 - Math.sin(u * 6) * 0.16; fR = 0.75 + Math.cos(u * 6) * 0.3; }
  }
  if (ESDIV) {
    if (p.accion === "sobras") { const ph = (u % 1.8) / 1.8, sube = Math.sin(Math.PI * clamp((ph - 0.15) / 0.55)); aL = 0.35; fL = -1.2; aR = 0.4 + sube * 0.25; fR = -1.0 - sube * 1.1; }
    if (["salsaroja", "salsaverde"].includes(p.accion)) { aR = -1.4; fR = 0.5; aL = 1.1; fL = 0.4; }
    if (p.accion === "tortillas") { const c = (u % 1.4) / 1.4, baja = Math.sin(Math.PI * clamp(c / 0.6)); aR = -1.2 + baja * 0.3; fR = -0.4; }
    if (p.accion === "frijoles") { aR = -1.1 - Math.sin(u * 8) * 0.12; fR = 0.6 + Math.cos(u * 8) * 0.3; }
    if (p.accion === "huevo") { const v = [2.4, 6.6].some(t0 => u > t0 - 0.6 && u < t0 + 1.4); aR = v ? -1.2 : -0.3; fR = v ? -0.5 : 0; }
    if (p.accion === "bana") { const c = (u % 1.3) / 1.3, sube = Math.sin(Math.PI * c); aR = -1.05 - sube * 0.25; fR = 0.5 - sube * 0.3; aL = 1.0; fL = -0.3; }
    if (p.accion === "armadiv") { aL = 1.1 + Math.abs(Math.sin(u * 4)) * 0.25; fL = -0.3; }
  }
  if (ESTAM) {
    if (p.accion === "sobras") { const ph = (u % 1.8) / 1.8, sube = Math.sin(Math.PI * clamp((ph - 0.15) / 0.55)); aL = 0.35; fL = -1.2; aR = 0.4 + sube * 0.25; fR = -1.0 - sube * 1.1; }
    if (p.accion === "hojas") { const c = (u % 1.2) / 1.2; aL = 1.05 + Math.sin(Math.PI * c) * 0.2; fL = -0.4 - Math.sin(Math.PI * c) * 0.4; }
    if (p.accion === "salsa") { aR = -1.4; fR = 0.5; aL = 1.1; fL = 0.4; }
    if (["manteca", "masa"].includes(p.accion)) { aL = 1.15 + Math.sin(u * 12) * 0.12; fL = 0.5 + Math.cos(u * 12) * 0.35; }
    if (p.accion === "flota") { const tira = clamp((u - 1.6) / 0.5); aL = 0.6 + tira * 0.5; fL = -1.1 + tira * 0.6; aR = -0.3; }
    if (p.accion === "arma") { aL = 1.1 + Math.sin(u * 6) * 0.15; aR = -1.1 - Math.sin(u * 6) * 0.15; fL = fR = 0.5; }
    if (p.accion === "vaporera") { const c = (u % 0.7) / 0.7; aR = -1.1 - Math.sin(Math.PI * c) * 0.2; fR = -0.3 - Math.sin(Math.PI * c) * 0.3; }
    if (p.accion === "cuece") { const e = Math.sin(Math.PI * clamp((u - 0.2) / 1.4)); aL = 0.35 + e * 0.8; aR = -0.35 - e * 0.8; fL = fR = -e * 0.8; }
  }
  if (ESAZT) {
    if (p.accion === "sobras") { const ph = (u % 1.8) / 1.8, sube = Math.sin(Math.PI * clamp((ph - 0.15) / 0.55)); aL = 0.35; fL = -1.2; aR = 0.4 + sube * 0.25; fR = -1.0 - sube * 1.1; }
    if (p.accion === "precalienta") { aR = -1.6 + Math.sin(u * 3) * 0.1; fR = 0.3; }
    if (p.accion === "asa") { const c = (u % 2) / 2, g = Math.sin(Math.PI * clamp((c - 0.6) / 0.4)); aR = -1.1 - g * 0.3; fR = 0.6 - g * 0.3; }
    if (p.accion === "suda") { if (u < 4) { aL = 0.9 + Math.sin(u * 2) * 0.1; fL = -0.6; } else { aR = -0.3; aL = 1.0; fL = -0.3; } }
    if (p.accion === "rajas") { aR = -1.1 - Math.sin(u * 8) * 0.12; fR = 0.6 + Math.cos(u * 8) * 0.3; }
    if (p.accion === "salsa") { aR = -1.4; fR = 0.5; aL = 1.1; fL = 0.4; }
    if (p.accion === "tortillas") { const c = (u % 1.4) / 1.4, baja = Math.sin(Math.PI * clamp(c / 0.6)); aR = -1.2 + baja * 0.3; fR = -0.4; }
    if (p.accion === "arma") { const c = ((u - 1.4) % 3.3 + 3.3) % 3.3, lam = u > 1.4 && c < 0.6; aL = 1.0 + (lam ? Math.sin(Math.PI * c / 0.6) * 0.2 : 0); fL = lam ? -0.4 - Math.sin(Math.PI * c / 0.6) * 0.5 : -0.3; aR = 0.6; fR = -0.9 - Math.abs(Math.sin(u * 4)) * 0.3; }
  }
  if (ESPOZ) {
    if (p.accion === "cuecemaiz") { const ver = u < 2.6; aR = ver ? -1.2 : -1.05 - Math.sin(u * 4) * 0.12; fR = ver ? -0.5 : 0.75 + Math.cos(u * 4) * 0.25; }
    if (p.accion === "cuececarne") { const c = (u % 1.6) / 1.6, sube = Math.sin(Math.PI * clamp((c - 0.5) / 0.5)); aR = -1.05 - sube * 0.35; fR = 0.6 - sube * 0.3; }
    if (p.accion === "remoja") { aL = 1.15 + Math.sin(u * 4) * 0.12; fL = 0.5; }
    if (p.accion === "licua") { aR = -1.4; fR = 0.5; aL = 1.1; fL = 0.4; }
    if (p.accion === "cuela") { aL = 1.0; fL = -0.5 + Math.sin(t * 8) * 0.05; aR = 0.45; fR = -0.9 - Math.abs(Math.sin(u * 3)) * 0.2; }
    if (p.accion === "friesalsa") { aR = -1.1 - Math.sin(u * 8) * 0.12; fR = 0.6 + Math.cos(u * 8) * 0.3; }
    if (p.accion === "junta") { const v = u > 0.4 && u < 6; aR = v ? -1.2 : -0.3; fR = v ? -0.5 : 0; }
    if (p.accion === "hierve") { const fr = Math.sin(t * 22) * 0.06; aL = -0.1 + fr; aR = -0.9 - fr; fL = fR = -1.15; }
  }
  if (ESMOST) {
    if (p.accion === "sobras") { const ph = (u % 1.8) / 1.8, sube = Math.sin(Math.PI * clamp((ph - 0.15) / 0.55)); aL = 0.35; fL = -1.2; aR = 0.4 + sube * 0.25; fR = -1.0 - sube * 1.1; }
    if (p.accion === "precalienta") { aR = -1.6 + Math.sin(u * 3) * 0.1; fR = 0.3; }
    if (p.accion === "claras") { const vol = clamp((u - (p.dur - 1.8)) / 0.4) * (1 - clamp((u - (p.dur - 0.5)) / 0.4)); aL = 1.15 + Math.sin(u * 12) * 0.12 * (1 - vol); fL = (0.5 + Math.cos(u * 12) * 0.35) * (1 - vol); if (vol > 0) { aL = 1.3; fL = -0.3; aR = -0.3; } }
    if (p.accion === "relleno") { if (u > 0.4 && u < 3.2) { aL = 1.0; fL = -0.5; } else if (u < 6.5) { aL = 1.15 + Math.sin(u * 12) * 0.12; fL = 0.5 + Math.cos(u * 12) * 0.35; } else { aL = 1.15 + Math.abs(Math.sin(u * 3)) * 0.3; fL = 0.5 - Math.sin(u * 3) * 0.4; } }
    if (p.accion === "envuelve") { aL = 1.15 + Math.abs(Math.sin(u * 3)) * 0.3; fL = 0.5 - Math.sin(u * 3) * 0.4; }
    if (["molde", "unta"].includes(p.accion)) { aL = 1.15 + Math.sin(u * 5) * 0.15; fL = -0.2 + Math.cos(u * 5) * 0.3; }
    if (p.accion === "fresas") { const c = (u % 0.6) / 0.6; aL = 1.0 + Math.sin(Math.PI * c) * 0.2; fL = -0.4 - Math.sin(Math.PI * c) * 0.5; }
    if (p.accion === "enfria") { aL = -0.3; aR = 0.3; fL = fR = -1.2; }
  }
  if (ESTIRA) {
    if (["hook", "outro"].includes(p.accion)) { aL = 1.5 + Math.sin(t * 12) * 0.05; aR = -1.5 - Math.sin(t * 12 + 1) * 0.05; fL = fR = 0.9; }
    if (p.accion === "cafe") { const v = u > 0.4 && u < 3.8; aR = v ? -1.2 : -0.3; fR = v ? -0.5 : 0; }
    if (p.accion === "bate") { const lev = clamp((u - (p.dur - 1.5)) / 0.5); aL = 1.15 + Math.sin(u * 12) * 0.12 * (1 - lev) + lev * 0.45; fL = (0.5 + Math.cos(u * 12) * 0.35) * (1 - lev) + lev * 0.1; }
    if (p.accion === "mascarpone") { aL = 1.15 + Math.sin(u * 4) * 0.1; fL = 0.5 + Math.cos(u * 4) * 0.25; }
    if (p.accion === "envuelve") { aL = 1.15 + Math.abs(Math.sin(u * 3)) * 0.3; fL = 0.5 - Math.sin(u * 3) * 0.4; }
    if (p.accion === "moja") { const c = (u % 2.8) / 2.8, dip = Math.max(Math.sin(Math.PI * clamp(c / 0.35)), Math.sin(Math.PI * clamp((c - 0.45) / 0.35))); aR = -1.25 + dip * 0.3; fR = -0.45; }
    if (p.accion === "capa") { const sol = u < 2.9, c = (u % 0.65) / 0.65; aL = sol ? 1.0 + Math.sin(Math.PI * c) * 0.2 : 1.15 + Math.sin(u * 7) * 0.12; fL = sol ? -0.4 - Math.sin(Math.PI * c) * 0.5 : 0.5 + Math.cos(u * 7) * 0.3; }
    if (p.accion === "refri") { const e = Math.sin(Math.PI * clamp((u - 2.0) / 1.6)); aL = 0.35 + e * 0.55; aR = -0.35 - e * 0.55; fL = fR = -e * 0.9; }
    if (p.accion === "cacao") { aL = 1.1; fL = -0.45 + Math.sin(t * 25) * 0.06; }
  }
  if (ESLASANA) {
    if (p.accion === "sobras") {
      const ph = (u % 1.8) / 1.8, sube = Math.sin(Math.PI * clamp((ph - 0.15) / 0.55));
      aL = 0.35; fL = -1.2; aR = 0.4 + sube * 0.25; fR = -1.0 - sube * 1.1;
    }
    if (p.accion === "sofrie") { aR = -1.05 - Math.sin(u * 9) * 0.14; fR = 0.75 + Math.cos(u * 9) * 0.3; aL = 0.35; fL = 0.2; }
    if (p.accion === "carne") { aR = -1.05; fR = 0.7 + Math.abs(Math.sin(u * 7)) * 0.45; aL = 0.35; fL = 0.2; }
    if (p.accion === "salsa") { const vierte = u < 2.6; aR = vierte ? -1.2 : -1.05 - Math.sin(u * 6) * 0.12; fR = vierte ? -0.5 : 0.75 + Math.cos(u * 6) * 0.25; aL = 0.35; fL = 0.2; }
    if (p.accion === "bechamel") { const vl = [4.8, 6.6, 8.4].some(t0 => u > t0 - 0.35 && u < t0 + 1.15); aR = vl ? -1.2 : -1.0 - Math.sin(u * 10) * 0.12; fR = vl ? -0.5 : 0.8 + Math.cos(u * 10) * 0.28; aL = 0.35; fL = 0.2; }
    if (p.accion === "precalienta") { aR = -1.6 + Math.sin(u * 3) * 0.1; fR = 0.3; }
    if (p.accion === "arma") { const c = (u - 1.4) % 3.3, lam = u > 1.4 && c < 0.7; aL = 1.0 + (lam ? Math.sin(Math.PI * c / 0.7) * 0.2 : 0); fL = lam ? -0.4 - Math.sin(Math.PI * c / 0.7) * 0.5 : -0.3; aR = 0.6; fR = -0.9 - Math.abs(Math.sin(u * 4)) * 0.3; }
    if (p.accion === "queso") { aL = 1.1 + Math.sin(t * 14) * 0.08; fL = -0.5; aR = u < 1.4 ? 0.6 : -0.25; fR = u < 1.4 ? -0.9 : 0; }
    if (p.accion === "hornea") { const lev = clamp((u - 3.6) / 0.8) * (1 - clamp((u - 5) / 0.6)); aL = 0.3 + lev * 1.0; aR = -0.3 - lev * 1.0; fL = fR = 0.3 + lev * 0.5; }
    if (p.accion === "reposa") { aL = -0.3; aR = 0.3; fL = fR = -1.2; }
  }
  if (ESCEREAL) {
    if (["hook", "juega", "control", "outro"].includes(p.accion)) { aL = 1.5 + Math.sin(t * 12) * 0.05; aR = -1.5 - Math.sin(t * 12 + 1) * 0.05; fL = fR = 0.9; }
    if (p.accion === "control") { aL = 1.2 + Math.abs(Math.sin(u * 4)) * 0.4; fL = 0.5; }
    if (p.accion === "prepara" || p.accion === "leche") { aR = -1.3; fR = 0.5; aL = 0.25; fL = 0; }
  }
  if (ESNACHOS) {
    if (p.accion === "precalienta") { aR = -1.6 + Math.sin(u * 3) * 0.1; fR = 0.3; }
    if (p.accion === "pico") { aR = -1.2 - Math.abs(Math.sin(u * 14)) * 0.4; fR = 0.5; aL = 1.0; fL = 0.4; }
    if (p.accion === "guacamole") { aL = 1.2 + Math.sin(u * 7) * 0.15; fL = 0.5 + Math.cos(u * 7) * 0.3; }
    if (p.accion === "capa") { aL = 1.1 + Math.abs(Math.sin(u * 6)) * 0.3; fL = 0.5; }
    if (p.accion === "secreto") { aR = -2.5 + Math.sin(t * 10) * 0.35; }
    if (p.accion === "outro") { aL = 1.6 + Math.sin(t * 10) * 0.1; aR = -1.6 - Math.sin(t * 10) * 0.1; fL = fR = 0.6; }
  }
  if (ESCARNE) {
    if (["asa", "cebollitas", "tortillas"].includes(p.accion)) { aR = -1.1 - Math.sin(u * 5) * 0.12; fR = 0.6; aL = 0.25; fL = 0; }
    if (p.accion === "calienta") { aR = -1.5 + Math.sin(u * 3) * 0.1; fR = 0.4; }
    if (p.accion === "pica") { aR = -1.2 - Math.abs(Math.sin(u * 14)) * 0.4; fR = 0.5; aL = 1.0; fL = 0.4; }
    if (p.accion === "reposa") { aR = -2.2 + Math.sin(t * 4) * 0.15; aL = 0.25; }
  }
  if (ESCHILA) {
    if (["frie", "sofrie"].includes(p.accion)) { aR = -1.1 - Math.sin(u * 8) * 0.12; fR = 0.6 + Math.cos(u * 8) * 0.3; aL = 0.25; fL = 0; }
    if (p.accion === "baña") { aL = 0.25; fL = 0; aR = u < 3.5 ? -1.3 : -1.1 - Math.sin(u * 9) * 0.15; fR = 0.6 + (u < 3.5 ? 0 : Math.cos(u * 9) * 0.3); }
    if (p.accion === "escurre") { aL = 1.2; fL = 0.4; aR = u > 3 && u < 6 ? -1.6 + Math.sin(t * 20) * 0.08 : -0.25; fR = 0.3; }
    if (p.accion === "hierve") { aL = 1.15 + Math.sin(u * 5) * 0.1; fL = 0.5; }
    if (p.accion === "licua") { aR = -1.4; fR = 0.5; aL = 1.1; fL = 0.4; }
  }
  if (ESROLES) {
    if (p.accion === "activa") { aL = 1.2 + Math.sin(u * 3) * 0.1; fL = 0.3; aR = -0.6; }
    if (p.accion === "amasa") { const v = Math.abs(Math.sin(u * 5)); aL = 1.1 + v * 0.4; aR = -1.1 - v * 0.4; fL = fR = 0.6 + v * 0.3; }
    if (p.accion === "reposa") { aR = -2.3 + Math.sin(t * 5) * 0.15; }
    if (p.accion === "estira") { const v = Math.sin(u * 3.2); aL = 1.2 + v * 0.15; aR = -1.2 - v * 0.15; fL = fR = 0.7 + v * 0.35; }
    if (["unta", "glasea"].includes(p.accion)) { aL = 1.2 + Math.sin(u * 9) * 0.12; fL = 0.5 + Math.cos(u * 9) * 0.3; }
    if (p.accion === "hilo") { const v = Math.abs(Math.sin(u * 4)); aL = 1.3 + v * 0.3; aR = -1.3 - v * 0.3; fL = fR = 0.6; }
    if (p.accion === "acomoda") { aL = 1.1 + Math.abs(Math.sin(u * 6)) * 0.3; fL = 0.5; }
  }
  if (p.accion === "salsa" && !ESLASANA && !ESAZT && !ESTAM) { aL = 1.25 + Math.sin(u * 9) * 0.12; fL = 0.6 + Math.cos(u * 9) * 0.3; }
  if (p.accion === "flip" && k > 0.42 && k < 0.6) aR = -1.1 - Math.sin((k - 0.42) / 0.18 * Math.PI) * 0.6;
  if (p.accion === "serve") { aL = 2.4 + Math.sin(t * 9) * 0.25; aR = -2.4 - Math.sin(t * 9) * 0.25; }
  return { aL, aR, fL, fR, conCuchara, conEspatula };
}

function renderAt(t) {
  t = clamp(t, 0, DURACION - 1e-3);
  const { i, p, u, k } = pasoEn(t);
  const prevP = i > 0 ? pasos[i - 1] : p;
  const enHook = p.accion === "hook" || p.accion === "rewind";

  // --- cámara ---
  const dur = p.accion === "rewind" ? p.dur : 0.7;
  const ct = ease(u / dur);
  const [pa, la] = camDe(prevP), [pb, lb] = camDe(p);
  tmpA.lerpVectors(pa, pb, ct); tmpB.lerpVectors(la, lb, ct);
  // movimiento vivo: respiración + empuje lento
  const empuje = 1 - 0.06 * k;
  camera.position.copy(tmpB).add(tmpA.clone().sub(tmpB).multiplyScalar(empuje));
  camera.position.x += Math.sin(t * 0.9) * 0.08; camera.position.y += Math.sin(t * 1.3) * 0.05;
  if (p.accion === "hook") { const a = Math.sin(u * 0.8) * 0.35; const d = camera.position.clone().sub(tmpB); d.applyAxisAngle(V3(0, 1, 0), a); camera.position.copy(tmpB).add(d); }
  if (p.accion === "rewind") { camera.position.x += Math.sin(t * 80) * 0.12; camera.position.y += Math.cos(t * 65) * 0.08; }
  if (p.accion === "flip" && k > 0.45 && k < 0.85) tmpB.y += Math.sin((k - 0.45) / 0.4 * Math.PI) * 0.6;
  camera.lookAt(tmpB);
  camera.rotation.z += Math.sin(t * 0.7) * 0.012;

  // --- chef ---
  const xA = chefDe(prevP), xB = chefDe(p);
  const caminando = Math.abs(xA - xB) > 0.01 && u < 0.7;
  let cx = lerp(xA, xB, ease(u / 0.7)), cy = 0, salto = 0;
  if (caminando) cy = Math.abs(Math.sin(u * 16)) * 0.12;
  if (p.accion === "serve" && u > 1.2) salto = bounce((u - 1.2) / 1.4) * 0.6;
  if (p.accion === "outro") salto = bounce(u / 1.6) * 0.7;
  if (p.accion === "hook") salto = bounce(u / 1.2) * 0.3;
  const zA = prevP.accion === "presenta" ? -1.3 : -0.35, zB = p.accion === "presenta" ? -1.3 : -0.35;
  CH.raiz.position.set(cx, cy + salto, lerp(zA, zB, ease(u / 0.7)));
  const respira = 1 + Math.sin(t * 3) * 0.02;
  const aplasta = salto > 0 ? 1 + salto * 0.15 : respira;
  CH.cuerpo.scale.set(1 / Math.sqrt(aplasta), aplasta, 1 / Math.sqrt(aplasta));
  CH.raiz.rotation.y = caminando ? Math.sign(xB - xA) * 0.5 : Math.sin(t * 0.8) * 0.12;
  CH.piernas.forEach((pi, n) => { pi.rotation.x = caminando ? Math.sin(u * 16 + n * Math.PI) * 0.6 : 0; });
  // cola
  CH.cola.forEach((s, n) => { const a = n / 8; s.position.set(Math.sin(t * 3 + n * 0.5) * 0.08 * a, 0.5 + a * 0.75 + Math.sin(a * 2) * 0.1, -0.4 - Math.sin(a * 2.2) * 0.45); });
  // cabeza / cara
  const zp = zonaPaso(p);
  const objetivo = p.accion === "presenta" ? -0.5 : zp === "pan" ? 0.45 : ["bowl", "dish", "horno"].includes(zp) ? -0.45 : 0;
  CH.cabeza.rotation.y = lerp(CH.cabeza.rotation.y, objetivo, 1) + Math.sin(t * 2.2) * 0.08;
  CH.cabeza.rotation.z = Math.sin(t * 2.6) * 0.08;
  CH.cabeza.rotation.x = p.accion === "presenta" ? -0.25 * clamp(u) : ["drop", "stir", "flip"].includes(p.accion) ? 0.2 : 0;
  CH.orejas.forEach((o, n) => { o.rotation.x = Math.max(0, Math.sin(t * 7 + n)) * 0.25; });
  const feliz = enHook || (ESNACHOS && ["secreto", "hornea"].includes(p.accion)) || (ESCARNE && p.accion === "arma" && u > 9) || (ESCHILA && p.accion === "escurre" && u > 3) || ["intro", "serve", "outro", "hornea", "queso", "extiende", "rebana", "glasea", "destapa"].includes(p.accion) || (p.accion === "presenta" && u > 0.8);
  const parpadeo = (t % 2.7) < 0.1;
  CH.ojos.forEach(o => { o.visible = !feliz; o.scale.y = parpadeo ? 0.15 : (ESCEREAL && ['hook', 'juega', 'control'].includes(p.accion) ? 0.55 : 1.25); });
  CH.felices.forEach(f => f.visible = feliz);
  const hablando = subs.some(s => t >= s.ini && t < s.fin);
  const mov = hablando ? Math.abs(Math.sin(t * 17)) : feliz ? 0.6 : 0.1;
  CH.boca.scale.set(1 + mov * 0.4, 0.25 + mov * 0.9, 0.5);
  CH.gorro.rotation.z = Math.sin(t * 3) * 0.06;

  // brazos
  let { aL, aR, fL, fR, conCuchara, conEspatula } = poseBrazos(p, u, k, t);
  // transición suave entre poses, con un poquito de rebote al final (anticipación y seguimiento)
  if (i > 0 && u < 0.5) {
    const pp = pasos[i - 1], A = poseBrazos(pp, pp.dur, 1, t), w = easeOutBack(u / 0.5);
    aL = A.aL + (aL - A.aL) * w; aR = A.aR + (aR - A.aR) * w; fL = A.fL + (fL - A.fL) * w; fR = A.fR + (fR - A.fR) * w;
  }
  CH.brazos[-1].hombro.rotation.set(fL, 0, -aL); CH.brazos[1].hombro.rotation.set(fR, 0, -aR);
  cuchara.visible = conCuchara; espatula.visible = conEspatula;
  if (ESCEREAL) { espatula.visible = false; cuchara.visible = p.accion === "control"; }
  if (ESNACHOS) { espatula.visible = false; cuchara.visible = p.accion === "capa"; }
  if (ESCARNE) { espatula.visible = ["asa", "cebollitas", "tortillas"].includes(p.accion); if (!["marina", "arma"].includes(p.accion)) cuchara.visible = false; }
  if (ESCHILA) { const esp = ["frie", "sofrie", "baña"].includes(p.accion); espatula.visible = esp; if (esp || ["escurre", "licua"].includes(p.accion)) cuchara.visible = false; }
  if (ESGAL) {
    manoBoloM.visible = false; manoGal.visible = false; manoCuch.visible = false; batidorL.visible = false;
    if (p.accion === "sobras") { manoBoloM.visible = true; manoCuch.visible = true; cuchara.visible = false; const ph = (u % 1.8) / 1.8; CH.boca.scale.set(1.3, ph > 0.45 && ph < 0.75 ? 1.2 : 0.35 + Math.abs(Math.sin(t * 14)) * 0.3, 0.5); }
    if (p.accion === "galletas") { manoGal.visible = u > 0.3 && u < 4; galMano.scale.setScalar(Math.max(0.2, 1 - Math.floor(u / 0.5) * 0.1)); cuchara.visible = u >= 4; }
    if (p.accion === "crema") { cuchara.visible = false; batidorL.visible = true; batidorL.userData.pico.visible = u > p.dur - 1.3; }
    enderezar(manoBoloM, fL, aL); enderezar(manoCuch, fR, aR); enderezar(manoGal, fL, aL);
  }
  if (ESBOLO) {
    manoDivM.visible = false; manoCuch.visible = false; manoLeche.visible = false; manoPure.visible = false; cuchara.visible = false; batidor.visible = false;
    if (p.accion === "sobras") { manoDivM.visible = true; manoCuch.visible = true; const ph = (u % 1.8) / 1.8; CH.boca.scale.set(1.3, ph > 0.45 && ph < 0.75 ? 1.2 : 0.35 + Math.abs(Math.sin(t * 14)) * 0.3, 0.5); }
    if (p.accion === "leche" && u > 0.4 && u < 3.2) manoLeche.visible = true;
    if (p.accion === "tomate" && u > 0.4 && u < 2.8) manoPure.visible = true;
    lecheL.rotation.z = p.accion === "leche" ? clamp((u - 0.6) / 0.4) * 1.9 * (1 - clamp((u - 2.8) / 0.4)) : 0;
    cajaPure.rotation.z = p.accion === "tomate" ? clamp((u - 0.6) / 0.4) * 1.9 * (1 - clamp((u - 2.4) / 0.4)) : 0;
    enderezar(manoDivM, fL, aL); enderezar(manoCuch, fR, aR); enderezar(manoLeche, fR, aR); enderezar(manoPure, fR, aR);
    espatula.visible = ["sofrito", "carne", "juntapasta"].includes(p.accion) || (["leche", "tomate"].includes(p.accion) && !manoLeche.visible && !manoPure.visible);
    cucharon.visible = p.accion === "cuecepasta" && !(u > 2.5 && u < 4.5); if (cucharon.visible) cucharon.userData.cont.material = M("#e8dcc0");
    const trabaja = ["sofrito", "carne", "leche", "tomate", "cuecepasta", "juntapasta"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.15 + Math.sin(t * 2) * 0.02 : 0;
    if (p.accion === "lento") CH.piernas[1].rotation.x = -Math.abs(Math.sin(t * 6)) * 0.35;
  }
  if (ESDIV) {
    manoTamM.visible = false; manoPlatito.visible = false; manoCuch.visible = false; cuchara.visible = p.accion === "armadiv";
    if (p.accion === "sobras") { manoTamM.visible = true; manoCuch.visible = true; const ph = (u % 1.8) / 1.8; CH.boca.scale.set(1.3, ph > 0.45 && ph < 0.75 ? 1.2 : 0.35 + Math.abs(Math.sin(t * 14)) * 0.3, 0.5); }
    if (p.accion === "huevo") manoPlatito.visible = [2.4, 6.6].some(t0 => u > t0 - 0.6 && u < t0 + 1.2);
    platitoH.rotation.z = p.accion === "huevo" ? [2.4, 6.6].reduce((m, t0) => Math.max(m, Math.sin(Math.PI * clamp((u - t0 + 0.4) / 1.4))), 0) * 1.2 : 0;
    enderezar(manoTamM, fL, aL); enderezar(manoCuch, fR, aR); enderezar(manoPlatito, fR, aR);
    espatula.visible = ["tortillas", "frijoles"].includes(p.accion);
    cucharon.visible = p.accion === "bana"; if (cucharon.visible) cucharon.userData.cont.material = M("#f2c14e");
    const trabaja = ["tortillas", "frijoles", "huevo", "bana", "armadiv"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.15 + Math.sin(t * 2) * 0.02 : 0;
  }
  if (ESTAM) {
    manoTir.visible = false; manoBolita.visible = false; manoCuch.visible = false; batidorL.visible = false; espatula.visible = false; cuchara.visible = false;
    if (p.accion === "sobras") { manoTir.visible = true; manoCuch.visible = true; const ph = (u % 1.8) / 1.8; CH.boca.scale.set(1.3, ph > 0.45 && ph < 0.75 ? 1.2 : 0.35 + Math.abs(Math.sin(t * 14)) * 0.3, 0.5); }
    if (p.accion === "flota") manoBolita.visible = u > 0.3 && u < 2.0;
    batidorL.visible = ["manteca", "masa"].includes(p.accion); batidorL.userData.pico.visible = false;
    enderezar(manoTir, fL, aL); enderezar(manoCuch, fR, aR); enderezar(manoBolita, fL, aL);
    const trabaja = ["hojas", "manteca", "masa", "flota", "arma", "vaporera"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.15 + Math.sin(t * 2) * 0.02 : 0;
  }
  if (ESAZT) {
    manoPoz.visible = false; manoTort.visible = false; manoCuch.visible = false;
    if (p.accion === "sobras") { manoPoz.visible = true; manoCuch.visible = true; const ph = (u % 1.8) / 1.8; CH.boca.scale.set(1.3, ph > 0.45 && ph < 0.75 ? 1.2 : 0.35 + Math.abs(Math.sin(t * 14)) * 0.3, 0.5); }
    if (p.accion === "arma") { const c = ((u - 1.4) % 3.3 + 3.3) % 3.3; manoTort.visible = u > 1.4 && u < 11 && c < 0.45; }
    enderezar(manoPoz, fL, aL); enderezar(manoCuch, fR, aR); enderezar(manoTort, fL, aL);
    espatula.visible = ["asa", "rajas", "tortillas"].includes(p.accion); cuchara.visible = false;
    cucharon.visible = p.accion === "arma"; if (cucharon.visible) cucharon.userData.cont.material = M(COL_SALSA_A);
    const trabaja = ["asa", "suda", "rajas", "tortillas", "arma", "queso"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.15 + Math.sin(t * 2) * 0.02 : 0;
  }
  if (ESPOZ) {
    espatula.visible = p.accion === "friesalsa"; cuchara.visible = false;
    cucharon.visible = ["cuecemaiz", "cuececarne"].includes(p.accion) && !(p.accion === "cuecemaiz" && u < 2.6); if (cucharon.visible) cucharon.userData.cont.material = M(p.accion === "cuececarne" && ((u % 1.6) / 1.6) > 0.5 ? "#f4ecdc" : "#d8e6ea");
    manoColador.visible = p.accion === "cuela"; enderezar(manoColador, fL, aL); pellejos.visible = p.accion === "cuela" && u > 2; colador.children[2].material = M("#8a2414");
    const trabaja = ["cuecemaiz", "cuececarne", "remoja", "cuela", "friesalsa", "junta", "hierve"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.15 + Math.sin(t * 2) * 0.02 : 0;
  } else colador.children[2].material = M(COL_CACAO);
  if (ESMOST) {
    [manoLas, manoLata, manoFresa, manoCuch].forEach(g => g.visible = false); batidorL.visible = false; espatula.visible = false;
    if (p.accion === "sobras") { manoLas.visible = true; manoCuch.visible = true; const ph = (u % 1.8) / 1.8; CH.boca.scale.set(1.3, ph > 0.45 && ph < 0.75 ? 1.2 : 0.35 + Math.abs(Math.sin(t * 14)) * 0.3, 0.5); }
    if (p.accion === "relleno" && u > 0.4 && u < 3.2) manoLata.visible = true;
    if (p.accion === "fresas") manoFresa.visible = u < p.dur - 0.5;
    batidorL.visible = p.accion === "claras" || (p.accion === "relleno" && u >= 3.2 && u < 6.5); batidorL.userData.pico.visible = p.accion === "claras" && u > p.dur - 2;
    cuchara.visible = ["envuelve", "molde", "unta"].includes(p.accion) || (p.accion === "relleno" && u >= 6.5);
    enderezar(manoLas, fL, aL); enderezar(manoCuch, fR, aR); enderezar(manoLata, fL, aL); enderezar(manoFresa, fL, aL);
    lataLC.rotation.z = p.accion === "relleno" ? -clamp((u - 0.7) / 0.4) * 1.9 * (1 - clamp((u - 2.7) / 0.4)) : 0;
    const trabaja = ["claras", "envuelve", "molde", "relleno", "unta", "fresas"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.15 + Math.sin(t * 2) * 0.02 : 0;
    if (p.accion === "enfria") CH.piernas[1].rotation.x = -Math.abs(Math.sin(t * 6)) * 0.35;
  }
  if (ESTIRA) {
    [manoJarra, manoSoleta, manoSoleta2, manoColador].forEach(g => g.visible = false); batidorL.visible = false;
    espatula.visible = false; cuchara.visible = ["mascarpone", "envuelve"].includes(p.accion) || (p.accion === "capa" && u >= 2.9);
    if (p.accion === "cafe" && u > 0.3 && u < 3.9) manoJarra.visible = true;
    if (p.accion === "moja") manoSoleta.visible = true;
    if (p.accion === "capa" && u < 2.9) manoSoleta2.visible = true;
    if (p.accion === "cacao") manoColador.visible = true;
    batidorL.visible = p.accion === "bate"; batidorL.userData.pico.visible = p.accion === "bate" && u > p.dur - 1.3;
    enderezar(manoJarra, fR, aR); enderezar(manoSoleta, fR, aR); enderezar(manoSoleta2, fL, aL); enderezar(manoColador, fL, aL);
    jarraCafe.rotation.z = p.accion === "cafe" ? clamp((u - 0.6) / 0.5) * 1.9 * (1 - clamp((u - 3.3) / 0.5)) : 0;
    if (p.accion === "moja") { const c = (u % 2.8) / 2.8; solMano.rotation.x = c > 0.4 ? Math.PI : 0; solMano.material = M("#" + new THREE.Color(COL_SOLETA).lerp(new THREE.Color(COL_SOLETA_M), clamp(c / 0.85)).getHexString()); }
    const trabaja = ["cafe", "bate", "mascarpone", "envuelve", "moja", "capa", "cacao"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.15 + Math.sin(t * 2) * 0.02 : 0;
  }
  if (ESLASANA) {
    [manoCer, manoCuch, manoPure, manoLeche, manoLamina, manoQueso].forEach(g => g.visible = false);
    cuchara.visible = false; espatula.visible = ["sofrie", "carne"].includes(p.accion) || (p.accion === "salsa" && u >= 2.6);
    const vlL = p.accion === "bechamel" && [4.8, 6.6, 8.4].some(t0 => u > t0 - 0.35 && u < t0 + 1.15);
    cucharon.visible = (p.accion === "arma") || (p.accion === "queso" && u < 1.4); batidor.visible = p.accion === "bechamel" && !vlL;
    if (p.accion === "sobras") { manoCer.visible = manoCuch.visible = true; }
    if (p.accion === "salsa" && u < 2.6) manoPure.visible = true;
    if (vlL) manoLeche.visible = true;
    if (p.accion === "arma") { const c = (u - 1.4) % 3.3; manoLamina.visible = u > 1.4 && u < 11.2 && c < 0.55; }
    if (p.accion === "queso") manoQueso.visible = u > 1.4 && u < 4.8;
    enderezar(manoCer, fL, aL); enderezar(manoLeche, fR, aR); enderezar(manoLamina, fL, aL); enderezar(manoQueso, fL, aL);
    enderezar(manoCuch, fR, aR); enderezar(manoPure, fR, aR);
    cajaPure.rotation.z = p.accion === "salsa" ? clamp((u - 0.4) / 0.5) * 1.9 * (1 - clamp((u - 2.2) / 0.4)) : 0;
    lecheL.rotation.z = p.accion === "bechamel" ? [4.8, 6.6, 8.4].reduce((m, t0) => Math.max(m, Math.sin(Math.PI * clamp((u - t0 + 0.2) / 1.4))), 0) * 1.9 : 0;
    // el cuerpo se inclina hacia lo que hace
    const trabaja = ["sofrie", "carne", "salsa", "bechamel", "arma", "queso", "reposa"].includes(p.accion);
    CH.cuerpo.rotation.x = trabaja ? 0.16 + Math.sin(t * 2) * 0.02 : 0;
    if (p.accion === "reposa") { CH.piernas[1].rotation.x = -Math.abs(Math.sin(t * 6)) * 0.35; CH.cabeza.rotation.x = 0.25; }
    if (p.accion === "sobras") { const ph = (u % 1.8) / 1.8; const enBoca = ph > 0.45 && ph < 0.75; CH.boca.scale.set(1.3, enBoca ? 1.2 : 0.35 + Math.abs(Math.sin(t * 14)) * 0.3, 0.5); }
  }
  cuchara.rotation.set(0.5, 0, 0.6); espatula.rotation.set(0.6, 0, -0.5);

  // --- repisa ---
  presentas.forEach((pr, n) => {
    const j = pasos.indexOf(pr), g = repisa[n];
    const usado = pr.usoI >= 0 && i >= pr.usoI;
    g.visible = !(i < j || usado || enHook);
    if (!g.visible) return;
    const q = i > j ? 1 : easeOutBack(clamp(u / 0.75));
    g.position.set(pr.slot, lerp(SHELF_Y + 9, SHELF_Y + 0.3, q), SHELF_Z + 0.1);
    const sw = i === j ? Math.sin(u * 8) * 0.12 * (1 - clamp(u / 1.4)) : 0;
    g.rotation.set(0, Math.sin(t * 1.2 + n) * 0.15, sw);
    const sq = i === j ? 1 - bounce(clamp((u - 0.55) / 0.6)) * 0.25 : 1;
    g.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  });

  // --- tazón ---
  const armaI = [idxDe("arma"), ESSUSHI ? idxDe("esterilla") : ESROLES ? idxDe("amasa") : ESRATA ? idxDe("precalienta") : ESCHILA ? idxDe("escurre") : ESCARNE ? idxDe("reposa") : ESNACHOS ? idxDe("pico") : idxDe("extiende")].filter(x => x >= 0)[0] ?? -1;
  tazon.visible = !enHook && !(idxDe("serve") >= 0 && i >= idxDe("serve")) && !(armaI >= 0 && i >= armaI);
  let nivel = 0, color = new THREE.Color(P.batter), hay = false;
  pasos.forEach((s, j) => {
    if (j > i) return;
    const lu = j === i ? u : s.dur;
    if (s.accion === "drop" && s.destino !== "sarten") {
      const items = s.ingredientes || [s.ingrediente];
      items.forEach((_, n) => {
        const lleno = clamp((lu - 0.25 - n * 0.5 - 0.55) / 0.5);
        nivel += lleno * (s.cantidad || 0.22) / items.length;
        if (lleno > 0) { color.set(s.color || P.batter); hay = true; }
      });
    }
    if (s.accion === "stir" && s.destino !== "sarten") color.lerp(new THREE.Color(s.color || P.batter), clamp(lu / (s.dur * 0.8)));
    if (s.accion === "pour") nivel -= 0.35 * clamp((lu - 0.3) / 1.2);
  });
  nivel = clamp(nivel, 0, 0.85);
  const h = 0.08 + nivel * 0.8;
  if (ESTACOS && p.accion === "remoja") { hay = true; nivel = 0.75; color.set("#d98a5a"); }
  if (ESSUSHI) {
    const li = idxDe("lava"), ai = idxDe("alina");
    hay = li >= 0 && i >= li;
    nivel = 0.75;
    if (i === li) color.set("#e9e4d6").lerp(new THREE.Color("#bfe3f5"), clamp(u / (p.dur * 0.85)));
    else if (ai >= 0 && i >= ai) color.set(COL_ARROZ); else color.set("#bfe3f5");
    if (i > li && ai >= 0 && i < ai) hay = false; // el arroz está en la olla
  }
  relleno.visible = hay; relleno.position.y = 0.08 + nivel * 0.8; relleno.scale.setScalar(radioTazon(0.08 + nivel * 0.8) - 0.02);
  relleno.material = M("#" + color.getHexString());
  remolino.visible = (p.accion === "stir" && p.destino !== "sarten") || p.accion === "lava" || (ESTACOS && p.accion === "drop" && p.destino !== "sarten" && u > 2) || (p.accion === "alina" && u > 1.2); remolino.position.y = h + 0.01; remolino.rotation.z = u * 9;
  tazon.rotation.z = p.accion === "stir" && p.destino !== "sarten" ? Math.sin(u * 11) * 0.04 : 0;
  // tazón "salta" al recibir ingredientes
  let golpe = 0;
  caidas.forEach(c => { if (c.j === i && !c.sarten) golpe = Math.max(golpe, bounce(clamp((u - 0.25 - c.n * 0.5 - 0.55) / 0.5)) * 0.12); });
  tazon.scale.set(1 + golpe, 1 - golpe, 1 + golpe);

  // --- caídas al tazón ---
  caidas.forEach(c => {
    const o = c.obj;
    if (c.j !== i) { o.visible = false; return; }
    const q = (u - 0.25 - c.n * 0.5) / 0.55;
    if (q < 0 || q > 2.2) { o.visible = false; return; }
    o.visible = true;
    const D = c.sarten ? PAN : BOWL, topY = c.sarten ? 0.55 : 1.05, x = D.x + c.lado * 0.15;
    if (c.ing !== "huevo") {
      const qq = clamp(q);
      o.position.set(x + c.lado * 0.3 * (1 - qq), lerp(6.5, topY - 0.15, easeIn(qq)), D.z);
      o.rotation.set(0, 0, (1 - qq) * 3 * c.lado);
      const hund = clamp((q - 1) / 0.5);
      o.scale.set(1 + hund * 0.4, Math.max(0.001, 1 - hund), 1 + hund * 0.4);
      o.position.y -= hund * 0.4;
      if (q > 1.5) o.visible = false;
      return;
    }
    // huevo: cae, choca contra el borde, se parte en dos
    const { arriba, abajo, clara, yema } = o.userData;
    const qq = clamp(q);
    if (q <= 1) {
      o.position.set(x, lerp(6.5, topY + 0.35, easeIn(qq)), D.z);
      o.rotation.set(0, 0, (1 - qq) * 4 * c.lado);
      arriba.position.set(0, 0, 0); abajo.position.set(0, 0, 0); arriba.rotation.set(0, 0, 0); abajo.rotation.set(0, 0, 0);
      arriba.visible = abajo.visible = true; clara.visible = yema.visible = false;
      return;
    }
    const r = q - 1; // 0..1.2
    o.position.set(x, topY + 0.35, D.z); o.rotation.set(0, 0, 0);
    const abre = easeOut(r / 0.35);
    arriba.position.set(-abre * 0.35, abre * 0.25 - easeIn(clamp((r - 0.35) / 0.6)) * 1.6, 0); arriba.rotation.set(0, 0, abre * 1.3);
    abajo.position.set(abre * 0.35, abre * 0.05 - easeIn(clamp((r - 0.35) / 0.6)) * 1.6, 0); abajo.rotation.set(0, 0, -abre * 1.6);
    const caeY = -easeIn(clamp((r - 0.05) / 0.45)) * 0.75;
    yema.visible = clara.visible = r < 0.75;
    yema.position.set(0, caeY, 0.02);
    const plano = clamp((r - 0.45) / 0.3);
    clara.position.set(0, caeY - 0.05, 0); clara.scale.set(1 + plano, Math.max(0.05, 1 - plano * 0.9), 1 + plano);
    yema.scale.set(1 + plano * 0.3, 1 - plano * 0.4, 1 + plano * 0.3);
    arriba.visible = abajo.visible = r < 1.0;
  });

  // --- sartén / hot cake ---
  const pourI = idxDe("pour"), flipI = idxDe("flip");
  let r = 0, colHC = P.batter, fy = 0, fr = 0, burb = 0;
  if (pourI >= 0 && i >= pourI) r = i > pourI ? 1 : easeOutBack(clamp((u - 0.4) / 1.4));
  if (flipI >= 0 && i === flipI) {
    burb = clamp(k / 0.3) * (k < 0.5 ? 1 : 0);
    const q = clamp((k - 0.5) / 0.3);
    fy = Math.sin(Math.PI * q) * 1.3; fr = q * Math.PI * 2;
    if (q > 0.5) colHC = P.dorado;
  } else if (flipI >= 0 && i > flipI) colHC = P.dorado;
  const enPlato = ["serve", "outro"].includes(p.accion) || enHook;
  hotcake.visible = r > 0.01 && !enPlato;
  hotcake.position.y = 0.16 + fy; hotcake.rotation.x = fr;
  hotcake.scale.set(Math.max(r, 0.001), 1, Math.max(r, 0.001));
  hcCuerpo.material = M(colHC);
  burbujas.forEach((b, n) => { const on = burb > 0 && Math.sin(t * 7 + n * 1.9) > -0.2; b.visible = on; b.scale.setScalar(on ? 0.6 + Math.abs(Math.sin(t * 9 + n)) * 0.8 : 1); });
  let nivS = 0, hayS = false; const colS = new THREE.Color(COLOR_BECH);
  pasos.forEach((s2, j) => {
    if (j > i) return;
    const lu = j === i ? u : s2.dur;
    if (s2.accion === "drop" && s2.destino === "sarten") {
      const items = s2.ingredientes || [s2.ingrediente];
      items.forEach((_, n) => { const ll = clamp((lu - 0.25 - n * 0.5 - 0.55) / 0.5); nivS += ll * 0.5 / items.length; if (ll > 0) { colS.set(s2.color || COLOR_BECH); hayS = true; } });
    }
    if (s2.accion === "stir" && s2.destino === "sarten") colS.lerp(new THREE.Color(s2.color || COLOR_BECH), clamp(lu / (s2.dur * 0.8)));
    if (s2.accion === "baña" && s2.capa === "bechamel") nivS -= clamp(lu / s2.dur);
  });
  nivS = clamp(nivS, 0, 1);
  sartenRelleno.visible = hayS && nivS > 0.02 && !enPlato; sartenRelleno.scale.set(0.6 + nivS * 0.4, 0.5 + nivS * 1.5, 0.6 + nivS * 0.4);
  sartenRelleno.material = M("#" + colS.getHexString());
  sartenRemolino.visible = sartenRelleno.visible && p.accion === "stir" && p.destino === "sarten"; sartenRemolino.rotation.z = u * 9;
  const fuego = ((pourI >= 0 && i >= pourI) || (hayS && nivS > 0.02)) && !enPlato;
  llama.visible = fuego; llama.material.opacity = 0.6 + 0.3 * Math.sin(t * 25); llama.scale.setScalar(1 + Math.sin(t * 18) * 0.04);
  sarten.rotation.z = p.accion === "flip" && k > 0.45 && k < 0.55 ? -Math.sin((k - 0.45) / 0.1 * Math.PI) * 0.12 : 0;
  vapor.forEach((v, n) => {
    const ph = (t * 0.6 + n / vapor.length) % 1;
    v.visible = fuego;
    v.position.set(PAN.x + Math.sin(n * 2.3 + t) * 0.4, 0.4 + ph * 2.2, PAN.z + Math.cos(n * 1.7) * 0.3);
    v.scale.setScalar(0.4 + ph * 1.1); v.material.opacity = 0.28 * Math.sin(ph * Math.PI);
  });

  // --- plato ---
  const serveI = idxDe("serve");
  let pl = 0;
  if (serveI >= 0 && i >= serveI) pl = i > serveI ? 1 : easeOutBack(clamp((u - 0.2) / 0.5));
  if (enHook) pl = 1;
  sarten.visible = !ESSUSHI && !ESROLES && !ESCARNE && !ESNACHOS && !ESCEREAL && !(ESCHILA && ["corta", "hierve", "escurre", "licua"].includes(p.accion)) && !(ESTACOS && ["corta", "tortillas"].includes(p.accion)) && !(ESALFREDO && ["hierve", "cuece"].includes(p.accion));
  plato.visible = pl > 0.001 && !ESPIZZA; plato.scale.setScalar(Math.max(pl, 0.001));
  const su = i > serveI || enHook ? 99 : u;
  pila.forEach((hc, n) => {
    const q = clamp((su - 0.4 - n * 0.2) / 0.3);
    hc.visible = q > 0; hc.position.y = 0.16 + n * 0.21 + (1 - easeIn(q)) * 3;
    hc.scale.set(1 + bounce(clamp((su - 0.7 - n * 0.2) / 0.4)) * 0.15, 1, 1);
  });
  const cima = 0.16 + 3 * 0.21 + 0.1;
  const top = R.toppings || ["miel"];
  const mq = top.includes("miel") ? clamp((su - 1.3) / 0.5) : 0;
  miel.visible = mq > 0; miel.position.y = cima; mielTapa.scale.set(0.3 + mq * 0.72, 0.12, 0.3 + mq * 0.72);
  gotas.forEach((g, n) => { const q = clamp((su - 1.6 - n * 0.08) / 0.6); g.visible = q > 0; g.scale.set(1, Math.max(0.001, q * (0.7 + hash(n) * 0.8)), 1); g.position.y = -0.1 - q * 0.2; });
  mantequilla.visible = top.includes("mantequilla") && su > 1.2; mantequilla.position.y = cima + 0.12 + (su < 1.5 ? (1.5 - su) * 4 : 0);
  mantequilla.rotation.y = 0.5;
  canelaPolvo.visible = top.includes("canela") && su > 2.0; canelaPolvo.position.y = cima + 0.1;
  if (enHook) plato.rotation.y = t * 0.6; else plato.rotation.y = 0;

  // --- refractario (enchiladas) ---
  refractario.visible = !ESCARNE && !ESLASANA && !ESAZT && !ESTAM && idxDe("arma") >= 0 && i >= idxDe("arma") && !enHook && !(serveI >= 0 && i >= serveI);
  if (refractario.visible) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const ua = lu("arma");
    rollosRef.forEach((r, n) => {
      const q = clamp((ua - 0.3 - n * 0.4) / 0.45);
      r.visible = q > 0;
      r.position.y = 0.6 + (1 - easeIn(q)) * 3; r.rotation.z = (1 - q) * 4;
      const sq = bounce(clamp((ua - 0.75 - n * 0.4) / 0.4)) * 0.3; r.scale.set(1 + sq, 1 - sq, 1);
    });
    let cs = 0, cb = 0;
    pasos.forEach((s2, j) => { if (s2.accion !== "baña" || j > i) return; const v = j < i ? 1 : easeOut(clamp((u - 0.2) / (s2.dur * 0.7))); if (s2.capa === "bechamel") cb = v; else cs = v; });
    capaSalsa.visible = cs > 0.01; capaSalsa.scale.set(0.3 + cs * 0.7, cs, 0.3 + cs * 0.7);
    capaBech.visible = cb > 0.01; capaBech.scale.set(0.3 + cb * 0.7, cb, 0.3 + cb * 0.7);
    const uq = lu("queso");
    quesoPiezas.forEach((q, n) => { const v = clamp((uq - 0.2 - (n / quesoPiezas.length) * 1.2) / 0.3); q.visible = v > 0; q.position.y = 0.9 + (1 - easeIn(v)) * 2.5; });
    const uh = lu("hornea"), hk = uh >= 99 ? 1 : uh < 0 ? 0 : clamp(uh / (pasos[idxDe("hornea")].dur * 0.85));
    gratinado.visible = hk > 0.05; gratinado.scale.set(1, hk, 1);
    quesoPiezas.forEach(q => { q.material = M(hk > 0.5 ? "#f2b94a" : "#ffd75e"); });
    burbujasRef.forEach((b, n) => { const on = hk > 0 && hk < 1 && Math.sin(t * 6 + n * 2.1) > 0; b.visible = on; b.scale.setScalar(on ? 0.5 + Math.abs(Math.sin(t * 9 + n)) : 1); });
    brilloHorno.intensity = p.accion === "hornea" ? 4 + Math.sin(t * 12) * 1 : 0;
  }

  // --- plato: panqueques o enchiladas ---
  platoEnch.visible = ESENCH;
  platoMole.visible = ESMOLE;
  platoSushi.visible = ESSUSHI;
  platoTacos.visible = ESTACOS;
  platoAlfredo.visible = ESALFREDO;
  if (ESALFREDO) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const qn = clamp((su - 0.3) / 0.6); nidoPlato.visible = qn > 0; nidoPlato.position.y = 0.08 + (1 - easeIn(qn)) * 2;
    nidoPlato.userData.tubos.forEach(tb => tb.material = M(COL_CREMA));
    quesoPlato.forEach((q, n) => { const v = clamp((su - 1.1 - n * 0.02) / 0.3); q.visible = v > 0; q.position.y = 0.3 + (1 - easeIn(v)) * 1.5; });
    pimienta.forEach((pm, n) => pm.visible = su > 1.8 + n * 0.02);
  }
  platoChila.visible = ESCHILA;
  platoCA.visible = ESCARNE;
  platoL.visible = ESLASANA; platoT.visible = ESTIRA; platoM.visible = ESMOST; platoP.visible = ESPOZ; platoA.visible = ESAZT; platoTm.visible = ESTAM; platoD.visible = ESDIV; platoB.visible = ESBOLO;
  platoN.visible = ESNACHOS;
  if (ESNACHOS) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    totP.forEach((tt, n) => { const q = clamp((su - 0.3 - n * 0.025) / 0.35); tt.visible = q > 0; tt.position.y = tt.userData.y0 + (1 - easeIn(q)) * 2.5; });
    const qq = clamp((su - 1.4) / 0.4); quesoP.visible = qq > 0; quesoP.scale.set(qq, 0.3 * qq, 0.85 * qq);
    picoP.forEach((c, n) => c.visible = su > 2.2 + n * 0.04);
    const qg = clamp((su - 4.0) / 0.35); guacP.visible = qg > 0; guacP.position.y = 0.5 + (1 - easeIn(qg)) * 1.5;
    cremaP.forEach((c, n) => c.visible = su > 5.2 + n * 0.3);
    jalaP.forEach((j, n) => { const v = clamp((su - 6.6 - n * 0.12) / 0.3); j.visible = v > 0; j.position.y = 0.45 + (1 - easeIn(v)) * 1.2; });
  }
  if (ESCARNE) { pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false; }
  if (ESCHILA) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    totosP.forEach((tt, n) => { const q = clamp((su - 0.3 - n * 0.03) / 0.35); tt.visible = q > 0; tt.position.y = tt.userData.y0 + (1 - easeIn(q)) * 2.5; });
    cremaCh.forEach((c, n) => { c.visible = su > 1.6 + n * 0.25; });
    quesoCh.forEach((q, n) => { const v = clamp((su - 2.6 - n * 0.04) / 0.3); q.visible = v > 0; q.position.y = q.userData.y0 + (1 - easeIn(v)) * 1.5; });
    cebollaCh.forEach((c, n) => { c.visible = su > 4.0 + n * 0.12; });
    cilantroCh.forEach((c, n) => { c.visible = su > 5.0 + n * 0.06; });
    const qh = clamp((su - 6.6) / 0.4); huevoCh.visible = qh > 0; huevoCh.position.y = 0.55 + (1 - easeIn(qh)) * 2;
  }
  platoRata.visible = ESRATA;
  if (ESRATA) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    platoRata.children.forEach((c, n) => { if (albahacas.includes(c)) return; const q = clamp((su - 0.3 - n * 0.015) / 0.3); c.visible = q > 0; });
    albahacas.forEach((h, n) => { const q = clamp((su - 1.3 - n * 0.2) / 0.3); h.visible = q > 0; h.position.y = 0.4 + (1 - easeIn(q)) * 1.5; });
  }
  platoRoles.visible = ESROLES;
  if (ESROLES) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    rolesPlato.forEach((r, n) => { const q = clamp((su - 0.3 - n * 0.25) / 0.35); r.visible = q > 0; r.position.y = 0.25 + (n === 3 ? 0.34 : 0) + (1 - easeIn(q)) * 2.5; });
  }
  if (ESTACOS) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    tacosPlato.forEach((tc, n) => { const q = clamp((su - 0.3 - n * 0.3) / 0.35); tc.visible = q > 0; tc.position.y = 0.06 + (1 - easeIn(q)) * 2.5; });
    limon.visible = su > 1.5;
  }
  if (ESSUSHI) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    piezasPlato.forEach((pz, n) => { const q = clamp((su - 0.3 - n * 0.12) / 0.3); pz.visible = q > 0; pz.position.y = 0.2 + (1 - easeIn(q)) * 2.5; });
    soya.visible = su > 1.4; jengibre.visible = su > 1.7; wasabi.visible = su > 1.9;
  }
  if (ESMOLE) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    piezasMole.forEach((pz, n) => { const q = clamp((su - 0.3 - n * 0.25) / 0.3); pz.visible = q > 0; pz.position.y = 0.32 + (1 - easeIn(q)) * 3; });
    const qs = clamp((su - 0.9) / 0.5); salsaMole.visible = qs > 0; salsaMole.scale.set(1.0 * qs, 0.45, 0.85 * qs); brilloMole.visible = qs > 0.9;
    semillas.forEach((sm, n) => { sm.visible = su > 1.5 + n * 0.012; });
    const qa = clamp((su - 1.9) / 0.35); arroz.visible = qa > 0; arroz.scale.setScalar(Math.max(0.001, easeOutBack(qa)));
  }
  if (ESENCH) {
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    rollosPlato.forEach((r, n) => { const q = clamp((su - 0.3 - n * 0.2) / 0.3); r.visible = q > 0; r.position.y = 0.32 + (1 - easeIn(q)) * 3; });
    const qs = clamp((su - 1.0) / 0.4); salsaPlato.visible = qs > 0; salsaPlato.scale.set(1.15 * qs, 0.35, 0.95 * qs);
    const qb = clamp((su - 1.3) / 0.4); bechPlato.visible = qb > 0; bechPlato.scale.set(qb, 1, qb);
    cremaPlato.visible = su > 1.7; cremaPlato.rotation.z = su * 2;
    cebollas.forEach((c, n) => { c.visible = su > 1.9 + n * 0.06; });
    cilantros.forEach((c, n) => { c.visible = su > 2.1 + n * 0.04; });
  }

  // --- pasta Alfredo ---
  if (ESALFREDO) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : (i > jj || enHook) ? 99 : i === jj ? u : -1; };
    const ur = lu("ralla");
    rallador.visible = p.accion === "ralla";
    if (rallador.visible) quesoRall.position.set(0, 0.3 - Math.abs(Math.sin(u * 7)) * 0.6, 0.12);
    montonQueso.visible = ur > 0.4 && i < idxDe("emulsiona") && !enHook;
    montonQueso.scale.set(Math.min(1, ur / 3), Math.min(1, ur / 3) * 0.45, Math.min(1, ur / 3));
    // olla
    if (["hierve", "cuece"].includes(p.accion)) {
      olla.visible = true; tapa.visible = p.accion === "hierve" && u < 1.2;
      tapa.position.y = 0.45 + Math.abs(Math.sin(t * 9)) * 0.05;
    } else if (!ESSUSHI) olla.visible = false;
    pastaOlla.visible = p.accion === "cuece";
    if (pastaOlla.visible) { const q = clamp((u - 0.3) / 0.8); pastaOlla.position.y = 0.4 + (1 - easeIn(q)) * 2.2; pastaOlla.children.forEach((v, n) => v.rotation.z = (hash(n) - 0.5) * (0.6 + q * 1.2)); }
    // pasta en el sartén
    const pasI = idxDe("pasa"), emI = idxDe("emulsiona");
    nidoSarten.visible = pasI >= 0 && i >= pasI && !enHook && !["serve", "outro"].includes(p.accion);
    if (nidoSarten.visible) {
      const q = i === pasI ? clamp((u - 0.2) / 0.7) : 1;
      nidoSarten.position.y = 0.14 + (1 - easeIn(q)) * 2; nidoSarten.rotation.y = p.accion === "pasa" || p.accion === "emulsiona" ? u * 1.5 : 0;
      const ce = emI >= 0 && i > emI ? 1 : i === emI ? clamp(u / p.dur) : 0;
      nidoSarten.userData.tubos.forEach(tb => tb.material = M("#" + new THREE.Color(COL_PASTA).lerp(new THREE.Color(COL_CREMA), ce).getHexString()));
    }
    quesoNieve.forEach((q, n) => { const on = p.accion === "emulsiona"; const v = on ? clamp((u - 0.4 - n * 0.06) / 0.4) : 0; q.visible = on && v > 0 && v < 1; q.position.y = 0.35 + (1 - easeIn(v)) * 1.6; });
    vaso.visible = p.accion === "tip"; if (vaso.visible) vaso.rotation.z = clamp(u / 0.6) * 1.8;
  }

  // --- tacos ---
  if (ESTACOS) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : (i > jj || enHook) ? 99 : i === jj ? u : -1; };
    const sarI = pasos.findIndex(s2 => s2.accion === "drop" && s2.destino === "sarten"), marI = idxDe("marina"), cortaI = idxDe("corta");
    chilesRemojo.visible = p.accion === "remoja";
    if (chilesRemojo.visible) chilesRemojo.children.forEach((c, n) => { c.position.y = Math.sin(t * 2 + n) * 0.04; c.rotation.y = n + t * 0.3; });
    const um = lu("marina");
    carneBowl.visible = marI >= 0 && i === marI;
    if (carneBowl.visible) carneBowl.children.forEach((c, n) => { const q = clamp((um - 0.2 - n * 0.35) / 0.4); c.position.y = n * 0.05 + (1 - easeIn(q)) * 2.5; c.material = M(q >= 1 ? COL_ADOBO : "#dc8f86"); });
    // carne en el sartén
    const enSar = sarI >= 0 && i >= sarI && (cortaI < 0 || i < cortaI);
    carneSarten.visible = enSar;
    if (enSar) {
      const ud = lu("dora"), dk = ud >= 99 ? 1 : ud < 0 ? 0 : clamp(ud / 3);
      filetes.forEach((f, n) => { const q = i === sarI ? clamp((u - 0.4 - n * 0.4) / 0.4) : 1; f.visible = q > 0; f.position.y = (1 - easeIn(q)) * 2; f.material = M("#" + new THREE.Color(COL_ADOBO).lerp(new THREE.Color("#5c1a0c"), dk * 0.8).getHexString()); if (p.accion === "dora" && n === 1) f.rotation.x = Math.sin(Math.PI * clamp((u - 1.5) / 0.6)) * Math.PI; });
    }
    // tabla: picar
    const uc = lu("corta");
    tablaT.visible = p.accion === "corta";
    if (tablaT.visible) {
      cuchilloT.position.set(-0.4 + ((u * 1.2) % 1) * 0.8, 0.35 + Math.abs(Math.sin(u * 14)) * 0.3, 0); cuchilloT.rotation.y = 0.4;
      const q = clamp((u - 0.3) / 2.2); bloqueCarne.visible = q < 0.4; cubos.forEach((c, n) => c.visible = n / cubos.length < q);
    }
    // piña dorándose
    const up = lu("pina");
    pinaSarten.visible = p.accion === "pina";
    if (pinaSarten.visible) aros.forEach((a, n) => { const q = clamp((u - 0.3 - n * 0.3) / 0.4); a.visible = q > 0; a.position.y = (1 - easeIn(q)) * 2; a.material = M("#" + new THREE.Color("#f2c84b").lerp(new THREE.Color("#c9862a"), clamp((u - 1.5) / 2)).getHexString()); });
    // comal
    comal.visible = p.accion === "tortillas";
    if (comal.visible) tortisComal.forEach((t2, n) => { const inf = Math.max(0, Math.sin(Math.PI * clamp((u - 1 - n * 0.4) / 1.2))); t2.scale.set(1, 1 + inf * 6, 1); });
  }

  // --- sushi ---
  if (ESSUSHI) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : (i > jj || enHook) ? 99 : i === jj ? u : -1; };
    const ui = j0 => idxDe(j0);
    // olla
    olla.visible = p.accion === "cocina";
    if (olla.visible) { tapa.position.y = 0.45 + Math.abs(Math.sin(t * 9)) * 0.05; tapa.rotation.z = Math.sin(t * 13) * 0.03; }
    // botella de vinagre
    const ua = p.accion === "alina" ? u : -1;
    botella.visible = ua >= 0 && ua < 1.4;
    if (botella.visible) { const q = clamp(ua / 0.5); botella.position.set(BOWL.x + 0.6, 1.9 - (1 - q) * 2, BOWL.z); botella.rotation.z = q * 2.0; }
    chorro.visible = ua > 0.5 && ua < 1.3;
    if (chorro.visible) { chorro.position.set(BOWL.x + 0.22, 1.25, BOWL.z); chorro.scale.set(1, 0.9, 1); }
    // tabla y cuchillo
    const uc = lu("corta");
    tabla2.visible = uc >= 0 && i < (ui("serve") >= 0 ? ui("serve") : 999) && !enHook && p.accion !== "cocina";
    cuchillo.position.set(-0.2 + ((uc * 1.4) % 1) * 0.9, 0.35 + Math.abs(Math.sin(uc * 14)) * 0.3 * (p.accion === "corta" ? 1 : 0), 0.0);
    cuchillo.rotation.y = 0.4;
    tiras.forEach((tr, n) => { tr.visible = uc > 0.6 + n * 0.6 && (ui("relleno") < 0 || i < ui("relleno")); });
    // mesa de armado
    mesa.visible = armaI >= 0 && i >= armaI && !enHook && !(ui("serve") >= 0 && i >= ui("serve"));
    if (mesa.visible) {
      const ue = lu("esterilla"), ux = lu("extiende"), ur = lu("relleno"), un = lu("enrolla"), ub = lu("rebana");
      const qn = clamp((ue - 0.3) / 0.6);
      hojaNori.visible = ue > 0.3; hojaNori.position.y = 0.14 + (1 - easeIn(qn)) * 2.5;
      const enr = clamp(un / 2.4);
      const qa = clamp((ux - 0.2) / 2.6);
      capaArroz.visible = ux > 0.2 && enr < 1; capaArroz.scale.set(1, 1, Math.max(0.001, qa * (1 - enr))); capaArroz.position.z = (1 - qa) * -0.55 * 0 - 0.1 + enr * 0.6;
      hojaNori.scale.set(1, 1, Math.max(0.001, 1 - enr)); hojaNori.position.z = enr * 0.75;
      lineaRelleno.forEach((tr, n) => { const q = clamp((ur - 0.1 - n * 0.35) / 0.4); tr.visible = q > 0 && enr < 0.6; tr.position.y = 0.3 + (1 - easeIn(q)) * 1.6; });
      rollo2.visible = enr > 0.05;
      rollo2.position.set(0, 0.36 + 0.05, 0.75 - (1 - enr) * 0.6);
      rolloCuerpo.visible = ub < 0.3;
      rollo2.rotation.x = -enr * Math.PI * 2;
      if (un >= 99) rollo2.rotation.x = 0;
      esterilla.rotation.x = p.accion === "enrolla" ? -Math.sin(Math.PI * clamp(u / 2.4)) * 0.6 : 0;
      gotasAgua.forEach((g, n) => { g.visible = p.accion === "enrolla" && u > 2.2 + n * 0.1; });
      // rebanar: el rollo se separa en 8 piezas
      piezasRollo.forEach((pz, n) => { const corte = clamp((ub - 0.3 - n * 0.25) / 0.2); pz.visible = ub > 0.3; pz.position.x = -0.79 + n * 0.225 + (n - 3.5) * 0.12 * corte; });
      if (p.accion === "rebana") { cuchillo.parent !== mesa && mesa.add(cuchillo); cuchillo.position.set(-0.8 + clamp((u - 0.3) / 2.0) * 1.6, 0.9 - Math.abs(Math.sin(u * 8)) * 0.35, 0); cuchillo.rotation.set(0, Math.PI / 2, 0); }
      else if (cuchillo.parent !== tabla2) tabla2.add(cuchillo);
    }
  }

  // --- chilaquiles ---
  tablaCh.visible = ESCHILA && p.accion === "corta";
  escurreCh.visible = ESCHILA && p.accion === "escurre";
  licuadora.visible = ESCHILA && p.accion === "licua";
  aceiteCh.visible = ESCHILA && p.accion === "frie";
  totSarten.visible = ESCHILA && ["frie", "baña"].includes(p.accion);
  aguaOlla.visible = ESCHILA; enOlla.forEach(o => o.visible = false); burbOlla.forEach(b => b.visible = false);
  burbCh.forEach(b => b.visible = false);
  if (ESCHILA) {
    if (p.accion === "corta") {
      // tres cortes: mitad, cuartos y octavos
      const cortes = [0.18, 0.45, 0.72].map(f => clamp((k - f) / 0.12));
      const nivelC = cortes[0] + cortes[1] + cortes[2];
      gajosT.forEach((g, n) => {
        const sep = 0.03 * nivelC + 0.08 * clamp((k - 0.88) / 0.1);
        const a = n * Math.PI / 4 + Math.PI / 8; g.position.set(-0.35 + Math.sin(a) * sep, 0.09, 0.05 + Math.cos(a) * sep);
      });
      const cual = k < 0.32 ? 0 : k < 0.59 ? 1 : 2, fase = clamp((k - [0.18, 0.45, 0.72][cual] + 0.08) / 0.2);
      cuchilloCh.rotation.set(0, [0, Math.PI / 2, Math.PI / 4][cual], 0);
      cuchilloCh.position.set(-0.35, 0.22 + Math.abs(Math.sin(fase * Math.PI)) * 0.45 - (fase > 0.4 && fase < 0.7 ? 0.25 : 0), 0.05);
    }
    if (p.accion === "frie") {
      const dor = clamp((u - 1.5) / (p.dur - 3));
      totosS.forEach((tt, n) => {
        const q = clamp((u - 0.4 - n * 0.18) / 0.4);
        tt.visible = q > 0; tt.position.y = 0.03 + (n % 3) * 0.03 + (1 - easeIn(q)) * 2.2 + Math.sin(t * 9 + n) * 0.015;
        tt.material = M("#" + new THREE.Color(COL_TORTI).lerp(new THREE.Color(COL_TOTO), clamp(dor * 1.1 - hash(n) * 0.1)).getHexString());
      });
      totSarten.rotation.y = Math.sin(u * 2) * 0.25;
      burbCh.forEach((b, n) => { const on = u > 0.6 && Math.sin(t * 8 + n * 2.3) > 0; b.visible = on; b.scale.setScalar(on ? 0.6 + Math.abs(Math.sin(t * 11 + n)) : 1); });
    }
    if (p.accion === "baña") {
      totosS.forEach((tt, n) => {
        const q = clamp((u - 1.6 - n * 0.12) / 0.4);
        tt.visible = q > 0; tt.position.y = 0.07 + (n % 4) * 0.05 + (1 - easeIn(q)) * 2.2;
        tt.material = M("#" + new THREE.Color(COL_TOTO).lerp(new THREE.Color(COL_SALCH), clamp((u - 3.6 - n * 0.05) / 1.5) * (n % 3 ? 0.75 : 0.5)).getHexString());
      });
      totSarten.rotation.y = u > 3.5 ? Math.sin((u - 3.5) * 5) * 0.5 * (1 - clamp((u - 7) / 1.5)) : 0;
    }
    if (p.accion === "escurre") {
      totosE.forEach((tt, n) => { const q = clamp((u - 0.4 - n * 0.12) / 0.35); tt.visible = q > 0; tt.position.y = tt.userData.y0 + (1 - easeIn(q)) * 2.2; });
      const us = u - 3.4; salero.visible = us > -0.4 && us < 2.4; salero.position.set(0.1 + Math.sin(us * 20) * 0.04 * (us > 0 ? 1 : 0), 1.2, -0.1);
      salCh.forEach((s, n) => { const ph = us - n * 0.06; s.visible = ph > 0 && ph < 0.6; s.position.y = 1.0 - clamp(ph / 0.6) * 0.7; });
    }
    if (p.accion === "hierve") {
      const v = clamp((u - 0.5) / (p.dur * 0.7));
      aguaOlla.material = M("#" + new THREE.Color("#cfe3ee").lerp(new THREE.Color("#d9826a"), v).getHexString());
      enOlla.forEach((o, n) => { const q = clamp((u - 0.6 - n * 0.35) / 0.4); o.visible = q > 0; o.position.set(o.userData.x, 0.42 + (1 - easeIn(q)) * 2 + Math.sin(t * 4 + n) * 0.03, o.userData.z); o.rotation.set(0, n + t * 0.2, n % 2 ? 0.3 : -0.2); });
      burbOlla.forEach((b, n) => { const on = u > 1.5 && Math.sin(t * 7 + n * 1.9) > 0.1; b.visible = on; b.scale.setScalar(on ? 0.5 + Math.abs(Math.sin(t * 10 + n)) : 1); });
    }
    if (p.accion === "licua") {
      const mezcla = clamp((u - 1.5) / 3);
      liquidoL.scale.y = 0.15 + mezcla * 0.85; liquidoL.position.y = 0.6 + liquidoL.scale.y * 0.5 + 0.02;
      liquidoL.material = M("#" + new THREE.Color("#d9826a").lerp(new THREE.Color(COL_SALCH), mezcla).getHexString());
      trozosL.forEach((o, n) => { const q = clamp((u - 0.2 - n * 0.12) / 0.4); o.visible = q > 0 && mezcla < 0.7; o.position.y = 0.85 + (n % 4) * 0.15 + (1 - easeIn(q)) * 2 + (mezcla > 0 ? Math.sin(t * 30 + n) * 0.1 : 0); o.rotation.y = t * 12 * mezcla + n; });
      const vibra = u > 1.5 && u < p.dur - 1 ? 1 : 0;
      licuadora.position.x = BOWL.x + Math.sin(t * 60) * 0.025 * vibra; licuadora.rotation.z = Math.sin(t * 47) * 0.015 * vibra;
      remL.visible = vibra > 0; remL.position.y = liquidoL.position.y + liquidoL.scale.y * 0.5 + 0.01; remL.rotation.z = t * 20;
    }
    // salsa en el sartén
    if (["sofrie", "baña"].includes(p.accion)) {
      const q = p.accion === "sofrie" ? clamp((u - 0.3) / 1.2) : 1;
      const osc = p.accion === "sofrie" ? clamp((u - 2) / (p.dur - 3)) : 1;
      sartenRelleno.visible = q > 0; sartenRelleno.scale.set(0.6 + q * 0.4, 0.5 + q * 1.2, 0.6 + q * 0.4);
      sartenRelleno.material = M("#" + new THREE.Color("#c94a2e").lerp(new THREE.Color("#8e1f12"), osc).getHexString());
      sartenRemolino.visible = p.accion === "sofrie" && u > 1.5; sartenRemolino.material = M("#b5402a"); sartenRemolino.rotation.z = u * 9;
    }
    const calor = ["frie", "sofrie", "hierve"].includes(p.accion) || (p.accion === "baña" && u < 1.4);
    llama.visible = calor; llama.material.opacity = 0.6 + 0.3 * Math.sin(t * 25);
    if (p.accion === "hierve") { olla.visible = true; tapa.visible = false; } else olla.visible = false;
    vapor.forEach(v => { v.visible = ["frie", "sofrie", "hierve", "baña"].includes(p.accion); });
  }

  // --- tacos de carne asada ---
  parrilla.visible = ESCARNE && ["calienta", "asa", "cebollitas", "tortillas"].includes(p.accion);
  marinaCA.visible = ESCARNE && p.accion === "marina";
  tablaCA.visible = ESCARNE && ["reposa", "pica"].includes(p.accion);
  if (ESCARNE) {
    if (idxDe("reposa") >= 0 && i >= idxDe("reposa")) { tazon.visible = false; relleno.visible = false; remolino.visible = false; }
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const d = j0 => pasos[idxDe(j0)].dur;
    if (p.accion === "marina") {
      filetesM.forEach((f, n) => { const q = clamp((u - 0.3 - n * 0.4) / 0.4); f.visible = q > 0; f.position.y = n * 0.06 + (1 - easeIn(q)) * 2.5; f.userData.cuerpo.material = colorCarne(clamp((u - 3) / 4) * 0.25); });
      const qj = u - 1.8; naranjaM.visible = qj > -0.3 && qj < 3.2; naranjaM.scale.set(0.8 + Math.sin(t * 14) * 0.03 * (qj > 0 ? 1 : 0), 0.8 - Math.abs(Math.sin(t * 14)) * 0.06 * (qj > 0 ? 1 : 0), 0.8);
      jugoM.visible = qj > 0.2 && qj < 3;
      hay = true; nivel = 0.15 + 0.3 * clamp((u - 2) / 2.5);
      relleno.visible = true; relleno.position.y = 0.08 + nivel * 0.8; relleno.scale.setScalar(radioTazon(0.08 + nivel * 0.8) - 0.02); relleno.material = M("#e8963a");
      remolino.visible = u > 5 && u < 8; remolino.position.y = 0.08 + nivel * 0.8 + 0.01; remolino.rotation.z = u * 9;
      marinaCA.rotation.y = u > 5 && u < 8 ? Math.sin(u * 6) * 0.2 : 0;
    }
    if (parrilla.visible) {
      brasa.material.opacity = 0.55 + 0.25 * Math.sin(t * 9);
      const ua = lu("asa"), uc = lu("cebollitas");
      const ca = ua < 0 ? 0 : ua >= 99 ? 1 : clamp((ua - 0.3) / (d("asa") * 0.55));
      filetesG.forEach((f, n) => {
        const q = ua < 0 ? 0 : ua >= 99 ? 1 : clamp((ua - 0.3 - n * 0.5) / 0.4);
        f.visible = q > 0 && p.accion !== "tortillas"; f.position.y = 0.14 + (1 - easeIn(q)) * 2;
        f.userData.cuerpo.material = colorCarne(ca * 0.9); f.userData.marcas.forEach(m => m.visible = ca > 0.35);
        const vt = p.accion === "asa" ? clamp((u - d("asa") * 0.5 - n * 0.3) / 0.6) : 0;
        f.rotation.x = Math.sin(Math.PI * vt) * 1.2; f.position.y += Math.sin(Math.PI * vt) * 0.5;
      });
      cebollitasG.forEach((c, n) => {
        const q = uc < 0 ? 0 : uc >= 99 ? 1 : clamp((uc - 0.4 - n * 0.3) / 0.4);
        c.visible = q > 0 && p.accion !== "tortillas"; c.position.y = 0.22 + (1 - easeIn(q)) * 2;
        const dor = uc >= 99 ? 1 : clamp((uc - 2) / (d("cebollitas") - 3));
        c.children[0].material = M("#" + new THREE.Color("#f6f1e4").lerp(new THREE.Color("#d9a86a"), dor).getHexString());
        c.rotation.x = p.accion === "cebollitas" ? Math.floor(clamp((uc - 2) / 1.6) * 4) * 1.57 + n : 0;
      });
      tortisG.forEach((t2, n) => {
        const on = p.accion === "tortillas", q = clamp((u - 0.3 - n * 0.3) / 0.4);
        t2.visible = on && q > 0; t2.position.y = 0.13 + (1 - easeIn(q)) * 2;
        const inf = on ? Math.max(0, Math.sin(Math.PI * clamp((u - 1.8 - n * 0.5) / 1.5))) : 0; t2.scale.set(1, 1 + inf * 5, 1);
        t2.rotation.x = on ? Math.PI * clamp((u - 3.8 - n * 0.3) / 0.4) : 0;
      });
      // gota de agua que chisporrotea
      const tg = p.accion === "calienta" ? u - p.dur * 0.6 : -9;
      gotaCA.visible = tg > -0.6 && tg < 0; gotaCA.position.set(0.1, 0.2 + clamp(-tg / 0.6) * 1.8, 0);
      salpicas.forEach((s, n) => { const v = tg - n * 0.05; s.visible = v > 0 && v < 0.9; const a = n * 0.785; s.position.set(0.1 + Math.cos(a) * v * 0.5, 0.18 + Math.sin(Math.PI * clamp(v / 0.9)) * 0.35, Math.sin(a) * v * 0.5); });
    }
    if (tablaCA.visible) {
      const ur = lu("reposa"), up = lu("pica");
      fileteT.userData.marcas.forEach(m => m.visible = true);
      vaporT.forEach((v, n) => { const ph = (t * 0.5 + n / 6) % 1; v.visible = p.accion === "reposa"; v.position.set(-0.15 + Math.sin(n * 2 + t) * 0.3, 0.2 + ph * 1.4, Math.cos(n * 1.3) * 0.2); v.scale.setScalar(0.5 + ph); v.material.opacity = 0.25 * Math.sin(ph * Math.PI); });
      const qf = p.accion === "reposa" ? clamp((u - 0.8) / 0.5) : 1;
      fileteT.position.y = 0.1 + (1 - easeIn(qf)) * 2;
      fibras.forEach(f => f.visible = p.accion === "pica" && u < 5.5);
      const corte = p.accion === "pica" ? clamp((u - 1.2) / 3.5) : 0, cubo = p.accion === "pica" ? clamp((u - 6) / 3) : 0;
      fileteT.visible = corte < 0.98; fileteT.scale.set(1.3 * (1 - corte), 1, 1.4); fileteT.position.x = -0.15 + 0.55 * corte;
      tirasCA.forEach((tr, n) => { tr.visible = p.accion === "pica" && n / 8 < corte && cubo < 0.3; tr.position.x = 0.4 - n * 0.14; });
      cubosCA.forEach((c, n) => c.visible = n / cubosCA.length < cubo);
      cuchilloCA.visible = p.accion === "pica";
      if (p.accion === "pica") {
        const pic = cubo > 0;
        cuchilloCA.rotation.set(0, pic ? 0.6 + Math.sin(u * 3) * 0.6 : Math.PI / 2, 0);
        cuchilloCA.position.set(pic ? -0.2 + Math.sin(u * 2) * 0.3 : 0.4 - corte * 1.1, 0.3 + Math.abs(Math.sin(u * 14)) * 0.3, 0);
      }
    }
    // el plato se va armando en "arma" y se queda en el final
    const uA = lu("arma"), enArma = p.accion === "arma" || p.accion === "outro";
    const sa = enHook || uA >= 99 ? 99 : uA;
    if (enArma || enHook) { plato.visible = true; plato.scale.setScalar(p.accion === "arma" && !enHook ? Math.max(0.001, easeOutBack(clamp(u / 0.5))) : 1); }
    tacosCA.forEach(({ tor, carneT, ceb, cil, sal }, n) => {
      tor.forEach((d2, k) => { const q = clamp((sa - 0.4 - n * 0.3 - k * 0.15) / 0.3); d2.visible = q > 0; d2.position.y = k * 0.035 + (1 - easeIn(q)) * 2; });
      carneT.forEach((c, k) => { const q = clamp((sa - 2.0 - n * 0.5 - k * 0.03) / 0.35); c.visible = q > 0; c.position.y = c.userData.y0 + (1 - easeIn(q)) * 1.5; });
      ceb.forEach((c, k) => c.visible = sa > 4.2 + n * 0.25 + k * 0.03);
      cil.forEach((c, k) => c.visible = sa > 5.0 + n * 0.25 + k * 0.03);
      sal.forEach((c, k) => c.visible = sa > 8.0 + n * 0.3 + k * 0.05);
    });
    limonesCA.forEach((l, n) => l.visible = sa > 6.2 + n * 0.3);
    cebPlato.forEach((c, n) => { const q = clamp((sa - 10 - n * 0.3) / 0.35); c.visible = q > 0; c.position.y = 0.12 + (1 - easeIn(q)) * 1.5; });
  }

  // --- ratatouille ---
  hornoR.visible = ESRATA;
  if (ESRATA) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const d = j0 => pasos[idxDe(j0)].dur;
    const up = lu("precalienta"), ub = lu("base"), uc = lu("rodajas"), ue = lu("espiral"), ua = lu("aliña"), ut = lu("tapa"), ud = lu("destapa");
    const calor = up < 0 ? 0 : up >= 99 ? 1 : clamp((up - 0.8) / 2);
    perillaH.rotation.z = -calor * 2.6;
    ventanaH.material.color.set(new THREE.Color("#1a1a1a").lerp(new THREE.Color("#ff9a3a"), calor * (0.75 + 0.1 * Math.sin(t * 8))));
    pantallaH.visible = calor > 0.5; luzH.intensity = p.accion === "precalienta" ? calor * 3 : 0;
    rataG.visible = !enHook && ub >= 0 && p.accion !== "rodajas" && !(serveI >= 0 && i >= serveI);
    tablaV.visible = p.accion === "rodajas";
    if (rataG.visible) {
      const qs = ub >= 99 ? 1 : clamp((ub - 0.3) / 2); salsaR.scale.setScalar(Math.max(0.01, easeOut(qs)));
      const nE = espiralR.length, qe = ue < 0 ? 0 : ue >= 99 ? 1 : clamp((ue - 0.4) / (d("espiral") - 1.4));
      const dor = ud < 0 ? 0 : ud >= 99 ? 1 : clamp(ud / (d("destapa") * 0.8));
      espiralR.forEach((pv, n) => {
        const v = clamp((qe * (nE + 3) - n) / 3); pv.visible = v > 0; pv.position.y = 0.42 + (1 - easeIn(v)) * 1.2;
      });
      VERD.forEach(([l], k) => l.color.set(new THREE.Color(["#5b2a6e", "#3f8f2f", "#c8361f", "#e8b820"][k]).lerp(new THREE.Color("#5a2e14"), dor * 0.35)));
      hierbas.forEach((h, n) => { const v = ua < 0 ? 0 : ua >= 99 ? 1 : clamp((ua - 2.5 - n * 0.04) / 0.4); h.visible = v > 0; h.position.y = 0.52 + (1 - easeIn(v)) * 1.5; });
      const ta = ut < 0 ? 0 : ut >= 99 ? 1 : easeOutBack(clamp((ut - 0.3) / 0.7));
      const qt = ud < 0 ? 0 : ud >= 99 ? 1 : clamp((ud - 0.3) / 0.9);
      aluminio.visible = ta > 0 && qt < 1; aluminio.position.y = 0.6 + (1 - ta) * 2.5 + easeIn(qt) * 3; aluminio.rotation.z = qt * 0.6;
      luzR.intensity = ["tapa", "destapa"].includes(p.accion) && (p.accion === "destapa" || u > 2.5) ? 4 + Math.sin(t * 12) : 0;
    }
    if (tablaV.visible) {
      const ciclo = d("rodajas") - 1.0, f = clamp((u - 0.5) / ciclo) * 4, k = Math.min(3, Math.floor(f)), ph = f - Math.floor(f);
      troncosV.forEach((tr, n) => { const q = n < k ? 1 : n === k ? ph : 0; tr.scale.y = 1 - q * 0.75; tr.position.x = -0.35 - q * 0.37; });
      pilasV.forEach((pl, n) => pl.forEach((s, j) => { s.visible = n < k || (n === k && ph * 6 > j); }));
      cuchilloV.position.set(0.15 - (k === 3 && ph > 0.98 ? 0 : 0), 0.32 + Math.abs(Math.sin(u * 12)) * 0.2, -0.55 + k * 0.37);
    }
  }

  // --- nachos ---
  tablaN.visible = ESNACHOS && p.accion === "pico";
  guacG.visible = ESNACHOS && p.accion === "guacamole";
  charola.visible = ESNACHOS && ["capa", "hornea"].includes(p.accion);
  tele.visible = ESNACHOS && ["intro", "secreto", "outro"].includes(p.accion);
  listaN.forEach(o => o.visible = false); palomitas.forEach(m => m.visible = false);
  if (ESNACHOS) {
    tazon.visible = false; relleno.visible = false;
    // lista: cobija, control y café (en el intro) y otra vez al final
    if (["intro", "secreto", "outro"].includes(p.accion)) {
      const tL = p.accion === "intro" ? [0.3, 1.7, 3.7] : [-9, -9, -9];
      listaN.forEach((o, n) => {
        const q = p.accion === "intro" ? clamp((u - tL[n]) / 0.4) : 1;
        o.visible = q > 0; const s2 = Math.max(0.001, easeOutBack(q)); o.scale.setScalar(s2);
        o.rotation.y = Math.sin(t * 1.2 + n) * 0.2;
        const pm = palomitas[n]; const qp = p.accion === "intro" ? clamp((u - tL[n] - 0.5) / 0.3) : 1;
        pm.visible = qp > 0; pm.scale.setScalar(Math.max(0.001, easeOutBack(qp))); pm.position.set(o.position.x + 0.35, 1.0, o.position.z + 0.1);
      });
      if (p.accion === "outro") { controlG.position.set(-0.1, 1.45 + Math.sin(t * 8) * 0.05, 0.3); controlG.rotation.set(0.4, 0, Math.sin(t * 10) * 0.15); } else { controlG.position.set(-0.95, 0.25, 0.9); controlG.rotation.set(0, 0, 0); }
      luzTV.intensity = 2.5 + Math.sin(t * 6) * 0.6;
    }
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const capaIs = pasos.map((s2, j) => s2.accion === "capa" ? j : -1).filter(j => j >= 0);
    // horno (precalienta)
    hornoR.visible = p.accion === "precalienta";
    if (hornoR.visible) {
      const calor = clamp((u - 0.8) / 2);
      perillaH.rotation.z = -calor * 2.6;
      ventanaH.material.color.set(new THREE.Color("#1a1a1a").lerp(new THREE.Color("#ff9a3a"), calor * (0.75 + 0.1 * Math.sin(t * 8))));
      pantallaH.visible = calor > 0.5; luzH.intensity = calor * 3;
    }
    if (p.accion === "pico") {
      const ph = clamp((u - 0.3) / (p.dur - 2.2));
      pilasN.forEach((arr, k) => arr.forEach((c, n) => c.visible = ph * 3 - k > n / arr.length));
      cuchilloN.position.set(-0.6 + Math.min(2, Math.floor(ph * 3)) * 0.6 + Math.sin(u * 3) * 0.12, 0.3 + Math.abs(Math.sin(u * 14)) * 0.3, -0.3); cuchilloN.rotation.y = 0.5;
      const ul = u - (p.dur - 1.6); limonN.visible = ul > -0.3; limonN.position.set(0, 0.9 - clamp(ul / 0.5) * 0.2, 0); limonN.scale.set(1, 1 - clamp(ul / 0.5) * 0.3, 1);
    }
    if (p.accion === "guacamole") {
      const m = clamp((u - 0.6) / 3);
      mitadesA.forEach((a, n) => { a.visible = m < 0.6; a.scale.set(1.3, 1.3 * (1 - m), 1.3); });
      guacMasa.scale.set(1, 0.15 + m * 0.35, 1); guacMasa.material = M("#" + new THREE.Color("#b9d45a").lerp(new THREE.Color("#8fb636"), m).getHexString());
      tenedor.position.set(Math.sin(u * 7) * 0.25, 0.95 - Math.abs(Math.sin(u * 7)) * 0.25, Math.cos(u * 5) * 0.15); tenedor.rotation.z = 0.3;
    }
    if (charola.visible) {
      capasN.forEach(({ tot, fri, que }, k) => {
        const uc = capaIs[k] === undefined ? -1 : i > capaIs[k] ? 99 : i === capaIs[k] ? u : -1;
        const dd = capaIs[k] !== undefined ? pasos[capaIs[k]].dur : 8;
        tot.forEach((tt, n) => { const q = clamp((uc - 0.8 - n * 0.06) / 0.35); tt.visible = q > 0; tt.position.y = tt.userData.y0 + (1 - easeIn(q)) * 2; });
        fri.forEach((f, n) => { const q = clamp((uc - dd * 0.45 - n * 0.12) / 0.3); f.visible = q > 0; f.scale.set(q, 0.4 * q, q); });
        que.forEach((qq, n) => { const v = clamp((uc - dd * 0.68 - n * 0.03) / 0.3); qq.visible = v > 0; qq.position.y = qq.userData.y0 + (1 - easeIn(v)) * 1.5; });
      });
      const uh = lu("hornea"), hk = uh < 0 ? 0 : uh >= 99 ? 1 : clamp(uh / (pasos[idxDe("hornea")].dur * 0.8));
      capasN.forEach(({ que }) => que.forEach(qq => qq.material = M(hk > 0.5 ? "#f6b62e" : COL_QUESO_N)));
      quesoDerretido.visible = hk > 0.3; quesoDerretido.material.opacity = 0.85 * clamp((hk - 0.3) / 0.4);
      burbN.forEach((b, n) => { const on = hk > 0.5 && Math.sin(t * 6 + n * 2.1) > 0; b.visible = on; b.scale.setScalar(on ? 0.5 + Math.abs(Math.sin(t * 9 + n)) : 1); });
      luzCh.intensity = p.accion === "hornea" ? 4 + Math.sin(t * 12) : 0;
    }
  }
  // --- día uno de GTA VI: cereal ---
  cajaCer.visible = false; lecheCer.visible = false; chorroCer.visible = false; cayendo.forEach(c => c.visible = false);
  cerealSup.visible = false; piezasCer.forEach(c => c.visible = false);
  if (ESCEREAL) {
    plato.visible = false;
    tele.visible = ["hook", "juega", "control", "outro"].includes(p.accion);
    if (tele.visible) luzTV.intensity = 2.5 + Math.sin(t * 6) * 0.6;
    controlG.visible = ["hook", "juega", "control", "outro"].includes(p.accion);
    controlG.position.set(-0.2 + Math.sin(t * 9) * 0.03, 1.12, 0.45); controlG.rotation.set(0.4, 0, Math.sin(t * 11) * 0.12);
    tazon.visible = !["hook", "juega"].includes(p.accion) || (p.accion === "juega" && u > p.dur - 0.6);
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const up = lu("prepara"), ul = lu("leche");
    const hC = up < 0 ? 0 : up >= 99 ? 0.82 : 0.1 + 0.72 * clamp((up - 0.8) / 3);
    let hL = up < 0 ? 0 : up >= 99 ? 0.25 : 0.25 * clamp((up - 5) / 1.8);
    if (ul >= 0) hL += 0.05 * clamp((ul - 1.0) / 0.8) + 0.05 * clamp((ul - 4.3) / 0.8);
    relleno.visible = false; remolino.visible = false;
    if (hC > 0.1) {
      const leche0 = hL > 0.02;
      cerealSup.visible = true; cerealSup.position.y = hC - 0.02; cerealSup.scale.setScalar(radioTazon(hC) - 0.03);
      cerealSup.material = M(leche0 ? "#fbfaf6" : "#e8c27a");
      piezasCer.forEach((c, n) => { const r = c.userData.r * (radioTazon(hC) - 0.08), a = c.userData.a; c.visible = n / piezasCer.length < (hC - 0.1) / 0.72 + 0.05; c.position.set(Math.cos(a) * r, hC + 0.01 + (leche0 ? Math.sin(t * 2 + n) * 0.01 : hash(n + 904) * 0.04), Math.sin(a) * r); });
    }
    if (p.accion === "prepara") {
      const qc = clamp(u / 0.5) * (1 - clamp((u - 3.9) / 0.4));
      cajaCer.visible = qc > 0.01; cajaCer.position.set(BOWL.x + 0.75, 1.9 + (1 - qc) * 1.5, BOWL.z); cajaCer.rotation.set(0, 0, qc * 2.1);
      cayendo.forEach((c, n) => { const ph = ((u * 1.6 + n / cayendo.length) % 1); c.visible = u > 0.6 && u < 3.9; c.position.set(BOWL.x + 0.3 + Math.sin(n * 2.1) * 0.12, 1.65 - ph * 1.0, BOWL.z + Math.cos(n * 1.7) * 0.1); c.rotation.set(n + u * 5, n, 0); });
      const ql = clamp((u - 4.4) / 0.5) * (1 - clamp((u - 7.2) / 0.4));
      lecheCer.visible = ql > 0.01; lecheCer.position.set(BOWL.x + 0.7, 1.8 + (1 - ql) * 1.5, BOWL.z); lecheCer.rotation.set(0, 0, ql * 1.9);
      chorroCer.visible = u > 5 && u < 7.0; chorroCer.position.set(BOWL.x + 0.3, 1.25, BOWL.z); chorroCer.scale.set(1, 0.9, 1);
    }
    if (p.accion === "leche") {
      const ql = clamp((u - 0.4) / 0.4) * (1 - clamp((u - 5.6) / 0.4));
      lecheCer.visible = ql > 0.01; lecheCer.position.set(BOWL.x + 0.7, 1.8 + (1 - ql) * 1.5, BOWL.z);
      const vierte = (u > 1.0 && u < 1.8) || (u > 4.3 && u < 5.1);
      lecheCer.rotation.set(0, 0, ql * (vierte ? 1.9 : 0.9));
      chorroCer.visible = vierte; chorroCer.position.set(BOWL.x + 0.3, 1.25, BOWL.z); chorroCer.scale.set(0.6, 0.9, 0.6);
    }
  }
  // --- lasaña ---
  refL.visible = ESLASANA && ["arma", "queso", "hornea", "reposa"].includes(p.accion);
  relojL.visible = ESLASANA && p.accion === "reposa";
  verdL.forEach(c => c.visible = false); carneL.forEach(c => c.visible = false); bloqueMolida.visible = false; burbL.forEach(b => b.visible = false);
  bechOlla.visible = false; mantL.visible = false; grumos.forEach(g => g.visible = false); remBech.visible = false; chorroL.visible = false;
  if (ESLASANA) {
    tazon.visible = false; relleno.visible = false; remolino.visible = false;
    tele.visible = p.accion === "sobras"; if (tele.visible) luzTV.intensity = 2 + Math.sin(t * 6) * 0.5;
    hornoR.visible = p.accion === "precalienta";
    if (hornoR.visible) { const calor = clamp((u - 0.5) / 1.5); perillaH.rotation.z = -calor * 2.6; ventanaH.material.color.set(new THREE.Color("#1a1a1a").lerp(new THREE.Color("#ff9a3a"), calor * (0.75 + 0.1 * Math.sin(t * 8)))); pantallaH.visible = calor > 0.5; luzH.intensity = calor * 3; }
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const uS = lu("sofrie"), uC = lu("carne"), uSa = lu("salsa");
    const enSarten = ["sofrie", "carne", "salsa"].includes(p.accion);
    const enOlla = p.accion === "bechamel";
    sarten.visible = enSarten || enOlla; olla.visible = false;
    llama.visible = enSarten || enOlla; llama.material.opacity = 0.6 + 0.3 * Math.sin(t * 25);
    vapor.forEach(v => v.visible = enSarten || enOlla);
    CH.raiz.updateMatrixWorld(true);
    const puntoMano = obj => obj.getWorldPosition(new THREE.Vector3());
    const chorro = (A, yB, col, ancho) => { chorroL.visible = true; chorroL.material = M(col); const h = Math.max(0.05, A.y - yB); chorroL.position.set(A.x, yB + h / 2, A.z); chorroL.scale.set(ancho, h, ancho); };
    if (enSarten) {
      const qv = uS >= 99 ? 1 : clamp((uS - 0.3) / 1.2);
      verdL.forEach((c, n) => { c.visible = qv > n / verdL.length; const [x, z] = c.userData.p; const giro = p.accion === "sofrie" ? u * 1.5 : 0; c.position.set(x * Math.cos(giro) - z * Math.sin(giro), 0.17 + (n % 3) * 0.02, x * Math.sin(giro) + z * Math.cos(giro)); c.material = M(n % 3 === 1 ? "#f08a2c" : uS >= 99 || (p.accion === "sofrie" && u > 4) ? "#f3e2b0" : "#f6efe0"); });
      if (uC >= 0) {
        bloqueMolida.visible = p.accion === "carne" && u < 2.2; const qb = clamp((u - 0.3) / 0.4); bloqueMolida.position.set(0, 0.22 + (1 - easeIn(qb)) * 2, 0); bloqueMolida.scale.set(1 - clamp((u - 1.2) / 1) * 0.7, 0.45, 1 - clamp((u - 1.2) / 1) * 0.7);
        const sep = uC >= 99 ? 1 : clamp((uC - 1.2) / 2.5), dor = uC >= 99 ? 1 : clamp((uC - 2.5) / 4);
        carneL.forEach((c, n) => { c.visible = sep > 0; const [x, z] = c.userData.p; c.position.set(x * sep, 0.2 + (n % 2) * 0.03 + Math.abs(Math.sin(t * 10 + n)) * 0.02 * (p.accion === "carne" ? 1 : 0), z * sep); c.material = M("#" + new THREE.Color("#d98a86").lerp(new THREE.Color("#7a4228"), dor).getHexString()); });
      }
      if (uSa >= 0) {
        const qs = clamp((uSa - 0.7) / 1.8);
        sartenRelleno.visible = qs > 0; sartenRelleno.material = M(COL_BOLO); sartenRelleno.scale.set(0.6 + qs * 0.4, 0.5 + qs * 2.2, 0.6 + qs * 0.4);
        carneL.forEach(c => { c.material = M("#8a3a22"); c.position.y = 0.22; });
        burbL.forEach((b, n) => { const on = u > 3 && Math.sin(t * 6 + n * 2.1) > 0.2; b.visible = on; b.scale.setScalar(on ? 0.6 + Math.abs(Math.sin(t * 9 + n)) * 0.8 : 1); });
        if (u > 0.7 && u < 2.4) chorro(puntoMano(cajaPure), PAN.y + 0.35, COL_BOLO, 1.3);
      } else sartenRelleno.visible = false;
    } else sartenRelleno.visible = false;
    if (enOlla) {
      const qm = clamp((u - 0.2) / 0.4); mantL.visible = u < 1.8; mantL.position.set(0, 0.2 + (1 - easeIn(qm)) * 1.8, 0); mantL.scale.setScalar(Math.max(0.01, 1 - clamp((u - 0.7) / 1.0)));
      const nivel = 0.14 + 0.08 * clamp((u - 4.6) / 4.6);
      bechOlla.visible = u > 0.8; bechOlla.position.y = nivel; bechOlla.scale.set(1, 1, 1);
      const blanco = clamp((u - 4.6) / 5);
      bechOlla.material = M("#" + new THREE.Color(u < 1.8 ? "#ffe27a" : "#efd9a0").lerp(new THREE.Color(COL_BECH_L), blanco).getHexString());
      grumos.forEach((g, n) => { g.visible = u > 2 && u < 10 && n / grumos.length > clamp((u - 5) / 4.5); g.position.y = nivel + 0.03; });
      remBech.visible = u > 1.8; remBech.position.y = nivel + 0.025; remBech.rotation.z = u * 10;
      const pulso = [4.8, 6.6, 8.4].some(t0 => u > t0 && u < t0 + 0.9);
      if (pulso) chorro(puntoMano(lecheL), PAN.y + 0.1 + nivel, "#fbfaf6", 1);
    }
    if (refL.visible) {
      const ua = lu("arma"), uq = lu("queso"), uh = lu("hornea");
      // tiempos de cada capa dentro de "arma"
      const tCapa = n => n === 0 ? 0.4 : (() => { const k = Math.floor((n - 1) / 4), j = (n - 1) % 4; return 1.4 + k * 3.3 + j * 0.8; })();
      capasL.forEach((m, n) => {
        if (m === capaTopBech) { const q = clamp((uq - 0.3) / 0.9); m.visible = q > 0; m.scale.set(1, Math.max(0.01, q), 1); m.position.y = m.userData.y0 - m.userData.h * (1 - q) / 2; return; }
        const q = clamp((ua - tCapa(n)) / 0.55);
        m.visible = q > 0;
        if (m.userData.tipo === "lam") { m.scale.set(1, 1, 1); m.position.y = m.userData.y0 + (1 - easeOut(q)) * 0.6; }
        else { m.scale.set(0.5 + q * 0.5, Math.max(0.01, q), 0.5 + q * 0.5); m.position.y = m.userData.y0 - m.userData.h * (1 - q) / 2; }
      });
      if (p.accion === "arma") { const c = (u - 1.4) % 3.3, j = Math.floor(c / 0.8); cucharon.userData.cont.material = M(j === 1 ? COL_BOLO : COL_BECH_L); }
      if (p.accion === "queso") cucharon.userData.cont.material = M(COL_BECH_L);
      quesoTop.forEach((q, n) => { const v = clamp((uq - 1.5 - n * 0.035) / 0.35); q.visible = v > 0; q.position.y = q.userData.y0 + (1 - easeIn(v)) * 1.6; });
      const tapado = uh >= 0 && uh < 99 && uh < 4.3, dorado = uh >= 99 ? 1 : uh < 0 ? 0 : clamp((uh - 4.6) / 3);
      aluL.visible = p.accion === "hornea" && uh < 4.8; aluL.position.y = 0.66 + clamp((uh - 3.8) / 0.8) * 1.2;
      gratin.visible = dorado > 0.05; gratin.scale.set(1, Math.max(0.01, dorado), 1);
      quesoTop.forEach(q => { if (dorado > 0.3) q.visible = false; });
      manchas.forEach((m, n) => m.visible = dorado > 0.4 + (n / manchas.length) * 0.5);
      luzL.intensity = p.accion === "hornea" ? 4 + Math.sin(t * 12) : 0;
      cortesL.forEach(c => c.visible = false);
      vaporL.forEach((v, n) => { const ph = (t * 0.45 + n / 6) % 1; v.visible = p.accion === "reposa" || (p.accion === "hornea" && !tapado); v.position.set(Math.sin(n * 2 + t) * 0.6, yL + 0.1 + ph * 1.6, Math.cos(n * 1.3) * 0.3); v.scale.setScalar(0.5 + ph); v.material.opacity = 0.28 * Math.sin(ph * Math.PI); });
      refL.rotation.y = 0;
    }
    if (relojL.visible) { agujaL.rotation.z = -clamp(u / (p.dur - 0.6)) * Math.PI * 2; relojL.rotation.z = Math.sin(t * 30) * 0.03 * (u > p.dur - 1 ? 1 : 0); relojL.scale.setScalar(1 + (u > p.dur - 1 ? Math.abs(Math.sin(t * 20)) * 0.08 : 0)); }
    // plato servido
    platoL.visible = true; pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const sv = ["serve", "outro"].includes(p.accion) ? (p.accion === "outro" ? 99 : u) : -1;
    const qc = clamp((sv - 0.3) / 0.6); cuadroL.visible = qc > 0; cuadroL.position.y = (1 - easeOutBack(qc)) * 1.2;
    parmL.forEach((q, n) => { const v = clamp((sv - 1.4 - n * 0.04) / 0.3); q.visible = v > 0; q.position.y = q.userData.y0 + (1 - easeIn(v)) * 0.8; });
    albL.visible = sv > 3;
  }
  // --- tiramisú ---
  tazCafe.visible = ESTIRA && ["cafe", "moja"].includes(p.accion);
  platoSol.visible = ESTIRA && p.accion === "moja";
  refT.visible = ESTIRA && ["capa", "refri", "cacao"].includes(p.accion);
  refri.visible = false; relojT.visible = false; masaT.visible = false; picosT.forEach(c => c.visible = false); gotasVain.forEach(g => g.visible = false); cucharadas.forEach(c => c.visible = false);
  if (ESTIRA) {
    sarten.visible = false; llama.visible = false; vapor.forEach(v => v.visible = false); olla.visible = false;
    tazon.visible = ["bate", "mascarpone", "envuelve"].includes(p.accion); relleno.visible = false; remolino.visible = false;
    tele.visible = ["hook", "outro"].includes(p.accion) || (p.accion === "serve" && u > p.dur - 2); if (tele.visible) luzTV.intensity = 2.5 + Math.sin(t * 6) * 0.6;
    controlG.visible = ["hook", "outro"].includes(p.accion);
    if (controlG.visible) { controlG.position.set(CH.raiz.position.x, CH.raiz.position.y + 1.12, CH.raiz.position.z + 0.8); controlG.rotation.set(0.4, 0, Math.sin(t * 11) * 0.12); }
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    CH.raiz.updateMatrixWorld(true);
    const chorro = (A, yB, col, ancho) => { chorroL.visible = true; chorroL.material = M(col); const h = Math.max(0.05, A.y - yB); chorroL.position.set(A.x, yB + h / 2, A.z); chorroL.scale.set(ancho, h, ancho); };
    // café
    if (tazCafe.visible) {
      const nv = p.accion === "cafe" ? clamp((u - 0.9) / 2.6) : 1, h = 0.06 + 0.3 * nv;
      cafeLiq.visible = nv > 0.02; cafeLiq.position.y = h; cafeLiq.scale.setScalar(0.33 + 0.33 * Math.sqrt(h / 0.5));
      if (p.accion === "cafe" && u > 0.9 && u < 3.4) chorro(jarraCafe.getWorldPosition(new THREE.Vector3()), 0.05 + h, COL_CAFE, 1);
      const caliente = p.accion === "cafe" ? 1 - clamp((u - 4) / 2) : 0;
      vaporT2.forEach((v, n) => { const ph = (t * 0.5 + n / 5) % 1; v.visible = caliente > 0.05; v.position.set(Math.sin(n * 2 + t) * 0.25, h + 0.1 + ph * 1.2, Math.cos(n * 1.3) * 0.2); v.scale.setScalar(0.5 + ph); v.material.opacity = 0.3 * caliente * Math.sin(ph * Math.PI); });
      if (p.accion === "moja") { const ciclos = Math.floor(u / 2.8); solMojadas.forEach((s, n) => s.visible = n < ciclos * 2); }
    }
    // tazón: crema batida, mascarpone y envolver
    if (tazon.visible) {
      masaT.visible = true;
      if (p.accion === "bate") { const v = clamp((u - 0.3) / (p.dur - 1.8)); masaT.material = M("#fdf0cf"); masaT.scale.set(0.95, 0.25 + v * 0.35, 0.95); masaT.position.y = 0.45 + v * 0.15; picosT.forEach((c, n) => { c.visible = v > 0.55 + n * 0.04; c.position.y = masaT.position.y + 0.7 * masaT.scale.y * 0.9; }); }
      if (p.accion === "mascarpone") { masaT.material = M("#f0d9a6"); masaT.scale.set(0.9, 0.35, 0.9); masaT.position.y = 0.5; remolino.visible = u > 1.5; remolino.position.y = 0.76; remolino.rotation.z = u * 3; remolino.material = M("#dcc08a"); gotasVain.forEach((g, n) => { const q = clamp((u - 0.4 - n * 0.2) / 0.4); g.visible = q > 0 && q < 1; g.position.set(0.1, 0.78 + (1 - q) * 1.2, 0); }); }
      if (p.accion === "envuelve") { masaT.material = M("#" + new THREE.Color("#f0d9a6").lerp(new THREE.Color("#f8e8c4"), clamp(u / p.dur)).getHexString()); masaT.scale.set(0.95, 0.35 + clamp(u / p.dur) * 0.15, 0.95); masaT.position.y = 0.5;
        cucharadas.forEach((c, n) => { const t0 = 0.4 + n * 2.2, q = clamp((u - t0) / 0.4), d = clamp((u - t0 - 0.8) / 1.2); c.visible = q > 0 && d < 1; c.position.set((n - 1) * 0.25, 0.82 + (1 - easeIn(q)) * 1.5, 0); c.scale.set(1 - d * 0.6, 0.6 * (1 - d), 1 - d * 0.6); });
        remolino.visible = true; remolino.position.y = 0.82; remolino.rotation.z = u * 2; remolino.material = M("#dcc08a"); }
    }
    // refractario
    if (refT.visible) {
      const capaIs = pasos.map((s2, j) => s2.accion === "capa" ? j : -1).filter(j => j >= 0);
      capasT.forEach(({ sol, cr }, k) => {
        const uc = capaIs[k] === undefined ? -1 : i > capaIs[k] ? 99 : i === capaIs[k] ? u : -1;
        sol.forEach((s, n) => { const q = clamp((uc - 0.3 - n * 0.16) / 0.25); s.visible = q > 0; s.position.y = s.userData.y0 + (1 - easeOut(q)) * 0.5; });
        const qc = clamp((uc - 3.0) / 1.8); cr.visible = qc > 0; cr.scale.set(0.15 + qc * 0.85, Math.max(0.05, qc), 0.4 + qc * 0.6);
      });
      const ur = lu("refri"), uca = lu("cacao");
      plastico.visible = ur >= 0 && (ur >= 99 ? false : true) && p.accion === "refri"; plastico.material.opacity = 0.35 * clamp((ur - 0.3) / 0.8);
      cacaoTop.visible = uca > 0.5; cacaoTop.material.opacity = clamp((uca - 0.5) / 3.5); cacaoTop.material.transparent = true;
      if (p.accion === "refri") {
        refri.visible = u > 1.1; const qr = clamp((u - 1.1) / 0.6); refri.scale.setScalar(Math.max(0.001, easeOutBack(qr)) * 0.8);
        puertaRefri.rotation.y = -1.9 * (1 - ease(clamp((u - 2.4) / 0.9)));
        relojT.visible = u > 3.4; relojT.scale.setScalar(easeOutBack(clamp((u - 3.4) / 0.4))); agujaT.rotation.z = -clamp((u - 3.6) / (p.dur - 4)) * Math.PI * 12;
      }
    }
    // plato servido
    platoT.visible = true; pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const sv = ["serve", "outro"].includes(p.accion) ? (p.accion === "outro" ? 99 : u) : -1;
    const qc = clamp((sv - 0.3) / 0.6); cuadroT.visible = qc > 0; cuadroT.position.y = (1 - easeOutBack(qc)) * 1.2;
    cacaoPolvo.forEach((q, n) => q.visible = sv > 1.4 + n * 0.05);
    granoCafe.visible = sv > 2.4;
  } else { platoT.visible = false; }
  if (!ESMOST) platoM.visible = false;
  // --- mostachón ---
  moldeM.visible = ESMOST && ["molde", "hornea", "enfria", "unta", "fresas"].includes(p.accion);
  migasTaz.forEach(m => m.visible = false);
  if (ESMOST) {
    sarten.visible = false; llama.visible = false; vapor.forEach(v => v.visible = false); olla.visible = false;
    tazon.visible = ["claras", "envuelve", "relleno"].includes(p.accion); relleno.visible = false; remolino.visible = false;
    hornoR.visible = p.accion === "precalienta"; pantallaH.material.map = texT180;
    if (hornoR.visible) { const calor = clamp((u - 0.5) / 1.5); perillaH.rotation.z = -calor * 2.6; ventanaH.material.color.set(new THREE.Color("#1a1a1a").lerp(new THREE.Color("#ff9a3a"), calor * (0.75 + 0.1 * Math.sin(t * 8)))); pantallaH.visible = calor > 0.5; luzH.intensity = calor * 3; }
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    CH.raiz.updateMatrixWorld(true);
    if (tazon.visible) {
      masaT.visible = true;
      if (p.accion === "claras") {
        const v = clamp((u - 0.3) / (p.dur - 2.5)); masaT.material = M("#f3f1ea"); masaT.scale.set(0.95, 0.25 + v * 0.35, 0.95); masaT.position.y = 0.45 + v * 0.15;
        picosT.forEach((c, n) => { c.visible = v > 0.3 + n * 0.06; c.material = M("#f7f5ee"); c.position.y = masaT.position.y + 0.7 * masaT.scale.y * 0.9; });
        // la prueba: voltear el tazón y que no se caiga nada
        const vol = clamp((u - (p.dur - 1.8)) / 0.5) * (1 - clamp((u - (p.dur - 0.6)) / 0.5));
        tazon.rotation.z = vol * 2.7; tazon.position.y = vol * 1.1;
      } else { tazon.rotation.z = 0; tazon.position.y = 0; picosT.forEach(c => c.material = M("#fdf0cf")); }
      if (p.accion === "envuelve") {
        const m = clamp((u - 3) / 6); masaT.material = M("#" + new THREE.Color("#f3f1ea").lerp(new THREE.Color(COL_BASE_M), m).getHexString()); masaT.scale.set(0.95, 0.6 - m * 0.08, 0.95); masaT.position.y = 0.6;
        migasTaz.forEach((c, n) => { const q = clamp((u - 0.4 - n * 0.06) / 0.4); c.visible = q > 0; const a = Math.atan2(c.position.z, c.position.x) + m * 3; const r = Math.hypot(c.position.x, c.position.z); c.position.y = 0.6 + 0.7 * 0.55 + (1 - easeIn(q)) * 1.5; });
        remolino.visible = u > 3; remolino.position.y = 1.0; remolino.rotation.z = u * 2; remolino.material = M("#d9b47a");
      }
      if (p.accion === "relleno") {
        const nv = clamp((u - 0.8) / 2.2); masaT.material = M(u < 3.2 ? "#f0dcae" : "#f5e3bc"); masaT.scale.set(0.9, 0.35 + nv * 0.15, 0.9); masaT.position.y = 0.6;
        if (u > 0.8 && u < 2.9) { const A = lataLC.getWorldPosition(new THREE.Vector3()); chorroL.visible = true; chorroL.material = M("#f3e3bf"); const yB = 0.5 + 0.7 * 0.4 * 0.9 + 0.1, h = Math.max(0.05, A.y - yB); chorroL.position.set(A.x, yB + h / 2, A.z); chorroL.scale.set(1, h, 1); }
        cucharadas.forEach((c, n) => { const t0 = 6.6 + n * 1.1, q = clamp((u - t0) / 0.4), d = clamp((u - t0 - 0.6) / 0.9); c.visible = q > 0 && d < 1; c.position.set((n - 1) * 0.25, 0.82 + (1 - easeIn(q)) * 1.5, 0); c.scale.set(1 - d * 0.6, 0.6 * (1 - d), 1 - d * 0.6); });
        remolino.visible = u > 3.2; remolino.position.y = 0.82; remolino.rotation.z = u * (u < 6.5 ? 10 : 2); remolino.material = M("#e8d6ae");
      }
    } else { tazon.rotation.z = 0; tazon.position.y = 0; }
    if (moldeM.visible) {
      const um = lu("molde"), uh = lu("hornea"), ue = lu("enfria"), uu = lu("unta"), uf = lu("fresas");
      const altura = um >= 99 ? 0.26 : 0.26 * clamp((um - 0.3) / 2.2);
      baseM.visible = altura > 0.01; baseM.scale.set(1, Math.max(0.01, altura), 1); baseM.position.y = 0.04 + altura / 2;
      const dor = uh >= 99 ? 1 : uh < 0 ? 0 : clamp((uh - 0.5) / (pasos[idxDe("hornea")].dur - 1.5));
      baseM.material = M("#" + new THREE.Color(COL_BASE_M).lerp(new THREE.Color(COL_DORADO_M), dor).getHexString());
      migasM.forEach(m => { m.visible = baseM.visible; m.position.y = 0.045 + altura; });
      luzM.intensity = p.accion === "hornea" ? 4 + Math.sin(t * 12) : 0;
      const calorV = p.accion === "hornea" ? 0.6 : p.accion === "enfria" ? 1 - clamp(u / (p.dur - 1)) : 0;
      vapM.forEach((v, n) => { const ph = (t * 0.5 + n / 5) % 1; v.visible = calorV > 0.05; v.position.set(Math.sin(n * 2 + t) * 0.5, 0.35 + ph * 1.4, Math.cos(n * 1.3) * 0.3); v.scale.setScalar(0.5 + ph); v.material.opacity = 0.3 * calorV * Math.sin(ph * Math.PI); });
      const qr = uu >= 99 ? 1 : uu < 0 ? 0 : clamp((uu - 0.4) / 3.2);
      rellM.visible = qr > 0; rellM.scale.set(0.2 + qr * 0.8, 1, 0.2 + qr * 0.8); rellM.position.y = 0.04 + 0.26 + 0.06;
      fresasM.forEach((f, n) => { const q = clamp((uf - 0.3 - n * ((pasos[idxDe("fresas")] || { dur: 5 }).dur - 1.2) / fresasM.length) / 0.25); f.visible = q > 0; f.position.y = 0.04 + 0.26 + 0.13 + (1 - easeOut(q)) * 0.5; });
      relojT.visible = p.accion === "enfria"; if (relojT.visible) { relojT.position.set(BOWL.x + 1.15, 0.35, BOWL.z + 1.0); relojT.scale.setScalar(0.8 * easeOutBack(clamp(u / 0.4))); agujaT.rotation.z = -clamp(u / (p.dur - 0.6)) * Math.PI * 4; }
    }
    // plato servido
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const sv = ["serve", "outro"].includes(p.accion) ? (p.accion === "outro" ? 99 : u) : -1;
    const qc = clamp((sv - 0.3) / 0.6); rebM.visible = qc > 0; rebM.position.y = (1 - easeOutBack(qc)) * 1.2; fresaEntera.visible = sv > 1.6;
  }
  // --- pozole ---
  cazuela.visible = ESPOZ && ["cuecemaiz", "junta", "hierve"].includes(p.accion);
  ollaRoja.visible = ESPOZ && p.accion === "cuececarne";
  chilesTaz.forEach(c => c.visible = false);
  if (ESPOZ) {
    sarten.visible = p.accion === "friesalsa"; olla.visible = false;
    const enFuego = cazuela.visible || ollaRoja.visible || sarten.visible;
    llama.visible = sarten.visible; llama.material.opacity = 0.6 + 0.3 * Math.sin(t * 25);
    vapor.forEach(v => v.visible = enFuego);
    tazon.visible = ["remoja", "cuela"].includes(p.accion); remolino.visible = false;
    licuadora.visible = p.accion === "licua";
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    CH.raiz.updateMatrixWorld(true);
    const chorro = (A, yB, col, ancho) => { chorroL.visible = true; chorroL.material = M(col); const h = Math.max(0.05, A.y - yB); chorroL.position.set(A.x, yB + h / 2, A.z); chorroL.scale.set(ancho, h, ancho); };
    // cazuela: maíz que florea, luego todo junto
    if (cazuela.visible) {
      const um = lu("cuecemaiz"), uj = lu("junta"), uh = lu("hierve");
      const flor = um >= 99 ? 1 : clamp((um - 4) / (pasos[idxDe("cuecemaiz")].dur - 5));
      const rojo = uj < 0 ? 0 : uj >= 99 ? 1 : clamp((uj - 4.5) / 2.5);
      caldoC.material = M("#" + new THREE.Color("#d8e6ea").lerp(new THREE.Color(COL_CALDO_P), rojo).getHexString());
      granosC.forEach((g, n) => { const q = p.accion === "cuecemaiz" ? clamp((u - 0.5 - n * 0.05) / 0.4) : 1; g.visible = q > 0; g.position.y = 0.54 + (1 - easeIn(q)) * 1.6 + Math.sin(t * 5 + n) * 0.01;
        const f = clamp(flor * 1.3 - hash(n + 1710) * 0.3); g.userData.l.forEach((s, k) => { s.position.set(Math.cos(k * 2.09) * (0.02 + f * 0.035), f * 0.01, Math.sin(k * 2.09) * (0.02 + f * 0.035)); s.scale.setScalar(1 + f * 0.35); }); });
      cebAjo.forEach(m => m.visible = p.accion === "cuecemaiz" && u > 2.5);
      carneC.forEach((c, n) => { const q = uj < 0 ? 0 : uj >= 99 ? 1 : clamp((uj - 0.6 - n * 0.25) / 0.35); c.visible = q > 0; c.position.y = c.userData.y0 + (1 - easeIn(q)) * 1.8; c.material = M("#" + new THREE.Color("#d9b38c").lerp(new THREE.Color("#9a4a2a"), rojo).getHexString()); });
      const hirv = p.accion === "hierve" || (p.accion === "cuecemaiz" && u > 2) || (p.accion === "junta" && u > 6);
      burbC.forEach((b, n) => { const on = hirv && Math.sin(t * 7 + n * 1.9) > 0.1; b.visible = on; b.scale.setScalar(on ? 0.5 + Math.abs(Math.sin(t * 10 + n)) : 1); b.material = M(rojo > 0.5 ? "#d24a30" : "#ffffff"); });
      vapC.forEach((v, n) => { const ph = (t * 0.5 + n / 6) % 1; v.visible = hirv; v.position.set(Math.sin(n * 2 + t) * 0.5, 0.6 + ph * 1.5, Math.cos(n * 1.3) * 0.3); v.scale.setScalar(0.5 + ph); v.material.opacity = 0.28 * Math.sin(ph * Math.PI); });
      if (p.accion === "junta" && u > 4.3 && u < 6.6) chorro(new THREE.Vector3(PAN.x - 0.2, 2.3, PAN.z), 0.6, COL_CALDO_P, 1.6);
      if (p.accion === "cuecemaiz" && u > 0.5 && u < 2.2) chorro(new THREE.Vector3(PAN.x - 0.1, 2.3, PAN.z), 0.6, "#cfe3ee", 1.4);
    }
    if (ollaRoja.visible) {
      const c = clamp((u - 2) / (p.dur - 3));
      caldoR.material = M("#" + new THREE.Color("#dfe8ea").lerp(new THREE.Color("#e6d8b8"), c).getHexString());
      carneR.forEach((m, n) => { const q = clamp((u - 0.3 - n * 0.2) / 0.35); m.visible = q > 0; m.position.y = 0.57 + (1 - easeIn(q)) * 1.6; if (n < 7) m.material = M("#" + new THREE.Color("#e8a39a").lerp(new THREE.Color("#d9b38c"), c).getHexString()); });
      espumaR.forEach((e, n) => { const nace = clamp((u - 2.5) / 1.5), quita = clamp((u - 5 - (n / espumaR.length) * (p.dur - 6)) / 0.3); e.visible = nace > n / espumaR.length && quita < 1; e.scale.set(1 - quita, 0.45 * (1 - quita), 1 - quita); });
    }
    if (tazon.visible) {
      relleno.visible = true; const nv = p.accion === "remoja" ? 0.55 : 0.1 + 0.4 * clamp((u - 1.2) / 4.5);
      relleno.position.y = 0.08 + nv * 0.8; relleno.scale.setScalar(radioTazon(0.08 + nv * 0.8) - 0.02);
      relleno.material = M(p.accion === "remoja" ? "#" + new THREE.Color("#cfe3ee").lerp(new THREE.Color("#c46a4a"), clamp((u - 1.5) / 5)).getHexString() : "#a82a18");
      chilesTaz.forEach((c, n) => { const q = clamp((u - 0.3 - n * 0.2) / 0.35); c.visible = p.accion === "remoja" && q > 0; c.position.y = 0.08 + nv * 0.8 + 0.09 + (1 - easeIn(q)) * 1.5 + Math.sin(t * 2 + n) * 0.015; });
      if (p.accion === "cuela" && u > 1 && u < 6) chorro(colador.getWorldPosition(new THREE.Vector3()), 0.08 + nv * 0.8, "#a82a18", 0.8);
    }
    if (licuadora.visible) {
      const mezcla = clamp((u - 1.5) / 3);
      liquidoL.scale.y = 0.2 + mezcla * 0.8; liquidoL.position.y = 0.6 + liquidoL.scale.y * 0.5 + 0.02;
      liquidoL.material = M("#" + new THREE.Color("#c46a4a").lerp(new THREE.Color("#a82a18"), mezcla).getHexString());
      trozosL.forEach((o, n) => { const q = clamp((u - 0.2 - n * 0.12) / 0.4); o.visible = q > 0 && mezcla < 0.7; o.position.y = 0.85 + (n % 4) * 0.15 + (1 - easeIn(q)) * 2 + (mezcla > 0 ? Math.sin(t * 30 + n) * 0.1 : 0); o.rotation.y = t * 12 * mezcla + n; });
      const vibra = u > 1.5 && u < p.dur - 1 ? 1 : 0;
      licuadora.position.x = BOWL.x + Math.sin(t * 60) * 0.025 * vibra; licuadora.rotation.z = Math.sin(t * 47) * 0.015 * vibra;
      remL.visible = vibra > 0; remL.position.y = liquidoL.position.y + liquidoL.scale.y * 0.5 + 0.01; remL.rotation.z = t * 20;
    }
    if (sarten.visible) {
      const q = clamp((u - 0.3) / 1.2), osc = clamp((u - 2) / (p.dur - 3));
      sartenRelleno.visible = q > 0; sartenRelleno.scale.set(0.6 + q * 0.4, 0.5 + q * 1.2, 0.6 + q * 0.4);
      sartenRelleno.material = M("#" + new THREE.Color("#c24a2e").lerp(new THREE.Color("#8e1f12"), osc).getHexString());
      sartenRemolino.visible = u > 1.5; sartenRemolino.material = M("#b5402a"); sartenRemolino.rotation.z = u * 9;
    }
    // plato servido (también en el gancho)
    platoP.visible = true; pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const su2 = enHook || i > idxDe("serve") ? 99 : p.accion === "serve" ? u : -1;
    topP.maiz.forEach((g, n) => g.visible = su2 > 0.3 + n * 0.03);
    topP.carne.forEach((c, n) => c.visible = su2 > 0.8 + n * 0.15);
    topP.lech.forEach((l, n) => l.visible = su2 > 2.0 + n * 0.04);
    topP.rab.forEach((r, n) => r.visible = su2 > 3.4 + n * 0.12);
    topP.ceb.forEach((c, n) => c.visible = su2 > 4.4 + n * 0.04);
    topP.ore.forEach((c, n) => c.visible = su2 > 5.4 + n * 0.03);
    limonP.visible = su2 > 7.6; tostadaP.visible = su2 > 8.6;
  } else platoP.visible = false;
  // --- pastel azteca ---
  flamaA.visible = ESAZT && p.accion === "asa";
  sudaA.visible = ESAZT && p.accion === "suda";
  refA.visible = ESAZT && ["arma", "queso", "hornea"].includes(p.accion);
  pilaTort.visible = ESAZT && p.accion === "tortillas";
  rajasS.forEach(m => m.visible = false); tortAceite.visible = false;
  if (ESAZT) {
    sarten.visible = ["rajas", "tortillas"].includes(p.accion); olla.visible = false;
    llama.visible = sarten.visible; llama.material.opacity = 0.6 + 0.3 * Math.sin(t * 25);
    vapor.forEach(v => v.visible = sarten.visible || flamaA.visible);
    tazon.visible = false; relleno.visible = false; remolino.visible = false;
    licuadora.visible = p.accion === "salsa";
    hornoR.visible = p.accion === "precalienta"; pantallaH.material.map = texT180;
    if (hornoR.visible) { const calor = clamp((u - 0.4) / 1.4); perillaH.rotation.z = -calor * 2.6; ventanaH.material.color.set(new THREE.Color("#1a1a1a").lerp(new THREE.Color("#ff9a3a"), calor * (0.75 + 0.1 * Math.sin(t * 8)))); pantallaH.visible = calor > 0.5; luzH.intensity = calor * 3; }
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    if (flamaA.visible) {
      lenguas.forEach((l, n) => { l.scale.set(1, 0.8 + Math.abs(Math.sin(t * 17 + n)) * 0.6, 1); });
      const neg = clamp((u - 0.5) / (p.dur - 1.5));
      poblanosF.forEach((pb, n) => { const giro = Math.floor(u / 2) + (((u % 2) / 2) > 0.8 ? ((u % 2) / 2 - 0.8) * 5 : 0); pb.rotation.x = giro * Math.PI / 2 + n; });
      manchasPob.forEach((arr, n) => arr.forEach((m, k) => m.visible = neg > (k / arr.length) * 0.9));
    }
    if (sudaA.visible) {
      const fuera = clamp((u - 3.8) / 0.6); bolsaA.position.set(-0.35, fuera * 0.05, 0); bolsaA.userData.gotas.forEach((g, n) => g.visible = u > 0.8 + n * 0.25 && u < 4.5);
      bolsaA.scale.setScalar(1 - fuera * 0.15);
      const corte = clamp((u - 5) / (p.dur - 5.6)); pobPelado.visible = u > 4.2 && corte < 0.9; pobPelado.scale.set(1 - corte * 0.8, 1, 1);
      rajasT.forEach((r, n) => r.visible = n / rajasT.length < corte);
      cuchilloA.visible = u > 4.8; cuchilloA.position.set(0.55 + Math.sin(u * 3) * 0.15, 0.35 + Math.abs(Math.sin(u * 12)) * 0.3, 0); cuchilloA.rotation.y = Math.PI / 2;
    }
    if (sarten.visible) {
      sartenRelleno.visible = false; sartenRemolino.visible = false;
      if (p.accion === "rajas") rajasS.forEach((m, n) => { const tipo = n % 3, t0 = tipo === 1 ? 0.3 : tipo === 0 ? 2.3 : 3.2, q = clamp((u - t0 - (n / rajasS.length) * 0.6) / 0.35); m.visible = q > 0; const [x, z] = m.userData.p, giro = u * 1.2; m.position.set(x * Math.cos(giro) - z * Math.sin(giro), 0.17 + (n % 3) * 0.02 + (1 - easeIn(q)) * 1.4, x * Math.sin(giro) + z * Math.cos(giro)); });
      if (p.accion === "tortillas") {
        aceiteCh.visible = true;
        const c = (u % 1.4) / 1.4, ciclo = Math.floor(u / 1.4); tortAceite.visible = u < p.dur - 0.6; tortAceite.position.y = 0.17 + Math.max(0, 1 - Math.sin(Math.PI * clamp(c / 0.6)) * 1.0) * 0.8;
        burbCh.forEach((b, n) => { const on = c < 0.6 && Math.sin(t * 9 + n * 2.3) > 0; b.visible = on; });
        tortsPila.forEach((t2, n) => t2.visible = n < ciclo);
      }
    }
    if (licuadora.visible) {
      const mezcla = clamp((u - 1.5) / 3);
      liquidoL.scale.y = 0.2 + mezcla * 0.8; liquidoL.position.y = 0.6 + liquidoL.scale.y * 0.5 + 0.02;
      liquidoL.material = M("#" + new THREE.Color("#e06a4a").lerp(new THREE.Color(COL_SALSA_A), mezcla).getHexString());
      trozosL.forEach((o, n) => { const q = clamp((u - 0.2 - n * 0.12) / 0.4); o.visible = q > 0 && mezcla < 0.7; o.position.y = 0.85 + (n % 4) * 0.15 + (1 - easeIn(q)) * 2 + (mezcla > 0 ? Math.sin(t * 30 + n) * 0.1 : 0); o.rotation.y = t * 12 * mezcla + n; });
      const vibra = u > 1.5 && u < p.dur - 1.5 ? 1 : 0;
      licuadora.position.x = BOWL.x + Math.sin(t * 60) * 0.025 * vibra; licuadora.rotation.z = Math.sin(t * 47) * 0.015 * vibra;
      remL.visible = vibra > 0; remL.position.y = liquidoL.position.y + liquidoL.scale.y * 0.5 + 0.01; remL.rotation.z = t * 20;
    }
    if (refA.visible) {
      const ua = lu("arma"), uq = lu("queso"), uh = lu("hornea");
      const nTop = capasTopA.length, nCap = capasA.length - nTop;
      const tCapa = n => n === 0 ? 0.4 : 1.4 + Math.floor((n - 1) / 6) * 3.3 + ((n - 1) % 6) * 0.52;
      capasA.forEach((m, n) => {
        let q;
        if (n >= nCap) q = clamp((uq - 0.3 - (n - nCap) * 0.6) / 0.5); else q = clamp((ua - tCapa(n)) / 0.45);
        m.visible = q > 0;
        if (m.userData.tipo === "tor") { m.scale.set(1, 1, 1); m.position.y = m.userData.y0 + (1 - easeOut(q)) * 0.6; }
        else { m.scale.set(0.5 + q * 0.5, Math.max(0.01, q), 0.5 + q * 0.5); m.position.y = m.userData.y0 - m.userData.h * (1 - q) / 2; }
      });
      // elotes sobre la capa de rajas más reciente que se ve
      let yRaj = -1; capasA.forEach(m => { if (m.visible && m.userData.tipo === "raj") yRaj = m.userData.y0 + m.userData.h / 2; });
      const topVis = capasA.filter(m => m.visible).pop();
      elotesA.forEach((e, n) => { e.visible = topVis && topVis.userData.tipo === "raj" && n < 30; e.position.y = yRaj + 0.015; });
      quesoTopA.forEach((q, n) => { const v = clamp((uq - 2.0 - n * 0.028) / 0.35); q.visible = v > 0; q.position.y = q.userData.y0 + (1 - easeIn(v)) * 1.6; });
      const dorado = uh >= 99 ? 1 : uh < 0 ? 0 : clamp((uh - 0.3) / 3.4);
      gratinA.visible = dorado > 0.05; gratinA.scale.set(1, Math.max(0.01, dorado), 1);
      if (dorado > 0.3) quesoTopA.forEach(q => q.visible = false);
      manchasA.forEach((m, n) => m.visible = dorado > 0.4 + (n / manchasA.length) * 0.5);
      luzA.intensity = p.accion === "hornea" ? 4 + Math.sin(t * 12) : 0;
    }
    // plato servido
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const sv = ["serve", "outro"].includes(p.accion) ? (p.accion === "outro" ? 99 : u) : -1;
    const qc = clamp((sv - 0.4) / 0.6); cuadroA.visible = qc > 0; cuadroA.position.y = (1 - easeOutBack(qc)) * 1.2;
    cremaA.visible = sv > 2.2; rajaTop.visible = sv > 3;
  }
  // --- tamales ---
  vasoT.visible = ESTAM && p.accion === "flota";
  armaT.visible = ESTAM && p.accion === "arma";
  vapT.visible = ESTAM && ["vaporera", "cuece"].includes(p.accion);
  hojasTaz.forEach(h => h.visible = false); mantecaB.visible = false; trozosMasa.forEach(m => m.visible = false);
  if (ESTAM) {
    sarten.visible = false; olla.visible = false; llama.visible = false;
    tazon.visible = ["hojas", "manteca", "masa", "flota"].includes(p.accion); relleno.visible = false; remolino.visible = false;
    licuadora.visible = p.accion === "salsa";
    vapor.forEach(v => v.visible = vapT.visible || p.accion === "hojas");
    CH.raiz.updateMatrixWorld(true);
    if (tazon.visible) {
      if (p.accion === "hojas") {
        relleno.visible = true; relleno.position.y = 0.08 + 0.6 * 0.8; relleno.scale.setScalar(radioTazon(0.08 + 0.48) - 0.02); relleno.material = M("#cfe3ee");
        hojasTaz.forEach((h, n) => { const q = clamp((u - 0.4 - n * 1.1) / 0.5); h.visible = q > 0; h.position.set((hash(n + 2140) - 0.5) * 0.3, 0.58 + (1 - easeIn(q)) * 1.6 - clamp((u - n * 1.1 - 1) / 2) * 0.06, (hash(n + 2141) - 0.5) * 0.3); });
      }
      if (["manteca", "masa", "flota"].includes(p.accion)) {
        masaT.visible = true;
        if (p.accion === "manteca") { const v = clamp((u - 1) / (p.dur - 2)); mantecaB.visible = u < 2.5; mantecaB.position.y = 0.4 + (1 - easeIn(clamp((u - 0.2) / 0.4))) * 1.6; mantecaB.scale.setScalar(Math.max(0.01, 1 - clamp((u - 1.2) / 1.3))); masaT.visible = u > 1; masaT.material = M("#" + new THREE.Color("#f3eee0").lerp(new THREE.Color("#fffdf8"), v).getHexString()); masaT.scale.set(0.9, 0.18 + v * 0.3, 0.9); masaT.position.y = 0.4 + v * 0.1; picosT.forEach((c, n) => { c.visible = v > 0.5 + n * 0.05; c.material = M("#fffdf8"); c.position.y = masaT.position.y + 0.7 * masaT.scale.y * 0.9; }); }
        else { picosT.forEach(c => c.visible = false); }
        if (p.accion === "masa") { const v = clamp((u - 0.5) / (p.dur - 1.5)); masaT.material = M("#" + new THREE.Color("#fffdf8").lerp(new THREE.Color(COL_MASA_T), v).getHexString()); masaT.scale.set(0.95, 0.45 + v * 0.15, 0.95); masaT.position.y = 0.5 + v * 0.05;
          trozosMasa.forEach((m, n) => { const q = clamp((u - 0.4 - n * 0.9) / 0.4), d = clamp((u - n * 0.9 - 1.2) / 0.8); m.visible = q > 0 && d < 1; m.position.y = 0.85 + (1 - easeIn(q)) * 1.5; m.scale.set(1 - d * 0.7, 0.7 * (1 - d), 1 - d * 0.7); });
          if ([2.2, 5.0].some(t0 => u > t0 && u < t0 + 1.0)) { chorroL.visible = true; chorroL.material = M("#e8c27a"); const yB = 0.9, A = new THREE.Vector3(BOWL.x + 0.2, 2.4, BOWL.z); chorroL.position.set(A.x, (A.y + yB) / 2, A.z); chorroL.scale.set(1, A.y - yB, 1); }
          remolino.visible = true; remolino.position.y = 0.95; remolino.rotation.z = u * 10; remolino.material = M("#e6cc8a"); }
        if (p.accion === "flota") { masaT.material = M(COL_MASA_T); masaT.scale.set(0.95, 0.6, 0.95); masaT.position.y = 0.55; }
      }
    }
    if (vasoT.visible) {
      // la bolita cae, se hunde un poquito y sube a flotar
      const q = clamp((u - 2.0) / 0.4), sube = clamp((u - 2.8) / 1.2);
      bolitaV.visible = u > 2.0; bolitaV.position.set(Math.sin(t * 2) * 0.03 * sube, u < 2.4 ? 1.5 - easeIn(q) * 1.05 : 0.45 + easeOut(sube) * 0.37 + Math.sin(t * 3) * 0.01 * sube, 0);
      burbV.forEach((b, n) => { const ph = ((u - 2.4) * 0.8 + n / 6) % 1; b.visible = u > 2.4 && u < 5; b.position.set(Math.sin(n * 2) * 0.12, 0.2 + ph * 0.6, Math.cos(n * 1.7) * 0.1); });
    }
    if (licuadora.visible) {
      const mezcla = clamp((u - 1.5) / 3);
      liquidoL.scale.y = 0.2 + mezcla * 0.8; liquidoL.position.y = 0.6 + liquidoL.scale.y * 0.5 + 0.02;
      liquidoL.material = M("#" + new THREE.Color("#9cc75a").lerp(new THREE.Color(COL_VERDE_S), mezcla).getHexString());
      trozosL.forEach((o, n) => { o.visible = false; });
      const vibra = u > 1.5 && u < p.dur - 1.5 ? 1 : 0;
      licuadora.position.x = BOWL.x + Math.sin(t * 60) * 0.025 * vibra; licuadora.rotation.z = Math.sin(t * 47) * 0.015 * vibra;
      remL.visible = vibra > 0; remL.material = M("#7fb84a"); remL.position.y = liquidoL.position.y + liquidoL.scale.y * 0.5 + 0.01; remL.rotation.z = t * 20;
    } else remL.material = M("#d0503a");
    if (armaT.visible) {
      const unta = clamp((u - 0.4) / 2.5), rell = clamp((u - 3.4) / 0.8), lados = clamp((u - 5.2) / 1.3), punta = clamp((u - 6.8) / 1.0), listo = u > 8;
      hojaGrande.visible = !listo; masaUnta.scale.set(Math.max(0.01, unta), Math.max(0.01, unta), 1); masaUnta.visible = unta > 0;
      rellenoT.visible = rell > 0; rellenoT.scale.setScalar(Math.max(0.01, easeOutBack(rell)));
      mitades.forEach(({ piv, s2 }) => { piv.rotation.y = -s2 * lados * 2.6; });
      hojaGrande.scale.set(1, 1 - punta * 0.35, 1); hojaGrande.position.z = 0.05 + punta * 0.1;
      tamalHecho.visible = listo; tamalHecho.scale.setScalar(listo ? easeOutBack(clamp((u - 8) / 0.4)) : 0.001);
      pilaTam.forEach((t2, n) => { const q = clamp((u - 8.6 - n * 0.35) / 0.3); t2.visible = q > 0; t2.position.y = 0.2 + Math.floor(n / 3) * 0.2 + (1 - easeIn(q)) * 1.2; });
    }
    if (vapT.visible) {
      const uv = p.accion === "vaporera" ? u : 99, uc = p.accion === "cuece" ? u : -1;
      const qm = clamp((uv - 0.8) / 0.5); monedaT.position.set(0.2, 0.2 + (1 - easeIn(qm)) * 1.6 + (uc > 0 ? Math.abs(Math.sin(t * 25)) * 0.02 : 0), 0.1); monedaT.rotation.x = uc > 0 ? Math.sin(t * 30) * 0.15 : 0;
      rejillaT.visible = uv > 2.2;
      tamVap.forEach((t2, n) => { const q = clamp((uv - 2.6 - n * 0.36) / 0.3); t2.visible = q > 0; t2.position.y = 0.55 + (1 - easeIn(q)) * 1.4; });
      hojasTapa.forEach((h, n) => { const q = clamp((uv - 9.2 - n * 0.3) / 0.35); h.visible = q > 0 && p.accion === "vaporera"; h.position.y = 0.88 + n * 0.01 + (1 - easeIn(q)) * 1; });
      const tq = uc < 0 ? 0 : clamp((uc - 0.3) / 0.8); tapaVap.visible = uc >= 0; tapaVap.position.y = 0.55 + (1 - easeIn(tq)) * 1.5 + (uc > 1.2 ? Math.abs(Math.sin(t * 9)) * 0.03 : 0);
      relojT.visible = uc > 1.5; if (relojT.visible) { relojT.position.set(PAN.x - 1.05, 0.45, PAN.z + 0.9); relojT.scale.setScalar(0.7 * easeOutBack(clamp((uc - 1.5) / 0.4))); agujaT.rotation.z = -clamp((uc - 1.8) / (p.dur - 2.5)) * Math.PI * 6; }
    }
    // plato servido
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const sv = ["serve", "outro"].includes(p.accion) ? (p.accion === "outro" ? 99 : u) : -1;
    const qc = clamp((sv - 0.3) / 0.5); abierto.visible = qc > 0; abierto.position.y = 0.08 + (1 - easeOutBack(qc)) * 1.0;
    cerrado.visible = sv > 1.0; salsaTm.visible = sv > 2.2; salsaTm.scale.setScalar(Math.max(0.01, clamp((sv - 2.2) / 0.6)));
  }
  // --- huevos divorciados ---
  huevosS.forEach(h => h.visible = false); gotasAceite.forEach(g => g.visible = false);
  if (ESDIV) {
    sarten.visible = ["tortillas", "frijoles", "huevo", "bana"].includes(p.accion); olla.visible = false;
    llama.visible = sarten.visible; llama.material.opacity = 0.6 + 0.3 * Math.sin(t * 25);
    vapor.forEach(v => v.visible = sarten.visible);
    tazon.visible = false; relleno.visible = false; remolino.visible = false;
    licuadora.visible = ["salsaroja", "salsaverde"].includes(p.accion);
    pilaTort.visible = p.accion === "tortillas";
    if (licuadora.visible) {
      const roja = p.accion === "salsaroja", mezcla = clamp((u - 1.5) / 3);
      liquidoL.scale.y = 0.2 + mezcla * 0.8; liquidoL.position.y = 0.6 + liquidoL.scale.y * 0.5 + 0.02;
      liquidoL.material = M("#" + new THREE.Color(roja ? "#e06a4a" : "#9cc75a").lerp(new THREE.Color(roja ? COL_ROJA : COL_VERDE_D), mezcla).getHexString());
      trozosL.forEach((o, n) => { const q = clamp((u - 0.2 - n * 0.12) / 0.4); o.visible = roja && q > 0 && mezcla < 0.7; o.position.y = 0.85 + (n % 4) * 0.15 + (1 - easeIn(q)) * 2 + (mezcla > 0 ? Math.sin(t * 30 + n) * 0.1 : 0); o.rotation.y = t * 12 * mezcla + n; });
      const vibra = u > 1.5 && u < p.dur - 1.5 ? 1 : 0;
      licuadora.position.x = BOWL.x + Math.sin(t * 60) * 0.025 * vibra; licuadora.rotation.z = Math.sin(t * 47) * 0.015 * vibra;
      remL.visible = vibra > 0; remL.material = M(roja ? "#d0503a" : "#7fb84a"); remL.position.y = liquidoL.position.y + liquidoL.scale.y * 0.5 + 0.01; remL.rotation.z = t * 20;
    }
    if (sarten.visible) {
      sartenRelleno.visible = false; sartenRemolino.visible = false; aceiteCh.visible = ["tortillas", "huevo", "bana"].includes(p.accion);
      if (p.accion === "tortillas") {
        const c = (u % 1.4) / 1.4, ciclo = Math.floor(u / 1.4); tortAceite.visible = u < p.dur - 0.6; tortAceite.position.y = 0.17 + Math.max(0, 1 - Math.sin(Math.PI * clamp(c / 0.6))) * 0.8;
        burbCh.forEach((b, n) => { const on = c < 0.6 && Math.sin(t * 9 + n * 2.3) > 0; b.visible = on; });
        tortsPila.forEach((t2, n) => t2.visible = n < ciclo);
      }
      if (p.accion === "frijoles") { const q = clamp((u - 0.3) / 1.2); sartenRelleno.visible = true; sartenRelleno.material = M(COL_FRIJOL_D); sartenRelleno.scale.set(0.6 + q * 0.35, 0.5 + q * 2, 0.6 + q * 0.35); sartenRemolino.visible = u > 1.5; sartenRemolino.material = M("#7a4a30"); sartenRemolino.rotation.z = u * 8; }
      if (["huevo", "bana"].includes(p.accion)) {
        const cuece = p.accion === "bana" ? clamp((u - 1) / (p.dur - 2.5)) : 0;
        huevosS.forEach((h, n) => { const t0 = [2.6, 6.8][n], q = p.accion === "bana" ? 1 : clamp((u - t0) / 0.5); h.visible = q > 0; h.scale.set(0.4 + q * 0.6, 1, 0.4 + q * 0.6); h.position.x = (n ? 1 : -1) * 0.33 - (1 - q) * 0.2 * (n ? 1 : -1);
          h.userData.cl.material = M("#" + new THREE.Color("#e9ecef").lerp(new THREE.Color("#ffffff"), cuece).getHexString(), { transparent: true, opacity: 0.6 + cuece * 0.4 }); });
        burbCh.forEach((b, n) => { const on = Math.sin(t * 9 + n * 2.3) > 0.2; b.visible = on && p.accion === "bana"; });
        if (p.accion === "bana") { sarten.rotation.z = -0.08; gotasAceite.forEach((g, n) => { const c = ((u + n * 0.16) % 1.3) / 1.3; g.visible = c < 0.5; g.position.set(0.6 - c * 1.6 + (n % 2) * 0.1, 0.2 + Math.sin(Math.PI * c * 2) * 0.25, (n % 3 - 1) * 0.1); }); }
      }
    }
    // plato armado
    const ua = p.accion === "armadiv" ? u : (["serve", "outro"].includes(p.accion) ? 99 : -1);
    if (ua >= 0 || enHook) { plato.visible = true; plato.scale.setScalar(1); }
    const sa = enHook ? 99 : ua;
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    huevosD.forEach((h, n) => { const q = clamp((sa - 0.4 - n * 0.6) / 0.4); h.visible = q > 0; h.position.y = 0.12 + (1 - easeIn(q)) * 1.2; });
    salsasD.forEach((m, n) => { const q = clamp((sa - 2.2 - n * 1.6) / 1.2); m.visible = q > 0; m.scale.set(q, 1, 0.85 * q); });
    yemasD.forEach((y, n) => y.visible = sa > 2.2 + n * 1.6 + 0.6);
    const qf = clamp((sa - 6) / 1.5); frijolD.visible = qf > 0; frijolD.scale.set(1, Math.max(0.01, qf), 0.5);
    const sv = ["serve", "outro"].includes(p.accion) ? (p.accion === "outro" ? 99 : u) : (enHook ? 99 : -1);
    quesoD.forEach((q, n) => { const v = clamp((sv - 0.3 - n * 0.06) / 0.3); q.visible = v > 0; q.position.y = q.userData.y0 + (1 - easeIn(v)) * 1.2; });
    cilD.forEach((c, n) => c.visible = sv > 2.2 + n * 0.08);
  } else if (sarten.rotation.z === -0.08) sarten.rotation.z = 0;
  // --- boloñesa ---
  tapaS.visible = false; aguaPasta.visible = false; tazaAgua.visible = false;
  if (ESBOLO) {
    pastaOlla.visible = false;
    const enS = ["sofrito", "carne", "leche", "tomate", "lento", "juntapasta"].includes(p.accion), enO = p.accion === "cuecepasta";
    sarten.visible = enS; olla.visible = enO; if (enO) tapa.visible = false;
    llama.visible = enS; llama.material.opacity = (p.accion === "lento" ? 0.35 : 0.6) + 0.3 * Math.sin(t * 25); llama.scale.setScalar(p.accion === "lento" ? 0.75 : 1);
    vapor.forEach(v => v.visible = enS || enO);
    tazon.visible = false; relleno.visible = false; remolino.visible = false;
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    CH.raiz.updateMatrixWorld(true);
    const chorro = (A, yB, col, ancho) => { chorroL.visible = true; chorroL.material = M(col); const h = Math.max(0.05, A.y - yB); chorroL.position.set(A.x, yB + h / 2, A.z); chorroL.scale.set(ancho, h, ancho); };
    if (enS) {
      const us = lu("sofrito"), uc = lu("carne"), ul = lu("leche"), ut = lu("tomate");
      const qv = us >= 99 ? 1 : clamp((us - 0.3) / 2);
      verdL.forEach((c, n) => { c.visible = qv > n / verdL.length && p.accion !== "juntapasta"; const [x, z] = c.userData.p; const giro = p.accion === "sofrito" ? u * 1.4 : 0; c.position.set(x * Math.cos(giro) - z * Math.sin(giro), 0.17 + (n % 3) * 0.02, x * Math.sin(giro) + z * Math.cos(giro)); c.material = M(n % 3 === 1 ? "#f08a2c" : n % 3 === 2 ? "#8fbf4a" : (us >= 99 || u > 6 ? "#f3e2b0" : "#f6efe0")); });
      if (uc >= 0 && p.accion !== "juntapasta") {
        bloqueMolida.visible = p.accion === "carne" && u < 1.4; const qb = clamp((u - 0.3) / 0.4); bloqueMolida.position.set(0, 0.22 + (1 - easeIn(qb)) * 2, 0); bloqueMolida.scale.set(1, 0.45, 1);
        const sep = uc >= 99 ? 1 : clamp((uc - 1.0) / 0.6), dor = uc >= 99 ? 1 : clamp((uc - 1.4) / 3.5), desh = uc >= 99 ? 1 : clamp((uc - 4.5) / 2);
        carneL.forEach((c, n) => { c.visible = sep > 0; const [x, z] = c.userData.p; const r2 = 0.5 + desh * 0.5; c.position.set(x * sep * r2, 0.2 + (n % 2) * 0.03, z * sep * r2); c.scale.setScalar(1 - desh * 0.3); c.material = M("#" + new THREE.Color("#d98a86").lerp(new THREE.Color("#7a4228"), dor).getHexString()); });
      }
      const qt = ut < 0 ? 0 : ut >= 99 ? 1 : clamp((ut - 0.8) / 1.8);
      const ql = ul < 0 ? 0 : clamp((ul - 0.8) / 1.5) * (1 - clamp((ul - 3.5) / 3.5));
      sartenRelleno.visible = qt > 0 || ql > 0.02; sartenRelleno.material = M(qt > 0 ? COL_BOLO_S : "#fbfaf6");
      const lvl = qt > 0 ? qt : ql * 0.6; sartenRelleno.scale.set(0.6 + lvl * 0.4, 0.5 + lvl * 2.2, 0.6 + lvl * 0.4);
      if (qt > 0) { carneL.forEach(c => { c.material = M("#8a3a22"); c.position.y = 0.22; }); verdL.forEach(c => c.visible = false); }
      if (p.accion === "leche" && u > 0.8 && u < 2.8) chorro(lecheL.getWorldPosition(new THREE.Vector3()), PAN.y + 0.3, "#fbfaf6", 1);
      if (p.accion === "tomate" && u > 0.7 && u < 2.5) chorro(cajaPure.getWorldPosition(new THREE.Vector3()), PAN.y + 0.3, COL_BOLO_S, 1.3);
      burbL.forEach((b, n) => { const on = (p.accion === "lento" || (p.accion === "tomate" && u > 2.5)) && Math.sin(t * 4 + n * 2.1) > 0.3; b.visible = on; b.scale.setScalar(on ? 0.6 + Math.abs(Math.sin(t * 6 + n)) * 0.8 : 1); });
      if (p.accion === "lento") { tapaS.visible = u > 1.6; tapaS.position.set(0.25, 0.2 + (1 - easeIn(clamp((u - 1.6) / 0.6))) * 1.2, 0); tapaS.rotation.z = 0.15;
        sartenRelleno.material = M("#" + new THREE.Color(COL_BOLO_S).lerp(new THREE.Color("#7e2410"), clamp((u - 2) / 6)).getHexString());
        relojT.visible = u > 2.5; if (relojT.visible) { relojT.position.set(PAN.x - 1.05, 0.45, PAN.z + 0.9); relojT.scale.setScalar(0.7 * easeOutBack(clamp((u - 2.5) / 0.4))); agujaT.rotation.z = -clamp((u - 2.8) / (p.dur - 3.5)) * Math.PI * 4; } }
      if (p.accion === "juntapasta") {
        sartenRelleno.material = M("#7e2410"); sartenRelleno.visible = true; sartenRelleno.scale.set(1, 2.2, 1);
        nidoSarten.visible = true; const q = clamp((u - 0.3) / 0.7); nidoSarten.position.y = 0.16 + (1 - easeIn(q)) * 1.5; nidoSarten.rotation.y = u * 1.4;
        const mix = clamp((u - 1.5) / 4); nidoSarten.userData.tubos.forEach(tb => tb.material = M("#" + new THREE.Color(COL_PASTA).lerp(new THREE.Color("#c0522e"), mix).getHexString()));
        carneL.forEach(c => c.visible = false);
        if (u > 1.2 && u < 2.4) chorro(new THREE.Vector3(PAN.x - 0.3, 1.9, PAN.z + 0.3), PAN.y + 0.35, "#e8dcc0", 0.7);
      } else nidoSarten.visible = false;
    }
    if (enO) {
      aguaPasta.visible = true; tazaAgua.visible = u > p.dur - 3;
      pastaOlla.visible = u > 2.6; const q = clamp((u - 2.8) / 2.5); pastaOlla.position.set(PAN.x, 0.1 + 0.48 - q * 0.25, PAN.z); pastaOlla.children.forEach((v, n) => v.rotation.z = (hash(n) - 0.5) * (0.6 + q * 1.4));
      pastaOlla.children.forEach(v => v.material = M(COL_PASTA));
    }
    // plato servido
    pila.forEach(hc => hc.visible = false); miel.visible = false; mantequilla.visible = false; canelaPolvo.visible = false;
    const sv = ["serve", "outro"].includes(p.accion) ? (p.accion === "outro" ? 99 : u) : (enHook ? 99 : -1);
    const qn = clamp((sv - 0.2) / 0.5); nidoB.visible = qn > 0; nidoB.position.y = 0.08 + (1 - easeIn(qn)) * 1.4;
    nidoB.userData.tubos.forEach(tb => tb.material = M("#e8b862"));
    const qs = clamp((sv - 0.8) / 0.5); salsaB.visible = qs > 0; salsaB.scale.set(qs, 0.4 * qs, qs);
    carneB.forEach(c => c.visible = qs > 0.8);
    parmB.forEach((q2, n) => { const v = clamp((sv - 1.4 - n * 0.04) / 0.3); q2.visible = v > 0; q2.position.y = q2.userData.y0 + (1 - easeIn(v)) * 1.0; });
    albB.visible = sv > 3;
  } else { llama.scale.setScalar(1); }
  // --- panqueques de galleta ---
  trozosGal.forEach(t2 => t2.visible = false); motasHC.forEach(m => m.visible = false); motasPila.forEach(m => m.visible = false); cremaCapas.forEach(r2 => r2.visible = false); cremaTop.visible = false;
  if (ESGAL) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const ug = lu("galletas");
    if (p.accion === "sobras") { tazon.visible = false; sarten.visible = false; }
    if (tazon.visible && ug >= 0) {
      const nivelT = relleno.position.y;
      trozosGal.forEach((t2, n) => { const q = clamp((ug - 0.6 - n * 0.15) / 0.35); t2.visible = q > 0 && p.accion !== "crema"; const [x, z] = t2.userData.p; const giro = ug >= 4 ? (ug - 4) * 1.2 : 0; t2.position.set(x * Math.cos(giro) - z * Math.sin(giro), nivelT + 0.02 + (1 - easeIn(q)) * 1.4, x * Math.sin(giro) + z * Math.cos(giro)); });
      if (ug > 0.6) relleno.material = M("#d8c49a");
    }
    if (p.accion === "crema") {
      tazon.visible = true; relleno.visible = false; remolino.visible = false; masaT.visible = true;
      const v = clamp((u - 0.3) / (p.dur - 1.8)); masaT.material = M("#fdf3dc"); masaT.scale.set(0.95, 0.25 + v * 0.35, 0.95); masaT.position.y = 0.45 + v * 0.15;
      picosT.forEach((c, n) => { c.visible = v > 0.5 + n * 0.05; c.material = M("#fdf3dc"); c.position.y = masaT.position.y + 0.7 * masaT.scale.y * 0.9; });
      sarten.visible = false; llama.visible = false; vapor.forEach(vv => vv.visible = false);
    }
    if (hotcake.visible) motasHC.forEach(m => m.visible = true);
    // pila con motitas, crema entre capas, galletas y chocolate
    if (plato.visible) {
      const su2 = (enHook || i > idxDe("serve")) ? 99 : p.accion === "serve" ? u : -1;
      pila.forEach((hc, k) => { if (hc.visible) motasPila.slice(k * 14, k * 14 + 14).forEach(m => m.visible = true); });
      cremaCapas.forEach((r2, k) => { r2.visible = pila[k + 1] && pila[k + 1].visible; r2.position.y = pila[k].position.y + 0.105; });
      const cima2 = 0.16 + 3 * 0.21 + 0.1, qc = clamp((su2 - 2.2) / 0.5);
      cremaTop.visible = qc > 0; cremaTop.position.y = cima2 + 0.1 + (1 - easeIn(qc)) * 1.2;
      galTop.forEach((g, n) => g.visible = su2 > 3.0 + n * 0.3);
      migasTop.forEach((m, n) => m.visible = su2 > 4.0 + n * 0.04);
      mielTapa.material = M("#4a2414", { transparent: true, opacity: 0.95 }); gotas.forEach(g => g.material = M("#4a2414"));
      miel.position.y = cima2 + 0.02;
    }
  } else { mielTapa.material = M("#f3a712", { transparent: true, opacity: 0.92 }); gotas.forEach(g => g.material = M("#f3a712")); }
  // --- roles de canela ---
  jarra.visible = ESROLES && ["activa", "drop"].includes(p.accion) && !(p.accion === "drop" && u > 1.0);
  if (jarra.visible) {
    const q = p.accion === "activa" ? clamp((u - 1.5) / (p.dur - 3)) : 1;
    espuma.position.y = 0.12 + q * 0.2; espuma.scale.set(0.2 + q * 0.8, 0.2 + q * 0.9, 0.2 + q * 0.8);
    espuma.children.forEach((b, n) => { b.position.y = Math.sin(t * 3 + n) * 0.02 * q; });
    jarra.rotation.z = p.accion === "drop" ? Math.sin(Math.PI * clamp(u / 1.0)) * 0.9 : 0;
  }
  rolesG.visible = ESROLES && !enHook && armaI >= 0 && i >= armaI && !(serveI >= 0 && i >= serveI);
  tazonGlase.visible = ESROLES && p.accion === "glasea";
  if (rolesG.visible) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : i > jj ? 99 : i === jj ? u : -1; };
    const ua = lu("amasa"), ur = lu("reposa"), ue = lu("estira"), ut = lu("unta"), un = lu("enrolla"), uh = lu("hilo"), um = lu("acomoda"), uo = lu("hornea"), ug = lu("glasea");
    const d = j0 => pasos[idxDe(j0)].dur;
    const enMolde = um >= 0;
    tablaR.visible = !enMolde;
    // bola: amasar y crecer
    const crece = ur >= 0 ? easeOut(clamp((ur - 0.8) / (d("reposa") - 1.6))) : 0;
    bolaR.visible = ue < 0.6 && !enMolde;
    const amas = p.accion === "amasa" ? Math.abs(Math.sin(u * 5)) * 0.25 : 0;
    const eb = (1 + crece * 0.5) * (ue >= 0 ? 1 - clamp(ue / 0.6) * 0.5 : 1);
    bolaR.scale.set(eb * (1 + amas), eb * (0.8 - amas), eb * (1 + amas)); bolaR.position.y = 0.1 + 0.55 * eb * (0.8 - amas);
    // trapo: cae, se queda, se quita
    const tIn = clamp((ur - 0.1) / 0.6), tOut = clamp((ur - (d("reposa") - 0.7)) / 0.6);
    trapo.visible = ur >= 0 && ur < 99 && tOut < 1;
    trapo.position.y = 0.1 + (1 - easeIn(tIn)) * 2.5 + easeIn(tOut) * 2.5; trapo.scale.setScalar(0.85 + crece * 0.35);
    // lámina estirada
    const le = ue >= 0 ? easeOut(clamp((ue - 0.4) / (d("estira") - 1.2))) : 0;
    const enr = un >= 0 ? clamp((un - 0.3) / (d("enrolla") - 1.0)) : 0;
    lamina.visible = le > 0 && enr < 0.97 && !enMolde;
    lamina.scale.set(0.3 + le * 0.7, 1, Math.max(0.02, (0.3 + le * 0.7) * (1 - enr)));
    lamina.position.z = (0.3 + le * 0.7) * 1.5 * enr / 2 * -1 + 0;
    lamina.position.z = -0.75 * enr;
    rodillo.visible = p.accion === "estira";
    if (rodillo.visible) { rodillo.position.z = Math.sin(u * 3.2) * 0.55; rodCuerpo.rotation.x = u * 6; }
    // mantequilla + azúcar con canela
    const mt = ut >= 0 ? clamp((ut - 0.3) / 2.2) : 0;
    capaMant.visible = mt > 0 && enr < 0.95 && !enMolde; capaMant.scale.set(Math.max(mt, 0.01), 1, Math.max(0.02, 1 - enr)); capaMant.position.z = 0.05 - 0.75 * enr;
    granos.forEach((gr, n) => { const v = ut >= 0 ? clamp((ut - 2.6 - n * 0.025) / 0.35) : 0; gr.visible = v > 0 && enr < 0.9 && !enMolde; gr.position.y = 0.2 + (1 - easeIn(v)) * 1.8; gr.position.z = ((hash(n + 701) - 0.5) * 1.15 + 0.05) * (1 - enr) - 0.6 * enr; });
    // tronco: crece mientras se enrolla y luego se corta con hilo
    const tronco = un >= 0 && !enMolde;
    const nCortes = uh >= 0 ? Math.floor(clamp((uh - 2.2) / (d("hilo") - 3.0)) * 11.99) : 0;
    rodajas.forEach((r, n) => {
      r.visible = tronco && (un >= 99 || enr > 0.05);
      const rr = un >= 99 ? 1 : 0.25 + enr * 0.75; r.scale.set(rr, 1, rr);
      const sep = uh >= 0 && n <= nCortes ? 1 : 0;
      r.position.set((-1.1 + n * 0.2) * (1 + sep * 0.0) + (n - 5.5) * 0.07 * (uh >= 99 ? 1 : sep), 0.12 + 0.3 * rr, 0.75 - 0.75 * Math.max(enr, un >= 99 ? 1 : 0) + 0.0);
      r.position.z = 0.6 * (1 - (un >= 99 ? 1 : enr));
      r.rotation.x = un >= 0 && un < 99 ? -enr * 12 : 0;
      if (uh >= 0 && n <= nCortes) r.rotation.y = -0.9 * (uh >= 99 ? 1 : clamp((uh - 2.2 - n * (d("hilo") - 3.0) / 12) / 0.4));
      else r.rotation.y = 0;
    });
    // hilo dental cortando
    const cortando = p.accion === "hilo" && u > 2.2 && u < d("hilo") - 0.6;
    hiloD.visible = hiloD2.visible = cortando;
    if (cortando) {
      const f = ((u - 2.2) / (d("hilo") - 3.0)) * 12, n = Math.min(10, Math.floor(f)), ph = f - Math.floor(f);
      const x = -1.0 + n * 0.2 + (n + 0.5 - 5.5) * 0.07;
      const y = 0.75 - Math.sin(Math.PI * ph) * 0.45;
      hiloD.position.set(x, y, 0); hiloD2.position.set(x, y + 0.5, 0.65);
    }
    // molde: caen los roles, crecen, se doran y se glasean
    molde.visible = enMolde;
    const hk = uo >= 99 ? 1 : uo < 0 ? 0 : clamp(uo / (d("hornea") * 0.85));
    const subeM = um >= 0 ? clamp((um - 3.5) / 2.5) : 0;
    rolesMolde.forEach((r, n) => {
      const q = um >= 99 ? 1 : clamp((um - 0.4 - n * 0.22) / 0.35);
      r.visible = q > 0; r.position.y = 0.28 + (1 - easeIn(q)) * 2.5;
      const sq = um < 99 ? bounce(clamp((um - 0.75 - n * 0.22) / 0.35)) * 0.2 : 0;
      const gr = 1 + subeM * 0.18 + hk * 0.06;
      r.scale.set(gr * (1 + sq), gr * (1 - sq), gr * (1 + sq));
    });
    const gq = ug >= 0 ? ug : -1;
    glaseMolde.forEach((gl, n) => { const v = gq >= 99 ? 1 : clamp((gq - 2.5 - n * 0.4) / 0.5); gl.visible = v > 0; gl.scale.set(0.3 + v * 0.75, 0.35 * v, 0.3 + v * 0.75); gl.position.y = 0.45 + subeM * 0.05; });
    moldeLuz.intensity = p.accion === "hornea" ? 4 + Math.sin(t * 12) : 0;
  }
  if (ESROLES) {
    const sv = serveI >= 0 && i >= serveI;
    const hk = enHook || sv ? 1 : (() => { const jj = idxDe("hornea"); return jj < 0 || i < jj ? 0 : i > jj ? 1 : clamp(u / (pasos[jj].dur * 0.85)); })();
    const c = new THREE.Color(COL_MASA_R).lerp(new THREE.Color(COL_DORADO_R), hk);
    matRolLado.color.copy(c); matRolTapa.color.copy(new THREE.Color("#fbeccb").lerp(new THREE.Color("#f0b46a"), hk));
  }

  // --- pizza ---
  pizza.visible = ESPIZZA && (enHook || (armaI >= 0 && i >= armaI));
  if (pizza.visible) {
    const lu = j0 => { const jj = idxDe(j0); return jj < 0 ? -1 : (i > jj || enHook) ? 99 : i === jj ? u : -1; };
    const ue = lu("extiende"), us = lu("salsa"), uq = lu("queso"), uh = lu("hornea"), uv = enHook ? -1 : lu("serve");
    // estirar: bola -> vuela girando -> cae como disco
    const vuelo = clamp((ue - 0.5) / 1.1), crece = clamp((ue - 0.2) / 1.6);
    masaBola.visible = ue < 0.5; masaBola.scale.set(1 + ue * 0.6, 0.7 - ue * 0.6, 1 + ue * 0.6);
    pizzaCuerpo.visible = ue >= 0.5;
    pizzaCuerpo.position.y = 0.12 + Math.sin(Math.PI * vuelo) * 2.2;
    pizzaCuerpo.rotation.y = vuelo * Math.PI * 4 + (enHook ? t * 0.6 : 0);
    pizzaCuerpo.rotation.z = Math.sin(Math.PI * vuelo) * 0.25;
    const esc = 0.45 + 0.55 * easeOut(crece); pizzaCuerpo.scale.set(esc, 1, esc);
    // salsa, queso, albahaca
    const sq = clamp((us - 0.1) / 1.3);
    salsaP.visible = rebSalsa.visible = sq > 0; salsaP.scale.set(Math.max(sq, 0.001), 1, Math.max(sq, 0.001)); rebSalsa.scale.copy(salsaP.scale);
    mozz.forEach((m, n) => { const q = clamp((uq - 0.1 - n * 0.06) / 0.3); m.visible = q > 0; m.position.y = 0.1 + (1 - easeIn(q)) * 2.5; });
    rebQueso.forEach((m, n) => { m.visible = uq > 0.4 + n * 0.1; });
    hojas.forEach((h, n) => { const q = clamp((uq - 1.1 - n * 0.08) / 0.35); h.visible = q > 0; h.position.y = 0.17 + (1 - easeIn(q)) * 2; h.rotation.z = hash(n) * 6 + (1 - q) * 4; });
    // horno: se dora y el queso se derrite
    const hk = uh >= 99 ? 1 : uh < 0 ? 0 : clamp(uh / (pasos[idxDe("hornea")].dur * 0.85));
    const col = new THREE.Color(COL_MASA).lerp(new THREE.Color("#d9953a"), hk);
    [disco, orilla, rebDisco, rebOrilla].forEach(o => o.material = M("#" + col.getHexString()));
    mozz.forEach(m => m.scale.set(1 + hk * 0.6, 0.35 - hk * 0.15, 1 + hk * 0.6));
    doradoP.forEach(d => d.visible = hk > 0.6);
    pizzaLuz.intensity = p.accion === "hornea" ? 4 + Math.sin(t * 12) : 0;
    // servir: sale la rebanada y el queso se estira
    const rv = clamp((uv - 0.3) / 1.4);
    rebanada.position.set(Math.sin(CUNA / 2) * rv * 0.5, rv * 1.5, Math.cos(CUNA / 2) * rv * 0.5);
    rebanada.rotation.x = -rv * 0.35;
    hilos.forEach((h, n) => {
      const on = rv > 0.05 && rv < 0.98; h.visible = on && uv < 99; if (!on) return;
      const a = CUNA * (0.25 + n * 0.17), r = 0.3 + n * 0.18;
      const x0 = Math.sin(a) * r, z0 = Math.cos(a) * r, y1 = rv * 1.5;
      h.position.set(x0 + Math.sin(CUNA / 2) * rv * 0.25, 0.1 + y1 / 2, z0 + Math.cos(CUNA / 2) * rv * 0.25);
      h.scale.set(1 - rv * 0.6, y1, 1 - rv * 0.6);
    });
  }

  particulas(t);

  // --- 2D ---
  set("rew", { opacity: p.accion === "rewind" ? 1 : 0 });
  if (p.accion === "rewind") set("rewBarra", { y: (t * 2600) % H });
  // destello blanco en cambios de escena clave
  let fl = 0;
  for (const s of pasos) if (["intro", "serve"].includes(s.accion) && t >= s.inicio) fl = Math.max(fl, 1 - clamp((t - s.inicio) / 0.25));
  set("flash", { opacity: fl * 0.7 });
  const tit = 0;
  const cta = p.accion === "outro" ? easeOutBack((u - 0.3) / 0.5) : 0;
  set("cta", { opacity: cta > 0 ? 1 : 0, transform: `translate(${790 + Math.sin(t * 3) * 10},${740 + Math.abs(Math.sin(t * 5)) * -24}) rotate(${Math.sin(t * 4) * 5}) scale(${Math.max(cta, 0.001) * 0.75})` });
  set("titulo", { opacity: tit > 0 ? 1 : 0, transform: `translate(540,330) rotate(${Math.sin(t * 4) * 2}) scale(${Math.max(tit, 0.001)})` });
  renderSubs(t, p.accion);

  if (USAR_POST) {
    if (!POST) armarPost();
    POST.dof.focus = camera.position.distanceTo(tmpB); POST.dof.aper = 90;
    POST.composer.render();
  } else renderer.render(scene, camera);
}

// ---------- montar ----------
window.DURACION = DURACION;
// acceso para generar imágenes de marca (marca/generar.js)
window.ESC = { THREE, scene, camera, renderer, COCINA, CH, plato, tazon, sarten, refractario, POOL, rerender: () => renderer.render(scene, camera) };
window.renderAt = renderAt;
window.getSubs = () => subs.map(s => ({ ini: s.ini, fin: s.fin, texto: s.palabras.map(x => x.w).join(" ") }));
window.getGuion = () => pasos.map(p => ({ ini: p.inicio, fin: p.inicio + p.dur, texto: p.texto || "", accion: p.accion, items: (p.ingredientes || (p.ingrediente ? [p.ingrediente] : [])).length }));

await Promise.all([document.fonts.load("64px Lilita"), document.fonts.load("140px Luckiest"), document.fonts.load("96px Baloo")]);
await document.fonts.ready;
renderAt(0);
window.LISTO = true;
if (document.body.classList.contains("preview")) {
  let playing = true, start = performance.now(), off = 0;
  const scrub = $("scrub"), lbl = $("time");
  $("play").onclick = () => { playing = !playing; if (playing) start = performance.now() - off * 1000; };
  scrub.oninput = () => { off = scrub.value / 1000 * DURACION; start = performance.now() - off * 1000; renderAt(off); lbl.textContent = off.toFixed(1) + "s"; };
  const loop = () => { if (playing) { off = ((performance.now() - start) / 1000) % DURACION; renderAt(off); scrub.value = off / DURACION * 1000; lbl.textContent = off.toFixed(1) + "s"; } requestAnimationFrame(loop); };
  loop();
}
