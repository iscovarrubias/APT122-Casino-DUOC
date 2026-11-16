const pool = require('../config/db');

const RUTA = '/api/imagenes/';

async function limpiarHuerfanas() {
  await pool.query(
    `DELETE FROM imagen i
     WHERE i.creado_en < NOW() - INTERVAL '1 day'
       AND NOT EXISTS (SELECT 1 FROM preparacion p WHERE p.imagen_url = $1::text || i.id_imagen::text)`,
    [RUTA]
  );
}

async function guardar(buffer, tipo) {
  await limpiarHuerfanas();
  const { rows } = await pool.query(
    'INSERT INTO imagen (tipo_mime, datos, tamano) VALUES ($1, $2, $3) RETURNING id_imagen',
    [tipo, buffer, buffer.length]
  );
  return rows[0].id_imagen;
}

async function obtener(id) {
  const { rows } = await pool.query('SELECT tipo_mime, datos FROM imagen WHERE id_imagen = $1', [id]);
  return rows[0] || null;
}

module.exports = { guardar, obtener, RUTA };
