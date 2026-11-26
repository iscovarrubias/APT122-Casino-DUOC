const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('@playwright/test');
const { MANUALES, VERSION } = require('./manuales');

const BASE = path.join(__dirname, 'salida', 'manuales');
const CUADROS = path.join(BASE, 'cuadros');
const TMP = path.join(BASE, 'tmp');
const FPS = 30;
const PAUSA_MAX = Number(process.env.PAUSA_MAX || 2.2);
const W = 3840;
const H = 2160;
const AZUL = '#0a2239';
const AMARILLO = '#fbb930';
const ffmpeg = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const duracion = (a) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a]).toString());
const codificar = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
const LOGO = fs.readFileSync(path.join(__dirname, '../../frontend/public/logooscuro.svg'), 'utf8');

function claro(x) {
  return String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

const ESTILO = `*{box-sizing:border-box;margin:0;padding:0}html,body{width:1920px;height:1080px;background:transparent;font-family:Poppins,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}`;

function htmlTarjeta(cuerpo) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${ESTILO}
  body{background:radial-gradient(1400px 900px at 30% 20%,#173a5e,${AZUL} 70%);color:#fff}
  .c{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 170px}
  .logo{height:92px;margin-bottom:60px}.logo svg{height:92px;width:auto}
  .eti{font-size:26px;letter-spacing:.16em;text-transform:uppercase;color:${AMARILLO};font-weight:600;margin-bottom:22px}
  h1{font-size:92px;line-height:1.08;font-weight:800;letter-spacing:-.01em;max-width:1500px}
  .rol{margin-top:34px;font-size:36px;color:#c9d6e6}
  ul{list-style:none;margin-top:30px}li{font-size:42px;line-height:1.35;margin:20px 0;display:flex;gap:26px;align-items:flex-start}
  li b{flex:none;width:64px;height:64px;border-radius:32px;background:${AMARILLO};color:${AZUL};display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;margin-top:-4px}
  .cols{columns:2;column-gap:90px}.cols li{font-size:34px;margin:14px 0;break-inside:avoid}.cols li b{width:52px;height:52px;font-size:24px}
  .pie{position:absolute;left:170px;bottom:60px;font-size:22px;color:#8fa5bd}
  .sig{margin-top:40px;font-size:32px;color:#c9d6e6}.sig strong{color:#fff}
  </style></head><body>${cuerpo}<div class="pie">${VERSION}</div></body></html>`;
}

function htmlHud(numero, total, titulo, lineas, lado) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${ESTILO}
  .paso{position:absolute;left:48px;top:44px;display:flex;align-items:center;gap:22px;background:rgba(10,34,57,.94);color:#fff;border-radius:28px;padding:18px 34px 18px 18px;box-shadow:0 16px 50px rgba(0,0,0,.28)}
  .n{width:84px;height:84px;border-radius:22px;background:${AMARILLO};color:${AZUL};font-size:50px;font-weight:800;display:flex;align-items:center;justify-content:center}
  .t small{display:block;font-size:19px;letter-spacing:.14em;text-transform:uppercase;color:${AMARILLO};font-weight:600}
  .t span{font-size:32px;font-weight:700}
  .sub{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);max-width:1500px;background:rgba(10,34,57,.94);color:#fff;border-radius:22px;padding:22px 40px;font-size:40px;line-height:1.3;font-weight:500;text-align:center;box-shadow:0 16px 50px rgba(0,0,0,.28)}
  ${lado ? `.paso{left:840px;top:300px}.sub{left:840px;bottom:auto;top:470px;transform:none;max-width:960px;text-align:left;font-size:48px;padding:28px 44px}` : ''}
  .ver{position:absolute;right:44px;bottom:18px;font-size:17px;color:rgba(10,34,57,.55);font-weight:500;background:rgba(255,255,255,.7);padding:4px 12px;border-radius:8px}
  </style></head><body>
  <div class="paso"><div class="n">${numero}</div><div class="t"><small>Paso ${numero} de ${total}</small><span>${claro(titulo)}</span></div></div>
  ${lineas ? `<div class="sub">${claro(lineas)}</div>` : ''}
  <div class="ver">${VERSION}</div></body></html>`;
}

function htmlMascara(f, lado) {
  const m = 26;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${ESTILO}
  .h{position:absolute;left:${f.x / 2 - m}px;top:${f.y / 2 - m}px;width:${f.w / 2 + 2 * m}px;height:${f.h / 2 + 2 * m}px;border-radius:22px;box-shadow:0 0 0 4000px rgba(10,22,36,${lado ? 0 : 0.42});outline:5px solid ${AMARILLO};outline-offset:0}
  </style></head><body><div class="h"></div></body></html>`;
}

async function png(pagina, html, archivo) {
  await pagina.setContent(html, { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: archivo, omitBackground: true });
}

function listaConcat(clip, t0, t1, salida) {
  const datos = JSON.parse(fs.readFileSync(path.join(CUADROS, clip, 'cuadros.json'), 'utf8'));
  const L = datos.lento || 1;
  const rutaU = path.join(CUADROS, clip, 'uniformes.json');
  const vacios = new Set(fs.existsSync(rutaU) ? JSON.parse(fs.readFileSync(rutaU, 'utf8')) : []);
  const cuadros = datos.cuadros.filter((c) => fs.existsSync(c.archivo) && !vacios.has(c.archivo));
  let i0 = 0;
  while (i0 + 1 < cuadros.length && cuadros[i0 + 1].t <= t0) i0 += 1;
  const lineas = [];
  let t = t0;
  for (let i = i0; i < cuadros.length && t < t1; i += 1) {
    const sig = Math.min(t1, i + 1 < cuadros.length ? cuadros[i + 1].t : t1);
    if (sig - t > 0.001) lineas.push(`file '${cuadros[i].archivo}'`, `duration ${Math.min((sig - t) / L, PAUSA_MAX).toFixed(4)}`);
    t = sig;
  }
  lineas.push(lineas[lineas.length - 2]);
  fs.writeFileSync(salida, lineas.join('\n'));
  return lineas.filter((x) => x.startsWith('duration')).reduce((a, x) => a + Number(x.split(' ')[1]), 0);
}

function zoomExpr(f, total) {
  const dur = Math.min(total, Math.max(2.8, total * 0.55));
  if (!f) return null;
  const margen = 1.5;
  let zf = Math.min(W / (f.w * margen), H / (f.h * margen), 1.7);
  if (zf < 1.12) return null;
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const entra = 0.9;
  const sale = Math.min(0.7, Math.max(0, dur - entra - 0.8));
  const t = `(on/${FPS})`;
  const k = sale > 0
    ? `if(lt(${t},${entra}),(1-cos(PI*${t}/${entra}))/2,if(gt(${t},${(dur - sale).toFixed(3)}),(1+cos(PI*(${t}-${(dur - sale).toFixed(3)})/${sale}))/2,1))`
    : `if(lt(${t},${entra}),(1-cos(PI*${t}/${entra}))/2,1)`;
  const z = `(1+${(zf - 1).toFixed(4)}*${k})`;
  const x = `max(0,min(iw-iw/${z},(${W / 2}+(${cx.toFixed(1)}-${W / 2})*${k})-iw/${z}/2))`;
  const y = `max(0,min(ih-ih/${z},(${H / 2}+(${cy.toFixed(1)}-${H / 2})*${k})-ih/${z}/2))`;
  return `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${W}x${H}:fps=${FPS}`;
}

async function tramoPaso(pagina, manual, i, info, dir) {
  const p = manual.pasos[i];
  const total = manual.pasos.length;
  const lista = path.join(dir, `p${i}.txt`);
  const subs = p.sub;
  const real = listaConcat(p.clip, info.t0 - 0.6, info.t1 + 0.9, lista);
  const dur = Math.max(real, 4.5, subs.length * 3.4);
  const lento = Math.min(2, dur / real);
  const huds = [];
  for (let s = 0; s < subs.length; s += 1) {
    const a = path.join(dir, `p${i}-hud${s}.png`);
    await png(pagina, htmlHud(i + 1, total, p.titulo, subs[s], manual.telefono), a);
    huds.push(a);
  }
  const mascara = path.join(dir, `p${i}-mascara.png`);
  const f = info.foco;
  const usarMascara = false;
  if (usarMascara) await png(pagina, htmlMascara(f), mascara);
  const zoom = null;
  const entradas = ['-f', 'concat', '-safe', '0', '-i', lista];
  const filtros = [`[0:v]fps=${FPS},scale=${W}:${H}:flags=lanczos,setsar=1,setpts=${lento.toFixed(4)}*PTS,fps=${FPS},tpad=stop_mode=clone:stop_duration=${Math.max(0, dur - real * lento + 0.5).toFixed(3)},trim=duration=${dur.toFixed(3)}[b0]`];
  let actual = '[b0]';
  let n = 1;
  if (usarMascara) {
    entradas.push('-loop', '1', '-i', mascara);
    const fin = Math.min(dur, Math.max(2.8, dur * 0.55));
    filtros.push(`[${n}:v]format=rgba,fade=t=in:st=0.3:d=0.5:alpha=1,fade=t=out:st=${Math.max(0.5, fin - 0.6).toFixed(2)}:d=0.5:alpha=1[m]`);
    filtros.push(`${actual}[m]overlay=0:0:shortest=1[b1]`);
    actual = '[b1]';
    n += 1;
  }
  if (zoom) {
    filtros.push(`${actual}${zoom}[b2]`);
    actual = '[b2]';
  }
  const tramo = dur / subs.length;
  huds.forEach((h, s) => {
    entradas.push('-loop', '1', '-i', h);
    const desde = s * tramo;
    const hasta = (s + 1) * tramo;
    const fi = s === 0 ? `fade=t=in:st=0:d=0.35:alpha=1,` : '';
    filtros.push(`[${n}:v]format=rgba,${fi}trim=duration=${dur.toFixed(3)}[h${s}]`);
    filtros.push(`${actual}[h${s}]overlay=0:0:enable='between(t,${desde.toFixed(3)},${(hasta - 0.001).toFixed(3)})':shortest=1[o${s}]`);
    actual = `[o${s}]`;
    n += 1;
  });
  const salida = path.join(dir, `p${i}.mp4`);
  ffmpeg([...entradas, '-filter_complex', filtros.join(';'), '-map', actual, '-t', dur.toFixed(3), ...codificar, salida]);
  return salida;
}

async function tarjetaVideo(pagina, html, segundos, archivo) {
  const img = archivo.replace(/\.mp4$/, '.png');
  await png(pagina, html, img);
  ffmpeg(['-loop', '1', '-i', img, '-vf', `fps=${FPS},scale=${W}:${H},format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${segundos - 0.4}:d=0.4`, '-t', String(segundos), ...codificar, archivo]);
  return archivo;
}

async function montar(manual, clips) {
  const dir = path.join(TMP, manual.archivo);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const nav = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH, args: ['--no-sandbox'] });
  const pagina = await nav.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const partes = [];
  const titulo = String(manual.id).padStart(2, '0');
  partes.push({
    nombre: 'Portada',
    archivo: await tarjetaVideo(
      pagina,
      htmlTarjeta(`<div class="c"><div class="logo">${LOGO}</div><div class="eti">${manual.id === 10 ? 'Guía rápida' : 'Manual del personal'}</div><h1>${claro(manual.titulo)}</h1><div class="rol">${claro(manual.rol)}</div></div>`),
      4,
      path.join(dir, 'portada.mp4')
    ),
  });
  partes.push({
    nombre: 'Antes de empezar',
    archivo: await tarjetaVideo(
      pagina,
      htmlTarjeta(`<div class="c"><div class="eti">Antes de empezar</div><ul>${manual.antes.map((a, i) => `<li><b>${i + 1}</b><span>${claro(a)}</span></li>`).join('')}</ul></div>`),
      5,
      path.join(dir, 'antes.mp4')
    ),
  });
  for (let i = 0; i < manual.pasos.length; i += 1) {
    const p = manual.pasos[i];
    const c = clips.find((x) => x.nombre === p.clip);
    const info = c && c.pasos.find((x) => x.paso === p.paso && (p.numero ? c.pasos.indexOf(x) >= 0 : true));
    if (!info) throw new Error(`Falta el clip ${p.clip} paso ${p.paso}`);
    process.stdout.write(`  paso ${i + 1}\n`);
    partes.push({ nombre: `Paso ${i + 1}: ${p.titulo}`, archivo: await tramoPaso(pagina, manual, i, info, dir) });
  }
  const resumen = `<div class="c"><div class="eti">Resumen</div><ul class="${manual.pasos.length > 5 ? 'cols' : ''}">${manual.pasos
    .map((p, i) => `<li><b>${i + 1}</b><span>${claro(p.titulo)}</span></li>`)
    .join('')}</ul>${manual.siguiente ? `<div class="sig">Siguiente video: <strong>${claro(manual.siguiente)}</strong></div>` : ''}</div>`;
  partes.push({ nombre: 'Resumen', archivo: await tarjetaVideo(pagina, htmlTarjeta(resumen), 6, path.join(dir, 'resumen.mp4')) });
  await nav.close();

  const lista = path.join(dir, 'partes.txt');
  fs.writeFileSync(lista, partes.map((p) => `file '${p.archivo}'`).join('\n'));
  let t = 0;
  const meta = [';FFMETADATA1', `title=${manual.titulo}`, `comment=${VERSION}`];
  for (const p of partes) {
    const d = duracion(p.archivo);
    meta.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(t * 1000)}`, `END=${Math.round((t + d) * 1000)}`, `title=${p.nombre}`);
    t += d;
  }
  const metaArchivo = path.join(dir, 'capitulos.txt');
  fs.writeFileSync(metaArchivo, meta.join('\n'));
  const destino = path.join(BASE, `${manual.archivo}.mp4`);
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-i', metaArchivo, '-map_metadata', '1', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', destino]);
  const capitulos = [];
  let acc = 0;
  for (const p of partes) {
    const m = Math.floor(acc / 60);
    const s = Math.floor(acc % 60);
    capitulos.push(`${m}:${String(s).padStart(2, '0')} ${p.nombre}`);
    acc += duracion(p.archivo);
  }
  fs.writeFileSync(path.join(BASE, `${manual.archivo}-capitulos.txt`), capitulos.join('\n') + '\n');
  return { destino, total: t };
}

async function main() {
  const clips = fs
    .readdirSync(BASE)
    .filter((f) => /^clips.*\.json$/.test(f))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(BASE, f), 'utf8')).clips);
  const pedidos = process.argv.slice(2).map(String);
  for (const m of MANUALES) {
    if (pedidos.length && !pedidos.includes(String(m.id))) continue;
    if (!m.pasos.every((p) => clips.some((c) => c.nombre === p.clip))) {
      process.stdout.write(`Sin material para el video ${m.id}\n`);
      continue;
    }
    process.stdout.write(`Video ${m.id}: ${m.titulo}\n`);
    const r = await montar(m, clips);
    process.stdout.write(`  listo ${r.destino} (${Math.round(r.total)} s)\n`);
  }
}

main();
