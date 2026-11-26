const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');

const RAIZ = path.resolve(process.argv[2]);
const SALIDA = path.resolve(process.argv[3]);
const DURACION = Number(process.env.DURACION || 35);
const FPS = Number(process.env.FPS || 60);
const MUESTRAS = process.env.MUESTRAS ? process.env.MUESTRAS.split(',').map(Number) : null;
const TIPOS = { '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };

function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const ruta = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
      if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta)) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream' });
      fs.createReadStream(ruta).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

(async () => {
  const s = await servidor();
  const navegador = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const geo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img', 'geo.json'), 'utf8'));
  const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img', 'datos.json'), 'utf8'));
  await pagina.addInitScript(([g, d]) => {
    window.GEO = g;
    window.DATOS = d;
  }, [geo, datos]);
  pagina.on('pageerror', (e) => console.error('ERR', e.message));
  await pagina.goto(`http://127.0.0.1:${s.address().port}/anuncio.html`);
  await pagina.evaluate(() => window.listo);
  await pagina.evaluate(() => window.seek(0));
  await new Promise((r) => setTimeout(r, 800));
  if (process.env.REVISAR) {
    const fallas = {};
    for (let f = 0; f <= DURACION * 10; f += 1) {
      const malos = await pagina.evaluate((x) => { window.seek(x); return window.revisar(); }, f / 10);
      for (const m of malos) (fallas[m] = fallas[m] || []).push((f / 10).toFixed(1));
    }
    for (const [m, ts] of Object.entries(fallas)) console.log('CHOQUE', JSON.stringify(m), ts[0], '-', ts[ts.length - 1], `(${ts.length})`);
    console.log('REVISION LISTA', Object.keys(fallas).length);
  } else if (MUESTRAS) {
    fs.mkdirSync(SALIDA, { recursive: true });
    for (const t of MUESTRAS) {
      await pagina.evaluate((x) => window.seek(x), t);
      await pagina.screenshot({ path: path.join(SALIDA, `t${t.toFixed(2)}.png`), scale: 'css' });
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '5.2', '-movflags', '+faststart', '-r', String(FPS), SALIDA], { stdio: ['pipe', 'inherit', 'inherit'] });
    const total = Math.round(DURACION * FPS);
    for (let f = 0; f < total; f += 1) {
      await pagina.evaluate((x) => window.seek(x), f / FPS);
      const buf = await pagina.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 300 === 0) process.stdout.write(`${f}/${total}\n`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
  }
  await navegador.close();
  s.close();
})();
