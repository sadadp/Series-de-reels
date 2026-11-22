const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const srv = http.createServer((q, r) => { const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(8794);
(async () => { const br = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const pg = await br.newPage();
pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto('http://localhost:8794/brand.html'); await pg.waitForFunction('window.READY', null, { timeout: 60000 }); await pg.evaluate(() => document.fonts.load('900 40px Inter'));
fs.mkdirSync('opt_out', { recursive: true });
for (const n of [1, 2, 3, 4]) fs.writeFileSync(`opt_out/perfil-${n}.png`, Buffer.from((await pg.evaluate(k => window.renderOpt(k), n)).split(',')[1], 'base64'));
await br.close(); srv.close(); })();
