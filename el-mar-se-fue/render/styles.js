// Estilos low-poly para EL MAR SE FUE — muestra de un mismo momento en varios looks
import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const ctx = out.getContext('2d');

const STYLES = {
  pastel: { skyTop: 0x7b6a8f, skyHor: 0xf0b08f, fog: 0xd8a89a, fogN: 60, fogF: 420, sun: 0xffd2b0, sunI: 2.2, hemiS: 0xd8c3e8, hemiG: 0xe9c9a0, hemiI: 1.6,
    sand: 0xf0d9b0, seabed: 0x8a8a6a, sea: 0x3aa6b9, waveLo: 0x1f6f8b, waveHi: 0x5cc4cf, mount: 0x8c6b80, exposure: 1.0, toon: false, cam: 'shoulder' },
  tormenta: { skyTop: 0x1b2430, skyHor: 0x55666b, fog: 0x4a585c, fogN: 40, fogF: 300, sun: 0xbfd6ff, sunI: 0.9, hemiS: 0x9fb3c8, hemiG: 0x5b5a4e, hemiI: 1.5,
    sand: 0xb9a888, seabed: 0x5d5f4c, sea: 0x24505a, waveLo: 0x0d2a36, waveHi: 0x3f7d84, mount: 0x2e3a40, exposure: 1.0, toon: false, cam: 'shoulder', rain: true, flash: true },
  maqueta: { skyTop: 0x9fd3f5, skyHor: 0xfbe3c4, fog: 0xf3dcc2, fogN: 120, fogF: 700, sun: 0xfff1d6, sunI: 2.6, hemiS: 0xcfe8ff, hemiG: 0xf3d7a8, hemiI: 1.5,
    sand: 0xf4dfb5, seabed: 0x9a936c, sea: 0x45b8c8, waveLo: 0x23779a, waveHi: 0x7fd9e0, mount: 0x8fae8a, exposure: 1.0, toon: false, cam: 'iso', tilt: true },
  comic: { skyTop: 0x2f6fd6, skyHor: 0xffc36b, fog: 0xffd9a0, fogN: 100, fogF: 600, sun: 0xffffff, sunI: 2.6, hemiS: 0xffffff, hemiG: 0xffe2b0, hemiI: 1.3,
    sand: 0xffd77a, seabed: 0xa59b5e, sea: 0x18b4d4, waveLo: 0x0b5fa5, waveHi: 0x37d0e8, mount: 0x7a5ca8, exposure: 1.0, toon: true, cam: 'shoulder' },
};

let scene, camera, S, tags = [], fx = {};
const R = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
function M(c, extra = {}) {
  if (S.toon) return new THREE.MeshToonMaterial({ color: c, ...extra });
  return new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });
}
function box(w, h, d, c, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (parent || scene).add(m); return m; }

function ground() {
  const g = new THREE.PlaneGeometry(400, 600, 50, 75); g.rotateX(-Math.PI / 2); g.translate(0, 0, -200);
  const p = g.attributes.position, col = [];
  const cs = new THREE.Color(S.sand), cb = new THREE.Color(S.seabed), cw = cs.clone().lerp(cb, 0.45);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let y = z > 0 ? 0.02 * z : z * 0.03; y += (R() - 0.5) * 0.25; if (z < -5) y += Math.sin(x * 0.3) * 0.15;
    p.setY(i, y);
    const c = z > 2 ? cs : z > -10 ? cw : cb; col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g.toNonIndexed(), S.toon ? new THREE.MeshToonMaterial({ vertexColors: true }) : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.receiveShadow = true; scene.add(m);
  // shells/rocks
  for (let i = 0; i < 90; i++) { const x = -40 + R() * 80, z = -6 - R() * 90; const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + R() * 0.4, 0), M(R() < 0.3 ? 0xf2e8cf : 0x6e6a58)); r.position.set(x, z * 0.03 + 0.05, z); r.scale.y = 0.5; r.castShadow = true; scene.add(r); }
  // far sea strip
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 800), M(S.sea)); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -4.2, -560); scene.add(sea);
}
function mountains() {
  for (let i = 0; i < 12; i++) { const h = 30 + R() * 40; const m = new THREE.Mesh(new THREE.ConeGeometry(50 + R() * 40, h, 5), M(S.mount)); m.position.set(-500 + i * 90 + R() * 30, h / 2 - 6, -700 - R() * 100); scene.add(m); }
}
function palm(x, z, hgt = 7) {
  const g = new THREE.Group(); g.position.set(x, z > 0 ? 0.02 * z : z * 0.03, z); scene.add(g);
  let y = 0, bend = (R() - 0.5) * 0.06; const segs = 7;
  for (let i = 0; i < segs; i++) { const s = box(0.38 - i * 0.025, hgt / segs, 0.38 - i * 0.025, 0x7a5636, i * i * bend, y + hgt / segs / 2, 0, g); y += hgt / segs; }
  const tx = (segs - 1) ** 2 * bend;
  for (let k = 0; k < 7; k++) {
    const leaf = new THREE.Group(); leaf.position.set(tx, y, 0); leaf.rotation.y = k / 7 * Math.PI * 2 + R() * 0.3; g.add(leaf);
    for (let j = 0; j < 4; j++) { const l = box(0.9 - j * 0.15, 0.06, 0.55, 0x3f8f4a, 0.55 + j * 0.8, -j * j * 0.14, 0, leaf); l.rotation.z = -0.15 - j * 0.12; }
  }
}
function hotel(x, z, w, h, c) {
  const g = new THREE.Group(); g.position.set(x, 0.02 * z, z); scene.add(g);
  box(w, h, 8, c, 0, h / 2, 0, g); box(w + 1, 0.6, 9, 0xd2694a, 0, h + 0.3, 0, g);
  for (let fy = 2; fy < h - 1; fy += 3) for (let fx = -w / 2 + 1.5; fx < w / 2 - 0.5; fx += 2.5) box(1.2, 1.4, 0.2, 0x7fb7d6, fx, fy, -4.05, g);
}
function lounger(x, z) { const g = new THREE.Group(); g.position.set(x, 0.02 * z, z); scene.add(g); box(0.8, 0.12, 2, 0xf7f7f2, 0, 0.45, 0, g); box(0.8, 0.12, 0.8, 0xf7f7f2, 0, 0.75, 0.9, g).rotation.x = -0.6; for (const a of [-0.3, 0.3]) for (const b of [-0.8, 0.8]) box(0.08, 0.4, 0.08, 0x8a6a4a, a, 0.2, b, g); }
function umbrella(x, z, c) { const g = new THREE.Group(); g.position.set(x, 0.02 * z, z); scene.add(g); box(0.08, 2.4, 0.08, 0xeeeeee, 0, 1.2, 0, g); const t = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 8), M(c)); t.position.y = 2.5; t.castShadow = true; g.add(t); }

// blocky character
function person(o) {
  const g = new THREE.Group(); scene.add(g);
  const P = {};
  const legH = 0.8 * o.s, bodyH = 0.75 * o.s, headS = 0.42 * o.s * (o.kid ? 1.2 : 1);
  for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 0.13 * o.s, legH, 0); g.add(l); box(0.2 * o.s, legH - 0.1, 0.22 * o.s, o.pants, 0, -legH / 2 + 0.05, 0, l); box(0.22 * o.s, 0.12, 0.32 * o.s, 0x222222, 0, -legH + 0.06, 0.05, l); P[sx < 0 ? 'legR' : 'legL'] = l; }
  box(0.55 * o.s, bodyH, 0.32 * o.s, o.shirt, 0, legH + bodyH / 2, 0, g);
  for (const sx of [-1, 1]) { const a = new THREE.Group(); a.position.set(sx * 0.36 * o.s, legH + bodyH - 0.08, 0); g.add(a); box(0.16 * o.s, 0.25 * o.s, 0.18 * o.s, o.shirt, 0, -0.1 * o.s, 0, a); box(0.14 * o.s, 0.62 * o.s, 0.16 * o.s, o.skin, 0, -0.38 * o.s, 0, a); P[sx < 0 ? 'armR' : 'armL'] = a; }
  const head = new THREE.Group(); head.position.y = legH + bodyH + headS / 2 + 0.03; g.add(head); P.head = head;
  box(headS, headS, headS, o.skin, 0, 0, 0, head);
  box(headS * 1.06, headS * 0.3, headS * 1.06, o.hair, 0, headS * 0.4, 0, head);
  box(headS * 1.06, headS * (o.long ? 1.1 : 0.55), headS * 0.3, o.hair, 0, headS * (o.long ? -0.12 : 0.2), -headS * 0.42, head);
  if (o.long) { box(headS * 0.18, headS * 0.9, headS * 0.8, o.hair, headS * 0.5, -0.05, -0.05, head); box(headS * 0.18, headS * 0.9, headS * 0.8, o.hair, -headS * 0.5, -0.05, -0.05, head); }
  if (o.pigtails) for (const sx of [-1, 1]) box(headS * 0.3, headS * 0.42, headS * 0.3, o.hair, sx * headS * 0.66, headS * 0.12, -headS * 0.1, head);
  for (const sx of [-1, 1]) box(headS * 0.12, headS * 0.12, 0.02, 0x1a1a1a, sx * headS * 0.2, headS * 0.05, headS / 2 + 0.01, head);
  if (o.mouth) box(headS * 0.22, headS * 0.12, 0.02, 0x5a1a1a, 0, -headS * 0.22, headS / 2 + 0.01, head);
  if (o.bucket) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.18, 8), M(0x1e6fff)); b.position.set(0, -0.72 * o.s, 0.05); P.armL.add(b); }
  g.P = P; g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  if (o.tag) tags.push({ obj: g, text: o.tag, color: o.tagColor, y: legH + bodyH + headS + 0.45 });
  return g;
}
function buildWave(z, h) {
  const cols = 60, rows = 14, pos = [], col = [], idx = [];
  const lo = new THREE.Color(S.waveLo), hi = new THREE.Color(S.waveHi), wh = new THREE.Color(0xffffff);
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const u = i / cols, v = j / rows, x = (u - 0.5) * 700;
    const curl = v > 0.6 ? ((v - 0.6) / 0.4) ** 2 : 0;
    pos.push(x + (R() - 0.5) * 3, v * h - curl * h * 0.1 + Math.sin(x * 0.05) * h * 0.04 * v, curl * h * 0.45 + (R() - 0.5) * 1.5);
    const c = v < 0.85 ? lo.clone().lerp(hi, v / 0.85) : hi.clone().lerp(wh, (v - 0.85) / 0.15); col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  const w = new THREE.Mesh(ng, S.toon ? new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, emissive: 0x0a2030, emissiveIntensity: 0.4 }));
  w.position.set(0, -4.5, z); scene.add(w);
  // foam balls like ref bubbles
  for (let i = 0; i < 160; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + R() * 1.6, 0), M(0xffffff)); s.position.set((R() - 0.5) * 700, -4.5 + h * (0.95 + R() * 0.15), z + h * 0.42 + R() * 4); scene.add(s); }
}

function build(name) {
  S = STYLES[name]; tags = []; fx = {};
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(S.fog, S.fogN, S.fogF);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Color(S.skyTop) }, b: { value: new THREE.Color(S.skyHor) } },
    vertexShader: 'varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 a,b; varying vec3 p; void main(){ float h=clamp(normalize(p).y*2.2,0.,1.); gl_FragColor=vec4(mix(b,a,pow(h,0.8)),1.); }' }));
  sky.material.userData.outlineParameters = { visible: false }; scene.add(sky); fx.sky = sky;
  scene.add(new THREE.HemisphereLight(S.hemiS, S.hemiG, S.hemiI));
  const sun = new THREE.DirectionalLight(S.sun, S.sunI); sun.position.set(-30, 40, -20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200 }); sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
  scene.add(sun); fx.sun = sun;
  ground(); mountains();
  for (const x of [-24, -18, -12, -7.5, 9, 14, 20, 26]) palm(x + R() * 1.5, 2 + R() * 5, 6 + R() * 3);
  hotel(-24, 14, 16, 13, 0xf3ece2); if (S.cam !== 'iso') hotel(19, 2, 10, 14, 0xf6d7c4); else hotel(-6, 16, 10, 8, 0xf6d7c4);
  for (const x of [-9, -6, 6, 9]) lounger(x, 5.5); umbrella(-11, 6.5, 0xe8584a); umbrella(11.5, 6, 0xf2c14e);
  buildWave(S.cam === 'iso' ? -30 : -105, S.cam === 'iso' ? 11 : 40);
  // characters
  const leo = person({ s: 0.75, kid: true, skin: 0xd99a6c, shirt: 0xffcf2e, pants: 0x2e6fd8, hair: 0x4a2c17, pigtails: true, bucket: true, mouth: true, tag: 'Leo', tagColor: '#f2994a' });
  leo.position.set(S.cam === 'iso' ? 2.5 : 0.2, -0.55, S.cam === 'iso' ? -14 : -18); leo.rotation.y = -0.15; leo.P.armR.rotation.z = -2.7;
  const dani = person({ s: 1, skin: 0x9a6343, shirt: 0xf5f2ea, pants: 0x2b2d42, hair: 0x151515, mouth: true, tag: 'Dani', tagColor: '#4aa3df' });
  dani.position.set(1.7, 0.05, 2.2); dani.rotation.y = -0.65; dani.P.armR.rotation.x = -1.4; dani.P.armL.rotation.x = -0.5;
  const tu = person({ s: 1, skin: 0xc68a5e, shirt: 0xe85d5d, pants: 0x3b3b55, hair: 0x5a3720, long: true, tag: 'Tú', tagColor: '#e85d5d' });
  tu.position.set(0, 0.05, 4); tu.rotation.y = Math.PI; fx.tu = tu;
  const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), M(0xd00000)); bracelet.position.set(0, -0.6, 0); bracelet.rotation.x = Math.PI / 2; tu.P.armL.add(bracelet);
  tu.P.armL.rotation.x = 0.5;
  // camera
  if (S.cam === 'iso') {
    camera = new THREE.OrthographicCamera(-10, 10, 17.8, -17.8, 0.1, 2000);
    camera.position.set(38, 36, 22); camera.lookAt(0, 0, -7); camera.zoom = 1.0; camera.updateProjectionMatrix();
    fx.sky.visible = true;
  } else {
    camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 3000);
    camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 3000); camera.position.set(0.9, 2.6, 10); camera.lookAt(1.3, 6.2, -40);
  }
  if (S.rain) { const n = 3000, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = (R() - 0.5) * 60; a[i * 3 + 1] = R() * 30; a[i * 3 + 2] = -R() * 60 + 6; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe3f0, size: 0.07, transparent: true, opacity: 0.7 }))); }
}

function txt(t, x, y, size, color, weight, align = 'center') { ctx.font = `${weight} ${size}px Inter`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(t, x, y); }
function caption(words, active) {
  // like ref: previous words faded, active bold white, upcoming hidden
  ctx.font = '600 44px Inter'; const shown = words.slice(0, active + 1);
  const widths = shown.map((w, i) => { ctx.font = `${i === active ? 700 : 500} 44px Inter`; return ctx.measureText(w + ' ').width; });
  let x = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
  shown.forEach((w, i) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; txt(w, x, 230, 44, i === active ? '#fff' : 'rgba(255,255,255,0.45)', i === active ? 700 : 500, 'left'); ctx.restore(); x += widths[i]; });
}
function drawTags() {
  for (const t of tags) {
    const p = t.obj.localToWorld(new THREE.Vector3(0, t.y, 0)).project(camera); if (p.z > 1) continue;
    const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
    ctx.font = '700 26px Inter'; const w = ctx.measureText(t.text).width + 26;
    ctx.fillStyle = t.color; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 20, w, 40, 10); ctx.fill();
    txt(t.text, x, y + 1, 26, '#fff', 700);
  }
}

window.renderStyle = function (name, label) {
  R.call; build(name);
  renderer.toneMappingExposure = S.exposure;
  if (S.toon) { const eff = new OutlineEffect(renderer, { defaultThickness: 0.004, defaultColor: [0, 0, 0] }); eff.render(scene, camera); }
  else renderer.render(scene, camera);
  ctx.filter = 'none'; ctx.drawImage(renderer.domElement, 0, 0);
  if (S.tilt) { // tilt-shift: blur top and bottom bands
    for (const [y0, h, dir] of [[0, 420, 1], [H - 420, 420, -1]]) { ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, h); ctx.clip(); ctx.filter = 'blur(6px)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.restore(); }
  }
  if (S.flash) { const g = ctx.createLinearGradient(0, 0, 0, H * 0.5); g.addColorStop(0, 'rgba(220,235,255,0.35)'); g.addColorStop(1, 'rgba(220,235,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  drawTags();
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  caption(['Me', 'está', 'saludando…'], 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - 170, H - 190, 340, 64, 32); ctx.fill(); txt(label, W / 2, H - 158, 30, '#fff', 800);
  return out.toDataURL('image/jpeg', 0.92);
};
window.READY = true;
