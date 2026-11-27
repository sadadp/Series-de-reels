const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const srv = http.createServer((q, r) => { const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(8891);
(async () => { const br = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const pg = await br.newPage({ viewport: { width: 720, height: 1280 } });
pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto('http://localhost:8891/cover6.html'); await pg.waitForFunction('window.READY', null, { timeout: 90000 }); await pg.evaluate(() => document.fonts.load('900 40px Inter'));
fs.mkdirSync('cov', { recursive: true });
fs.writeFileSync('cov/portada-6.png', Buffer.from((await pg.evaluate(() => window.renderCover())).split(',')[1], 'base64'));
await br.close(); srv.close(); })();
