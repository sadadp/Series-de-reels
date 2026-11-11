#!/usr/bin/env node
// Renderiza una receta a MP4 vertical 1080x1920.
// Uso: node render.js hotcakes-platano [--fps 30] [--audio musica.mp3] [--frame 5.2]
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const nombre = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").startsWith("--")) || "hotcakes-platano";
const opt = k => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : null; };
const FPS = +(opt("fps") || 30);
const audio = opt("audio");
const frameSolo = opt("frame");
const out = path.join(__dirname, "salida");
fs.mkdirSync(out, { recursive: true });

const srtTime = s => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const url = "file://" + path.join(__dirname, "engine", "reel.html") + `?r=${nombre}&render=1`;
  await page.goto(url);
  await page.waitForFunction(() => window.LISTO === true);
  const dur = await page.evaluate(() => window.DURACION);

  if (frameSolo !== null) {
    await page.evaluate(t => window.renderAt(t), +frameSolo);
    const f = path.join(out, `${nombre}-${frameSolo}s.png`);
    await page.screenshot({ path: f });
    console.log("Cuadro:", f);
    await browser.close();
    return;
  }

  // subtítulos y guion para voz en off
  const subs = await page.evaluate(() => window.getSubs());
  fs.writeFileSync(path.join(out, `${nombre}.srt`), subs.map((s, i) => `${i + 1}\n${srtTime(s.ini)} --> ${srtTime(s.fin)}\n${s.texto}\n`).join("\n"));
  const guion = await page.evaluate(() => window.getGuion());
  fs.writeFileSync(path.join(out, `${nombre}-guion.json`), JSON.stringify(guion, null, 1));
  fs.writeFileSync(path.join(out, `${nombre}-guion.txt`), guion.map(g => `[${g.ini.toFixed(1)}s] ${g.texto}`).join("\n") + "\n");

  const mp4 = path.join(out, `${nombre}.mp4`);
  const ff = ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-"];
  if (audio) ff.push("-i", audio, "-shortest", "-c:a", "aac", "-b:a", "192k");
  ff.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18", "-movflags", "+faststart", mp4);
  const proc = spawn("ffmpeg", ff, { stdio: ["pipe", "ignore", "inherit"] });

  const total = Math.ceil(dur * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once("drain", r));
    if (f % FPS === 0) process.stdout.write(`\r${Math.round(f / total * 100)}%`);
  }
  proc.stdin.end();
  await new Promise(r => proc.on("close", r));
  await browser.close();
  console.log(`\nListo: ${mp4} (${dur.toFixed(1)}s)`);
})();
