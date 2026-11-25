#!/usr/bin/env node
// Genera el kit de marca de Chef Michi: recortes 3D + logo, perfil y portadas.
// Uso: node marca/generar.js
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const OUT = path.join(__dirname, "img");
fs.mkdirSync(OUT, { recursive: true });
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".json": "application/json", ".png": "image/png" };
const srv = http.createServer((req, res) => {
  const f = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});

// poses de Michi: tiempo de la receta + ajustes de escena + cámara
const POSES = {
  "michi-cara":  { t: 5.0, cam: [0.35, 1.9, 4.3], mira: [0, 1.62, 0], plato: false },
  "michi-cuerpo": { t: 5.0, cam: [0.9, 1.5, 7.2], mira: [0, 1.25, 0], plato: false },
  "michi-plato": { t: 1.0, cam: [-0.75, 2.0, 6.6], mira: [-0.75, 1.0, 0], plato: true },
};

(async () => {
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => console.error("Error:", e.message));
  await page.goto(`${base}/engine3d/reel3d.html?r=panqueques-platano&render=1`);
  await page.waitForFunction(() => window.LISTO === true, null, { timeout: 120000 });
  await page.addStyleTag({ content: "html,body,#stage{background:transparent!important} #ov{display:none!important}" });
  const etapa = process.argv[2] || "todo";
  if (etapa === "todo" || etapa === "recortes") for (const [nombre, p] of Object.entries(POSES)) {
    await page.evaluate(p => {
      const E = window.ESC;
      window.renderAt(p.t);
      E.COCINA.visible = false; E.tazon.visible = false; E.sarten.visible = false; E.refractario.visible = false;
      E.plato.visible = p.plato;
      E.scene.background = null;
      E.POOL.forEach(m => m.visible = false);
      E.CH.raiz.position.set(p.plato ? -0.25 : 0, 0, 0); E.CH.raiz.rotation.y = p.plato ? -0.25 : 0.12;
      E.CH.cabeza.rotation.set(0, 0.1, 0.05);
      E.camera.position.set(...p.cam); E.camera.lookAt(...p.mira); E.camera.rotation.z = 0;
      E.rerender();
    }, p);
    await page.screenshot({ path: path.join(OUT, nombre + ".png"), omitBackground: true });
    console.log("ok", nombre);
  }
  // plantillas 2D (perfil, logo, portadas)
  if (etapa === "todo" || etapa === "plantillas") for (const [nombre, w, h] of [["perfil", 1080, 1080], ["logo", 1500, 1500], ["youtube-banner", 2560, 1440], ["facebook-portada", 1640, 624], ["youtube-miniatura", 1280, 720]]) {
    const pg = await browser.newPage({ viewport: { width: w, height: h } });
    await pg.goto(`${base}/marca/plantilla.html?p=${nombre}`);
    await pg.waitForFunction(() => window.LISTO === true);
    await pg.screenshot({ path: path.join(OUT, nombre + ".png") });
    await pg.close(); console.log("ok", nombre);
  }
  // portadas por video (vertical + miniatura de YouTube)
  const PORTADAS = [
    ["presentacion", "¡HOLA, SOY", "CHEF MICHI!", "Recetas fáciles en 1 minuto", null],
    ["panqueques-platano", "PANQUEQUES", "DE PLÁTANO", "¡Solo 3 ingredientes!", "fondo-panqueques-platano.png"],
    ["enchiladas-suizas", "ENCHILADAS", "SUIZAS", "Con bechamel cremosita", "fondo-enchiladas-suizas.png"],
    ["mole-poblano", "MOLE", "POBLANO", "Receta casera y fácil", "fondo-mole-poblano.png"],
    ["pizza-italiana", "PIZZA", "ITALIANA", "¿Con piña o sin piña?", "fondo-pizza-italiana.png"],
    ["enchiladas-suizas-v2", "ENCHILADAS", "SUIZAS", "El secreto: bechamel casera", "fondo-enchiladas-suizas.png"],
    ["sushi", "SUSHI", "EN CASA", "Paso a paso, fácil", "fondo-sushi.png"],
    ["tacos-al-pastor", "TACOS", "AL PASTOR", "Sin trompo, en casa", "fondo-tacos-al-pastor.png"],
    ["pasta-alfredo", "PASTA", "ALFREDO", "Auténtica, sin crema", "fondo-pasta-alfredo.png"],
    ["roles-de-canela", "ROLES", "DE CANELA", "El truco: hilo dental", "fondo-roles-de-canela.png"],
    ["ratatouille", "RATATOUILLE", "CASERA", "El secreto: las rodajas", "fondo-ratatouille.png"],
    ["chilaquiles-rojos", "CHILAQUILES", "ROJOS", "El truco: que truenen", "fondo-chilaquiles-rojos.png"],
    ["tacos-carne-asada", "TACOS DE", "CARNE ASADA", "El secreto: el reposo", "fondo-tacos-carne-asada.png"],
    ["nachos-gta", "NACHOS", "PARA GTA VI", "El secreto: dos capas", "fondo-nachos-gta.png"],
    ["cereal-gta", "DÍA UNO", "DE GTA VI", "El desayuno más fácil", "fondo-cereal-gta.png"],
    ["lasana-bechamel", "LASAÑA", "CON BECHAMEL", "El secreto: el reposo", "fondo-lasana-bechamel.png"],
    ["tiramisu", "TIRAMISÚ", "SIN HORNO", "El secreto: un segundo", "fondo-tiramisu.png"],
    ["mostachon", "MOSTACHÓN", "DE FRESA", "El secreto: la base", "fondo-mostachon.png"],
    ["pozole-rojo", "POZOLE", "ROJO", "El secreto: que floree", "fondo-pozole-rojo.png"],
    ["pastel-azteca", "PASTEL", "AZTECA", "El secreto: sellar la tortilla", "fondo-pastel-azteca.png"],
    ["tamales-verdes", "TAMALES", "VERDES", "El secreto: la prueba del vaso", "fondo-tamales-verdes.png"],
    ["huevos-divorciados", "HUEVOS", "DIVORCIADOS", "El secreto: la yema líquida", "fondo-huevos-divorciados.png"],
    ["pasta-bolonesa", "PASTA A LA", "BOLOÑESA", "El secreto: una hora", "fondo-pasta-bolonesa.png"],
    ["panqueques-galleta", "PANQUEQUES", "DE GALLETA", "El secreto: no batir de más", "fondo-panqueques-galleta.png"],
    ["arroz-frito", "ARROZ FRITO", "MAR Y TIERRA", "El secreto: arroz del día anterior", "fondo-arroz-frito.png"],
    ["huevos-benedictinos", "HUEVOS", "BENEDICTINOS", "Holandesa que no se corta", "fondo-huevos-benedictinos.png"],
    ["pollo-naranja", "POLLO", "A LA NARANJA", "Crujiente como de restaurante", "fondo-pollo-naranja.png"],
  ];
  if (etapa === "portadas" || etapa === "todo") {
    const dir = path.join(__dirname, "..", "portadas"); fs.mkdirSync(dir, { recursive: true });
    for (const [n, t1, t2, pill, fondo] of PORTADAS) for (const [tipo, w, h] of [["portada", 1080, 1920], ["mini", 1280, 720]]) {
      const pg = await browser.newPage({ viewport: { width: w, height: h } });
      const q = new URLSearchParams({ p: tipo, t1, t2, pill, ...(fondo ? { fondo } : {}) });
      await pg.goto(`${base}/marca/plantilla.html?${q}`);
      await pg.waitForFunction(() => window.LISTO === true);
      await pg.screenshot({ path: path.join(dir, `${n}-${tipo === "portada" ? "portada" : "youtube"}.png`) });
      await pg.close(); console.log("ok", n, tipo);
    }
  }
  await browser.close(); srv.close();
})();
