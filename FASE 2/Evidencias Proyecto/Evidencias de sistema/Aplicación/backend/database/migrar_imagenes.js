require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/db');
const { RUTA_UPLOADS, detectarFormato } = require('../src/middleware/subida');
const imagenModel = require('../src/models/imagen.model');

async function main() {
  const { rows } = await pool.query("SELECT id_preparacion, nombre, imagen_url FROM preparacion WHERE imagen_url LIKE '%/uploads/%'");
  let movidas = 0;
  for (const p of rows) {
    const archivo = path.join(RUTA_UPLOADS, path.basename(new URL(p.imagen_url, 'http://x').pathname));
    if (!fs.existsSync(archivo)) { console.warn(`Sin archivo para "${p.nombre}": ${archivo}`); continue; }
    const buffer = fs.readFileSync(archivo);
    const formato = detectarFormato(buffer);
    if (!formato) { console.warn(`Formato no reconocido: ${archivo}`); continue; }
    const id = await imagenModel.guardar(buffer, formato.tipo);
    await pool.query('UPDATE preparacion SET imagen_url = $2 WHERE id_preparacion = $1', [p.id_preparacion, `${imagenModel.RUTA}${id}`]);
    movidas++;
  }
  console.log(`Fotos migradas: ${movidas} de ${rows.length}.`);
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
