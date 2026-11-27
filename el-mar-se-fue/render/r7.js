const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const root = __dirname;
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(8901);
(async () => {
  const [mode, a, b, o4] = process.argv.slice(2); const outDir = mode === 'list' ? b : o4;
  const br = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 720, height: 1280 } });
  pg.on('console', m => console.log('PAGE', m.text())); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('http://localhost:8901/ep7.html'); await pg.waitForFunction('window.READY', null, { timeout: 60000 });
  await pg.evaluate(() => document.fonts.load('900 40px Inter'));
  fs.mkdirSync(outDir, { recursive: true });
  const times = mode === 'list' ? a.split(',').map(Number) : (() => { const fps = 30, arr = []; for (let f = Math.round(+a * fps); f < Math.round(+b * fps); f++) arr.push(f / fps); return arr; })();
  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    const url = await pg.evaluate(t => window.renderFrame(t), times[i]);
    const name = mode === 'list' ? `t_${times[i].toFixed(1)}.jpg` : `f${String(Math.round(times[i] * 30)).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
    if (i % 60 === 0) console.log(i, times[i].toFixed(2), ((Date.now() - t0) / (i + 1)).toFixed(0) + 'ms/f');
  }
  await br.close(); srv.close();
})();
