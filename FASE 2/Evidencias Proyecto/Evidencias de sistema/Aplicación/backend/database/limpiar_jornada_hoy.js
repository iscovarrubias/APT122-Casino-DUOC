require('dotenv').config();
const pool = require('../src/config/db');
const { hoyChile } = require('../src/utils/fecha');

const MENU_DE_HOY = 'SELECT id_menu FROM menu WHERE fecha = $1';
const JORNADA_DE_HOY = `SELECT j.id_jornada FROM jornada j JOIN menu m ON m.id_menu = j.id_menu WHERE m.fecha = $1`;
const COMPONENTES_DE_HOY = `SELECT id_menu_preparacion FROM menu_preparacion WHERE id_menu IN (${MENU_DE_HOY})`;

async function main() {
  const fecha = hoyChile();
  const base = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
  const cuenta = async (sql) => Number((await pool.query(sql, [fecha])).rows[0].n);

  const resumen = {
    jornadas: await cuenta(`SELECT COUNT(*) AS n FROM (${JORNADA_DE_HOY}) x`),
    ventas: await cuenta(`SELECT COUNT(*) AS n FROM venta_combo WHERE id_jornada IN (${JORNADA_DE_HOY})`),
    movimientos: await cuenta(`SELECT COUNT(*) AS n FROM movimiento_stock WHERE id_menu_preparacion IN (${COMPONENTES_DE_HOY})`),
    disponibilidad: await cuenta(`SELECT COUNT(*) AS n FROM disponibilidad WHERE id_menu_preparacion IN (${COMPONENTES_DE_HOY})`),
  };

  console.log(`Base: ${base}`);
  console.log(`Fecha: ${fecha}`);
  console.log(`Jornadas: ${resumen.jornadas} | ventas de caja: ${resumen.ventas} | movimientos de stock: ${resumen.movimientos} | cambios de disponibilidad: ${resumen.disponibilidad}`);

  if (!process.argv.includes('--confirmar')) {
    console.log('No se borró nada. Para borrar, ejecuta de nuevo con --confirmar.');
    return;
  }
  if (resumen.jornadas === 0 && resumen.movimientos === 0) {
    console.log('No hay jornada de hoy que borrar.');
    return;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`DELETE FROM movimiento_stock WHERE id_menu_preparacion IN (${COMPONENTES_DE_HOY})`, [fecha]);
    await cliente.query(`DELETE FROM venta_combo WHERE id_jornada IN (${JORNADA_DE_HOY})`, [fecha]);
    await cliente.query(`DELETE FROM jornada WHERE id_menu IN (${MENU_DE_HOY})`, [fecha]);
    await cliente.query(`DELETE FROM disponibilidad WHERE id_menu_preparacion IN (${COMPONENTES_DE_HOY})`, [fecha]);
    await cliente.query('COMMIT');
    console.log('Jornada de hoy borrada. El menú sigue publicado: ya puedes iniciar la jornada de nuevo.');
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());