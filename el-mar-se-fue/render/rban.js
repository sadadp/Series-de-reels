const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const srv = http.createServer((q, r) => { const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(8795);
(async () => { const br = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); const pg = await br.newPage();
pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto('http://localhost:8795/brand.html'); await pg.waitForFunction('window.READY', null, { timeout: 60000 }); await pg.evaluate(() => document.fonts.load('900 40px Inter'));
fs.mkdirSync('opt_out', { recursive: true });
fs.writeFileSync('opt_out/banner-youtube.png', Buffer.from((await pg.evaluate(() => window.renderYouTube2())).split(',')[1], 'base64')); fs.writeFileSync('opt_out/portada-facebook.png', Buffer.from((await pg.evaluate(() => window.renderFacebook2())).split(',')[1], 'base64'));
await br.close(); srv.close(); })();
