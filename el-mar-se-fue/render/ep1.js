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
window.READY = true;
