#!/usr/bin/env node
// Renderiza una receta a MP4 vertical 1080x1920.
// Uso: node render.js hotcakes-platano [--2d] [--fps 30] [--audio mezcla.wav] [--frame 5.2] [--serve]
//   por defecto usa el motor 3D (engine3d); --2d usa el motor SVG plano (engine)
//   --serve abre un servidor local para la vista previa en el navegador
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const nombre = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").match(/^--(fps|audio|frame|port)$/)) || "hotcakes-platano";
const opt = k => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : null; };
const flag = k => args.includes("--" + k);
const FPS = +(opt("fps") || 30);
const audio = opt("audio");
const frameSolo = opt("frame");
const modo2d = flag("2d");
const out = path.join(__dirname, "salida");
fs.mkdirSync(out, { recursive: true });

// servidor estático (los módulos ES no cargan desde file://)
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".json": "application/json", ".png": "image/png" };
function servidor(puerto = 0) {
  return new Promise(res => {
    const srv = http.createServer((req, resp) => {
      const f = path.join(__dirname, decodeURIComponent(req.url.split("?")[0]));
      if (!f.startsWith(__dirname) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(resp);
    }).listen(puerto, "127.0.0.1", () => res(srv));
  });
}

const srtTime = s => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};

(async () => {
  const srv = await servidor(flag("serve") ? +(opt("port") || 8080) : 0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const pagina = modo2d ? "engine/reel.html" : "engine3d/reel3d.html";
  if (flag("serve")) { console.log(`Vista previa: ${base}/${pagina}?r=${nombre}`); return; }

  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => console.error("Error en página:", e.message));
  await page.goto(`${base}/${pagina}?r=${nombre}&render=1`);
  await page.waitForFunction(() => window.LISTO === true, null, { timeout: 120000 });
  const dur = await page.evaluate(() => window.DURACION);

  // subtítulos y guion para voz en off
  const subs = await page.evaluate(() => window.getSubs());
  fs.writeFileSync(path.join(out, `${nombre}.srt`), subs.map((s, i) => `${i + 1}\n${srtTime(s.ini)} --> ${srtTime(s.fin)}\n${s.texto}\n`).join("\n"));
  const guion = await page.evaluate(() => window.getGuion());
  fs.writeFileSync(path.join(out, `${nombre}-guion.json`), JSON.stringify(guion, null, 1));
  fs.writeFileSync(path.join(out, `${nombre}-guion.txt`), guion.filter(g => g.texto).map(g => `[${g.ini.toFixed(1)}s] ${g.texto}`).join("\n") + "\n");

  if (frameSolo !== null) {
    await page.evaluate(t => window.renderAt(t), +frameSolo);
    const f = path.join(out, `${nombre}-${frameSolo}s.png`);
    await page.screenshot({ path: f });
    console.log("Cuadro:", f);
    await browser.close(); srv.close();
    return;
  }

  const mp4 = path.join(out, `${nombre}.mp4`);
  const ff = ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-"];
  if (audio) ff.push("-i", audio, "-shortest", "-c:a", "aac", "-b:a", "192k");
  ff.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18", "-movflags", "+faststart", mp4);
  const proc = spawn("ffmpeg", ff, { stdio: ["pipe", "ignore", "inherit"] });

  const total = Math.ceil(dur * FPS), t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once("drain", r));
    if (f % FPS === 0) process.stdout.write(`\r${Math.round(f / total * 100)}%  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  proc.stdin.end();
  await new Promise(r => proc.on("close", r));
  await browser.close(); srv.close();
  console.log(`\nListo: ${mp4} (${dur.toFixed(1)}s)`);
})();
