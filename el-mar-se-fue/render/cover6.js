// EL MAR SE FUE · EP1 — personajes toon (cabeza grande, cuerpo de bloques, contorno grueso), render por tiempo t
import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const effect = new OutlineEffect(renderer, { defaultThickness: 0.006, defaultColor: [0.06, 0.04, 0.03] });
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const ctx = out.getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000); scene.add(camera);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k), seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
let RS = 7; const R = () => (RS = (RS * 16807) % 2147483647) / 2147483647;
const NO_OUTLINE = { visible: false };
const ramp = (() => { const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const M = (c, x = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...x });
const quiet = m => { m.material.userData.outlineParameters = NO_OUTLINE; return m; };

// ---------- world ----------
const HILL = { x: 90, z: 25, s: 28, h: 40 };
const hill = (x, z) => { const dx = x - HILL.x, dz = z - HILL.z; return HILL.h * Math.exp(-(dx * dx + dz * dz) / (2 * HILL.s * HILL.s)); };
const hgt = (x, z) => (z > 0 ? z * 0.03 : z * 0.025 + 0.06 * Math.sin(x * 0.9 + z * 0.7) * Math.min(1, -z / 5)) + hill(x, z);
{
  const g = new THREE.PlaneGeometry(800, 2200, 160, 440); g.rotateX(-Math.PI / 2); g.translate(0, 0, -900);
  const p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); p.setY(i, hgt(x, z)); const n = (R() - 0.5) * 0.04;
    const c = hill(x, z) > 2.5 ? [0.36, 0.62, 0.3] : z > 3 ? [0.97, 0.86, 0.6] : z > -12 ? [0.78, 0.66, 0.46] : [0.6, 0.58, 0.44];
    col.push(c[0] + n, c[1] + n, c[2] + n);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  scene.add(quiet(new THREE.Mesh(g, M(0xffffff, { vertexColors: true }))));
}
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform vec3 top,hor; varying vec3 vW; void main(){ float h=normalize(vW-cameraPosition).y; gl_FragColor=vec4(mix(hor,top,pow(clamp(h,0.,1.),0.55)),1.); }' }));
quiet(sky); scene.add(sky);
scene.fog = new THREE.Fog(0xffffff, 300, 2600);
const hemi = new THREE.HemisphereLight(0xffffff, 0xe6c89a, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.2); sun.position.set(-40, 60, 30); scene.add(sun);
const clouds = []; for (let i = 0; i < 12; i++) { const grp = new THREE.Group(), m = M(0xffffff); for (let j = 0; j < 4; j++) { const s = quiet(new THREE.Mesh(new THREE.SphereGeometry(45 + R() * 35, 10, 7), m)); s.position.set(j * 60 - 90, 0, R() * 20); s.scale.y = 0.45; grp.add(s); } grp.position.set(-1400 + R() * 2800, 280 + R() * 240, -1300 - R() * 1200); scene.add(grp); clouds.push(m); }

const waterG = new THREE.PlaneGeometry(900, 2600, 90, 120); waterG.rotateX(-Math.PI / 2); waterG.translate(0, 0, -1300);
const waterBase = waterG.attributes.position.array.slice();
const waterM = M(0x2fb6c8, { transparent: true, opacity: 0.88 });
const water = quiet(new THREE.Mesh(waterG, waterM)); scene.add(water);
const shore = t => t < 0.4 ? 1.6 : t < 4.5 ? lerp(1.6, -22, ease(seg(t, 0.4, 4.5)) ** 1.3) : lerp(-22, -230, ease(seg(t, 4.5, 10)));
function updateWater(t) {
  const s = shore(t), wl = hgt(0, s) + 0.08; water.position.set(0, wl, s);
  const p = waterG.attributes.position; for (let i = 0; i < p.count; i++) { const x = waterBase[i * 3], z = waterBase[i * 3 + 2]; p.setY(i, 0.05 * Math.sin(x * 0.17 + t * 1.6) + 0.05 * Math.sin(z * 0.23 - t * 1.2)); }
  p.needsUpdate = true; waterG.computeVertexNormals();
}
// props
const box = (w, h, d, c, x, y, z, par = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); par.add(m); return m; };
for (let i = 0; i < 11; i++) { const w = 12 + R() * 10, hh = 10 + R() * 20, x = -140 + i * 21 + R() * 6, z = 48 + R() * 14; box(w, hh, 9, [0xffa0b0, 0xffd77a, 0x8fe0f2, 0xfafafa, 0xbff0a8][i % 5], x, hgt(x, z) + hh / 2, z); }
for (let i = 0; i < 14; i++) { const x = -60 + R() * 110, z = 5 + R() * 14, y = hgt(x, z); if (Math.abs(x) < 6) continue; box(0.08, 2.2, 0.08, 0xeeeeee, x, y + 1.1, z); const t = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.6, 8), M([0xff4d6d, 0xffd60a, 0x4cc9f0, 0x80ed99][i % 4])); t.position.set(x, y + 2.3, z); scene.add(t); }
for (let i = 0; i < 9; i++) { const x = -80 + i * 18 + R() * 5, z = 24 + R() * 10, y = hgt(x, z); box(0.5, 9, 0.5, 0x8b5a2b, x, y + 4.5, z); for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 1.1), M(0x2f9d4c)); lf.position.set(x, y + 9, z); lf.rotation.set(0, (k / 6) * Math.PI * 2, -0.35); lf.translateX(1.8); scene.add(lf); } }
for (const [x, z, c, rz] of [[-22, -55, 0xe63946, 0.35], [28, -85, 0x1d3557, -0.4], [-50, -140, 0xf4a261, 0.3]]) { const g = new THREE.Group(); box(2.4, 1, 6, c, 0, 0.5, 0, g); box(1.6, 1.1, 1.8, 0xffffff, 0, 1.5, -0.8, g); g.position.set(x, hgt(x, z), z); g.rotation.set(0.05, R() * 3, rz); scene.add(g); }
{ const cx = HILL.x - 4, cz = HILL.z, cy = hgt(cx, cz); box(8, 7, 12, 0xffffff, cx, cy + 3.5, cz); const r = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 4), M(0xc0392b)); r.position.set(cx, cy + 9, cz); r.rotation.y = Math.PI / 4; r.scale.z = 1.5; scene.add(r); box(3, 12, 3, 0xffffff, cx, cy + 6, cz + 6); }
for (let i = 0; i < 160; i++) { const x = -60 + R() * 120, z = -3 - R() * 150; const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + R() * 0.35, 0), M(R() < 0.3 ? 0xf2e8cf : 0x6e6a58)); r.position.set(x, hgt(x, z), z); r.scale.y = 0.5; scene.add(r); }
const fish = []; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M(i % 2 ? 0xff7b00 : 0xc8c8c8)); f.scale.set(0.5, 0.6, 1.6); f.userData = { x: -1.5 + R() * 3, z: -0.8 - R() * 3, ph: R() * 6 }; scene.add(f); fish.push(f); }

// wave
const waveG = (() => { const cols = 160, rows = 46, g = new THREE.BufferGeometry(), pos = [], col = [], idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const u = i / cols, v = j / rows, x = (u - 0.5) * 1800, curl = v > 0.62 ? ((v - 0.62) / 0.38) ** 2 : 0;
    pos.push(x, v + 0.04 * Math.sin(x * 0.02) * v - curl * 0.12, curl * 0.42 + 0.03 * Math.sin(x * 0.013 + v * 3));
    const c = v < 0.55 ? [0.04 + v * 0.08, 0.2 + v * 0.35, 0.3 + v * 0.35] : v < 0.88 ? [0.1 + (v - 0.55) * 0.3, 0.45 + (v - 0.55) * 0.6, 0.55 + (v - 0.55) * 0.5] : [0.85, 0.96, 0.97]; col.push(...c); }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g; })();
const wave = quiet(new THREE.Mesh(waveG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))); scene.add(wave);
const foamN = 4000, foamPos = new Float32Array(foamN * 3), foamSeed = Array.from({ length: foamN }, () => [R(), R(), R()]);
const foamG = new THREE.BufferGeometry(); foamG.setAttribute('position', new THREE.BufferAttribute(foamPos, 3));
const foam = new THREE.Points(foamG, new THREE.PointsMaterial({ color: 0xffffff, size: 1 })); scene.add(foam);
function setWave(z, h, base, t) { wave.visible = foam.visible = h > 0; wave.position.set(0, base - 1, z); wave.scale.set(1, h, h);
  for (let i = 0; i < foamN; i++) { const [a, b, c] = foamSeed[i]; foamPos[i * 3] = (a - 0.5) * 1800; foamPos[i * 3 + 1] = base - 1 + h * (0.93 + b * 0.12) + Math.sin(t * 3 + a * 40) * h * 0.02; foamPos[i * 3 + 2] = z + h * (0.32 + c * 0.15); }
  foamG.attributes.position.needsUpdate = true; foam.material.size = Math.max(0.35, h * 0.007); }
const birds = []; for (let i = 0; i < 16; i++) { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0x222222 }); const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.3), m); w1.position.x = -0.6; const w2 = w1.clone(); w2.position.x = 0.6; g.add(w1, w2); g.userData = { x: -150 + R() * 300, y: 25 + R() * 50, z0: -650 - R() * 300, sp: 70 + R() * 40, ph: R() * 6, w1, w2 }; scene.add(g); birds.push(g); }

// ---------- characters (same look as approved cast) ----------
function faceTex(o) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); const cx = 256;
  g.fillStyle = o.skin; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,240,220'},${0.03 + R() * 0.04})`; g.fillRect(R() * 1024, R() * 512, 2 + R() * 5, 1 + R() * 3); }
  g.fillStyle = o.hair; g.beginPath(); g.moveTo(0, 0); g.lineTo(1024, 0); g.lineTo(1024, o.hairLine); for (let x = 1024; x >= 0; x -= 32) g.lineTo(x, o.hairLine + Math.sin(x * 0.09) * 10); g.closePath(); g.fill();
  g.strokeStyle = o.brow; g.lineWidth = 14; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 30, 196); g.quadraticCurveTo(cx + s * 62, o.worried ? 176 : 186, cx + s * 96, o.worried ? 200 : 192); g.stroke(); }
  for (const s of [-1, 1]) { const ex = cx + s * 62, ey = 250;
    g.fillStyle = '#fbf8f1'; g.beginPath(); g.ellipse(ex, ey, 40, 48, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1e140c'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#3b2414'; g.beginPath(); g.ellipse(ex + s * 2, ey + 6, 20, 24, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120c08'; g.beginPath(); g.ellipse(ex + s * 2, ey + 8, 11, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex + s * 2 - 7, ey - 2, 6, 7, 0, 0, Math.PI * 2); g.fill();
    if (o.lashes) { g.strokeStyle = '#1e140c'; g.lineWidth = 5; for (const k of [-0.6, 0, 0.6]) { g.beginPath(); g.moveTo(ex + s * (20 + k * 18), ey - 44); g.lineTo(ex + s * (28 + k * 22), ey - 60); g.stroke(); } }
    if (o.old) { g.strokeStyle = 'rgba(70,40,20,0.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(ex + s * 46, ey - 6); g.lineTo(ex + s * 64, ey - 12); g.moveTo(ex + s * 46, ey + 8); g.lineTo(ex + s * 64, ey + 10); g.stroke(); } }
  g.strokeStyle = '#2a1810'; g.lineWidth = 8; g.beginPath();
  if (o.mouth === 'open') { g.fillStyle = '#2a1008'; g.ellipse(cx, 378, 26, 22, 0, 0, Math.PI * 2); g.fill(); if (o.lips) { g.strokeStyle = o.lips; g.lineWidth = 7; g.beginPath(); g.ellipse(cx, 378, 28, 24, 0, 0, Math.PI * 2); g.stroke(); } }
  else if (o.mouth === 'smile') { g.moveTo(cx - 34, 370); g.quadraticCurveTo(cx, 392, cx + 34, 370); g.stroke(); }
  else { g.moveTo(cx - 30, 378); g.lineTo(cx + 30, 376); g.stroke(); }
  if (o.mustache) { g.fillStyle = o.mustache; g.beginPath(); g.ellipse(cx - 30, 352, 36, 14, 0.2, 0, Math.PI * 2); g.ellipse(cx + 30, 352, 36, 14, -0.2, 0, Math.PI * 2); g.fill(); }
  if (o.freckles) { g.fillStyle = 'rgba(110,60,30,0.7)'; for (let i = 0; i < 14; i++) g.fillRect(cx + (R() - 0.5) * 170, 300 + R() * 30, 5, 5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function person(o) {
  const g = new THREE.Group(), s = o.s || 1, skin = M(o.skin), cloth = M(o.shirt), pants = M(o.pants);
  const legH = (o.kid ? 0.55 : 0.85) * s, torH = (o.kid ? 0.55 : 0.8) * s, root = new THREE.Group(); g.add(root);
  const legs = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.13 * s, legH, 0); root.add(p); box(0.2 * s, legH, 0.22 * s, 0, 0, -legH / 2, 0, p).material = pants; box(0.24 * s, 0.1 * s, 0.32 * s, 0x2a1d14, 0, -legH + 0.05 * s, 0.04 * s, p); return p; });
  const tor = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.36 * s, torH, 4, 1), cloth); tor.rotation.y = Math.PI / 4; tor.scale.z = 0.6; tor.position.y = legH + torH / 2; root.add(tor);
  if (o.buttons) for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 8, 6), M(0xd9a35a)); b.position.set(0, legH + torH * (0.25 + i * 0.25), 0.2 * s); root.add(b); }
  const arms = [-1, 1].map(sx => { const a = new THREE.Group(); a.position.set(sx * 0.37 * s, legH + torH - 0.05 * s, 0); root.add(a); box(0.17 * s, torH * 0.9, 0.18 * s, 0, 0, -torH * 0.45, 0, a).material = cloth; const h = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 10, 8), skin); h.scale.set(1, 1.1, 0.8); h.position.y = -torH * 0.95; a.add(h); return a; });
  if (o.bracelet) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.1 * s, 0.025 * s, 6, 14), M(0xd00000)); b.rotation.x = Math.PI / 2; b.position.y = -torH * 0.82; arms[1].add(b); }
  const hr = (o.kid ? 0.42 : 0.4) * s, head = new THREE.Mesh(new THREE.SphereGeometry(hr, 32, 22), new THREE.MeshToonMaterial({ map: faceTex(o), gradientMap: ramp }));
  head.scale.set(1.12, 0.98, 0.8); head.position.y = legH + torH + hr * 0.85; root.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.17, 12, 8), M(o.skin)); nose.scale.set(1.1, 0.9, 0.9); nose.position.set(0, head.position.y - hr * 0.05, hr * 0.8); root.add(nose);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.16, 10, 8), M(o.skin)); e.scale.set(0.5, 1, 0.8); e.position.set(sx * hr * 1.1, head.position.y, 0); root.add(e); }
  if (o.hat) { const b = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.75, hr * 1.75, 0.04 * s, 24), M(0xc49a52)); b.position.y = head.position.y + hr * 0.7; root.add(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.75, hr * 0.95, hr * 0.6, 20), M(0xc49a52)); c.position.y = b.position.y + hr * 0.3; root.add(c); }
  if (o.longHair) { const hm = M(o.hairC); const back = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.02, 24, 16), hm); back.scale.set(1.15, 1.25, 0.7); back.position.set(0, head.position.y - hr * 0.35, -hr * 0.25); root.add(back);
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(hr * 0.35, hr * 1.5, hr * 0.5), hm); l.position.set(sx * hr * 1.05, head.position.y - hr * 0.55, hr * 0.05); root.add(l); } }
  if (o.earrings) for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.09, hr * 0.025, 6, 12), M(0xe8c060)); e.position.set(sx * hr * 1.12, head.position.y - hr * 0.3, hr * 0.1); root.add(e); }
  if (o.pigtails) for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.28, 10, 8), M(o.hairC)); p.position.set(sx * hr * 1.05, head.position.y + hr * 0.3, -hr * 0.2); root.add(p); }
  if (o.bucket) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.08 * s, 0.16 * s, 10), M(0x1e6fff)); b.position.y = -torH * 1.05; arms[1].add(b); }
  Object.assign(g, { root, legs, arms, s, legH, top: head.position.y + hr * (o.hat ? 1.2 : 1) });
  scene.add(g); return g;
}
function pose(p, o = {}) {
  const r = o.run || 0, ph = o.phase || 0;
  p.legs[0].rotation.x = Math.sin(ph) * 0.8 * r; p.legs[1].rotation.x = -Math.sin(ph) * 0.8 * r;
  p.arms[0].rotation.set(-Math.sin(ph) * 0.7 * r, 0, 0); p.arms[1].rotation.set(Math.sin(ph) * 0.7 * r, 0, 0);
  p.root.position.y = Math.abs(Math.sin(ph)) * 0.06 * r; p.root.rotation.x = 0.12 * r;
  if (o.crouch) { p.root.position.y = -p.legH * 0.45; p.legs[0].rotation.x = p.legs[1].rotation.x = -1.2; p.root.rotation.x = 0.4; p.arms[0].rotation.x = p.arms[1].rotation.x = -0.9; }
  if (o.waveR !== undefined) p.arms[0].rotation.set(0, 0, -o.waveR);
  if (o.reachR !== undefined) p.arms[0].rotation.set(-o.reachR, 0, 0.1);
  if (o.reachL !== undefined) p.arms[1].rotation.set(-o.reachL, 0, -0.1);
  if (o.phone) p.arms[0].rotation.set(-1.4, 0, 0.15);
}
const face = (p, x, z) => { p.rotation.y = Math.atan2(x - p.position.x, z - p.position.z); };
const place = (p, x, z) => p.position.set(x, hgt(x, z), z);

const tu = person({ skin: '#c68a5e', hair: '#5a3720', brow: '#3a2414', shirt: 0xc85a4a, pants: 0x3b3b55, hairLine: 175, bracelet: true, s: 0.85 });
const dani = person({ skin: '#9a6442', hair: '#1c1612', hairC: 0x1c1612, longHair: true, lashes: true, earrings: true, lips: '#8a3a32', brow: '#1c1612', shirt: 0xe9e2d2, pants: 0x2b2d3a, hairLine: 200, mouth: 'open', worried: true, s: 0.85 });
const chuy = person({ skin: '#b07a4e', hair: '#b9b4aa', brow: '#e8e2d6', shirt: 0x5a3b28, pants: 0x3a2e24, mustache: '#efe7da', old: true, hat: true, hairLine: 150, buttons: true, mouth: 'open', worried: true, s: 0.85 });
const leo = person({ kid: true, s: 0.7, skin: '#c88d5f', hair: '#4a2c17', hairC: 0x4a2c17, pigtails: true, lashes: true, brow: '#3a2010', shirt: 0xf2c230, pants: 0x2e5fb8, hairLine: 190, freckles: true, mouth: 'smile', bucket: true });
const crowd = [];
const cols = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x9b5de5, 0x06d6a0, 0xffffff, 0xef476f, 0x118ab2, 0xffb703];
const skins = ['#c68a5e', '#9a6442', '#e0b48a', '#8a5a3a', '#d9a070'];
for (let i = 0; i < 10; i++) {
  const p = person({ skin: skins[i % 5], hair: ['#151515', '#3b2314', '#6b4423', '#c9a36a'][i % 4], hairC: 0x151515, brow: '#2a1810', shirt: cols[i], pants: [0x1d3557, 0x333333, 0x6a8caf][i % 3], hairLine: 175 + (i % 3) * 10, longHair: i % 3 === 1, lashes: i % 3 === 1, mouth: i % 4 === 0 ? 'smile' : 'line', s: 0.8 });
  const left = i % 2 === 0, x = left ? -9 - R() * 14 : 12 + R() * 14, z = -5 - R() * 18;
  crowd.push({ p, x, z, ph: R() * 6, phone: i % 3 === 0 });
}
const TU0 = V3(0, 0, 0.6), LEO = V3(7, 0, -60), DIR = V3(HILL.x - TU0.x, 0, HILL.z - TU0.z).normalize();

// ---------- timeline ----------
const dark = t => t < 16 ? 0 : t < 26 ? 0.7 * ease(seg(t, 16, 26)) : lerp(0.7, 0.85, seg(t, 26, 42));
function atmos(t) {
  const d = dark(t);
  skyU.top.value.setRGB(lerp(0.36, 0.14, d), lerp(0.66, 0.17, d), lerp(0.92, 0.2, d));
  skyU.hor.value.setRGB(lerp(0.95, 0.38, d), lerp(0.88, 0.44, d), lerp(0.74, 0.42, d));
  scene.fog.color.copy(skyU.hor.value); hemi.intensity = lerp(1.3, 0.6, d); sun.intensity = lerp(2.2, 0.5, d);
  for (const m of clouds) m.color.setRGB(lerp(1, 0.35, d), lerp(1, 0.38, d), lerp(1, 0.38, d));
  waterM.color.setRGB(lerp(0.18, 0.08, d), lerp(0.71, 0.3, d), lerp(0.78, 0.35, d));
}
const shake = (t, a) => V3(Math.sin(t * 13.1) * 0.6 + Math.sin(t * 7.3) * 0.4, Math.sin(t * 11.7) * 0.5 + Math.cos(t * 5.1) * 0.5, 0).multiplyScalar(a);
function crowdAt(t, mode) {
  crowd.forEach((c, i) => {
    let x = c.x, z = c.z, run = 0, ph = c.ph + t * 9, rot;
    if (mode === 'flee') { z = -55 + i * 3 + (t - 38) * 4.5; run = 1; ph = c.ph + t * 13; }
    place(c.p, x, z);
    if (mode === 'flee') c.p.rotation.y = 0; else if (mode === 'turn') c.p.rotation.y = lerp(Math.PI, 0, ease(seg(t, 10.6, 12.2))); else c.p.rotation.y = Math.PI + (i % 3 - 1) * 0.4;
    pose(c.p, { run, phase: ph, phone: c.phone && mode === 'calm' });
  });
}
function stage(t, shot) {
  atmos(t); updateWater(t);
  const far = hgt(0, -230) + 0.08;
  if (t < 19.5) setWave(-1500, 0, far, t); else if (t < 26) setWave(-900, lerp(4, 30, seg(t, 19.5, 26)), far, t);
  else if (t < 32) setWave(-700, 36, far, t); else if (t < 38) setWave(lerp(-460, -400, seg(t, 32, 38)), lerp(28, 32, seg(t, 32, 38)), far, t);
  else setWave(lerp(-210, -125, seg(t, 38, 44)), lerp(105, 120, seg(t, 38, 44)), far, t);
  [tu, dani, chuy, leo].forEach(p => p.visible = true); dani.visible = false; chuy.visible = false;
  birds.forEach(b => b.visible = false); fish.forEach(f => f.visible = false);
  crowdAt(t, t < 10 ? 'calm' : t < 38 ? 'turn' : 'flee');
  place(tu, TU0.x, TU0.z); tu.rotation.y = Math.PI; pose(tu, {});
  place(leo, LEO.x, LEO.z); leo.rotation.y = Math.PI; pose(leo, { crouch: true });
  let eye, look, fov = 50, sh = 0.01;
  switch (shot) {
    case 'feet': { fish.forEach(f => { const u = f.userData; f.visible = shore(t) < u.z + 0.2; f.position.set(u.x, hgt(u.x, u.z) + 0.05 + Math.abs(Math.sin(t * 9 + u.ph)) * 0.1, u.z); f.rotation.set(0, u.ph, Math.sin(t * 14 + u.ph)); });
      tu.rotation.y = Math.PI * 0.85; eye = V3(1.4, 1.1, -2.6); look = V3(0, hgt(0, 0.6) + 1.0, 0.6); fov = 50; sh = 0.008; break; }
    case 'seabed': { tu.visible = false; const k = ease(seg(t, 4.5, 6.5)); eye = V3(0.5, lerp(1.4, 2.4, k), lerp(3.0, 5.0, k)); look = V3(2 + Math.sin((t - 4.5) * 0.35) * 8, 1.2, -40); fov = 52; sh = 0.012; break; }
    case 'chuy': { chuy.visible = true; const k = seg(t, 10, 14), z = lerp(-16, -3.2, k), x = lerp(-3, -0.8, k); place(chuy, x, z); chuy.rotation.y = 0; pose(chuy, { run: 1, phase: t * 12, waveR: 2.7 + Math.sin(t * 12) * 0.25 });
      tu.visible = false; eye = V3(1.2, 1.6, 2.0); look = V3(x, hgt(x, z) + 1.5, z); fov = 46; sh = 0.03; break; }
    case 'leoFar': { const k = ease(seg(t, 14.3, 19.5)); eye = V3(0.8, 2.2, 3.8); look = V3(LEO.x, hgt(LEO.x, LEO.z) + 0.7, LEO.z); fov = lerp(44, 12, k); sh = 0.004; break; }
    case 'horizon': { birds.forEach(b => { const u = b.userData; b.visible = true; b.position.set(u.x, u.y - (t - 20) * 2, u.z0 + (t - 20) * u.sp); const fl = Math.sin(t * 10 + u.ph) * 0.5; u.w1.rotation.z = fl; u.w2.rotation.z = -fl; b.scale.setScalar(1.4); });
      tu.visible = false; eye = V3(0.6, 2.4, 3.2); look = V3(-20, far + 9, -900); fov = lerp(34, 24, seg(t, 20, 26)); break; }
    case 'dani': { dani.visible = true; const run = seg(t, 26.6, 32) * 7, base = TU0.clone().addScaledVector(DIR, run);
      place(tu, base.x, base.z); const dp = base.clone().addScaledVector(DIR, 1.2).add(V3(-DIR.z, 0, DIR.x).multiplyScalar(0.5)); place(dani, dp.x, dp.z);
      const fw = Math.atan2(DIR.x, DIR.z), whip = ease(seg(t, 26, 26.7)); tu.rotation.y = lerp(Math.PI, fw, whip); dani.rotation.y = fw + Math.PI * 0.75;
      pose(tu, { run: t > 26.6 ? 0.8 : 0, phase: t * 10, reachL: 1.1 }); pose(dani, { run: t > 26.6 ? 0.6 : 0, phase: t * 10 + 1, reachR: 1.3 });
      eye = base.clone().addScaledVector(DIR, 5).add(V3(DIR.z, 0, -DIR.x).multiplyScalar(1.6)); eye.y = hgt(eye.x, eye.z) + 1.7;
      look = base.clone().addScaledVector(DIR, 0.6); look.y = hgt(look.x, look.z) + 1.4; fov = 48; sh = 0.05; break; }
    case 'leoWave': { const k = seg(t, 32.6, 33.8); leo.rotation.y = lerp(Math.PI, 0, ease(k));
      if (t >= 32.6) pose(leo, {}); if (t > 33.8) pose(leo, { waveR: 2.6 + Math.sin((t - 33.8) * 7) * 0.35 });
      eye = V3(0.6, 2.0, 3.2); look = V3(LEO.x, hgt(LEO.x, LEO.z) + 2.6, LEO.z); fov = 7.5; sh = 0.0015; break; }
    case 'bigWave': { eye = V3(0.5, hgt(0, 4) + 0.5, 4.5); look = V3(-8, lerp(55, 80, seg(t, 38, 44)), -250); fov = 72; sh = 0.04 + 0.05 * seg(t, 38, 44); break; }
    case 'daniHill': { leo.visible = false; dani.visible = true; tu.visible = false;
      const dp = V3(HILL.x - 34, 0, HILL.z - 8); place(dani, dp.x, dp.z); dani.position.y += 0.2;
      eye = V3(HILL.x - 37.5, 0, HILL.z - 10.6); eye.y = hgt(eye.x, eye.z) + 1.6; face(dani, eye.x, eye.z); pose(dani, { reachR: 1.35 });
      look = V3(dp.x, dani.position.y + 1.4, dp.z); fov = 46; break; }
  }
  camera.position.copy(eye); camera.fov = fov; camera.updateProjectionMatrix();
  camera.lookAt(look.clone().add(shake(t, sh * eye.distanceTo(look)))); sky.position.copy(eye);
}
const shotAt = t => t < 4.5 ? 'feet' : t < 10 ? 'seabed' : t < 14 ? 'chuy' : t < 20 ? 'leoFar' : t < 26 ? 'horizon' : t < 32 ? 'dani' : t < 38 ? 'leoWave' : t < 44 ? 'bigWave' : 'split';

// ---------- overlays ----------
const SUBS = [
  [0.6, 3.4, 'TÚ', 'El mar… se está yendo.'], [5.0, 7.6, 'TÚ', 'Nadie corre. Nadie.'],
  [10.2, 13.9, 'DON CHUY', '¡TSUNAMI! ¡Corran a la capilla!'], [14.2, 17.5, 'LEO', '¡Mira! ¡Encontré una concha gigante!'],
  [17.6, 21.6, 'TÚ', '¿Lía? ¡LÍA!… No me escuchó.'], [23.0, 24.8, 'TÚ', 'Cuatro minutos.'],
  [26.4, 31.5, 'DANI', '¡No vas a llegar! ¡Vámonos, por favor!'], [34.8, 36.8, 'TÚ', 'Me está saludando…'],
];
function wrap(text, maxW) { const ws = text.split(' '), ls = []; let c = ''; for (const w of ws) { const tt = c ? c + ' ' + w : w; if (ctx.measureText(tt).width > maxW && c) { ls.push(c); c = w; } else c = tt; } if (c) ls.push(c); return ls; }
function txt(text, x, y, size, color = '#fff', weight = 800, alpha = 1, maxW = 620) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  wrap(text, maxW).forEach((ln, i, a) => { const yy = y + (i - (a.length - 1) / 2) * size * 1.2; ctx.lineWidth = size * 0.22; ctx.strokeStyle = 'rgba(15,10,6,0.92)'; ctx.strokeText(ln, x, yy); ctx.fillStyle = color; ctx.fillText(ln, x, yy); });
  ctx.restore();
}
function pill(text, x, y, size, bg, fg, align = 'center') { ctx.save(); ctx.font = `900 ${size}px Inter`; const w = ctx.measureText(text).width + size * 1.2, h = size * 1.75; const x0 = align === 'left' ? x : x - w / 2;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, h / 2); ctx.fill(); ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x0 + size * 0.6, y + 1); ctx.restore(); }
function overlays(t) {
  for (const [a, b, who, s] of SUBS) if (t >= a && t < b) { const al = clamp((t - a) * 6, 0, 1) * clamp((b - t) * 6, 0, 1); ctx.globalAlpha = al;  ctx.globalAlpha = 1; txt(s, W / 2, 790, 44, '#fff', 900, al); }
  if (t >= 20 && t < 44) { const sec = Math.round(lerp(240, 150, seg(t, 20, 44))), s = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; pill(s, W - 150, 110, 36, sec < 180 ? 'rgba(200,0,0,0.85)' : 'rgba(0,0,0,0.6)', '#fff', 'left'); }
}
function vignette(t) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.22 + dark(t) * 0.35})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

const storyFrame = function (t, noOverlay) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  if (t >= 56.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - 56.6) * 3, 0, 1);
    txt('Comenta A o B.', W / 2, 560, 64, '#fff', 900, a); txt('Lo que gane, pasa.', W / 2, 650, 48, '#ffd23f', 800, a); txt('EP 2 mañana', W / 2, 760, 34, '#bbb', 700, a); return out.toDataURL('image/jpeg', 0.92); }
  const shot = shotAt(t);
  if (shot !== 'split') {
    stage(t, shot); camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false);
    effect.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0); vignette(t);
    if (t >= 32 && t < 34.6) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, W, H); }
    if (!noOverlay) overlays(t);
  } else {
    const k = t - 44, half = H / 2; renderer.setScissorTest(true);
    stage(37.5, 'leoWave'); pose(leo, { waveR: 2.6 + Math.sin(k * 3) * 0.2 }); camera.fov = 7.5 - k * 0.1; camera.aspect = W / half; camera.updateProjectionMatrix();
    renderer.setViewport(0, half, W, half); renderer.setScissor(0, half, W, half); effect.render(scene, camera);
    stage(44, 'daniHill'); setWave(-215, 112, hgt(0, -230) + 0.08, 44); camera.fov = 46 - k * 0.8; camera.aspect = W / half; camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, W, half); renderer.setScissor(0, 0, W, half); effect.render(scene, camera); renderer.setScissorTest(false);
    ctx.filter = 'saturate(0.6) contrast(1.06)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none';
    const p = clamp(1 - k / 12.5, 0, 1); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, half - 5, W, 10); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(0, half - 5, W * p, 10);
    pill('¿QUÉ HACES?', W / 2, half, 36, 'rgba(0,0,0,0.85)', '#fff');
    ctx.globalAlpha = clamp(k * 3, 0, 1);
    pill('A', 40, 190, 46, '#ffcf2e', '#000', 'left'); txt('Bajas por Lía', W / 2 + 40, 190, 50, '#ffcf2e', 900);
    pill('B', 40, half + 110, 46, '#7bdff2', '#000', 'left'); txt('Subes con Dani', W / 2 + 40, half + 110, 50, '#7bdff2', 900);
    ctx.globalAlpha = 1;
  }
  return out.toDataURL('image/jpeg', 0.92);
};

// ---------- gancho + contexto (antes de la historia) ----------
const HOOK_END = 3.9, CARD_END = 5.1, OFF = 15.6;
const towel = box(2.4, 0.04, 1.6, 0x4cc9f0, -1.3, hgt(-1.3, 4) + 0.03, 4); towel.visible = false;
const towel2 = box(0.6, 0.045, 1.6, 0xffffff, -1.3, hgt(-1.3, 4) + 0.035, 4); towel2.visible = false;
const umb = new THREE.Group(); box(0.08, 2.4, 0.08, 0xeeeeee, 0, 1.2, 0, umb); { const c = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8), M(0xff6b6b)); c.position.y = 2.5; umb.add(c); }
umb.position.set(-2.6, hgt(-2.6, 4.6), 4.6); umb.visible = false; scene.add(umb);
function sit(p) { p.root.position.y = -p.legH * 0.72; p.legs[0].rotation.x = p.legs[1].rotation.x = -1.45; p.arms[0].rotation.set(0.5, 0, 0.25); p.arms[1].rotation.set(0.5, 0, -0.25); }
function ctxStage(t, shot) {
  atmos(0); updateWater(0); setWave(-1500, 0, 0, t);
  birds.forEach(b => b.visible = false); fish.forEach(f => f.visible = false); crowd.forEach(c => c.p.visible = false);
  chuy.visible = false; [tu, dani, leo, towel, towel2, umb].forEach(o => o.visible = true);
  place(tu, -0.7, 4.1); tu.rotation.y = Math.PI; pose(tu, {}); sit(tu);
  place(dani, -1.9, 4.0); dani.rotation.y = Math.PI - 0.2; pose(dani, {}); sit(dani);
  let eye, look, fov = 46;
  if (shot === 'c1') { const k = seg(t, CARD_END, 8.6); const x = lerp(0.2, 2.6, k), z = lerp(3.2, -1.4, k); place(leo, x, z); leo.rotation.y = Math.atan2(2.4, -4.6); pose(leo, { run: 1, phase: t * 13 });
    eye = V3(2.6, 2.3, 10.5); look = V3(-0.3, 0.7, 2.0); fov = 46; }
  else if (shot === 'c2') { place(leo, 2.6, -1.8); leo.position.y += Math.abs(Math.sin(t * 6)) * 0.12; leo.rotation.y = -0.5; pose(leo, { waveR: 2.6 + Math.sin(t * 8) * 0.3 });
    eye = V3(1.2, 1.0, 1.4); look = V3(2.6, 0.75, -1.8); fov = 42; }
  else { place(leo, 2.6, -1.8); leo.rotation.y = Math.PI; pose(leo, {}); dani.rotation.y = Math.PI + 0.5; dani.arms[0].rotation.set(0, 0, -2.3 + Math.sin(t * 7) * 0.25);
    eye = V3(-1.0, 1.15, 0.4); look = V3(-1.3, 0.75, 4.0); fov = 44; }
  camera.position.copy(eye); camera.fov = fov; camera.aspect = W / H; camera.updateProjectionMatrix();
  camera.lookAt(look.clone().add(shake(t, 0.004 * eye.distanceTo(look)))); sky.position.copy(eye);
}
const CTX_SUBS = [[5.3, 8.6, 'TÚ', 'Por fin… vacaciones.'], [8.8, 11.6, 'LEO', '¡Vengan! ¡El agua está calientita!'], [11.8, 15.4, 'DANI', '¡Lía, no te alejes mucho, eh!']];
function subAt(t, a, b, who, s) { if (t < a || t >= b) return; const al = clamp((t - a) * 6, 0, 1) * clamp((b - t) * 6, 0, 1); ctx.globalAlpha = al;  ctx.globalAlpha = 1; txt(s, W / 2, 790, 44, '#fff', 900, al); }
window.renderFrame = function (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  [towel, towel2, umb].forEach(o => o.visible = false);
  if (t < HOOK_END) {
    const st = t < 1.7 ? 40 + t * 1.2 : 11 + (t - 1.7) * 1.3; storyFrame(st, true);
    subAt(t, 0.15, HOOK_END, 'DON CHUY', '¡TSUNAMI! ¡Corran a la capilla!');
    if (t > HOOK_END - 0.25) { ctx.fillStyle = `rgba(255,255,255,${(t - (HOOK_END - 0.25)) / 0.25})`; ctx.fillRect(0, 0, W, H); }
    return out.toDataURL('image/jpeg', 0.92);
  }
  if (t < CARD_END) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); txt('3 HORAS ANTES', W / 2, H / 2, 64, '#fff', 900, clamp((t - HOOK_END) * 5, 0, 1) * clamp((CARD_END - t) * 5, 0, 1)); return out.toDataURL('image/jpeg', 0.92); }
  if (t < OFF) {
    ctxStage(t, t < 8.6 ? 'c1' : t < 11.6 ? 'c2' : 'c3');
    effect.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0); vignette(0);
    if (t < 8.0) txt('EL MAR SE FUE', W / 2, 300, 70, '#fff', 900, clamp((t - CARD_END) * 3, 0, 1) * clamp((8.0 - t) * 3, 0, 1));
    for (const [a, b, w, s2] of CTX_SUBS) subAt(t, a, b, w, s2);
    return out.toDataURL('image/jpeg', 0.92);
  }
  return storyFrame(t - OFF);
};
window.TOTAL = OFF + 59;

// ===================== EP · EL HOTEL =====================
const T3 = { HOOK: 4.6, CARD: 5.8, LOBBY: 15.6, HALL: 21.5, BALC: 28.5, STAIR: 38, DEC: 50.4, TAG: 54, END: 56.5 };
const O = V3(30, 0, 32); O.y = hgt(O.x, O.z); const GY = O.y;
const hotel = new THREE.Group(); scene.add(hotel);
const hm = (c, x = {}) => M(c, x);
function slab(w, h, d, c, x, y, z, par = hotel, extra = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hm(c, extra)); m.position.set(x, y, z); par.add(m); return m; }
// exterior (quiet so interiors stay visible from inside)
const shell = slab(16, 26, 12, 0xf6d7c4, O.x, GY + 13, O.z + 6); quiet(shell); shell.material.side = THREE.FrontSide;
for (let f = 1; f < 8; f++) for (let k = -2; k <= 2; k++) { const w = slab(1.8, 1.6, 0.1, 0x7fb7d6, O.x + k * 3, GY + f * 3.2 + 1.2, O.z - 0.06); quiet(w); }
const sign = slab(9, 1.2, 0.2, 0x1f3a6b, O.x, GY + 25.5, O.z - 0.1); quiet(sign);
// balcony on floor 7 (front, center)
const BAL = V3(O.x, GY + 22.4, O.z - 1.4);
slab(5, 0.3, 2.8, 0xeeeeee, BAL.x, BAL.y - 0.15, BAL.z); slab(5, 1.0, 0.1, 0xffffff, BAL.x, BAL.y + 0.5, BAL.z - 1.35, hotel, { transparent: true, opacity: 0.5 });
// lobby set (ground floor, inside the shell)
const LOB = new THREE.Group(); hotel.add(LOB);
slab(15.6, 0.1, 11.6, 0xe8dcc6, O.x, GY + 0.05, O.z + 6, LOB); slab(15.6, 0.2, 11.6, 0xf3ece2, O.x, GY + 4.2, O.z + 6, LOB);
slab(15.6, 4.2, 0.2, 0xd9a98a, O.x, GY + 2.1, O.z + 11.8, LOB); slab(0.2, 4.2, 11.6, 0xe9c3a8, O.x - 7.8, GY + 2.1, O.z + 6, LOB); slab(0.2, 4.2, 11.6, 0xe9c3a8, O.x + 7.8, GY + 2.1, O.z + 6, LOB);
const glass = slab(15.6, 4.2, 0.08, 0xbfe6f0, O.x, GY + 2.1, O.z + 0.2, LOB, { transparent: true, opacity: 0.18 }); quiet(glass);
slab(4.6, 1.15, 0.9, 0x8b5a2b, O.x, GY + 0.6, O.z + 7.5, LOB); slab(4.8, 0.1, 1.1, 0x5a3a1a, O.x, GY + 1.2, O.z + 7.5, LOB);
slab(6, 1.2, 0.1, 0x1f3a6b, O.x, GY + 3.1, O.z + 11.65, LOB);
const lamps = []; for (const dx of [-4, 0, 4]) { const l = slab(1.2, 0.12, 1.2, 0xfff2b0, O.x + dx, GY + 4.05, O.z + 5, LOB, { emissive: 0xffe9a0, emissiveIntensity: 0.8 }); lamps.push(l); }
const plant = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 7), hm(0x2f9d4c)); plant.position.set(O.x - 6.5, GY + 1.0, O.z + 2); LOB.add(plant);
// hallway set (floor 2) and stairwell (floor 2 landing) built in an isolated box far away so nothing else is seen
const HALL = V3(400, 0, 400), STA = V3(430, 0, 400);
const hallG = new THREE.Group(); scene.add(hallG);
slab(14, 0.1, 3.4, 0x8a2a2a, HALL.x, 0.05, HALL.z, hallG); slab(14, 0.2, 3.4, 0xd8cfc0, HALL.x, 3.2, HALL.z, hallG);
slab(14, 3.2, 0.2, 0xe0c9a6, HALL.x, 1.6, HALL.z + 1.7, hallG); slab(14, 3.2, 0.2, 0xe0c9a6, HALL.x, 1.6, HALL.z - 1.7, hallG); slab(0.2, 3.2, 3.4, 0xe0c9a6, HALL.x - 7, 1.6, HALL.z, hallG); slab(0.2, 3.2, 3.4, 0xe0c9a6, HALL.x + 7, 1.6, HALL.z, hallG);
slab(1.0, 2.4, 0.08, 0xb9c2c9, HALL.x - 0.52, 1.2, HALL.z + 1.58, hallG, { emissive: 0x111111 }); slab(1.0, 2.4, 0.08, 0xb9c2c9, HALL.x + 0.52, 1.2, HALL.z + 1.58, hallG, { emissive: 0x111111 });
slab(2.4, 0.3, 0.1, 0x333333, HALL.x, 2.6, HALL.z + 1.58, hallG); slab(0.25, 0.45, 0.06, 0x666666, HALL.x + 1.4, 1.3, HALL.z + 1.58, hallG);
for (const dx of [-5, -3, 3, 5]) slab(1.0, 2.2, 0.06, 0x8b5a2b, HALL.x + dx, 1.1, HALL.z - 1.58, hallG);
const redLight = slab(0.5, 0.2, 0.3, 0xff2020, HALL.x - 3, 3.0, HALL.z + 1.5, hallG, { emissive: 0xff0000, emissiveIntensity: 1 });
const staG = new THREE.Group(); scene.add(staG);
slab(4.6, 0.2, 6, 0x9a9a92, STA.x + 1.7, 0, STA.z, staG); slab(3.4, 0.2, 1.2, 0x9a9a92, STA.x - 2.3, 0, STA.z - 2.4, staG); slab(0.2, 12, 6, 0xd8d2c4, STA.x - 4, 2, STA.z, staG); slab(0.2, 12, 6, 0xd8d2c4, STA.x + 4, 2, STA.z, staG); slab(8, 12, 0.2, 0xcfc8b8, STA.x, 2, STA.z + 3, staG);
for (let i = 0; i < 10; i++) { slab(2.4, 0.3, 0.45, 0x8f8f88, STA.x + 2.2, i * 0.3 + 0.15, STA.z - 0.5 + 2.5 - i * 0.45 + 0.0, staG); slab(2.4, 0.3, 0.45, 0x7f7f78, STA.x - 2.2, -i * 0.3 - 0.15, STA.z + 2.5 - i * 0.45, staG); }
const exitSign = slab(1.2, 0.5, 0.06, 0x16a34a, STA.x - 2.2, -1.4, STA.z + 2.85, staG, { emissive: 0x0f7a35, emissiveIntensity: 1 });
const roofDoor = slab(1.2, 2.2, 0.1, 0xfff6d0, STA.x + 2.2, 4.2, STA.z - 2.9, staG, { emissive: 0xfff0b0, emissiveIntensity: 0.9 });
slab(0.08, 1, 5, 0x444444, STA.x, 0.6, STA.z, staG);
// people
const hrOf = p => p.hr0; function acc(p, o) {
  const s = p.s, hr = 0.4 * s, hy = p.top - hr; p.hr0 = hr;
  if (o.bun) { const b = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.35, 12, 10), M(o.hairC)); b.position.set(0, hy + hr * 0.75, -hr * 0.45); p.root.add(b); }
  if (o.cap) { const c = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.02, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), M(o.cap)); c.scale.set(1.12, 0.7, 0.82); c.position.set(0, hy + hr * 0.3, 0); p.root.add(c); const br = new THREE.Mesh(new THREE.BoxGeometry(hr * 0.9, 0.03, hr * 0.7), M(o.cap)); br.position.set(0, hy + hr * 0.36, -hr * 1.0); p.root.add(br); }
  if (o.glasses) for (const sx of [-1, 1]) { const g = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.22, hr * 0.03, 6, 16), M(0x222222)); g.position.set(sx * hr * 0.28, hy + hr * 0.05, hr * 0.82); p.root.add(g); }
  if (o.collar) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.07 * s, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff })); c.position.set(0, p.top - hr * 2.05, 0.22 * s); p.root.add(c); }
  if (o.phone) { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.17, 0.02), M(0x111111)); ph.position.set(0, -0.6 * s, 0.07); p.arms[0].add(ph); }
}
const rosaO = { skin: '#c68a5e', hair: '#1a1210', hairC: 0x1a1210, bun: true, lashes: true, earrings: true, brow: '#1a1210', shirt: 0x1f3a6b, pants: 0x1f2a44, hairLine: 185, worried: true, s: 0.85 };
const rosa = person(rosaO); acc(rosa, rosaO);
const betoO = { skin: '#d9a070', hair: '#2a1a10', brow: '#2a1a10', shirt: 0x2ec4b6, pants: 0xd8c8a8, hairLine: 175, mouth: 'smile', cap: 0xe63946, phone: true, s: 0.85 };
const beto = person(betoO); acc(beto, betoO);
const carmenO = { skin: '#b98463', hair: '#e8e4dc', hairC: 0xe8e4dc, bun: true, glasses: true, old: true, brow: '#d8d2c8', shirt: 0x7b4a8e, pants: 0x4a3a5a, hairLine: 165, worried: true, s: 0.8 };
const carmen = person(carmenO); acc(carmen, carmenO);
const padreO = { skin: '#a8754e', hair: '#9a948a', brow: '#555', shirt: 0x1a1a1a, pants: 0x1a1a1a, hairLine: 160, old: true, collar: true, s: 0.85 };
const padre = person(padreO); acc(padre, padreO);
const chair = new THREE.Group(); { slab(0.6, 0.08, 0.55, 0x333333, 0, 0.55, 0, chair); slab(0.6, 0.6, 0.06, 0x333333, 0, 0.88, -0.28, chair);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 20), M(0x111111)); w.rotation.y = Math.PI / 2; w.position.set(sx * 0.36, 0.34, -0.05); chair.add(w); } } scene.add(chair);
const NEW = [rosa, beto, carmen, padre, chair];
function seatCarmen(x, y, z, ry) { chair.visible = carmen.visible = true; chair.position.set(x, y, z); chair.rotation.y = ry; carmen.position.set(x, y + 0.12, z); carmen.rotation.y = ry; pose(carmen, {}); sit(carmen); }
function env3(ST) {
  atmos(ST); updateWater(ST); const far = hgt(0, -230) + 0.08;
  if (ST < 19.5) setWave(-1500, 0, far, ST); else if (ST < 26) setWave(-900, lerp(4, 30, seg(ST, 19.5, 26)), far, ST); else setWave(-700, 36, far, ST);
  birds.forEach(b => b.visible = false); fish.forEach(f => f.visible = false); [towel, towel2, umb].forEach(o => o.visible = false);
  crowdAt(ST, ST < 10 ? 'calm' : 'turn'); [tu, dani, chuy, leo, ...NEW].forEach(p => p.visible = false);
  hemi.color.set(0xffffff); lamps.forEach(l => l.material.emissiveIntensity = 0.8);
}
function cam3(eye, look, fov, sh, t) { camera.position.copy(eye); camera.fov = fov; camera.aspect = W / H; camera.updateProjectionMatrix(); camera.lookAt(look.clone().add(shake(t, sh * eye.distanceTo(look)))); sky.position.copy(eye); }
function shot3(t, s) {
  if (s === 'hook') { env3(23); beto.visible = true; beto.position.set(BAL.x, BAL.y, BAL.z - 0.7); beto.rotation.y = 0; pose(beto, {}); beto.arms[0].rotation.set(-1.5, 0, 0.35);
    cam3(V3(BAL.x + 0.2, BAL.y + 1.85, BAL.z + 0.6), V3(BAL.x - 0.1, BAL.y + 1.45, BAL.z - 1.6), 64, 0.006, t); }
  else if (s === 'lobby') { const ST = lerp(10, 14, seg(t, T3.CARD, T3.LOBBY)); env3(ST); rosa.visible = true; place(rosa, O.x, O.z + 8.3); rosa.position.y = GY; rosa.rotation.y = Math.PI;
    pose(rosa, {}); if (t > 12.4) rosa.arms[0].rotation.set(-2.2, 0, 0.2);
    const flick = t > 7.6 && t < 9.2 ? (Math.sin(t * 40) > 0 ? 0.1 : 0.8) : t >= 9.2 ? 0.15 : 0.8; lamps.forEach(l => l.material.emissiveIntensity = flick); hemi.intensity *= t > 7.6 ? 0.75 : 1;
    if (t < 10.6) cam3(V3(O.x + 1.2, GY + 1.6, O.z + 3.6), V3(O.x, GY + 1.75, O.z + 8.3), 46, 0.003, t);
    else cam3(V3(O.x - 0.8, GY + 1.75, O.z + 9.6), V3(O.x + 2, GY + 1.2, O.z - 20), 52, 0.004, t); }
  else if (s === 'hall') { env3(15); hemi.color.set(0xff8a8a); hemi.intensity = 0.9; seatCarmen(HALL.x + 0.6, 0, HALL.z + 0.4, 0.3); carmen.arms[0].rotation.set(-1.3, 0, -0.2);
    rosa.visible = true; const k = seg(t, T3.LOBBY, 18.5); rosa.position.set(lerp(HALL.x - 6, HALL.x - 1.2, k), 0, HALL.z - 0.2); rosa.rotation.y = Math.PI / 2; pose(rosa, { run: k < 1 ? 1 : 0, phase: t * 11 });
    redLight.material.emissiveIntensity = Math.sin(t * 6) > 0 ? 1 : 0.2; cam3(V3(HALL.x + 3.4, 1.6, HALL.z - 1.2), V3(HALL.x - 0.2, 1.1, HALL.z + 0.4), 52, 0.004, t); }
  else if (s === 'balc') { const ST = lerp(27, 29, seg(t, T3.HALL, T3.BALC)); env3(ST); beto.visible = true; beto.position.set(BAL.x - 0.9, BAL.y, BAL.z - 0.6); beto.rotation.y = Math.PI; pose(beto, {}); beto.arms[0].rotation.set(-1.4, 0, 0.2);
    tu.visible = dani.visible = true; const run = seg(t, T3.HALL, T3.BALC) * 12, base = TU0.clone().addScaledVector(DIR, 6 + run); place(tu, base.x, base.z);
    const dp = base.clone().addScaledVector(DIR, 1.2); place(dani, dp.x, dp.z); const fw = Math.atan2(DIR.x, DIR.z); tu.rotation.y = dani.rotation.y = fw; pose(tu, { run: 0.8, phase: t * 10, reachL: 1.1 }); pose(dani, { run: 0.6, phase: t * 10 + 1, reachR: 1.3 }); dani.rotation.y = fw + Math.PI * 0.75;
    if (t < 26.2) cam3(V3(BAL.x + 0.4, BAL.y + 2.0, BAL.z + 0.3), base.clone().add(V3(0, 1, 0)), 30, 0.004, t);
    else cam3(V3(BAL.x + 0.4, BAL.y + 2.0, BAL.z + 0.3), V3(-30, hgt(0, -230) + 10, -900), 30, 0.003, t); }
  else if (s === 'stair' || s === 'down' || s === 'up') { env3(30); hemi.color.set(0xd8e0ff); hemi.intensity = 0.8; seatCarmen(STA.x + 0.4, 0.1, STA.z - 1.6, 0); rosa.visible = true; rosa.position.set(STA.x + 1.3, 0.1, STA.z - 1.4); rosa.rotation.y = -0.6; pose(rosa, {}); rosa.arms[1].rotation.set(-0.7, 0, -0.3);
    if (s === 'stair') cam3(V3(STA.x + 0.8, 1.5, STA.z + 1.3), V3(STA.x + 0.8, 1.05, STA.z - 1.5), 52, 0.003, t);
    else if (s === 'down') cam3(V3(STA.x - 2.2, 1.7, STA.z - 2.6), V3(STA.x - 2.2, -2.4, STA.z + 2.8), 58, 0.002, t);
    else cam3(V3(STA.x + 1.0, 0.8, STA.z + 2.6), V3(STA.x + 2.2, 4.0, STA.z - 2.9), 55, 0.002, t); }
  else if (s === 'tag') { env3(31); padre.visible = true; const cx = HILL.x - 4, cz = HILL.z - 6.3, cy = hgt(cx, HILL.z); padre.position.set(cx, cy, cz); padre.rotation.y = Math.atan2(-cx, -cz); pose(padre, {});
    padre.arms[0].rotation.set(0, 0, -0.9); cam3(V3(cx - 1.6, cy + 1.1, cz - 4.2), V3(cx, cy + 1.6, cz), 44, 0.003, t); }
}
const SUBS3 = [[0.2, 4.4, '¡Banda, el mar se fue! ¡Miren esto, no manches!'], [7.0, 10.6, '«¡TSUNAMI! ¡Corran a la capilla!»'], [10.9, 12.3, '¿Qué fue eso?'], [12.5, 15.4, '¡Evacuación! ¡Todos fuera del hotel, ya!'],
  [16.3, 19.6, 'Mija… el elevador no sirve.'], [23.5, 26.8, 'Esa gente está corriendo… ¿a dónde van?'], [29.2, 33.7, 'Son siete pisos para arriba… o la colina allá afuera.'], [34.2, 36.9, 'No me dejes sola, mija.'], [51.2, 53.5, 'Van a venir todos…']];
function liveUI(t) { pill('● EN VIVO', 40, 120, 28, '#e63946', '#fff', 'left'); pill('👁 ' + (1200 + Math.floor(t * 900)).toLocaleString('es-MX'), 250, 120, 26, 'rgba(0,0,0,0.55)', '#fff', 'left');
  const cm = ['¿¿qué es eso??', 'CORRE BETO', 'eso es un tsunami 😱', 'no manches', 'vete de ahí']; for (let i = 0; i < 4; i++) { const k = (t * 0.9 + i * 0.25) % 1; ctx.globalAlpha = 1 - k; pill(cm[(i + Math.floor(t)) % cm.length], 40, 1040 - k * 260, 24, 'rgba(0,0,0,0.5)', '#fff', 'left'); } ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const k = (t * 0.6 + i / 6) % 1; ctx.globalAlpha = 1 - k; txt('❤', 640 + Math.sin(k * 9 + i) * 20, 1150 - k * 420, 44, '#ff4d6d', 900); } ctx.globalAlpha = 1; }
window.renderFrame = function (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; const half = H / 2; renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  if (t >= T3.TAG + 0 && t >= T3.END - 2.5 && t >= T3.TAG + 2.5 - 0) { /* fallthrough to end */ }
  if (t >= T3.END - 2.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - (T3.END - 2.5) - 0.1) * 3, 0, 1); txt('Comenta A o B.', W / 2, 560, 64, '#fff', 900, a); txt('Lo que gane, pasa.', W / 2, 650, 48, '#ffd23f', 800, a); return out.toDataURL('image/jpeg', 0.92); }
  if (t >= T3.STAIR && t < T3.DEC) { // decisión: abajo = A, arriba = B
    renderer.setScissorTest(true); shot3(t, 'down'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, half, W, half); renderer.setScissor(0, half, W, half); effect.render(scene, camera);
    shot3(t, 'up'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, 0, W, half); renderer.setScissor(0, 0, W, half); effect.render(scene, camera); renderer.setScissorTest(false);
    ctx.filter = 'saturate(0.75)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none';
    const k = t - T3.STAIR, p = clamp(1 - k / 12, 0, 1); ctx.fillStyle = '#fff'; ctx.fillRect(0, half - 4, W, 8); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(0, half - 4, W * p, 8); pill('¿QUÉ HACE ROSA?', W / 2, half, 32, 'rgba(0,0,0,0.85)', '#fff');
    ctx.globalAlpha = clamp(k * 3, 0, 1); pill('A', 40, 190, 46, '#ffcf2e', '#000', 'left'); txt('Bajan y corren a la capilla', W / 2 + 40, 190, 42, '#ffcf2e', 900, 1, 560);
    pill('B', 40, half + 110, 46, '#7bdff2', '#000', 'left'); txt('Suben a la azotea', W / 2 + 40, half + 110, 46, '#7bdff2', 900); ctx.globalAlpha = 1;
    return out.toDataURL('image/jpeg', 0.92);
  }
  if (t >= T3.HOOK && t < T3.CARD) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); txt('MIENTRAS TANTO, EN EL HOTEL…', W / 2, H / 2, 50, '#fff', 900, clamp((t - T3.HOOK) * 5, 0, 1) * clamp((T3.CARD - t) * 5, 0, 1), 600); return out.toDataURL('image/jpeg', 0.92); }
  const s = t < T3.HOOK ? 'hook' : t < T3.LOBBY ? 'lobby' : t < T3.HALL ? 'hall' : t < T3.BALC ? 'balc' : t < T3.STAIR ? 'stair' : 'tag';
  shot3(t, s); effect.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0); vignette(s === 'tag' ? 28 : 0);
  if (s === 'hook') { liveUI(t); if (t > T3.HOOK - 0.25) { ctx.fillStyle = `rgba(255,255,255,${(t - (T3.HOOK - 0.25)) / 0.25})`; ctx.fillRect(0, 0, W, H); } }
  if (s === 'lobby' && t < 7.6) pill('HOTEL BAHÍA DORADA', W / 2, 200, 28, 'rgba(0,0,0,0.6)', '#fff');
  for (const [a, b, s2] of SUBS3) if (t >= a && t < b) txt(s2, W / 2, 790, 44, '#fff', 900, clamp((t - a) * 6, 0, 1) * clamp((b - t) * 6, 0, 1));
  return out.toDataURL('image/jpeg', 0.92);
};
window.TOTAL = T3.END;

// ===================== PARTE 4 · LA AZOTEA (ganó B en la Parte 2) =====================
const T5 = { HOOK: 4.2, CARD: 5.6, CLIMB: 16, BETO: 21, ROOF: 27, IMPACT: 32, AFTER: 39.8, TWIST: 44, END: 59 };
const RY = GY + 26.15;
const roofG = new THREE.Group(); scene.add(roofG);
slab(16, 0.3, 12, 0x9a948a, O.x, RY - 0.15, O.z + 6, roofG);
for (const [w, d, x, z] of [[16, 0.3, O.x, O.z + 0.15], [16, 0.3, O.x, O.z + 11.85], [0.3, 12, O.x - 7.85, O.z + 6], [0.3, 12, O.x + 7.85, O.z + 6]]) slab(w, 0.9, d, 0xd8cfc0, x, RY + 0.45, z, roofG);
const HUT = V3(O.x + 4, RY, O.z + 8); slab(3, 2.8, 3, 0xcfc8b8, HUT.x, RY + 1.4, HUT.z, roofG); const hutDoor = slab(1.1, 2.1, 0.08, 0xfff0c0, HUT.x, RY + 1.05, HUT.z - 1.52, roofG, { emissive: 0xffe9a0, emissiveIntensity: 0.6 });
{ const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2, 14), M(0x4c6a8a)); tank.position.set(O.x - 4.5, RY + 1.2, O.z + 9); roofG.add(tank); slab(0.1, 4, 0.1, 0x555555, O.x - 6, RY + 2, O.z + 4, roofG); }
const lancha = new THREE.Group(); slab(1.8, 0.7, 4.2, 0x2f6fae, 0, 0.35, 0, lancha); slab(1.5, 0.1, 3.8, 0x8b5a2b, 0, 0.62, 0, lancha); slab(1.6, 0.14, 0.3, 0xffffff, 0, 0.75, 1.9, lancha); scene.add(lancha);
const FLOOD = GY + 15;
function piggy(carrier, t) { carmen.visible = true; carmen.rotation.y = carrier.rotation.y; const back = V3(-Math.sin(carrier.rotation.y), 0, -Math.cos(carrier.rotation.y)); carmen.position.copy(carrier.position).addScaledVector(back, 0.4).add(V3(0, 0.42, 0)); pose(carmen, {}); sit(carmen);
  carmen.arms[0].rotation.set(-1.9, 0, 0.5); carmen.arms[1].rotation.set(-1.9, 0, -0.5); carrier.arms[0].rotation.set(0.6, 0, 0.3); carrier.arms[1].rotation.set(0.6, 0, -0.3); }
function env5(ST, level, edge) { env3(ST); roofG.visible = true; lancha.visible = false; if (level !== undefined) { water.position.set(0, level, edge); } }
function onRoof(p, x, z, ry) { p.visible = true; p.position.set(x, RY, z); p.rotation.y = ry; pose(p, {}); }
function shot5(t, s) {
  if (s === 'hook') { const k = seg(t, 0, 3.4); env5(40, lerp(hgt(0, -230) + 0.08, GY + 8, seg(t, 2.6, 4.2)), lerp(-230, 400, seg(t, 2.6, 4.2))); setWave(lerp(-60, 22, k), lerp(34, 30, k), hgt(0, -230) + 0.08, t);
    onRoof(beto, O.x + 1.5, O.z + 1.0, Math.PI); beto.arms[0].rotation.set(-1.5, 0, 0.2); onRoof(rosa, O.x - 0.4, O.z + 1.3, Math.PI); piggy(rosa, t);
    cam3(V3(O.x + 2.4, RY + 1.6, O.z + 4.5), V3(O.x - 2, RY + 6, O.z - 40), 66, t > 2.6 ? 0.06 : 0.01, t); }
  else if (s === 'climb') { env5(36); hemi.color.set(0xd8e0ff); hemi.intensity = 0.8; const k = ((t - T5.CARD) / 5.2) % 1, i = k * 9; rosa.visible = true;
    rosa.position.set(STA.x + 2.2, i * 0.3 + 0.3, STA.z + 2 - 0.45 * i); rosa.rotation.y = Math.PI; pose(rosa, { run: 0.6, phase: t * 7 }); piggy(rosa, t);
    cam3(V3(STA.x + 0.6, 3.4, STA.z - 2.3), rosa.position.clone().add(V3(0, 1.3, 0)), 56, 0.006, t); }
  else if (s === 'beto') { env5(37); hemi.color.set(0xd8e0ff); hemi.intensity = 0.8; rosa.visible = true; rosa.position.set(STA.x + 2.2, 4 * 0.3 + 0.3, STA.z + 2 - 0.45 * 4); rosa.rotation.y = Math.PI; pose(rosa, {});
    const kb = seg(t, T5.CLIMB, 18.6), ib = lerp(9, 5.5, kb); beto.visible = true; beto.position.set(STA.x + 2.2, ib * 0.3 + 0.3, STA.z + 2 - 0.45 * ib); beto.rotation.y = 0; pose(beto, { run: kb < 1 ? 0.8 : 0, phase: t * 9 });
    if (t < 19.2) piggy(rosa, t); else { beto.rotation.y = Math.PI; piggy(beto, t); rosa.arms[0].rotation.set(-0.8, 0, 0.2); }
    cam3(V3(STA.x + 0.4, 3.9, STA.z - 2.5), V3(STA.x + 2.2, 2.3, STA.z + 0.6), 58, 0.005, t); }
  else if (s === 'roof') { const k = seg(t, T5.BETO, 24.5); env5(38); setWave(lerp(-200, -90, seg(t, T5.BETO, T5.ROOF)), 34, hgt(0, -230) + 0.08, t); hutDoor.material.emissiveIntensity = 1.2;
    const p = HUT.clone().add(V3(0, 0, -2)).lerp(V3(O.x + 1, RY, O.z + 1.6), k); onRoof(beto, p.x, p.z, Math.PI); pose(beto, { run: k < 1 ? 0.7 : 0, phase: t * 9 }); piggy(beto, t);
    const r = p.clone().add(V3(-1.2, 0, 0.4)); onRoof(rosa, r.x, r.z, Math.PI); pose(rosa, { run: k < 1 ? 0.7 : 0, phase: t * 9 + 1 });
    if (t < 24.5) cam3(V3(O.x - 2, RY + 1.7, O.z + 2.5), V3(HUT.x, RY + 1.2, HUT.z - 1.5), 52, 0.006, t); else cam3(V3(O.x + 3, RY + 2.0, O.z + 5), V3(O.x - 3, RY - 6, O.z - 60), 60, 0.01, t); }
  else if (s === 'impact') { const k = seg(t, T5.ROOF, 30.6); env5(40, lerp(hgt(0, -230) + 0.08, FLOOD, ease(seg(t, 28.6, 31.5))), lerp(-230, 400, seg(t, 28.4, 29.6))); setWave(lerp(-90, 25, k), lerp(34, 26, k), hgt(0, -230) + 0.08, t); if (t > 30.8) wave.visible = foam.visible = false;
    onRoof(beto, O.x + 1, O.z + 1.6, Math.PI); piggy(beto, t); onRoof(rosa, O.x - 0.3, O.z + 2.0, Math.PI); rosa.arms[0].rotation.set(-2.2, 0, 0.3);
    cam3(V3(O.x + 2.6, RY + 2.0, O.z + 6), V3(O.x - 2, RY + (t < 29 ? 4 : -8), O.z - 30), 66, t > 28.4 && t < 31.6 ? 0.09 : 0.02, t); }
  else if (s === 'after' || s === 'twist' || s === 'decBoat' || s === 'decRoof') { env5(42, FLOOD, 400); wave.visible = foam.visible = false;
    onRoof(beto, O.x + 1.2, O.z + 1.4, Math.PI - 0.3); beto.arms[0].rotation.set(-0.4, 0, 0.1); onRoof(rosa, O.x - 0.6, O.z + 1.4, Math.PI); seatCarmen(O.x + 0.3, RY, O.z + 2.6, Math.PI); chair.visible = false; carmen.position.y = RY - 0.05;
    const kb = seg(t, 38, T5.END), bp = V3(lerp(4, 24, kb), FLOOD - 0.25 + Math.sin(t * 2) * 0.08, lerp(-12, 24, kb)); lancha.visible = t > 39 || s.startsWith('dec'); lancha.position.copy(bp); lancha.rotation.set(Math.sin(t * 1.3) * 0.05, 0.6 + Math.sin(t * 0.4) * 0.2, 0);
    if (s === 'after') cam3(V3(O.x + 0.2, RY + 1.3, O.z - 1.6), V3(O.x + 0.2, RY + 1.2, O.z + 2), 50, 0.003, t);
    else if (s === 'twist') { rosa.arms[0].rotation.set(-1.4, 0, -0.3); cam3(V3(O.x - 1.4, RY + 4.5, O.z + 3), bp, lerp(50, 30, seg(t, T5.AFTER, 42)), 0.004, t); }
    else if (s === 'decBoat') cam3(V3(O.x - 1.4, RY + 4.5, O.z + 3), bp, 32, 0.003, t);
    else cam3(V3(O.x + 0.2, RY + 1.4, O.z - 1.8), V3(O.x + 0.2, RY + 1.1, O.z + 2), 52, 0.002, t); }
}
const SUBS5 = [[0.6, 3.0, '¡Ahí viene! ¡AGÁRRENSE!'], [6.6, 10.4, 'Déjame aquí, mija… ya estoy vieja.'], [10.6, 12.7, '¡Ni lo piense, Doña Carmen!'], [16.8, 19.0, '¡Yo la ayudo! ¡Vámonos!'],
  [33.0, 36.4, 'Se cayó la señal… ya nadie nos ve.'], [36.6, 40.0, 'Mija… el agua sigue subiendo.'], [40.3, 43.3, '¡Esa lancha! Con ella llegamos a la colina.']];
window.renderFrame = function (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; const half = H / 2; renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  if (t >= T5.END - 2.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - (T5.END - 2.5) - 0.1) * 3, 0, 1); txt('Comenta A o B.', W / 2, 560, 64, '#fff', 900, a); txt('Lo que gane, pasa.', W / 2, 650, 48, '#ffd23f', 800, a); return out.toDataURL('image/jpeg', 0.92); }
  if (t >= T5.HOOK && t < T5.CARD) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - T5.HOOK) * 5, 0, 1) * clamp((T5.CARD - t) * 5, 0, 1); txt('USTEDES ELIGIERON:', W / 2, H / 2 - 50, 44, '#fff', 800, a); txt('SUBIR A LA AZOTEA', W / 2, H / 2 + 30, 60, '#ffcf2e', 900, a); return out.toDataURL('image/jpeg', 0.92); }
  if (t >= T5.TWIST) {
    renderer.setScissorTest(true); shot5(t, 'decBoat'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, half, W, half); renderer.setScissor(0, half, W, half); effect.render(scene, camera);
    shot5(t, 'decRoof'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, 0, W, half); renderer.setScissor(0, 0, W, half); effect.render(scene, camera); renderer.setScissorTest(false);
    ctx.filter = 'saturate(0.7)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none'; ctx.fillStyle = '#fff'; ctx.fillRect(0, half - 4, W, 8); pill('¿QUÉ HACEN?', W / 2, half, 34, 'rgba(0,0,0,0.85)', '#fff');
    ctx.globalAlpha = clamp((t - T5.TWIST) * 3, 0, 1); pill('A', 40, 190, 46, '#ffcf2e', '#000', 'left'); txt('Bajan por la lancha', W / 2 + 40, 190, 46, '#ffcf2e', 900, 1, 560);
    pill('B', 40, half + 110, 46, '#7bdff2', '#000', 'left'); txt('Se quedan a esperar ayuda', W / 2 + 40, half + 110, 42, '#7bdff2', 900, 1, 560); ctx.globalAlpha = 1;
    return out.toDataURL('image/jpeg', 0.92);
  }
  const s = t < T5.HOOK ? 'hook' : t < T5.CLIMB ? 'climb' : t < T5.BETO ? 'beto' : t < T5.ROOF ? 'roof' : t < T5.IMPACT ? 'impact' : t < T5.AFTER ? 'after' : 'twist';
  shot5(t, s); effect.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0); vignette(30);
  if (s === 'impact' && t > 28.4 && t < 29.4) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - (t - 28.4))})`; ctx.fillRect(0, 0, W, H); }
  if (t > 0.3 && t < 3.6) pill('EL MAR SE FUE · PARTE 4', W / 2, 200, 28, 'rgba(0,0,0,0.6)', '#fff');
  if (s === 'climb') pill(t < 10.8 ? 'PISO 3' : 'PISO 6', W / 2, 200, 30, 'rgba(0,0,0,0.65)', '#fff');
  for (const [a, b, s2] of SUBS5) if (t >= a && t < b) txt(s2, W / 2, 790, 44, '#fff', 900, clamp((t - a) * 6, 0, 1) * clamp((b - t) * 6, 0, 1));
  return out.toDataURL('image/jpeg', 0.92);
};
window.TOTAL = T5.END;


// ===================== PARTE 3 · LA CAPILLA (ganó B: subes con Dani) =====================
const T4 = { HOOK: 4.2, CROSS: 10.5, CLIMB: 20, CHAPEL: 29, TWIST: 39, DEC: 50, END: 52.5 };
const CH = { x: HILL.x - 4, z: HILL.z }; CH.y = hgt(CH.x, CH.z); const DOOR = V3(CH.x, CH.y, CH.z - 6.05);
const doorG = new THREE.Group(); scene.add(doorG);
{ const dk = slab(2.2, 3.4, 0.1, 0x120a06, DOOR.x, DOOR.y + 1.7, DOOR.z - 0.02, doorG); quiet(dk); }
const leafL = new THREE.Group(), leafR = new THREE.Group(); leafL.position.set(DOOR.x - 1.1, DOOR.y, DOOR.z - 0.05); leafR.position.set(DOOR.x + 1.1, DOOR.y, DOOR.z - 0.05);
slab(1.1, 3.3, 0.12, 0x6b3f1f, 0.55, 1.65, 0, leafL); slab(1.1, 3.3, 0.12, 0x6b3f1f, -0.55, 1.65, 0, leafR); doorG.add(leafL, leafR);
function doors(open) { leafL.rotation.y = -open * 1.5; leafR.rotation.y = open * 1.5; }
const bundle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.34), M(0xf2c230)); scene.add(bundle);
const pathAt = s => { const p = TU0.clone().addScaledVector(DIR, s); p.y = hgt(p.x, p.z); return p; };
const FW = Math.atan2(DIR.x, DIR.z);
function env4(ST) { env3(ST); bundle.visible = false; doors(1); [towel, towel2, umb].forEach(o => o.visible = false); crowd.forEach(c => c.p.visible = false); }
function runners(sBase, t) { crowd.slice(0, 5).forEach((c, i) => { c.p.visible = true; const p = pathAt(sBase + (i - 2) * 3.2).add(V3(-DIR.z, 0, DIR.x).multiplyScalar((i % 2 ? 1 : -1) * (1.5 + i * 0.4))); p.y = hgt(p.x, p.z); c.p.position.copy(p); c.p.rotation.y = FW; pose(c.p, { run: 1, phase: t * 12 + i }); }); }
function couple(s, t, stumble) { tu.visible = dani.visible = true; const b = pathAt(s); tu.position.copy(b); tu.rotation.y = FW; pose(tu, { run: 0.8, phase: t * 10, reachL: 1.1 });
  const d = pathAt(s + 1.2).add(V3(-DIR.z, 0, DIR.x).multiplyScalar(0.5)); d.y = hgt(d.x, d.z); dani.position.copy(d); dani.rotation.y = FW + Math.PI * 0.75; pose(dani, { run: 0.6, phase: t * 10 + 1, reachR: 1.3 });
  if (stumble) { tu.root.rotation.x = 1.15 * stumble; tu.root.position.y = -0.6 * stumble; dani.rotation.y = FW + Math.PI; } return b; }
function chuyCarry(p, t) { chuy.visible = true; bundle.visible = true; chuy.position.copy(p); pose(chuy, { run: 0.45, phase: t * 7 }); chuy.arms[0].rotation.set(-1.25, 0, 0.35); chuy.arms[1].rotation.set(-1.25, 0, -0.35);
  const fw = V3(Math.sin(chuy.rotation.y), 0, Math.cos(chuy.rotation.y)); bundle.position.copy(p).addScaledVector(fw, 0.45).add(V3(0, 1.15, 0)); bundle.rotation.y = chuy.rotation.y; }
function shot4(t, s) {
  if (s === 'hook') { env4(31); setWave(-330, 45, hgt(0, -230) + 0.08, t); tu.visible = leo.visible = true; const b = pathAt(36); tu.position.copy(b); tu.rotation.y = Math.atan2(LEO.x - b.x, LEO.z - b.z); pose(tu, {});
    place(leo, LEO.x, LEO.z); leo.rotation.y = Math.atan2(b.x - LEO.x, b.z - LEO.z); pose(leo, { waveR: 2.6 + Math.sin(t * 5) * 0.3 });
    const toL = V3(LEO.x - b.x, 0, LEO.z - b.z).normalize(); const e = b.clone().addScaledVector(toL, -1.6).add(V3(-toL.z, 0, toL.x).multiplyScalar(0.7)); e.y = b.y + 1.9;
    const k = ease(seg(t, 0, 3.2)); cam3(e, LEO.clone().setY(hgt(LEO.x, LEO.z) + lerp(4, 7.5, k)), lerp(26, 14, k), 0.002, t); }
  else if (s === 'cross') { env4(32); const sv = lerp(20, 34, seg(t, T4.HOOK, T4.CROSS)); couple(sv, t); runners(sv - 4, t); beto.visible = true; beto.position.set(BAL.x - 0.9, BAL.y, BAL.z - 0.6); beto.rotation.y = Math.PI + 0.6; pose(beto, {}); beto.arms[0].rotation.set(-1.4, 0, 0.2);
    const b = pathAt(sv); const e = b.clone().add(V3(-DIR.z, 0, DIR.x).multiplyScalar(-4)).addScaledVector(DIR, -3); e.y = b.y + 1.2; cam3(e, V3(BAL.x, BAL.y - 9, BAL.z), 52, 0.01, t); }
  else if (s === 'climb') { env4(33); const sv = lerp(44, 74, seg(t, T4.CROSS, T4.CLIMB)); const st = t > 13.4 && t < 15.2 ? Math.sin(Math.PI * seg(t, 13.4, 15.2)) : 0; const b = couple(sv, t, st); runners(sv + 6, t);
    const e = b.clone().addScaledVector(DIR, 5).add(V3(DIR.z, 0, -DIR.x).multiplyScalar(1.4)); e.y = hgt(e.x, e.z) + 1.6; cam3(e, b.clone().addScaledVector(DIR, 0.6).add(V3(0, 1.2, 0)), 50, 0.04, t); }
  else if (s === 'chapel') { env4(35); padre.visible = true; padre.position.set(DOOR.x + 0.9, DOOR.y, DOOR.z - 0.6); padre.rotation.y = Math.PI; pose(padre, {}); padre.arms[0].rotation.set(0, 0, -1.6 - Math.abs(Math.sin(t * 5)) * 0.6);
    const k = seg(t, T4.CLIMB, 25.5), from = V3(70, 0, 11), to = V3(DOOR.x - 0.4, 0, DOOR.z - 1.6), p = from.clone().lerp(to, k); p.y = hgt(p.x, p.z); tu.visible = true; tu.position.copy(p); tu.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); pose(tu, { run: k < 1 ? 0.8 : 0, phase: t * 10 });
    dani.visible = t < 26.6; if (dani.visible) { const kd = seg(t, T4.CLIMB, 26.6), dp = V3(71.5, 0, 12).lerp(V3(DOOR.x - 0.2, 0, DOOR.z + 0.3), kd); dp.y = hgt(dp.x, dp.z); dani.position.copy(dp); dani.rotation.y = tu.rotation.y; pose(dani, { run: kd < 1 ? 0.7 : 0, phase: t * 10 + 1 }); }
    cam3(V3(DOOR.x - 6, DOOR.y + 1.6, DOOR.z - 9), V3(DOOR.x - 1.5, DOOR.y + 1.4, DOOR.z - 1.5), 44, 0.006, t); }
  else if (s === 'twist' || s === 'decChuy' || s === 'decDoor') { const ST = s === 'twist' ? lerp(36, 40, seg(t, T4.CHAPEL, T4.TWIST)) : 40; env4(ST); setWave(lerp(-260, -170, seg(t, 33, T4.DEC)), lerp(95, 120, seg(t, 33, T4.DEC)), hgt(0, -230) + 0.08, t);
    padre.visible = true; padre.position.set(DOOR.x + 0.9, DOOR.y, DOOR.z - 0.6); padre.rotation.y = Math.PI; pose(padre, {});
    tu.visible = true; tu.position.set(DOOR.x - 0.4, hgt(DOOR.x - 0.4, DOOR.z - 1.6), DOOR.z - 1.6); const cp = pathAt(lerp(62, 70, seg(t, T4.CHAPEL, T4.DEC + 2))); cp.y += 0.25;
    tu.rotation.y = lerp(Math.PI * 0.1, Math.atan2(cp.x - tu.position.x, cp.z - tu.position.z), ease(seg(t, T4.CHAPEL, 30.5))); pose(tu, {});
    chuy.rotation.y = FW; chuyCarry(cp, t);
    if (s === 'twist') { if (t < 31.4) cam3(V3(DOOR.x - 1.4, DOOR.y + 1.6, DOOR.z - 4.6), tu.position.clone().add(V3(0, 1.5, 0)), 40, 0.003, t);
      else if (t < 34.5) { const e = cp.clone().addScaledVector(DIR, 4.2).add(V3(0.8, 2.0, 0)); cam3(e, cp.clone().add(V3(0, 1.2, 0)), lerp(52, 38, seg(t, 31.4, 34.5)), 0.006, t); }
      else cam3(V3(DOOR.x - 2, DOOR.y + 2.4, DOOR.z - 3), V3(-20, 30, -260), 62, 0.03, t); }
    else if (s === 'decChuy') { const e = cp.clone().addScaledVector(DIR, 3.2).add(V3(0.6, 1.6, 0)); cam3(e, cp.clone().add(V3(0, 1.4, 0)), 46, 0.01, t); }
    else { doors(lerp(1, 0.35, seg(t, T4.TWIST, T4.DEC))); cam3(V3(DOOR.x - 1.5, DOOR.y + 1.4, DOOR.z - 5), V3(DOOR.x - 0.2, DOOR.y + 1.6, DOOR.z), 46, 0.004, t); } }
}
// ===================== PARTE 5 · LO QUE TRAÍA (ganó A en la Parte 3) =====================
const T6 = { HOOK: 4.6, CARD: 6.0, RUN: 14, MEET: 25, CROSS: 29.5, DANGER: 37, END: 52 };
const MP = pathAt(60); MP.y += 0.2; const perp = V3(-DIR.z, 0, DIR.x);
const LP = MP.clone().addScaledVector(perp, 0.9); LP.y = hgt(LP.x, LP.z) + 0.2;
function env6(ST, level) { env5(ST, level === undefined ? undefined : level, level === undefined ? undefined : 400); bundle.visible = false; doors(1); lancha.visible = false; }
function liaSit(t) { leo.visible = true; leo.position.copy(LP); leo.rotation.y = FW + Math.PI; pose(leo, {}); sit(leo); leo.arms[0].rotation.set(-0.6 - Math.abs(Math.sin(t * 3)) * 0.2, 0, 0.3); }
function chuyKneel(t) { chuy.visible = true; chuy.position.copy(MP); chuy.rotation.y = FW + Math.PI + 0.5; pose(chuy, { crouch: true }); }
function shot6(t, s) {
  if (s === 'hook') { env6(40, GY + 12); liaSit(t); chuyKneel(t); const e = LP.clone().addScaledVector(DIR, -1.6).add(V3(0, 1.0, 0)); cam3(e, LP.clone().add(V3(0, 0.75, 0)), lerp(40, 26, seg(t, 0, 4.6)), 0.003, t); }
  else if (s === 'run') { env6(38, GY + 8);
    if (t < 8.6) { padre.visible = true; padre.position.set(DOOR.x + 0.9, DOOR.y, DOOR.z - 0.6); padre.rotation.y = Math.PI; pose(padre, {}); padre.arms[0].rotation.set(-1.4, 0, -0.2);
      const k = seg(t, T6.CARD, 8.6), p = V3(DOOR.x - 0.4, 0, DOOR.z - 1.6).lerp(V3(74, 0, 12), k); p.y = hgt(p.x, p.z); tu.visible = true; tu.position.copy(p); tu.rotation.y = FW + Math.PI; pose(tu, { run: 1, phase: t * 11 });
      cam3(V3(DOOR.x + 3.2, DOOR.y + 2.0, DOOR.z - 2.6), p.clone().add(V3(0, 1.2, 0)), 52, 0.01, t); }
    else { const sv = lerp(72, 63, seg(t, 8.6, T6.RUN)), b = pathAt(sv); tu.visible = true; tu.position.copy(b); tu.rotation.y = FW + Math.PI; pose(tu, { run: 1, phase: t * 11 }); runners(sv + 1, t);
      const e = b.clone().addScaledVector(DIR, -5).add(perp.clone().multiplyScalar(1.6)); e.y = hgt(e.x, e.z) + 1.3; cam3(e, b.clone().add(V3(0, 1.3, 0)), 50, 0.04, t); } }
  else if (s === 'meet') { env6(40, GY + 10); chuyKneel(t); tu.visible = true; const tp = MP.clone().addScaledVector(DIR, lerp(4, 1.2, seg(t, T6.RUN, 16))).addScaledVector(perp, 0.5); tp.y = hgt(tp.x, tp.z); tu.position.copy(tp); tu.rotation.y = FW + Math.PI; pose(tu, { run: t < 16 ? 1 : 0, phase: t * 10 });
    if (t < 18.2) { bundle.visible = true; bundle.position.copy(LP).add(V3(0, 0.3, 0)); bundle.rotation.set(0, FW, Math.PI / 2); } else liaSit(t);
    if (t > 22) { tu.position.copy(LP).addScaledVector(DIR, 0.5); tu.position.y = hgt(tu.position.x, tu.position.z); pose(tu, { crouch: true }); tu.arms[0].rotation.set(-1.3, 0, 0.4); tu.arms[1].rotation.set(-1.3, 0, -0.4); }
    const e = MP.clone().addScaledVector(DIR, -3.4).addScaledVector(perp, 0.5); e.y = hgt(e.x, e.z) + 1.3; cam3(e, MP.clone().addScaledVector(perp, 0.45).add(V3(0, 0.6, 0)), 50, 0.004, t); }
  else if (s === 'cross') { env6(41, GY + 12); chuyKneel(t); chuy.rotation.y = Math.atan2(O.x - MP.x, O.z - MP.z); liaSit(t);
    onRoof(rosa, O.x - 0.6, O.z + 1.4, Math.PI); onRoof(beto, O.x + 1.2, O.z + 1.4, Math.PI); beto.arms[0].rotation.set(0, 0, -2.6 + Math.sin(t * 6) * 0.3); seatCarmen(O.x + 0.3, RY, O.z + 2.6, Math.PI); chair.visible = false; carmen.position.y = RY - 0.05;
    lancha.visible = true; lancha.position.set(22, GY + 12 - 0.25 + Math.sin(t * 2) * 0.08, 18); lancha.rotation.y = 0.8;
    const e = MP.clone().addScaledVector(perp, -0.8).add(V3(0, 1.6, 0)); cam3(e, V3(O.x, RY + 0.6, O.z + 2), lerp(34, 16, seg(t, T6.MEET, 27.5)), 0.004, t); }
  else if (s === 'danger' || s === 'decA' || s === 'decB') { const lv = s === 'danger' ? lerp(GY + 12, MP.y - 2.2, seg(t, T6.CROSS, T6.DANGER)) : MP.y - 2.2; env6(42, lv); chuy.visible = true; chuy.position.copy(MP); chuy.rotation.y = FW + Math.PI; pose(chuy, {}); sit(chuy);
    if (s === 'danger') { liaSit(t); tu.visible = true; tu.position.copy(LP).addScaledVector(DIR, 0.6); tu.position.y = hgt(tu.position.x, tu.position.z); tu.rotation.y = FW + Math.PI; pose(tu, {});
      const e = MP.clone().addScaledVector(DIR, -7).add(V3(0, 0, 0)); e.y = lv + 1.0; cam3(e, MP.clone().add(V3(0, 0.8, 0)), 46, 0.01, t); }
    else if (s === 'decA') { tu.visible = true; const tp = MP.clone().addScaledVector(DIR, 2.2); tp.y = hgt(tp.x, tp.z); tu.position.copy(tp); tu.rotation.y = FW; pose(tu, {}); leo.visible = true; leo.rotation.y = FW; leo.position.copy(tp).addScaledVector(V3(Math.sin(FW), 0, Math.cos(FW)), -0.35).add(V3(0, 0.7, 0)); pose(leo, {}); sit(leo); leo.arms[0].rotation.set(-1.9, 0, 0.5); leo.arms[1].rotation.set(-1.9, 0, -0.5);
      const e = MP.clone().addScaledVector(DIR, 5.2).addScaledVector(perp, 1.2); e.y = hgt(e.x, e.z) + 1.4; cam3(e, MP.clone().addScaledVector(DIR, 1.6).add(V3(0, 1.1, 0)), 46, 0.004, t); }
    else { tu.visible = true; const tp = MP.clone().addScaledVector(perp, 0.6); tp.y = hgt(tp.x, tp.z); tu.position.copy(tp); tu.rotation.y = FW; pose(tu, {}); tu.arms[1].rotation.set(0, 0, 1.0); chuy.position.copy(MP).addScaledVector(perp, -0.1); chuy.rotation.y = FW; pose(chuy, {}); chuy.arms[0].rotation.set(0, 0, -1.2);
      leo.visible = true; const lp2 = MP.clone().addScaledVector(DIR, 5); lp2.y = hgt(lp2.x, lp2.z); leo.position.copy(lp2); leo.rotation.y = FW; pose(leo, { run: 1, phase: t * 12 });
      const e = MP.clone().addScaledVector(DIR, -3.5).addScaledVector(perp, 1.8); e.y = hgt(e.x, e.z) + 1.8; cam3(e, MP.clone().addScaledVector(DIR, 2.5).add(V3(0, 1.0, 0)), 50, 0.004, t); } }
}
const SUBS6 = [[0.5, 1.8, '¿Lía…?'], [2.0, 4.4, '¡Hermano!'], [6.3, 8.4, '¡No! ¡Regresa!'], [14.6, 18.6, 'La encontré… en el fondo del mar.'], [19.0, 22.3, '¡Perdón por alejarme!'], [22.4, 24.8, 'Perdóname tú a mí.'],
  [26.0, 28.5, '¿Esa es… mi lancha?'], [30.0, 33.4, 'Mi pierna… no puedo, muchacho.'], [34.0, 36.2, '«¡Ya voy a cerrar la puerta!»']];
window.renderFrame = function (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; const half = H / 2; renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  if (t >= T6.END - 2.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - (T6.END - 2.5) - 0.1) * 3, 0, 1); txt('Comenta A o B.', W / 2, 560, 64, '#fff', 900, a); txt('Lo que gane, pasa.', W / 2, 650, 48, '#ffd23f', 800, a); return out.toDataURL('image/jpeg', 0.92); }
  if (t >= T6.HOOK && t < T6.CARD) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - T6.HOOK) * 5, 0, 1) * clamp((T6.CARD - t) * 5, 0, 1); txt('USTEDES ELIGIERON:', W / 2, H / 2 - 60, 44, '#fff', 800, a); txt('SALIR A AYUDAR A DON CHUY', W / 2, H / 2 + 30, 52, '#ffcf2e', 900, a, 640); return out.toDataURL('image/jpeg', 0.92); }
  if (t >= T6.DANGER) {
    renderer.setScissorTest(true); shot6(t, 'decA'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, half, W, half); renderer.setScissor(0, half, W, half); effect.render(scene, camera);
    shot6(t, 'decB'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, 0, W, half); renderer.setScissor(0, 0, W, half); effect.render(scene, camera); renderer.setScissorTest(false);
    ctx.filter = 'saturate(0.7)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none'; ctx.fillStyle = '#fff'; ctx.fillRect(0, half - 4, W, 8); pill('¿QUÉ HACES?', W / 2, half, 34, 'rgba(0,0,0,0.85)', '#fff');
    ctx.globalAlpha = clamp((t - T6.DANGER) * 3, 0, 1); pill('A', 40, 190, 46, '#ffcf2e', '#000', 'left'); txt('Cargas a Lía y corren', W / 2 + 40, 190, 44, '#ffcf2e', 900, 1, 560);
    pill('B', 40, half + 110, 46, '#7bdff2', '#000', 'left'); txt('Cargas a Don Chuy', W / 2 + 40, half + 110, 46, '#7bdff2', 900, 1, 560); ctx.globalAlpha = 1;
    return out.toDataURL('image/jpeg', 0.92);
  }
  const s = t < T6.HOOK ? 'hook' : t < T6.RUN ? 'run' : t < T6.MEET ? 'meet' : t < T6.CROSS ? 'cross' : 'danger';
  shot6(t, s); effect.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0); vignette(30);
  if (t > 0.3 && t < 1.9) pill('EL MAR SE FUE · PARTE 5', W / 2, 200, 28, 'rgba(0,0,0,0.6)', '#fff');
  for (const [a, b, s2] of SUBS6) if (t >= a && t < b) txt(s2, W / 2, 790, 44, '#fff', 900, clamp((t - a) * 6, 0, 1) * clamp((b - t) * 6, 0, 1));
  return out.toDataURL('image/jpeg', 0.92);
};
window.TOTAL = T6.END;

// ===================== PARTE 6 · LA LANCHA (ganó A en la Parte 4) =====================
const T7 = { HOOK: 4.2, CARD: 5.6, DESC: 15, ROW: 24, CROSS: 29, DIL: 39, END: 53.8 };
const LV = MP.y - 1.8, BAL6 = V3(O.x - 4, LV + 0.7, O.z - 1.0);
slab(4, 0.25, 2.2, 0xeeeeee, BAL6.x, BAL6.y - 0.12, BAL6.z);
const plank = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.05), M(0x8b5a2b)); plank.position.set(0, -0.5, 0.15); beto.arms[0].add(plank);
const debris = []; { const cols = [0xff4d6d, 0xffd60a, 0x4cc9f0, 0x80ed99]; for (let i = 0; i < 26; i++) { const g = new THREE.Group(); if (i % 2) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 8), M(cols[i % 4])); c.rotation.z = 0.5; g.add(c); } else slab(0.8, 0.12, 1.8, 0xf7f7f2, 0, 0, 0, g); g.userData = { x: 5 + (i * 37 % 50), z: -18 + (i * 23 % 36), ph: i }; scene.add(g); debris.push(g); } }
const EXT = crowd[1].p; EXT.userData.isExtra = true;
const ROUTE = [V3(BAL6.x, 0, BAL6.z - 2.2), V3(40, 0, 0), V3(52, 0, 6)];
function routeAt(k) { const a = k < 0.6 ? ROUTE[0].clone().lerp(ROUTE[1], k / 0.6) : ROUTE[1].clone().lerp(ROUTE[2], (k - 0.6) / 0.4); a.y = LV - 0.25; return a; }
function env7(ST) { env6(ST, LV); debris.forEach(d => { d.visible = true; const u = d.userData; d.position.set(u.x, LV + 0.05 + Math.sin(ST * 1.7 + u.ph) * 0.05, u.z); d.rotation.y = u.ph + ST * 0.1; }); EXT.visible = false; }
function boatAt(p, ry, t, paddle) { lancha.visible = true; lancha.position.copy(p).add(V3(0, Math.sin(t * 2) * 0.06, 0)); lancha.rotation.set(Math.sin(t * 1.3) * 0.05, ry, Math.sin(t * 1.7) * 0.04);
  const fw = V3(Math.sin(ry), 0, Math.cos(ry)), base = lancha.position.clone().add(V3(0, 0.55, 0));
  rosa.visible = carmen.visible = beto.visible = true; chair.visible = false;
  rosa.position.copy(base).addScaledVector(fw, 1.2); rosa.rotation.y = ry; pose(rosa, {}); sit(rosa);
  carmen.position.copy(base); carmen.rotation.y = ry; pose(carmen, {}); sit(carmen);
  beto.position.copy(base).addScaledVector(fw, -1.3).add(V3(0, -0.15, 0)); beto.rotation.y = ry; pose(beto, {}); beto.root.position.y = -0.3;
  if (paddle) { const ph = Math.sin(t * 4); beto.arms[0].rotation.set(-0.6 + ph * 0.7, 0, -0.5); beto.arms[1].rotation.set(-0.6 + ph * 0.7, 0, 0.5); } plank.visible = true; }
function extraAt(p, t) { EXT.visible = true; EXT.position.copy(p).add(V3(0, -1.15 + Math.sin(t * 3) * 0.06, 0)); EXT.rotation.y = 0.6; pose(EXT, {}); EXT.arms[0].rotation.set(0, 0, -2.7 + Math.sin(t * 6) * 0.3); EXT.arms[1].rotation.set(0, 0, 2.4); }
function shot7(t, s) {
  plank.visible = false;
  if (s === 'hook' || s === 'dil' || s === 'decA') { env7(45); const bp = routeAt(0.82); boatAt(bp, 0.7, t, false); const xp = bp.clone().add(V3(-2.6, 0, 2.2)); extraAt(xp, t); rosa.arms[0].rotation.set(-1.5, 0, -0.5);
    if (s === 'hook') cam3(xp.clone().add(V3(1.6, 0.9, 2.4)), xp.clone().add(V3(0, 0.5, 0)), lerp(48, 34, seg(t, 0, 4)), 0.006, t);
    else if (s === 'decA') cam3(xp.clone().add(V3(1.4, 1.2, 3.0)), xp.clone().add(V3(1.0, 0.5, -1.0)), 50, 0.004, t);
    else cam3(bp.clone().add(V3(1.2, 2.6, 5.5)), bp.clone().add(V3(-2.2, 0.4, 1.8)), 56, 0.005, t); }
  else if (s === 'desc') { env7(42); const k = seg(t, T7.CARD, 12.5); const lp = ROUTE[0].clone(); lp.y = LV - 0.25; lancha.visible = true; lancha.position.copy(lp); lancha.rotation.y = 0.0;
    beto.visible = true; beto.rotation.y = Math.PI; if (t < 7.2) { beto.position.copy(BAL6); pose(beto, {}); } else { beto.position.copy(lp).add(V3(0, 0.55, -1.2)); pose(beto, {}); beto.arms[0].rotation.set(-2.6, 0, 0); beto.arms[1].rotation.set(-2.6, 0, 0); }
    rosa.visible = true; rosa.position.copy(BAL6).add(V3(0.9, 0, 0)); rosa.rotation.y = Math.PI; pose(rosa, {}); rosa.arms[0].rotation.set(-1.2, 0, 0); rosa.arms[1].rotation.set(-1.2, 0, 0);
    carmen.visible = true; chair.visible = false; carmen.rotation.y = Math.PI; const cp = BAL6.clone().add(V3(0.4, 0.4, -0.6)).lerp(lp.clone().add(V3(0, 0.55, 0)), ease(seg(t, 8, 13))); carmen.position.copy(cp); pose(carmen, {}); sit(carmen);
    if (t > 13) { boatAt(lp, Math.PI, t, false); rosa.visible = true; }
    cam3(V3(BAL6.x + 4.5, LV + 2.4, BAL6.z - 7), V3(BAL6.x, LV + 0.6, BAL6.z - 1.4), 46, 0.004, t); }
  else if (s === 'row' || s === 'cross') { env7(43); const k = s === 'row' ? lerp(0, 0.5, seg(t, T7.DESC, T7.ROW)) : lerp(0.5, 0.75, seg(t, T7.ROW, T7.CROSS)), bp = routeAt(k), ry = Math.atan2(ROUTE[1].x - ROUTE[0].x, ROUTE[1].z - ROUTE[0].z); boatAt(bp, ry, t, true);
    if (s === 'row') cam3(bp.clone().add(V3(-3.2, 1.6, 3.5)), bp.clone().add(V3(0, 0.8, 0)), 50, 0.006, t);
    else { [tu, leo, chuy].forEach(p => p.visible = true); place(tu, MP.x + 0.6, MP.z); tu.rotation.y = FW + Math.PI; pose(tu, {}); place(chuy, MP.x - 0.5, MP.z); chuy.rotation.y = FW + Math.PI; pose(chuy, {}); sit(chuy); place(leo, LP.x, LP.z); leo.rotation.y = FW + Math.PI; pose(leo, {});
      beto.arms[0].rotation.set(-1.5, 0, -0.3); cam3(bp.clone().add(V3(-0.6, 3.4, -0.4)), MP.clone().add(V3(0, 1.0, 0)), lerp(40, 14, seg(t, T7.ROW, 26.5)), 0.004, t); } }
  else if (s === 'decB') { env7(46); const bp = routeAt(lerp(0.82, 0.95, seg(t, T7.DIL, T7.END))); boatAt(bp, Math.atan2(ROUTE[2].x - ROUTE[1].x, ROUTE[2].z - ROUTE[1].z), t, true); extraAt(routeAt(0.82).add(V3(-2.6, 0, 2.2)), t);
    cam3(bp.clone().add(V3(-3.5, 1.8, -3.0)), bp.clone().add(V3(2, 0.8, 2)), 50, 0.004, t); }
}
const SUBS7 = [[0.5, 3.4, '¡Ayúdenme, por favor!'], [7.0, 10.1, '¡Despacio… despacio!'], [11.2, 13.3, 'Ay, Diosito…'], [16.0, 18.3, '¡Hacia la capilla! ¡Rema, Beto!'],
  [25.0, 27.4, '¡Miren! ¡Hay gente en la colina!'], [30.0, 32.7, '¡No sé nadar! ¡Por favor!'], [34.5, 37.5, 'Si se sube… nos hundimos.']];
window.renderFrame = function (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; const half = H / 2; renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  if (t >= T7.END - 2.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - (T7.END - 2.5) - 0.1) * 3, 0, 1); txt('Comenta A o B.', W / 2, 560, 64, '#fff', 900, a); txt('Lo que gane, pasa.', W / 2, 650, 48, '#ffd23f', 800, a); return out.toDataURL('image/jpeg', 0.92); }
  if (t >= T7.HOOK && t < T7.CARD) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const a = clamp((t - T7.HOOK) * 5, 0, 1) * clamp((T7.CARD - t) * 5, 0, 1); txt('USTEDES ELIGIERON:', W / 2, H / 2 - 60, 44, '#fff', 800, a); txt('BAJAR POR LA LANCHA', W / 2, H / 2 + 30, 56, '#ffcf2e', 900, a, 640); return out.toDataURL('image/jpeg', 0.92); }
  if (t >= T7.DIL) {
    renderer.setScissorTest(true); shot7(t, 'decA'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, half, W, half); renderer.setScissor(0, half, W, half); effect.render(scene, camera);
    shot7(t, 'decB'); camera.aspect = W / half; camera.updateProjectionMatrix(); renderer.setViewport(0, 0, W, half); renderer.setScissor(0, 0, W, half); effect.render(scene, camera); renderer.setScissorTest(false);
    ctx.filter = 'saturate(0.7)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none'; ctx.fillStyle = '#fff'; ctx.fillRect(0, half - 4, W, 8); pill('¿QUÉ HACEN?', W / 2, half, 34, 'rgba(0,0,0,0.85)', '#fff');
    ctx.globalAlpha = clamp((t - T7.DIL) * 3, 0, 1); pill('A', 40, 190, 46, '#ffcf2e', '#000', 'left'); txt('Lo suben a la lancha', W / 2 + 40, 190, 46, '#ffcf2e', 900, 1, 560);
    pill('B', 40, half + 110, 46, '#7bdff2', '#000', 'left'); txt('Siguen remando', W / 2 + 40, half + 110, 48, '#7bdff2', 900, 1, 560); ctx.globalAlpha = 1;
    return out.toDataURL('image/jpeg', 0.92);
  }
  const s = t < T7.HOOK ? 'hook' : t < T7.DESC ? 'desc' : t < T7.ROW ? 'row' : t < T7.CROSS ? 'cross' : 'dil';
  shot7(t, s); effect.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0); vignette(30);
  if (t > 0.3 && t < 1.9) pill('EL MAR SE FUE · PARTE 6', W / 2, 200, 28, 'rgba(0,0,0,0.6)', '#fff');
  for (const [a, b, s2] of SUBS7) if (t >= a && t < b) txt(s2, W / 2, 790, 44, '#fff', 900, clamp((t - a) * 6, 0, 1) * clamp((b - t) * 6, 0, 1));
  return out.toDataURL('image/jpeg', 0.92);
};
window.TOTAL = T7.END;

window.renderCover = function () {
  ctx.setTransform(1, 0, 0, 1, 0, 0); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  shot7(44, 'decA'); const xp = EXT.position.clone().add(V3(0, 1.15, 0)); cam3(xp.clone().add(V3(0.2, 0.9, 3.6)), xp.clone().add(V3(0.8, 1.6, -1.5)), 58, 0, 0);
  effect.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 520);
  for (const [s, y, sz, c] of [['¿LO SUBEN?', 240, 96, '#fff'], ['LA LANCHA SE PUEDE HUNDIR', 330, 44, '#ffcf2e']]) { ctx.font = `900 ${sz}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = sz * 0.16; ctx.strokeStyle = '#140c06'; ctx.strokeText(s, W / 2, y); ctx.fillStyle = c; ctx.fillText(s, W / 2, y); }
  pill('EL MAR SE FUE · PARTE 6', W / 2, 1080, 34, 'rgba(0,0,0,0.75)', '#fff');
  return out.toDataURL('image/png');
};
window.READY = true;
