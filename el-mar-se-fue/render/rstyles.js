const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const srv = http.createServer((q, r) => { const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(8767);
(async () => { const br = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const pg = await br.newPage({ viewport: { width: 720, height: 1280 } });
pg.on('pageerror', e => console.log('ERR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('CON', m.text()); });
await pg.goto('http://localhost:8767/styles.html'); await pg.waitForFunction('window.READY', null, { timeout: 60000 }); await pg.evaluate(() => document.fonts.load('700 40px Inter'));
fs.mkdirSync('styles_out', { recursive: true });
const L = { pastel: '1 · ATARDECER PASTEL', tormenta: '2 · TORMENTA', maqueta: '3 · MAQUETA', comic: '4 · CÓMIC' };
for (const s of Object.keys(L)) { const u = await pg.evaluate(([a, b]) => window.renderStyle(a, b), [s, L[s]]); fs.writeFileSync(`styles_out/${s}.jpg`, Buffer.from(u.split(',')[1], 'base64')); console.log(s); }
await br.close(); srv.close(); })();
