const { Pool } = require('pg');
const { URL_BD } = require('./entorno');

let pool;
const conexion = () => {
  if (!pool) pool = new Pool({ connectionString: URL_BD, max: 2 });
  return pool;
};

async function consulta(sql, parametros = []) {
  const { rows } = await conexion().query(sql, parametros);
  return rows;
}

async function limpiarDia(fecha) {
  const ids = '(SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1))';
  const jornadas = '(SELECT j.id_jornada FROM jornada j JOIN menu m ON m.id_menu = j.id_menu WHERE m.fecha = $1)';
  const cliente = await conexion().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`DELETE FROM movimiento_stock WHERE id_menu_preparacion IN ${ids}`, [fecha]);
    await cliente.query(`DELETE FROM venta_combo WHERE id_jornada IN ${jornadas}`, [fecha]);
    await cliente.query('DELETE FROM jornada WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1)', [fecha]);
    await cliente.query(`DELETE FROM disponibilidad WHERE id_menu_preparacion IN ${ids}`, [fecha]);
    await cliente.query(`DELETE FROM venta WHERE id_menu_preparacion IN ${ids}`, [fecha]);
    await cliente.query('DELETE FROM menu_preparacion WHERE id_menu IN (SELECT id_menu FROM menu WHERE fecha = $1)', [fecha]);
    await cliente.query('DELETE FROM menu WHERE fecha = $1', [fecha]);
    await cliente.query('COMMIT');
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

async function borrarCalificaciones(nombrePreparacion) {
  await consulta('DELETE FROM calificacion WHERE id_preparacion = (SELECT id_preparacion FROM preparacion WHERE nombre = $1)', [
    nombrePreparacion,
  ]);
}

async function cerrar() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { consulta, limpiarDia, borrarCalificaciones, cerrar };
