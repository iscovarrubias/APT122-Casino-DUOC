require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/db');
const { detectarFormato, TAMANO_MAXIMO } = require('../src/middleware/subida');
const imagenModel = require('../src/models/imagen.model');

let sharp = null;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

const ANCHO_MAXIMO = 1000;
const CALIDAD_WEBP = 78;

const CARPETA = path.join(__dirname, 'imagenes');

const PLATOS = {
  'pollo-asado-papas-arroz': 'Pollo Asado con Papas fritas y Arroz',
  'budin-zapallitos-piamontesa': 'Budín de Zapallitos Italianos con Arroz Piamontesa',
  'lentejas-parmesana': 'Lentejas a la Parmesana',
  'budin-zapallitos-ensaladas': 'Budín de Zapallitos Italianos con Ensaladas',
  'budin-acelga-arroz-arabe': 'Budín de Acelga con Arroz Árabe',
  'omelette-pimenton': 'Omelette pimentón con ensaladas',
  'corbatitas-alfredo': 'Corbatitas con Salsa Alfredo',
  'panqueques-florentinos': 'Panqueques Florentinos',
  'ensalada-huerto': 'Ensalada del Huerto',
  'hamburguesa-suiza': 'Hamburguesa Suiza con Acelgas a la Crema',
  'garbanzos-curry': 'Garbanzos al Curry con Arroz Perla',
  'ensalada-nicoise': 'Ensalada Nicoise',
  'hamburguesa-vacuno': 'Hamburguesa de Vacuno con Arroz',
  'hamburguesa-veggie': 'Hamburguesa Veggie con Papas Fritas y Arroz',
  'pollo-asado-ensaladas': 'Pollo Asado con Ensaladas',
  'charquican-huevo': 'Charquicán con huevo',
  charquican: 'Charquicán',
  'ensalada-repollo-zanahoria': 'Ensalada de repollo y zanahoria',
  'ensalada-chilena': 'Ensalada chilena',
  'sopa-verduras': 'Sopa de verduras',
  'consome-ave': 'Consomé de ave',
  'crema-zapallo': 'Crema de zapallo',
  'pan-amasado': 'Pan amasado',
  manzana: 'Manzana',
  naranja: 'Naranja',
  platano: 'Plátano',
  'fruta-estacion': 'Fruta de estación',
  'arroz-con-leche': 'Arroz con leche',
  'jalea-frutilla': 'Jalea de frutilla',
  'mousse-chocolate': 'Mousse de chocolate',
  'flan-caramelo': 'Flan de caramelo',
  'agua-mineral': 'Agua mineral',
  'jugo-naranja': 'Jugo de naranja',
  'te-helado': 'Té helado',
  'jugo-pina': 'Jugo de piña',
};

const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp'];

function archivoDe(slug) {
  for (const ext of EXTENSIONES) {
    const ruta = path.join(CARPETA, slug + ext);
    if (fs.existsSync(ruta)) return ruta;
  }
  return null;
}

async function optimizar(buffer, formato) {
  if (!sharp) return { buffer, tipo: formato.tipo };
  const salida = await sharp(buffer)
    .rotate()
    .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true })
    .webp({ quality: CALIDAD_WEBP })
    .toBuffer();
  return { buffer: salida, tipo: 'image/webp' };
}

async function main() {
  if (!sharp) console.warn('sharp no está instalado: las fotos se cargan sin comprimir. Ejecuta: npm install --no-save sharp');
  let cargadas = 0;
  const faltantes = [];
  for (const [slug, nombre] of Object.entries(PLATOS)) {
    const ruta = archivoDe(slug);
    if (!ruta) {
      faltantes.push(slug);
      continue;
    }
    const original = fs.readFileSync(ruta);
    const formato = detectarFormato(original);
    if (!formato) {
      console.warn(`Formato no reconocido: ${path.basename(ruta)}`);
      continue;
    }
    const { buffer, tipo } = await optimizar(original, formato);
    if (buffer.length > TAMANO_MAXIMO) {
      console.warn(`Omitida por tamaño (máx. 3 MB): ${path.basename(ruta)}`);
      continue;
    }
    const prep = (await pool.query('SELECT id_preparacion FROM preparacion WHERE nombre = $1', [nombre])).rows[0];
    if (!prep) {
      console.warn(`No existe la preparación "${nombre}". Ejecuta antes seed_menu_campomar.sql.`);
      continue;
    }
    const id = await imagenModel.guardar(buffer, tipo);
    await pool.query('UPDATE preparacion SET imagen_url = $2 WHERE id_preparacion = $1', [prep.id_preparacion, `${imagenModel.RUTA}${id}`]);
    cargadas += 1;
    console.log(`Foto cargada: ${nombre} (${Math.round(original.length / 1024)} KB a ${Math.round(buffer.length / 1024)} KB)`);
  }
  console.log(`Fotos cargadas: ${cargadas} de ${Object.keys(PLATOS).length}.`);
  if (faltantes.length) console.log(`Sin archivo en database/imagenes: ${faltantes.join(', ')}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
