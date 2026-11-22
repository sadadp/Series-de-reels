// Personajes estilo "toon de terror": cuerpo de bloques, cabeza grande achatada con cara pintada, contorno negro grueso
import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const ctx = out.getContext('2d');
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0075, defaultColor: [0.05, 0.03, 0.02] });

// 3-tone cel ramp
const ramp = (() => { const d = new Uint8Array([70, 150, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const M = (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...extra });
let R = 1; const rnd = () => (R = (R * 16807) % 2147483647) / 2147483647;

// hand-painted face texture
function faceTex(o) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  // UV: x 0..1 wraps around; front of sphere sits at u=0.75 for three's SphereGeometry (facing +z)
  g.fillStyle = o.skin; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,240,220'},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * 1024, rnd() * 512, 2 + rnd() * 6, 1 + rnd() * 3); }
  const cx = 256; // front (+z) is u=0.25 in SphereGeometry
  // hair cap painted on the top band
  g.fillStyle = o.hair; g.beginPath(); g.moveTo(0, 0); g.lineTo(1024, 0); g.lineTo(1024, o.hairLine);
  for (let x = 1024; x >= 0; x -= 32) g.lineTo(x, o.hairLine + Math.sin(x * 0.09) * 10 + (rnd() - 0.5) * 8);
  g.closePath(); g.fill();
  // eyebrows
  g.strokeStyle = o.brow; g.lineWidth = 14; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 30, 196 - (o.worried ? s * 0 : 0)); g.quadraticCurveTo(cx + s * 62, o.worried ? 176 : 186, cx + s * 96, o.worried ? 200 : 192); g.stroke(); }
  // ojos normales de caricatura: blanco, pupila, brillo
  for (const s of [-1, 1]) {
    const ex = cx + s * 62, ey = 250;
    g.fillStyle = '#fbf8f1'; g.beginPath(); g.ellipse(ex, ey, 40, 48, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1e140c'; g.lineWidth = 6; g.stroke();
    g.fillStyle = o.iris || '#3b2414'; g.beginPath(); g.ellipse(ex + s * 2, ey + 6, 20, 24, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120c08'; g.beginPath(); g.ellipse(ex + s * 2, ey + 8, 11, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex + s * 2 - 7, ey - 2, 6, 7, 0, 0, Math.PI * 2); g.fill();
    if (o.lashes) { g.strokeStyle = '#1e140c'; g.lineWidth = 5; for (const k of [-0.6, 0, 0.6]) { g.beginPath(); g.moveTo(ex + s * (20 + k * 18), ey - 44); g.lineTo(ex + s * (28 + k * 22), ey - 60); g.stroke(); } }
    if (o.old) { g.strokeStyle = 'rgba(70,40,20,0.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(ex + s * 46, ey - 6); g.lineTo(ex + s * 64, ey - 12); g.moveTo(ex + s * 46, ey + 8); g.lineTo(ex + s * 64, ey + 10); g.stroke(); }
  }
  // mouth
  g.strokeStyle = '#2a1810'; g.lineWidth = 8; g.beginPath();
  if (o.mouth === 'open') { g.fillStyle = '#2a1008'; g.ellipse(cx, 378, 26, 22, 0, 0, Math.PI * 2); g.fill(); }
  else if (o.mouth === 'smile') { g.moveTo(cx - 34, 370); g.quadraticCurveTo(cx, 392, cx + 34, 370); g.stroke(); }
  else { g.moveTo(cx - 30, 378); g.lineTo(cx + 30, 376); g.stroke(); }
  if (o.lips && o.mouth === 'open') { g.strokeStyle = o.lips; g.lineWidth = 7; g.beginPath(); g.ellipse(cx, 378, 28, 24, 0, 0, Math.PI * 2); g.stroke(); }
  if (o.mustache) { g.fillStyle = o.mustache; g.beginPath(); g.ellipse(cx - 30, 352, 36, 14, 0.2, 0, Math.PI * 2); g.ellipse(cx + 30, 352, 36, 14, -0.2, 0, Math.PI * 2); g.fill(); }
  if (o.freckles) { g.fillStyle = 'rgba(110,60,30,0.7)'; for (let i = 0; i < 14; i++) g.fillRect(cx + (rnd() - 0.5) * 170, 300 + rnd() * 30, 5, 5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function box(w, h, d, mat, x, y, z, p) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; }
function person(o) {
  const g = new THREE.Group(); const s = o.s || 1;
  const skin = M(o.skin), cloth = M(o.shirt), pants = M(o.pants);
  const legH = (o.kid ? 0.55 : 0.85) * s;
  for (const sx of [-1, 1]) {
    box(0.2 * s, legH, 0.22 * s, pants, sx * 0.13 * s, legH / 2, 0, g);
    box(0.24 * s, 0.1 * s, 0.32 * s, M(o.shoes || 0x2a1d14), sx * 0.13 * s, 0.05 * s, 0.04 * s, g);
  }
  // tapered jacket torso
  const tor = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.36 * s, (o.kid ? 0.55 : 0.8) * s, 4, 1), cloth);
  tor.rotation.y = Math.PI / 4; tor.scale.z = 0.6; const torH = (o.kid ? 0.55 : 0.8) * s; tor.position.y = legH + torH / 2; g.add(tor);
  if (o.buttons) for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 8, 6), M(0xd9a35a)); b.position.set(0, legH + torH * (0.25 + i * 0.25), 0.2 * s); g.add(b); }
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(sx * 0.37 * s, legH + torH - 0.05 * s, 0); g.add(a);
    box(0.17 * s, torH * 0.9, 0.18 * s, cloth, 0, -torH * 0.45, 0, a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 10, 8), skin); hand.scale.set(1, 1.1, 0.8); hand.position.y = -torH * 0.95; a.add(hand);
    arms.push(a);
  }
  // big flattened head with painted face
  const hr = (o.kid ? 0.42 : 0.4) * s;
  const head = new THREE.Mesh(new THREE.SphereGeometry(hr, 40, 28), new THREE.MeshToonMaterial({ map: faceTex(o), gradientMap: ramp }));
  head.scale.set(1.12, 0.98, 0.8); head.position.y = legH + torH + hr * 0.85; g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.17, 14, 10), M(o.nose || o.skin)); nose.scale.set(1.1, 0.9, 0.9); nose.position.set(0, head.position.y - hr * 0.05, hr * 0.8); g.add(nose);
  for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.16, 10, 8), M(o.skin)); ear.scale.set(0.5, 1, 0.8); ear.position.set(sx * hr * 1.1, head.position.y, 0); g.add(ear); }
  if (o.hat) { // sombrero
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.75, hr * 1.75, 0.04 * s, 24), M(0xc49a52)); brim.position.y = head.position.y + hr * 0.7; g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.75, hr * 0.95, hr * 0.6, 20), M(0xc49a52)); crown.position.y = brim.position.y + hr * 0.3; g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.96, hr * 0.96, hr * 0.12, 20), M(0x3a2a1a)); band.position.y = brim.position.y + hr * 0.08; g.add(band);
  }
  if (o.longHair) {
    const hm = M(o.hairC);
    const back = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.02, 24, 16), hm); back.scale.set(1.15, 1.25, 0.7); back.position.set(0, head.position.y - hr * 0.35, -hr * 0.25); g.add(back);
    for (const sx of [-1, 1]) { const lock = new THREE.Mesh(new THREE.BoxGeometry(hr * 0.35, hr * 1.5, hr * 0.5), hm); lock.position.set(sx * hr * 1.05, head.position.y - hr * 0.55, hr * 0.05); g.add(lock); }
  }
  if (o.earrings) for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.09, hr * 0.025, 6, 12), M(0xe8c060)); e.position.set(sx * hr * 1.12, head.position.y - hr * 0.3, hr * 0.1); g.add(e); }
  if (o.necklace) { const n = new THREE.Mesh(new THREE.TorusGeometry(0.17 * s, 0.015 * s, 6, 20, Math.PI), M(0x7a5a3a)); n.rotation.set(Math.PI / 2 + 0.35, 0, Math.PI); n.position.set(0, legH + torH - 0.03 * s, 0.05 * s); g.add(n);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.07 * s, 6), M(0xf3e6cf)); sh.rotation.x = Math.PI; sh.position.set(0, legH + torH - 0.17 * s, 0.2 * s); g.add(sh); }
  if (o.pigtails) for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.28, 10, 8), M(o.hairC)); p.position.set(sx * hr * 1.05, head.position.y + hr * 0.3, -hr * 0.2); g.add(p); }
  g.arms = arms; g.top = head.position.y + hr * (o.hat ? 1.2 : 1);
  return g;
}

const CAST = {
  chuy: { name: 'DON CHUY', skin: '#b07a4e', hair: '#b9b4aa', brow: '#e8e2d6', shirt: 0x5a3b28, pants: 0x3a2e24, mustache: '#efe7da', old: true, hat: true, hairLine: 150, buttons: true },
  dani: { name: 'DANI', skin: '#9a6442', hair: '#1c1612', hairC: 0x1c1612, longHair: true, lashes: true, earrings: true, necklace: true, lips: '#8a3a32', brow: '#1c1612', shirt: 0xe9e2d2, pants: 0x2b2d3a, hairLine: 200, mouth: 'open', worried: true },
  leo: { name: 'LEO', kid: true, s: 0.8, skin: '#c88d5f', hair: '#4a2c17', hairC: 0x4a2c17, pigtails: true, lashes: true, brow: '#3a2010', shirt: 0xf2c230, pants: 0x2e5fb8, hairLine: 190, freckles: true, mouth: 'smile' },
  leoMal: { name: 'LEO', kid: true, s: 0.8, skin: '#a9805e', hair: '#3a2414', brow: '#2a1810', shirt: 0xb8962a, pants: 0x24467e, hairLine: 170, drips: true },
  tu: { name: 'TÚ', skin: '#c68a5e', hair: '#5a3720', brow: '#3a2414', shirt: 0xc85a4a, pants: 0x3b3b55, hairLine: 175 },
};

function scene0(bg, light) {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(bg);
  sc.add(new THREE.HemisphereLight(light.sky, light.ground, light.hemi));
  const d = new THREE.DirectionalLight(light.key, light.keyI); d.position.set(...light.pos); sc.add(d);
  return sc;
}
function caption(text, who) {
  ctx.font = '800 40px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(20,12,6,0.9)'; ctx.strokeText(text, W / 2, 760); ctx.fillStyle = '#fff'; ctx.fillText(text, W / 2, 760);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.roundRect(20, 70, 60 + who.length * 26, 64, 32); ctx.fill();
  ctx.font = '900 34px Inter'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText('◉ ' + who, 40, 103);
}
function grain(warm) {
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${warm ? 0.45 : 0.25})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

window.renderCast = function () {
  R = 7;
  const sc = scene0(0x8ec9dc, { sky: 0xffffff, ground: 0xe9cf9e, hemi: 1.3, key: 0xfff0d6, keyI: 2.2, pos: [3, 5, 6] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M(0xf0d9a8)); floor.rotation.x = -Math.PI / 2; sc.add(floor);
  const order = ['chuy', 'dani', 'tu', 'leo']; const xs = [-1.9, -0.65, 0.6, 1.7];
  const people = order.map((k, i) => { const p = person(CAST[k]); p.position.x = xs[i]; p.rotation.y = -xs[i] * 0.08; sc.add(p); return [k, p]; });
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100); cam.position.set(0, 1.4, 19); cam.lookAt(0, 1.3, 0);
  effect.render(sc, cam); ctx.drawImage(renderer.domElement, 0, 0); grain(false);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  people.forEach(([k, p]) => { const v = new THREE.Vector3(p.position.x, p.top + 0.25, 0).project(cam); const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
    const t = k === 'leoMal' ? 'LEO (después)' : CAST[k].name; ctx.font = '800 20px Inter'; const w = ctx.measureText(t).width + 18; ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16, w, 32, 16); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y + 1); });
  ctx.font = '900 46px Inter'; ctx.fillStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText('REPARTO', W / 2, 120); ctx.fillText('REPARTO', W / 2, 120);
  return out.toDataURL('image/jpeg', 0.92);
};

window.renderCloseup = function (key, line, who) {
  R = 11;
  const sc = scene0(0x9bbfd0, { sky: 0xe6f2f6, ground: 0xd8c08e, hemi: 1.3, key: 0xffe2b8, keyI: 2.0, pos: [-4, 3, 5] });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M(0x8f8a62)); ground.rotation.x = -Math.PI / 2; sc.add(ground);
  for (let i = 0; i < 40; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + rnd() * 0.3, 0), M(rnd() < 0.3 ? 0xe8dcc0 : 0x5e5a48)); r.position.set((rnd() - 0.5) * 16, 0.05, -rnd() * 30); r.scale.y = 0.5; sc.add(r); }
  // wall of water behind
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(200, 60, 40, 10), M(0x1d4f63, { side: THREE.DoubleSide })); wave.position.set(0, 20, -60); sc.add(wave);
  const crest = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 200, 12, 1), M(0xe8f4f2)); crest.rotation.z = Math.PI / 2; crest.position.set(0, 49, -58); sc.add(crest);
  const p = person(CAST[key]); sc.add(p); p.arms[0].rotation.z = key === 'leo' ? -2.5 : 0;
  const cam = new THREE.PerspectiveCamera(34, W / H, 0.1, 400); cam.position.set(0, 0.55, key === 'leo' ? 3.6 : 5.0); cam.lookAt(0, key === 'leo' ? 1.1 : 1.6, 0);
  effect.render(sc, cam); ctx.drawImage(renderer.domElement, 0, 0); grain(false); caption(line, who);
  return out.toDataURL('image/jpeg', 0.92);
};

// ---------- marca: perfil y banners ----------
function resize(w, h) { renderer.setSize(w, h); out.width = w; out.height = h; }
function stroked(text, x, y, size, fill, weight = 900, lw = 0.16) { ctx.font = `${weight} ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = size * lw; ctx.strokeStyle = '#140c06'; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y); }
window.renderProfile = function () {
  resize(1080, 1080); const S = 1080, c = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.save(); ctx.beginPath(); ctx.arc(c, c, c, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#ffcf2e'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#7bdff2'; ctx.beginPath(); ctx.moveTo(S * 0.62, 0); ctx.lineTo(S, 0); ctx.lineTo(S, S); ctx.lineTo(S * 0.38, S); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#140c06'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(S * 0.62, -10); ctx.lineTo(S * 0.38, S + 10); ctx.stroke();
  stroked('A', S * 0.3, S * 0.47, 400, '#fff', 900, 0.1); stroked('B', S * 0.71, S * 0.55, 400, '#fff', 900, 0.1);
  ctx.restore(); ctx.lineWidth = 40; ctx.strokeStyle = '#140c06'; ctx.beginPath(); ctx.arc(c, c, c - 20, 0, Math.PI * 2); ctx.stroke();
  return out.toDataURL('image/png');
};
function castScene(w, h, camZ, camY, lookY, spread) {
  R = 7; resize(w, h);
  const sc = scene0(0x8ec9dc, { sky: 0xffffff, ground: 0xe9cf9e, hemi: 1.3, key: 0xfff0d6, keyI: 2.2, pos: [3, 5, 6] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), M(0xf0d9a8)); floor.rotation.x = -Math.PI / 2; sc.add(floor);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), M(0x3fb6c8)); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.01, -110); sc.add(sea);
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(400, 40), M(0x1d6f8b, { side: THREE.DoubleSide })); wave.position.set(0, 14, -90); sc.add(wave);
  const crest = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 400, 12), M(0xeaf7f6)); crest.rotation.z = Math.PI / 2; crest.position.set(0, 34, -88); sc.add(crest);
  const order = ['chuy', 'dani', 'tu', 'leo']; const xs = [-spread - 1.3, -spread, spread, spread + 1.2]; order.forEach((k, i) => { const p = person(CAST[k]); p.position.x = xs[i]; p.rotation.y = -p.position.x * 0.06; if (k === 'leo') p.arms[0].rotation.z = -2.5; sc.add(p); });
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 400); cam.position.set(0, camY, camZ); cam.lookAt(0, lookY, 0);
  effect.render(sc, cam); ctx.drawImage(renderer.domElement, 0, 0);
}
window.renderYouTube = function (name) {
  const w = 2560, h = 1440; castScene(w, h, 13, 1.25, 1.25, 3.3);
  const sy = (h - 423) / 2; // zona segura 1546x423 al centro
  stroked(name, w / 2, sy + 160, 170, '#fff'); stroked('Historias donde TÚ decides qué pasa', w / 2, sy + 300, 62, '#ffcf2e', 800, 0.14); stroked('Comenta A o B', w / 2, sy + 380, 52, '#fff', 800, 0.14);
  return out.toDataURL('image/png');
};
window.renderFacebook = function (name) {
  const w = 1640, h = 624; castScene(w, h, 9, 1.2, 1.25, 3.2);
  stroked(name, w / 2, 250, 120, '#fff'); stroked('Tú decides qué pasa · Comenta A o B', w / 2, 360, 46, '#ffcf2e', 800, 0.14);
  return out.toDataURL('image/png');
};

// ---------- opciones de foto de perfil ----------
function circleClip(S, bg) { ctx.clearRect(0, 0, S, S); ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S); }
function ring(S, c = '#140c06') { ctx.restore(); ctx.lineWidth = 36; ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 18, 0, Math.PI * 2); ctx.stroke(); }
function faceShot(S, key, over, camZ, lookY) {
  R = 3; resize(S, S);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x886644, 1.4)); const d = new THREE.DirectionalLight(0xfff0dd, 2.2); d.position.set(2, 3, 5); sc.add(d);
  const p = person({ ...CAST[key], ...over }); sc.add(p); const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100); cam.position.set(0, lookY, camZ); cam.lookAt(0, lookY, 0);
  renderer.setClearColor(0x000000, 0); effect.render(sc, cam); renderer.setClearColor(0x000000, 1);
}
window.renderOpt = function (n) {
  const S = 1080;
  if (n === 1) { // cara de Lía asustada, fondo rojo
    faceShot(S, 'leo', { mouth: 'open', worried: true }, 2.5, 1.0); const img = renderer.domElement;
    circleClip(S, '#e0342a'); const g = ctx.createRadialGradient(S / 2, S / 2, 100, S / 2, S / 2, S * 0.7); g.addColorStop(0, '#ff6a3d'); g.addColorStop(1, '#a3140f'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.drawImage(img, 0, 40); ring(S);
  } else if (n === 2) { // ojo gigante con la ola reflejada
    circleClip(S, '#0f2f3a'); const c = S / 2;
    ctx.fillStyle = '#fbf8f1'; ctx.beginPath(); ctx.ellipse(c, c, 430, 300, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 30; ctx.strokeStyle = '#140c06'; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(c, c, 210, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#3aa9c4'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#0d4f66'; ctx.beginPath(); ctx.moveTo(c - 260, c + 60); for (let x = -260; x <= 260; x += 20) ctx.lineTo(c + x, c - 40 - Math.sin((x + 260) / 520 * Math.PI) * 120); ctx.lineTo(c + 260, c + 260); ctx.lineTo(c - 260, c + 260); ctx.fill();
    ctx.fillStyle = '#eaf7f6'; ctx.beginPath(); ctx.ellipse(c + 40, c - 150, 140, 34, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#140c06'; ctx.beginPath(); ctx.arc(c, c + 10, 70, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.lineWidth = 22; ctx.strokeStyle = '#140c06'; ctx.beginPath(); ctx.arc(c, c, 210, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c - 70, c - 80, 40, 0, Math.PI * 2); ctx.fill(); ring(S, '#ffcf2e');
  } else if (n === 3) { // Don Chuy, el narrador de todas las historias
    faceShot(S, 'chuy', {}, 3.6, 1.75); const img = renderer.domElement;
    circleClip(S, '#1d6f8b'); const g = ctx.createRadialGradient(S / 2, S * 0.4, 80, S / 2, S / 2, S * 0.7); g.addColorStop(0, '#3fb6c8'); g.addColorStop(1, '#0f3c4c'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.drawImage(img, 0, 30); ring(S, '#ffcf2e');
  } else { // texto: ¿Y TÚ?
    circleClip(S, '#140c06'); const c = S / 2;
    ctx.fillStyle = '#e0342a'; ctx.beginPath(); ctx.moveTo(0, c + 160); for (let x = 0; x <= S; x += 30) ctx.lineTo(x, c + 160 - Math.sin(x / S * Math.PI * 2) * 50); ctx.lineTo(S, S); ctx.lineTo(0, S); ctx.fill();
    stroked('¿Y', c, c - 210, 260, '#ffcf2e', 900, 0.08); stroked('TÚ?', c, c + 60, 330, '#fff', 900, 0.08); ring(S, '#ffcf2e');
  }
  return out.toDataURL('image/png');
};

// ---------- banners v2: Don Chuy al frente ----------
function chuyCut(size) { faceShot(size, 'chuy', { mouth: 'smile' }, 4.2, 1.55); const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(renderer.domElement, 0, 0); return c; }
function bg(w, h) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f3c4c'); g.addColorStop(0.6, '#1d6f8b'); g.addColorStop(1, '#3fb6c8'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(234,247,246,0.9)'; ctx.beginPath(); ctx.moveTo(0, h * 0.82); for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.82 - Math.sin(x / w * Math.PI * 3) * h * 0.03); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  ctx.fillStyle = '#f0d9a8'; ctx.fillRect(0, h * 0.9, w, h * 0.1); }
window.renderYouTube2 = function () {
  const w = 2560, h = 1440, sy = (h - 423) / 2, ch = chuyCut(700); resize(w, h); bg(w, h);
  ctx.drawImage(ch, 470, sy - 150, 700, 700);
  ctx.textAlign = 'left'; const tx = 1130;
  ctx.font = '900 96px Inter'; ctx.lineJoin = 'round'; for (const [s, y, c, sz] of [['LO QUE CUENTA', sy + 150, '#ffcf2e', 96], ['DON CHUY', sy + 270, '#fff', 130]]) { ctx.font = `900 ${sz}px Inter`; ctx.lineWidth = sz * 0.16; ctx.strokeStyle = '#140c06'; ctx.strokeText(s, tx, y); ctx.fillStyle = c; ctx.fillText(s, tx, y); }
  ctx.font = '800 50px Inter'; ctx.lineWidth = 8; ctx.strokeStyle = '#140c06'; ctx.strokeText('Historias donde TÚ decides qué pasa', tx, sy + 370); ctx.fillStyle = '#fff'; ctx.fillText('Historias donde TÚ decides qué pasa', tx, sy + 370);
  return out.toDataURL('image/png');
};
window.renderFacebook2 = function () {
  const w = 1640, h = 624, ch = chuyCut(620); resize(w, h); bg(w, h);
  ctx.drawImage(ch, 230, 10, 620, 620);
  ctx.textAlign = 'left'; const tx = 800; ctx.lineJoin = 'round';
  for (const [s, y, c, sz] of [['LO QUE CUENTA', 230, '#ffcf2e', 72], ['DON CHUY', 330, '#fff', 100]]) { ctx.font = `900 ${sz}px Inter`; ctx.lineWidth = sz * 0.16; ctx.strokeStyle = '#140c06'; ctx.strokeText(s, tx, y); ctx.fillStyle = c; ctx.fillText(s, tx, y); }
  ctx.font = '800 38px Inter'; ctx.lineWidth = 7; ctx.strokeStyle = '#140c06'; ctx.strokeText('Tú decides qué pasa · Comenta A o B', tx, 410); ctx.fillStyle = '#fff'; ctx.fillText('Tú decides qué pasa · Comenta A o B', tx, 410);
  return out.toDataURL('image/png');
};
window.READY = true;
