#!/usr/bin/env node
// Story animada: node stories/hacer-story.js bienvenida 7  -> salida/story-bienvenida.mp4 + .png
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, ".."), nombre = process.argv[2] || "bienvenida", DUR = +(process.argv[3] || 7), FPS = 30;
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".png": "image/png" };
const srv = http.createServer((q, r) => { const f = path.join(RAIZ, decodeURIComponent(q.url.split("?")[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(`http://127.0.0.1:${srv.address().port}/stories/${nombre}.html`);
  await p.waitForFunction(() => window.LISTO === true);
  const out = path.join(RAIZ, "salida", `story-${nombre}`);
  await p.evaluate(() => window.ponTiempo(3.2)); await p.screenshot({ path: out + ".png" });
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out + "-video.mp4"], { stdio: ["pipe", "ignore", "inherit"] });
  for (let f = 0; f < DUR * FPS; f++) {
    await p.evaluate(t => window.ponTiempo(t), f / FPS);
    const buf = await p.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
  }
  ff.stdin.end(); await new Promise(r => ff.on("close", r)); await b.close(); srv.close();
  console.log("ok", out);
})();
