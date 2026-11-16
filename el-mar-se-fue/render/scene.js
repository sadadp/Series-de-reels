// EL MAR SE FUE · EP1 — escena 3D (Three.js), render determinista por tiempo t
import * as THREE from 'three';

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const out = document.createElement('canvas'); out.width = W; out.height = H;
document.body.appendChild(out);
const ctx = out.getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.03, 6000);
scene.add(camera);

// ---------- utils ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(7);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- terrain ----------
const HILL = { x: 90, z: 25, s: 28, h: 40 };
const hill = (x, z) => { const dx = x - HILL.x, dz = z - HILL.z; return HILL.h * Math.exp(-(dx * dx + dz * dz) / (2 * HILL.s * HILL.s)); };
function hgt(x, z) {
  let y = z > 0 ? z * 0.03 + 0.12 * Math.sin(x * 0.3) * Math.min(1, z / 10)
               : z * 0.025 + 0.07 * Math.sin(x * 0.9 + z * 0.7) * Math.min(1, -z / 5);
  return y + hill(x, z);
}
{
  const g = new THREE.PlaneGeometry(800, 2200, 160, 440);
  g.rotateX(-Math.PI / 2); g.translate(0, 0, -900);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  const r2 = rng(3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = hgt(x, z); p.setY(i, y);
    let c;
    const n = (r2() - 0.5) * 0.05;
    if (hill(x, z) > 2.5) c = [0.28 + n, 0.55 + n, 0.22];
    else if (z > 3) c = [0.96 + n, 0.83 + n, 0.56 + n];
    else if (z > -12) c = [0.66 + n, 0.53 + n, 0.35 + n];
    else { const k = 0.5 + 0.5 * Math.sin(x * 0.11) * Math.sin(z * 0.07); c = [0.43 + n - k * 0.06, 0.42 + n + k * 0.03, 0.30 + n]; }
    col.set(c, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));
}

// ---------- sky ----------
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 top,hor,bot; varying vec3 vW; void main(){ float h=normalize(vW-cameraPosition).y; vec3 c = h>0. ? mix(hor,top,pow(clamp(h,0.,1.),0.55)) : mix(hor,bot,min(-h*5.,1.)); gl_FragColor=vec4(c,1.); }`
}));
scene.add(sky);
scene.fog = new THREE.Fog(0xffffff, 250, 2600);
const SUN_DIR = V3(-0.35, 0.10, -1).normalize();
const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c0, fog: false }));
sunDisk.position.copy(SUN_DIR.clone().multiplyScalar(3500)); scene.add(sunDisk);

const hemi = new THREE.HemisphereLight(0xbfe3ff, 0xd9b77a, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd59a, 2.6); sun.position.copy(SUN_DIR.clone().multiplyScalar(100)); scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(20, 30, 40); scene.add(fill);

// clouds
const clouds = [];
for (let i = 0; i < 14; i++) {
  const grp = new THREE.Group(), m = mat(0xffffff, { roughness: 1, emissive: 0x443322, emissiveIntensity: 0.3 });
  for (let j = 0; j < 5; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(40 + R() * 40, 12, 8), m); s.position.set(j * 55 - 110, R() * 20, R() * 30); s.scale.y = 0.5; grp.add(s); }
  grp.position.set(-1500 + R() * 3000, 260 + R() * 260, -1200 - R() * 1400); scene.add(grp); clouds.push({ grp, m });
}

// ---------- water ----------
const waterG = new THREE.PlaneGeometry(900, 2600, 90, 120); waterG.rotateX(-Math.PI / 2); waterG.translate(0, 0, -1300);
const waterBase = waterG.attributes.position.array.slice();
const waterM = mat(0x1aa9c0, { roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.72 });
const water = new THREE.Mesh(waterG, waterM); scene.add(water);
function shore(t) {
  if (t < 0.4) return 1.3;
  if (t < 4) return lerp(1.3, -25, ease(seg(t, 0.4, 4)) ** 1.3);
  return lerp(-25, -230, ease(seg(t, 4, 10)));
}
function updateWater(t) {
  const s = shore(t); const wl = hgt(0, s) + 0.09;
  water.position.set(0, wl, s);
  const p = waterG.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = waterBase[i * 3], z = waterBase[i * 3 + 2];
    p.setY(i, 0.05 * Math.sin(x * 0.17 + t * 1.6) + 0.05 * Math.sin(z * 0.23 - t * 1.2));
  }
  p.needsUpdate = true; waterG.computeVertexNormals();
  return wl;
}

// ---------- town, umbrellas, palms, boats, chapel ----------
const hotelCols = [0xff8fa3, 0xffd166, 0x7bdff2, 0xf7f7f7, 0xb8f2a0, 0xff9f6b];
for (let i = 0; i < 12; i++) {
  const w = 12 + R() * 10, hh = 10 + R() * 22, d = 10;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(hotelCols[i % 6]));
  const x = -140 + i * 20 + R() * 6, z = 45 + R() * 15; m.position.set(x, hgt(x, z) + hh / 2, z); scene.add(m);
}
const umbCols = [0xff4d6d, 0xffd60a, 0x4cc9f0, 0xf72585, 0x80ed99];
for (let i = 0; i < 16; i++) {
  const x = -60 + R() * 110, z = 4 + R() * 16, y = hgt(x, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2), mat(0xeeeeee)); pole.position.set(x, y + 1.1, z);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.6, 10), mat(umbCols[i % 5])); top.position.set(x, y + 2.3, z);
  scene.add(pole, top);
}
for (let i = 0; i < 10; i++) {
  const x = -90 + i * 17 + R() * 5, z = 22 + R() * 10, y = hgt(x, z);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 9, 6), mat(0x8b5a2b)); tr.position.set(x, y + 4.5, z); tr.rotation.z = (R() - 0.5) * 0.3; scene.add(tr);
  for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4.5, 4), mat(0x2d9d4a)); lf.position.set(x, y + 9, z); lf.rotation.set(Math.PI / 2 - 0.5, (k / 6) * Math.PI * 2, 0, 'YXZ'); lf.translateY(2); scene.add(lf); }
}
function boat(x, z, c, rz) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 6), mat(c)); hull.position.y = 0.5;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.8), mat(0xffffff)); cab.position.set(0, 1.5, -0.8);
  g.add(hull, cab); g.position.set(x, hgt(x, z), z); g.rotation.set(0.05, R() * 3, rz); scene.add(g);
}
boat(-22, -55, 0xe63946, 0.35); boat(28, -85, 0x1d3557, -0.4); boat(-50, -140, 0xf4a261, 0.3); boat(60, -170, 0x2a9d8f, -0.3);
{ // chapel
  const cx = HILL.x - 4, cz = HILL.z, cy = hgt(cx, cz);
  const b = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 12), mat(0xffffff)); b.position.set(cx, cy + 3.5, cz);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 4), mat(0xc0392b)); roof.position.set(cx, cy + 9, cz); roof.rotation.y = Math.PI / 4; roof.scale.z = 1.5;
  const tw = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 3), mat(0xffffff)); tw.position.set(cx, cy + 6, cz + 6);
  const tt = new THREE.Mesh(new THREE.ConeGeometry(2.3, 3.5, 4), mat(0xc0392b)); tt.position.set(cx, cy + 13.7, cz + 6); tt.rotation.y = Math.PI / 4;
  scene.add(b, roof, tw, tt);
}
// shells/rocks on seabed
for (let i = 0; i < 260; i++) {
  const x = -80 + R() * 160, z = -3 - R() * 200;
  const r = new THREE.Mesh(new THREE.SphereGeometry(0.1 + R() * 0.5, 6, 4), mat(R() < 0.25 ? 0xf2e8cf : 0x6b705c)); r.position.set(x, hgt(x, z), z); r.scale.y = 0.5; scene.add(r);
}

// ---------- characters ----------
function capsule(r, l, c) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), mat(c)); }
function makeFigure(o) {
  const g = new THREE.Group(), root = new THREE.Group(); g.add(root);
  const P = {};
  const mk = (r, l, c, x, y, parent) => { const piv = new THREE.Group(); piv.position.set(x, y, 0); const m = capsule(r, l, c); m.position.y = -(l / 2 + r) + 0.02; piv.add(m); parent.add(piv); return piv; };
  P.legL = mk(0.08, 0.62, o.pants, 0.1, 0.9, root); P.legR = mk(0.08, 0.62, o.pants, -0.1, 0.9, root);
  const torso = new THREE.Group(); torso.position.y = 0.9; root.add(torso); P.torso = torso;
  const body = capsule(0.19, 0.4, o.shirt); body.position.y = 0.36; torso.add(body);
  P.armL = mk(0.06, 0.5, o.skin, 0.27, 0.6, torso); P.armR = mk(0.06, 0.5, o.skin, -0.27, 0.6, torso);
  const sl = capsule(0.075, 0.14, o.shirt); sl.position.y = -0.08; P.armL.add(sl); const sr = sl.clone(); P.armR.add(sr);
  const head = new THREE.Group(); head.position.y = 0.85; head.scale.setScalar(o.head || 1); torso.add(head); P.head = head;
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), mat(o.skin)));
  const eyeW = mat(0xffffff, { roughness: 0.3 }), eyeB = mat(0x1a1a1a, { roughness: 0.2 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), eyeW); e.position.set(s * 0.06, 0.02, 0.13); head.add(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), eyeB); pu.position.set(s * 0.06, 0.02, 0.165); head.add(pu);
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat(0x4a1010)); mouth.position.set(0, -0.07, 0.145); mouth.scale.set(1.2, 0.35, 0.5); head.add(mouth); P.mouth = mouth;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.172, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(o.hair)); hair.position.set(0, 0.015, -0.015); hair.rotation.x = -0.25; head.add(hair);
  if (o.longback) { const hb = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 10), mat(o.hair)); hb.position.set(0, -0.01, -0.04); hb.scale.set(1, 0.9, 0.9); head.add(hb); }
  if (o.pigtails) for (const s of [-1, 1]) { const pt = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), mat(o.hair)); pt.position.set(s * 0.19, 0.05, -0.04); head.add(pt); }
  if (o.hat) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 20), mat(0xd9b86a)); brim.position.y = 0.11;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.15, 16), mat(0xd9b86a)); crown.position.y = 0.19; head.add(brim, crown);
    const mus = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.04), mat(0xf5f5f5)); mus.position.set(0, -0.035, 0.15); head.add(mus);
  }
  if (o.bucket) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.16, 12), mat(0x1e6fff)); b.position.set(0, -0.62, 0.03); P.armL.add(b); }
  if (o.phone) { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.015), mat(0x111111)); ph.position.set(0, -0.62, 0.05); P.armR.add(ph);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); fl.position.set(0, -0.62, 0.12); fl.visible = false; P.armR.add(fl); P.flash = fl; }
  if (o.star) { const st = new THREE.Mesh(new THREE.CircleGeometry(0.07, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })); st.position.set(0, 0.42, 0.195); torso.add(st); }
  g.scale.setScalar(o.scale || 1); g.P = P; g.root = root; scene.add(g);
  return g;
}
function pose(f, p = {}) {
  const P = f.P; const r = p.run || 0, ph = p.phase || 0;
  P.legL.rotation.set(Math.sin(ph) * 0.9 * r, 0, 0); P.legR.rotation.set(-Math.sin(ph) * 0.9 * r, 0, 0);
  P.armL.rotation.set(-Math.sin(ph) * 0.8 * r, 0, 0.08); P.armR.rotation.set(Math.sin(ph) * 0.8 * r, 0, -0.08);
  P.torso.rotation.set(0.15 * r, 0, 0); f.root.position.y = Math.abs(Math.sin(ph)) * 0.08 * r;
  if (p.crouch) { f.root.position.y = -0.42; P.legL.rotation.x = -1.5; P.legR.rotation.x = -1.4; P.torso.rotation.x = 0.55; P.armR.rotation.set(-1.0, 0, 0); P.armL.rotation.set(-0.7, 0, 0.2); P.head.rotation.x = 0.3; }
  else P.head.rotation.x = p.headX || 0;
  if (p.raiseR !== undefined) P.armR.rotation.set(0, 0, -p.raiseR);
  if (p.raiseL !== undefined) P.armL.rotation.set(0, 0, p.raiseL);
  if (p.reachR !== undefined) P.armR.rotation.set(-p.reachR, 0, 0.1);
  if (p.phoneUp) P.armR.rotation.set(-1.35, 0, 0.2);
  P.mouth.scale.set(1.2, p.mouth ?? 0.35, 0.5);
  if (P.flash) P.flash.visible = !!p.flash;
}
const SKIN = { a: 0xc68a5e, b: 0x8d5a3b, c: 0x9c6b45, d: 0xe0b48a, e: 0x6b4226 };
const leo = makeFigure({ skin: SKIN.a, shirt: 0xffcf2e, pants: 0x2e6fd8, hair: 0x4a2c17, pigtails: true, bucket: true, star: true, head: 1.35, scale: 0.72 });
const dani = makeFigure({ skin: SKIN.b, shirt: 0xf5f2ea, pants: 0x2b2d42, hair: 0x111111 });
const chuy = makeFigure({ skin: SKIN.c, shirt: 0xe0703a, pants: 0xd8c8a8, hair: 0xeeeeee, hat: true });
const LEO_POS = V3(7, 0, -60); LEO_POS.y = hgt(LEO_POS.x, LEO_POS.z);
const crowd = [];
const shirts = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x9b5de5, 0x06d6a0, 0xffffff, 0xef476f, 0x118ab2];
for (let i = 0; i < 16; i++) {
  const kid = i >= 13, onBeach = i < 4;
  const f = makeFigure({ skin: Object.values(SKIN)[i % 5], shirt: shirts[i % 9], pants: [0x1d3557, 0x333333, 0xa8dadc][i % 3], hair: [0x111111, 0x3b2314, 0x6b4423][i % 3], phone: i % 3 === 0, longback: i % 4 === 1, head: kid ? 1.3 : 1, scale: kid ? 0.7 : 0.95 + R() * 0.1 });
  const side = R() < 0.5 ? -1 : 1; const x = onBeach ? (side < 0 ? -22 + R() * 14 : 14 + R() * 14) : (side < 0 ? -26 + R() * 18 : 15 + R() * 16), z = onBeach ? 1 + R() * 6 : -6 - R() * 18;
  crowd.push({ f, x, z, face: Math.PI + (R() - 0.5) * 1.2, kid, phase: R() * 6, phone: i % 3 === 0 });
}

// ---------- wave ----------
const waveG = (() => {
  const cols = 160, rows = 46, g = new THREE.BufferGeometry(), pos = [], col = [], idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const u = i / cols, v = j / rows, x = (u - 0.5) * 1800;
    const curl = v > 0.62 ? Math.pow((v - 0.62) / 0.38, 2) : 0;
    const y = v + 0.04 * Math.sin(x * 0.02) * v - curl * 0.12;
    const z = curl * 0.42 + 0.03 * Math.sin(x * 0.013 + v * 3);
    pos.push(x, y, z);
    let c; if (v < 0.55) c = [0.02 + v * 0.06, 0.08 + v * 0.3, 0.16 + v * 0.35]; else if (v < 0.88) { const k = (v - 0.55) / 0.33; c = [0.05 + k * 0.1, 0.25 + k * 0.3, 0.36 + k * 0.25]; } else { const k = (v - 0.88) / 0.12; c = [0.15 + k * 0.8, 0.55 + k * 0.42, 0.6 + k * 0.38]; }
    col.push(...c);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
})();
const wave = new THREE.Mesh(waveG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
scene.add(wave);
const foamN = 5000, foamPos = new Float32Array(foamN * 3), foamSeed = Array.from({ length: foamN }, () => [R(), R(), R()]);
const foamG = new THREE.BufferGeometry(); foamG.setAttribute('position', new THREE.BufferAttribute(foamPos, 3));
const foam = new THREE.Points(foamG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.85 }));
scene.add(foam);
function setWave(z, h, base, t) {
  wave.visible = foam.visible = h > 0;
  wave.position.set(0, base - 1, z); wave.scale.set(1, h, h);
  for (let i = 0; i < foamN; i++) { const [a, b, c] = foamSeed[i]; const x = (a - 0.5) * 1800; foamPos[i * 3] = x; foamPos[i * 3 + 1] = base - 1 + h * (0.93 + b * 0.12) + Math.sin(t * 3 + a * 40) * h * 0.02; foamPos[i * 3 + 2] = z + h * (0.32 + c * 0.15); }
  foamG.attributes.position.needsUpdate = true; foam.material.size = Math.max(0.35, h * 0.007);
}

// ---------- birds ----------
const birds = [];
for (let i = 0; i < 18; i++) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.3), m); w1.position.x = -0.6; const w2 = w1.clone(); w2.position.x = 0.6;
  g.add(w1, w2); g.userData = { x: -150 + R() * 300, y: 25 + R() * 60, z0: -700 - R() * 400, sp: 70 + R() * 40, ph: R() * 6, w1, w2 }; scene.add(g); birds.push(g);
}

// ---------- POV body ----------
const skinPOV = mat(0xb98463);
const pov = new THREE.Group(); camera.add(pov);
function limb(a, b, r, m) { const d = b.clone().sub(a), L = d.length(); const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, L, 4, 12), m); c.position.copy(a.clone().add(b).multiplyScalar(0.5)); c.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return c; }
const povArm = new THREE.Group(); pov.add(povArm);
const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.009, 8, 20), mat(0xd00000, { roughness: 0.5 }));
const povHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), skinPOV); povHand.scale.set(1.1, 0.55, 1.5);
function setPovArm(a, b) {
  povArm.clear(); povArm.add(limb(a, b, 0.038, skinPOV));
  const d = b.clone().sub(a).normalize();
  bracelet.position.copy(b.clone().addScaledVector(d, -0.05)); bracelet.quaternion.setFromUnitVectors(V3(0, 0, 1), d);
  povHand.position.copy(b.clone().addScaledVector(d, 0.04)); povHand.quaternion.setFromUnitVectors(V3(0, 0, 1), d);
  povArm.add(bracelet, povHand);
}
const feet = [];
for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), skinPOV); f.scale.set(0.85, 0.55, 2.0); f.position.set(s * 0.11, hgt(s * 0.11, -0.5) + 0.04, -0.5); scene.add(f); feet.push(f); }
const fish = [];
for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(i % 2 ? 0xff7b00 : 0xc0c0c0, { roughness: 0.3, metalness: 0.4 })); f.scale.set(0.5, 0.6, 1.6); f.userData = { x: -0.7 + R() * 1.4, z: -1.3 - R() * 2.5, ph: R() * 6 }; scene.add(f); fish.push(f); }

// ---------- timeline ----------
const T = { end: 59 };
function darkness(t) { return t < 16 ? 0 : t < 26 ? 0.7 * ease(seg(t, 16, 26)) : lerp(0.7, 0.88, seg(t, 26, 42)); }
function setAtmos(t) {
  const d = darkness(t);
  skyU.top.value.setRGB(lerp(0.30, 0.13, d), lerp(0.55, 0.16, d), lerp(0.92, 0.18, d));
  skyU.hor.value.setRGB(lerp(1.0, 0.36, d), lerp(0.80, 0.42, d), lerp(0.55, 0.38, d));
  skyU.bot.value.copy(skyU.hor.value);
  scene.fog.color.copy(skyU.hor.value);
  hemi.intensity = lerp(1.3, 0.55, d); sun.intensity = lerp(2.6, 0.35, d); fill.intensity = lerp(0.6, 0.35, d);
  sunDisk.material.color.setRGB(1, lerp(0.95, 0.75, d), lerp(0.75, 0.6, d)); sunDisk.visible = d < 0.6;
  for (const c of clouds) c.m.color.setRGB(lerp(1, 0.3, d), lerp(1, 0.33, d), lerp(1, 0.33, d));
  waterM.color.setRGB(lerp(0.10, 0.06, d), lerp(0.66, 0.25, d), lerp(0.75, 0.3, d));
  renderer.toneMappingExposure = lerp(1.05, 0.95, d);
}
const shake = (t, a) => V3(Math.sin(t * 13.1) * 0.6 + Math.sin(t * 7.3) * 0.4, Math.sin(t * 11.7) * 0.5 + Math.cos(t * 5.1) * 0.5, 0).multiplyScalar(a);

function placeCrowd(t, mode) {
  crowd.forEach((c, i) => {
    let x = c.x, z = c.z, face = c.face, run = 0, ph = c.phase + t * 9, flash = false;
    if (mode === 'calm') {
      if (c.kid) { z = c.z - (t - 4) * 1.6; run = 1; face = Math.PI; }
      flash = c.phone && Math.sin(t * 2.3 + i * 1.7) > 0.93;
    } else if (mode === 'turn') { face = lerp(c.face, 0, ease(seg(t, 10.8, 12.5))); }
    else if (mode === 'flee') { const k = (t - 38); z = -70 + i * 2.8 + k * 4.5; x = c.x * 1.6; face = 0; run = 1; ph = c.phase + t * 13; }
    c.f.position.set(x, hgt(x, z), z); c.f.rotation.y = face;
    pose(c.f, { run, phase: ph, phoneUp: c.phone && mode === 'calm', flash, mouth: mode === 'flee' ? 1.2 : 0.35 });
  });
}

function stage(t, shotName) {
  setAtmos(t);
  const wl = updateWater(t);
  // defaults
  leo.visible = true; dani.visible = false; chuy.visible = false; pov.visible = false; feet.forEach(f => f.visible = false); fish.forEach(f => f.visible = false); birds.forEach(b => b.visible = false);
  leo.position.copy(LEO_POS); leo.rotation.y = Math.PI; pose(leo, { crouch: true });
  placeCrowd(t, t < 10 ? 'calm' : t < 38 ? 'turn' : 'flee');
  const waterFar = hgt(0, -230) + 0.09;
  // wave state
  if (t < 19.5) setWave(-1500, 0, waterFar, t);
  else if (t < 26) setWave(-900, lerp(4, 30, seg(t, 19.5, 26)), waterFar, t);
  else if (t < 32) setWave(-700, 36, waterFar, t);
  else if (t < 38) setWave(lerp(-460, -400, seg(t, 32, 38)), lerp(28, 32, seg(t, 32, 38)), waterFar, t);
  else setWave(lerp(-210, -125, seg(t, 38, 44)), lerp(105, 120, seg(t, 38, 44)), waterFar, t);

  const eye = V3(0, hgt(0, 0) + 1.62, 0); let look, fov = 50, sh = 0.02, up = V3(0, 1, 0);
  switch (shotName) {
    case 'feet': { // 0-4
      feet.forEach(f => f.visible = true); pov.visible = true;
      setPovArm(V3(-0.32, -0.42, -0.05), V3(-0.2, -0.3, -0.42));
      fish.forEach(f => { const u = f.userData; f.visible = shore(t) < u.z + 0.2; f.position.set(u.x, hgt(u.x, u.z) + 0.04 + Math.abs(Math.sin(t * 9 + u.ph)) * 0.08, u.z); f.rotation.set(0, u.ph, Math.sin(t * 14 + u.ph) * 0.9); });
      look = V3(0, 0, -0.95 - t * 0.05); fov = 66; sh = 0.012; break; }
    case 'seabed': { // 4-10
      const k = ease(seg(t, 4, 6.5));
      look = V3(lerp(0, -12, 0) + Math.sin((t - 4) * 0.35) * 18 * seg(t, 5.5, 10), lerp(0, 0.2, k), lerp(-2.2, -60, k)); fov = 55; sh = 0.03; break; }
    case 'chuy': { // 10-14
      chuy.visible = true; const k = seg(t, 10, 14); const z = lerp(-14, -2.6, k), x = lerp(-3, -0.4, k);
      chuy.position.set(x, hgt(x, z), z); chuy.rotation.y = 0;
      pose(chuy, { run: 1, phase: t * 12, mouth: 1.4 }); chuy.P.armR.rotation.set(0, 0, -2.7 + Math.sin(t * 12) * 0.25);
      look = V3(x, hgt(x, z) + 1.5, z); fov = 48; sh = 0.04; break; }
    case 'leoFar': { // 14-20
      const k = ease(seg(t, 14.3, 19.5)); look = V3(LEO_POS.x, LEO_POS.y + 0.6, LEO_POS.z); fov = lerp(42, 10, k); sh = 0.004 + 0.01 * (1 - k);
      if (t > 16.8) { leo.rotation.y = Math.PI; } break; }
    case 'horizon': { // 20-26
      birds.forEach(b => { const u = b.userData; b.visible = true; const z = u.z0 + (t - 20) * u.sp; b.position.set(u.x, u.y - (t - 20) * 2, z); b.rotation.y = 0; const fl = Math.sin(t * 10 + u.ph) * 0.5; u.w1.rotation.z = fl; u.w2.rotation.z = -fl; b.scale.setScalar(1.4); });
      look = V3(-20, waterFar + 9, -900); fov = lerp(34, 24, seg(t, 20, 26)); sh = 0.002; break; }
    case 'dani': { // 26-32
      const dir = V3(HILL.x, 0, HILL.z).normalize(); const run = seg(t, 27, 32) * 6;
      const whip = ease(seg(t, 26, 26.8));
      const base = dir.clone().multiplyScalar(run); eye.add(base); eye.y = hgt(eye.x, eye.z) + 1.62;
      const lookDir = V3(0, 0, -1).lerp(dir, whip).normalize();
      dani.visible = true; const dp = eye.clone().addScaledVector(dir, 1.7); dp.y = hgt(dp.x, dp.z);
      dani.position.copy(dp); dani.rotation.y = Math.atan2(-dir.x, -dir.z);
      pose(dani, { run: t > 27 ? 0.6 : 0, phase: t * 10, mouth: 0.9 + Math.abs(Math.sin(t * 9)) * 0.7, reachR: 1.25 });
      dani.P.armL.rotation.set(-0.4, 0, 0.4);
      pov.visible = true; setPovArm(V3(-0.3, -0.42, -0.02), V3(-0.03, -0.24, -0.6 + 0.04 * Math.sin(t * 8)));
      look = eye.clone().addScaledVector(lookDir, 10); look.y = eye.y + 0.25; fov = 58; sh = 0.09; break; }
    case 'leoWave': { // 32-38 and split top
      const k = seg(t, 32.6, 33.8); leo.rotation.y = lerp(Math.PI, 0, ease(k));
      if (t < 32.6) pose(leo, { crouch: true }); else pose(leo, { mouth: 0.9 });
      if (t > 33.8) leo.P.armR.rotation.set(0, 0, -2.6 + Math.sin((t - 33.8) * 7) * 0.35);
      leo.P.armL.rotation.set(0, 0, 0.15);
      look = V3(LEO_POS.x, LEO_POS.y + 2.4, LEO_POS.z); fov = 7.5; sh = 0.0015; break; }
    case 'bigWave': { // 38-44
      eye.set(0, hgt(0, 2) + 0.45, 2); look = V3(-10, lerp(55, 80, seg(t, 38, 44)), -250); fov = 72; sh = 0.05 + 0.05 * seg(t, 38, 44); break; }
    case 'daniHill': {
      leo.visible = false; dani.visible = true;
      const dp = V3(HILL.x - 34, 0, HILL.z - 8); dp.y = hgt(dp.x, dp.z) + 0.25; dani.position.copy(dp);
      const cam = V3(HILL.x - 37.2, 0, HILL.z - 10.4); cam.y = hgt(cam.x, cam.z) + 1.7; eye.copy(cam);
      dani.rotation.y = Math.atan2(cam.x - dp.x, cam.z - dp.z);
      pose(dani, { reachR: 1.3, mouth: 1.1 }); dani.P.armL.rotation.set(-0.3, 0, 0.3);
      look = V3(dp.x, dp.y + 1.3, dp.z); fov = 50; sh = 0.01; break; }
  }
  crowd.forEach(c => { if (c.f.position.distanceTo(eye) < 7) c.f.visible = false; else c.f.visible = true; });
  camera.position.copy(eye); camera.fov = fov; camera.up.copy(up);
  camera.lookAt(look.clone().add(shake(t, sh * eye.distanceTo(look))));
  camera.updateProjectionMatrix();
  sky.position.copy(camera.position);
}

function shotAt(t) {
  if (t < 4) return 'feet'; if (t < 10) return 'seabed'; if (t < 14) return 'chuy'; if (t < 20) return 'leoFar';
  if (t < 26) return 'horizon'; if (t < 32) return 'dani'; if (t < 38) return 'leoWave'; if (t < 44) return 'bigWave'; return 'split';
}

// ---------- overlay text ----------
const SUBS = [
  [0.6, 3.6, 'El mar… se está yendo.', '#fff'],
  [5.0, 7.9, 'Nadie corre. Nadie.', '#fff'],
  [10.2, 13.6, '¡TSUNAMI! ¡Corran a la capilla!', '#ffd23f'],
  [14.2, 16.9, '«¡Mira! ¡Encontré una concha gigante!»', '#9fe7ff'],
  [17.0, 22.2, '¿Leo? ¡LEO!… No me escuchó.', '#fff'],
  [23.0, 25.5, 'Cuatro minutos.', '#fff'],
  [26.4, 30.8, '¡No vas a llegar! ¡Vámonos, por favor!', '#ffb3c1'],
  [34.8, 36.7, 'Me está saludando…', '#fff'],
];
function wrap(text, maxW) { const words = text.split(' '), lines = []; let cur = ''; for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; } if (cur) lines.push(cur); return lines; }
function txt(text, x, y, size, color = '#fff', weight = 800, alpha = 1, maxW = 620) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = wrap(text, maxW);
  lines.forEach((ln, i) => { const yy = y + (i - (lines.length - 1) / 2) * size * 1.18; ctx.lineWidth = size * 0.2; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(ln, x, yy); ctx.fillStyle = color; ctx.fillText(ln, x, yy); });
  ctx.restore();
}
function pill(text, x, y, size, bg, fg) { ctx.save(); ctx.font = `800 ${size}px Inter`; const w = ctx.measureText(text).width + size * 1.2, h = size * 1.7; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1); ctx.restore(); }
function overlays(t) {
  if (t < 3.6) { pill('FICCIÓN · EP 1', W / 2, 120, 26, 'rgba(0,0,0,0.55)', '#fff'); txt('EL MAR SE FUE', W / 2, 200, 64, '#fff', 900, clamp((t - 0.1) * 3, 0, 1) * clamp((3.6 - t) * 3, 0, 1)); }
  for (const [a, b, s, c] of SUBS) if (t >= a && t < b) txt(s, W / 2, 860, 44, c, 800, clamp((t - a) * 6, 0, 1) * clamp((b - t) * 6, 0, 1));
  if (t >= 20 && t < 44) { const sec = Math.round(lerp(240, 150, seg(t, 20, 44))); const s = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; pill(s, W - 120, 120, 40, sec < 180 ? 'rgba(200,0,0,0.85)' : 'rgba(0,0,0,0.6)', '#fff'); }
}

// ---------- frame ----------
window.renderFrame = function (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  if (t >= 56.5) { // black end card
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const a = clamp((t - 56.6) * 3, 0, 1);
    txt('Comenta A o B.', W / 2, 560, 64, '#fff', 900, a); txt('Lo que gane, pasa.', W / 2, 650, 48, '#ffd23f', 800, a); txt('EP 2 mañana', W / 2, 760, 34, '#bbb', 700, a);
    return out.toDataURL('image/jpeg', 0.92);
  }
  const shot = shotAt(t);
  if (shot !== 'split') {
    stage(t, shot); camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false); renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, 0, 0);
    // vignette
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.35 + darkness(t) * 0.3})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (t >= 32 && t < 34.6) { ctx.fillStyle = `rgba(0,0,0,${0.12})`; ctx.fillRect(0, 0, W, H); }
    overlays(t);
  } else {
    const k = t - 44, half = H / 2;
    renderer.setScissorTest(true);
    stage(37.5 + k * 0.05, 'leoWave'); camera.fov = 7.5 - k * 0.12; camera.aspect = W / half; camera.updateProjectionMatrix();
    renderer.setViewport(0, half, W, half); renderer.setScissor(0, half, W, half); renderer.render(scene, camera);
    stage(44 + k * 0.05, 'daniHill'); setWave(-215, 112, hgt(0, -230) + 0.09, 44); camera.fov = 45 - k * 0.8; camera.aspect = W / half; camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, W, half); renderer.setScissor(0, 0, W, half); renderer.render(scene, camera);
    renderer.setScissorTest(false);
    ctx.filter = 'saturate(0.55) contrast(1.08)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none';
    ctx.fillStyle = '#fff'; ctx.fillRect(0, half - 3, W, 6);
    const a = clamp(k * 3, 0, 1);
    
    ctx.globalAlpha = a;
    pill('A', 70, 190, 48, '#ffcf2e', '#000'); txt('Bajas por Leo', W / 2 + 30, 190, 50, '#ffcf2e', 900);
    pill('B', 70, half + 110, 48, '#7bdff2', '#000'); txt('Subes con Dani', W / 2 + 30, half + 110, 50, '#7bdff2', 900);
    ctx.globalAlpha = 1;
    // countdown bar
    const p = clamp(1 - k / 12.5, 0, 1); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, half - 5, W, 10); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(0, half - 5, W * p, 10);
    pill('¿QUÉ HACES?', W / 2, half, 38, 'rgba(0,0,0,0.8)', '#fff');
  }
  return out.toDataURL('image/jpeg', 0.92);
};
window.DBG = () => ({ cam: camera.position.toArray(), feet: feet.map(f => { const v = f.getWorldPosition(new THREE.Vector3()); const p = v.clone().project(camera); return [f.visible, v.toArray(), p.toArray()]; }) });
window.READY = true;
