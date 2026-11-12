/* Motor 3D de reels de cocina (Three.js, estilo caricatura "toon").
 * Todo depende solo de t: renderAt(t) siempre da el mismo cuadro.
 * Capa 3D (canvas) + capa 2D (SVG) para subtítulos, título y efectos.
 */
import * as THREE from "three";

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
  pr.usoI = pasos.findIndex(s => s.accion === "drop" && (s.ingrediente === pr.ingrediente || (s.ingredientes || []).includes(pr.ingrediente)));
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
};
const zonaDe = a => ({ hook: "hook", rewind: "intro", intro: "intro", drop: "bowl", stir: "bowl", pour: "pan", flip: "pan", serve: "plate", outro: "outro" }[a] || "wide");
const camDe = p => p.accion === "presenta" ? [V3(p.slot + 0.6, 3.2, 7.6), V3(p.slot + 0.6, 2.5, 0)] : CAMS[zonaDe(p.accion)];
const CHEF_X = { wide: 0, hook: 0.15, intro: 0, bowl: 0.1, pan: 0.15, plate: 0.15, outro: 0 };
const chefDe = p => p.accion === "presenta" ? p.slot + 1.3 : CHEF_X[zonaDe(p.accion)];

// ---------- renderer ----------
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(P.pared);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);

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
  g.font = `${tam}px ${fuente}`; const w = Math.ceil(g.measureText(texto).width) + tam * 1.2, h = Math.ceil(tam * 1.7);
  c.width = w; c.height = h;
  g.font = `${tam}px ${fuente}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = fondo; g.strokeStyle = borde; g.lineWidth = tam * 0.12;
  const r = h * 0.3; g.beginPath(); g.roundRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2, r); g.fill(); g.stroke();
  g.fillStyle = color; g.fillText(texto, w / 2, h / 2 + tam * 0.05);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return { tx, aspecto: w / h };
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
    c.font = "140px Luckiest"; c.lineWidth = 16; c.strokeStyle = "#3a1f0d"; c.setLineDash([]); c.strokeText(R.pizarron?.[0] || "", w / 2, 290); c.fillStyle = P.amarillo; c.fillText(R.pizarron?.[0] || "", w / 2, 290);
    c.fillStyle = "#f6f1e4"; c.font = "70px Lilita"; c.fillText(R.pizarron?.[1] || "", w / 2, 395);
  });
  const letrero = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.1, 0.15), [M(P.maderaOscura), M(P.maderaOscura), M(P.maderaOscura), M(P.maderaOscura), new THREE.MeshToonMaterial({ map: tx, gradientMap: grad }), M(P.maderaOscura)]);
  letrero.position.set(0, 5.4, -2.45); letrero.castShadow = true; g.add(letrero);
  // estufa
  const hornilla = mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.08, 40), "#2b2b2b", { contorno: 0 }); hornilla.position.set(PAN.x, 0.04, PAN.z); g.add(hornilla);
  return g;
}
scene.add(cocina());

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
const FABRICA = { platano, huevo, avena };
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
  const { tx, aspecto } = etiquetaTex((pr.etiqueta || "").toUpperCase());
  const et = new THREE.Mesh(new THREE.PlaneGeometry(0.42 * aspecto, 0.42), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
  et.position.set(0, 1.25, 0.05); g.add(et);
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
    caidas.push({ j, n, ing, obj, lado: n % 2 ? 1 : -1 });
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

// ---------- partículas (deterministas) ----------
const POOL = [];
const geoPart = { esfera: new THREE.SphereGeometry(1, 8, 6), cuadro: new THREE.PlaneGeometry(1, 1.6), estrella: new THREE.OctahedronGeometry(1, 0) };
for (let i = 0; i < 420; i++) {
  const m = new THREE.Mesh(geoPart.esfera, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide }));
  m.visible = false; scene.add(m); POOL.push(m);
}
const RAFAGAS = [];
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
    if (a === "flip") rafaga(ti + s.dur * 0.5, { origen: V3(PAN.x, 0.4, PAN.z), n: 26, colores: ["#fff3d6", "#efc77a"], tipo: "esfera", vel: 1.8, g: -6, vida: 0.9, tam: 0.04, arriba: 2 });
  });
  // salpicaduras al caer cada ingrediente
  caidas.forEach(c => {
    const s = pasos[c.j], tl = s.inicio + 0.25 + c.n * 0.5 + 0.55;
    const col = c.ing === "avena" ? ["#f4ead2", "#ffffff"] : [s.color || P.batter, "#fff3c4"];
    rafaga(tl, { origen: V3(BOWL.x, 0.7, BOWL.z), n: c.ing === "avena" ? 40 : 26, colores: col, tipo: "esfera", vel: c.ing === "avena" ? 1.2 : 2.2, g: c.ing === "avena" ? -0.6 : -7, vida: c.ing === "avena" ? 1.4 : 0.8, tam: c.ing === "avena" ? 0.07 : 0.045, arriba: 2.4 });
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
  const y = accion === "outro" || accion === "intro" ? 1560 : 330;
  g.setAttribute("transform", `translate(540,${y}) rotate(${Math.sin(t * 5) * 1.2}) scale(${lerp(0.6, 1, pop)})`);
  g.querySelectorAll(".frente tspan").forEach(ts => { const w = s.palabras[+ts.dataset.k]; ts.setAttribute("fill", t >= w.t && t < w.t + w.d ? P.amarillo : "#fff"); });
}

// ---------- estado en el tiempo t ----------
const tmpA = V3(0, 0, 0), tmpB = V3(0, 0, 0);
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
  const objetivo = p.accion === "presenta" ? -0.5 : ["drop", "stir"].includes(p.accion) ? -0.45 : ["pour", "flip"].includes(p.accion) ? 0.45 : 0;
  CH.cabeza.rotation.y = lerp(CH.cabeza.rotation.y, objetivo, 1) + Math.sin(t * 2.2) * 0.08;
  CH.cabeza.rotation.z = Math.sin(t * 2.6) * 0.08;
  CH.cabeza.rotation.x = p.accion === "presenta" ? -0.25 * clamp(u) : ["drop", "stir", "flip"].includes(p.accion) ? 0.2 : 0;
  CH.orejas.forEach((o, n) => { o.rotation.x = Math.max(0, Math.sin(t * 7 + n)) * 0.25; });
  const feliz = enHook || ["intro", "serve", "outro"].includes(p.accion) || (p.accion === "presenta" && u > 0.8);
  const parpadeo = (t % 2.7) < 0.1;
  CH.ojos.forEach(o => { o.visible = !feliz; o.scale.y = parpadeo ? 0.15 : 1.25; });
  CH.felices.forEach(f => f.visible = feliz);
  const hablando = subs.some(s => t >= s.ini && t < s.fin);
  const mov = hablando ? Math.abs(Math.sin(t * 17)) : feliz ? 0.6 : 0.1;
  CH.boca.scale.set(1 + mov * 0.4, 0.25 + mov * 0.9, 0.5);
  CH.gorro.rotation.z = Math.sin(t * 3) * 0.06;

  // brazos
  const conCuchara = ["drop", "stir"].includes(p.accion), conEspatula = ["pour", "flip"].includes(p.accion);
  let aL = 0.25, aR = -0.25, fL = 0, fR = 0;
  if (["intro", "outro", "hook"].includes(p.accion)) { aR = -2.5 + Math.sin(t * 10) * 0.35; }
  if (p.accion === "presenta") { aL = 0.4; aR = -2.2 + Math.sin(t * 6) * 0.2; fR = -0.4; }
  if (conCuchara) { aL = 1.15; fL = 0.5; }
  if (p.accion === "stir") { aL = 1.15 + Math.sin(u * 11) * 0.12; fL = 0.5 + Math.cos(u * 11) * 0.35; }
  if (p.accion === "drop") aL += Math.sin(u * 14) * 0.08 * (u > 0.8 ? 1 : 0);
  if (conEspatula) { aR = -1.1; fR = 0.6; }
  if (p.accion === "flip" && k > 0.42 && k < 0.6) aR = -1.1 - Math.sin((k - 0.42) / 0.18 * Math.PI) * 0.6;
  if (p.accion === "serve") { aL = 2.4 + Math.sin(t * 9) * 0.25; aR = -2.4 - Math.sin(t * 9) * 0.25; }
  CH.brazos[-1].hombro.rotation.set(fL, 0, -aL); CH.brazos[1].hombro.rotation.set(fR, 0, -aR);
  cuchara.visible = conCuchara; espatula.visible = conEspatula;
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
  tazon.visible = !enHook && !(idxDe("serve") >= 0 && i >= idxDe("serve"));
  let nivel = 0, color = new THREE.Color(P.batter), hay = false;
  pasos.forEach((s, j) => {
    if (j > i) return;
    const lu = j === i ? u : s.dur;
    if (s.accion === "drop") {
      const items = s.ingredientes || [s.ingrediente];
      items.forEach((_, n) => {
        const lleno = clamp((lu - 0.25 - n * 0.5 - 0.55) / 0.5);
        nivel += lleno * (s.cantidad || 0.22) / items.length;
        if (lleno > 0) { color.set(s.color || P.batter); hay = true; }
      });
    }
    if (s.accion === "stir") color.lerp(new THREE.Color(P.batter), clamp(lu / (s.dur * 0.8)));
    if (s.accion === "pour") nivel -= 0.35 * clamp((lu - 0.3) / 1.2);
  });
  nivel = clamp(nivel, 0, 0.85);
  const h = 0.08 + nivel * 0.8;
  relleno.visible = hay; relleno.position.y = h; relleno.scale.setScalar(radioTazon(h) - 0.02);
  relleno.material = M("#" + color.getHexString());
  remolino.visible = p.accion === "stir"; remolino.position.y = h + 0.01; remolino.rotation.z = u * 9;
  tazon.rotation.z = p.accion === "stir" ? Math.sin(u * 11) * 0.04 : 0;
  // tazón "salta" al recibir ingredientes
  let golpe = 0;
  caidas.forEach(c => { if (c.j === i) golpe = Math.max(golpe, bounce(clamp((u - 0.25 - c.n * 0.5 - 0.55) / 0.5)) * 0.12); });
  tazon.scale.set(1 + golpe, 1 - golpe, 1 + golpe);

  // --- caídas al tazón ---
  caidas.forEach(c => {
    const o = c.obj;
    if (c.j !== i) { o.visible = false; return; }
    const q = (u - 0.25 - c.n * 0.5) / 0.55;
    if (q < 0 || q > 2.2) { o.visible = false; return; }
    o.visible = true;
    const topY = 1.05, x = BOWL.x + c.lado * 0.15;
    if (c.ing !== "huevo") {
      const qq = clamp(q);
      o.position.set(x + c.lado * 0.3 * (1 - qq), lerp(6.5, topY - 0.15, easeIn(qq)), BOWL.z);
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
      o.position.set(x, lerp(6.5, topY + 0.35, easeIn(qq)), BOWL.z);
      o.rotation.set(0, 0, (1 - qq) * 4 * c.lado);
      arriba.position.set(0, 0, 0); abajo.position.set(0, 0, 0); arriba.rotation.set(0, 0, 0); abajo.rotation.set(0, 0, 0);
      arriba.visible = abajo.visible = true; clara.visible = yema.visible = false;
      return;
    }
    const r = q - 1; // 0..1.2
    o.position.set(x, topY + 0.35, BOWL.z); o.rotation.set(0, 0, 0);
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
  const fuego = pourI >= 0 && i >= pourI && !enPlato;
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
  plato.visible = pl > 0.001; plato.scale.setScalar(Math.max(pl, 0.001));
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

  renderer.render(scene, camera);
}

// ---------- montar ----------
window.DURACION = DURACION;
window.renderAt = renderAt;
window.getSubs = () => subs.map(s => ({ ini: s.ini, fin: s.fin, texto: s.palabras.map(x => x.w).join(" ") }));
window.getGuion = () => pasos.map(p => ({ ini: p.inicio, fin: p.inicio + p.dur, texto: p.texto || "", accion: p.accion }));

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
