const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SALIDA = path.join(__dirname, 'salida');
const CUADROS = path.join(SALIDA, 'cuadros');
const SEGMENTOS = path.join(SALIDA, 'segmentos');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = Number(process.env.DEMO_FPS || 30);
const TRANSICION = 0.5;

const ffmpeg = (args) => execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

function listaConcat(nombre, desde, hasta) {
  const datos = JSON.parse(fs.readFileSync(path.join(CUADROS, nombre, 'cuadros.json'), 'utf8'));
  const cuadros = datos.cuadros.filter((c) => fs.existsSync(c.archivo));
  if (!cuadros.length) throw new Error(`La escena "${nombre}" no tiene cuadros`);
  const L = datos.lento || 1;
  const inicio = desde ?? cuadros[0].t;
  const fin = hasta ?? datos.fin;
  const lineas = [];
  const agregar = (archivo, duracion) => {
    if (duracion <= 0) return;
    lineas.push(`file '${archivo.replace(/'/g, "'\\''")}'`, `duration ${(duracion / L).toFixed(4)}`);
  };
  if (cuadros[0].t > inicio) agregar(cuadros[0].archivo, cuadros[0].t - inicio);
  cuadros.forEach((c, i) => {
    const siguiente = i + 1 < cuadros.length ? cuadros[i + 1].t : Math.max(fin, c.t + L / FPS);
    if (siguiente - c.t >= 0.002) agregar(c.archivo, siguiente - c.t);
  });
  lineas.push(`file '${cuadros[cuadros.length - 1].archivo.replace(/'/g, "'\\''")}'`);
  const archivo = path.join(SEGMENTOS, `${nombre}.txt`);
  fs.writeFileSync(archivo, lineas.join('\n'));
  return { archivo, datos };
}

const codificar = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS)];

function simple(nombre) {
  const { archivo } = listaConcat(nombre);
  const salida = path.join(SEGMENTOS, `${nombre}.mp4`);
  ffmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    archivo,
    '-vf',
    `fps=${FPS},scale=3840:2160:force_original_aspect_ratio=decrease:flags=lanczos,pad=3840:2160:(ow-iw)/2:(oh-ih)/2:color=0x0f2136`,
    ...codificar,
    salida,
  ]);
  return salida;
}

function dividido(nombre, izquierda, derecha) {
  const a = JSON.parse(fs.readFileSync(path.join(CUADROS, izquierda, 'cuadros.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(CUADROS, derecha, 'cuadros.json'), 'utf8'));
  const desde = Math.min(a.inicio, b.inicio);
  const hasta = Math.max(a.fin, b.fin);
  const la = listaConcat(izquierda, desde, hasta);
  const lb = listaConcat(derecha, desde, hasta);
  const salida = path.join(SEGMENTOS, `${nombre}.mp4`);
  ffmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    la.archivo,
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    lb.archivo,
    '-filter_complex',
    `[0:v]fps=${FPS},scale=2720:2160:flags=lanczos,setsar=1[a];[1:v]fps=${FPS},scale=1120:2160:flags=lanczos,setsar=1[b];[a][b]hstack=inputs=2,trim=duration=${((hasta - desde) / (a.lento || 1)).toFixed(3)}[v]`,
    '-map',
    '[v]',
    ...codificar,
    salida,
  ]);
  return salida;
}

function duracion(archivo) {
  const salida = execFileSync(process.env.FFPROBE || 'ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    archivo,
  ]);
  return Number(String(salida).trim());
}

function unir(archivos, destino) {
  if (archivos.length === 1) return fs.copyFileSync(archivos[0], destino);
  const entradas = archivos.flatMap((a) => ['-i', a]);
  const partes = [];
  let previo = '[0:v]';
  let acumulado = duracion(archivos[0]);
  for (let i = 1; i < archivos.length; i += 1) {
    const etiqueta = i === archivos.length - 1 ? '[v]' : `[x${i}]`;
    partes.push(`${previo}[${i}:v]xfade=transition=fade:duration=${TRANSICION}:offset=${(acumulado - TRANSICION).toFixed(3)}${etiqueta}`);
    acumulado += duracion(archivos[i]) - TRANSICION;
    previo = etiqueta;
  }
  ffmpeg([...entradas, '-filter_complex', partes.join(';'), '-map', '[v]', ...codificar, '-movflags', '+faststart', destino]);
  return acumulado;
}

function main() {
  const orden = JSON.parse(fs.readFileSync(path.join(SALIDA, 'orden.json'), 'utf8'));
  fs.mkdirSync(SEGMENTOS, { recursive: true });
  const archivos = orden.map((s) => {
    process.stdout.write(`Montando ${s.nombre}...\n`);
    return s.izquierda ? dividido(s.nombre, s.izquierda, s.derecha) : simple(s.nombre);
  });
  const destino = path.join(SALIDA, 'demo-casinos-duoc.mp4');
  const total = unir(archivos, destino);
  process.stdout.write(`Video listo: ${destino} (${Math.round(total)} s)\n`);
}

if (require.main === module) main();

module.exports = { simple, dividido, unir };
