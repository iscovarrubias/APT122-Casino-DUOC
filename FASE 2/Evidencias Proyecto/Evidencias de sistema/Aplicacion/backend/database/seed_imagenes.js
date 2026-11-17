require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/db');
const { detectarFormato, TAMANO_MAXIMO } = require('../src/middleware/subida');
const imagenModel = require('../src/models/imagen.model');

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
  'charquican': 'Charquicán',
};

const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp'];

function archivoDe(slug) {
  for (const ext of EXTENSIONES) {
    const ruta = path.join(CARPETA, slug + ext);
    if (fs.existsSync(ruta)) return ruta;
  }
  return null;
}

async function main() {
  let cargadas = 0;
  const faltantes = [];
  for (const [slug, nombre] of Object.entries(PLATOS)) {
    const ruta = archivoDe(slug);
    if (!ruta) { faltantes.push(slug); continue; }
    const buffer = fs.readFileSync(ruta);
    if (buffer.length > TAMANO_MAXIMO) { console.warn(`Omitida por tamaño (máx. 3 MB): ${path.basename(ruta)}`); continue; }
    const formato = detectarFormato(buffer);
    if (!formato) { console.warn(`Formato no reconocido: ${path.basename(ruta)}`); continue; }
    const prep = (await pool.query('SELECT id_preparacion FROM preparacion WHERE nombre = $1', [nombre])).rows[0];
    if (!prep) { console.warn(`No existe la preparación "${nombre}". Ejecuta antes seed_menu_campomar.sql.`); continue; }
    const id = await imagenModel.guardar(buffer, formato.tipo);
    await pool.query('UPDATE preparacion SET imagen_url = $2 WHERE id_preparacion = $1', [prep.id_preparacion, `${imagenModel.RUTA}${id}`]);
    cargadas += 1;
    console.log(`Foto cargada: ${nombre}`);
  }
  console.log(`Fotos cargadas: ${cargadas} de ${Object.keys(PLATOS).length}.`);
  if (faltantes.length) console.log(`Sin archivo en database/imagenes: ${faltantes.join(', ')}`);
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
