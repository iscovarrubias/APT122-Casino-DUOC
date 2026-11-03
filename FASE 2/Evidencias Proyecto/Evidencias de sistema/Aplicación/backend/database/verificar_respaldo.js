require('dotenv').config();
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Pool } = require('pg');

const origen = process.env.DATABASE_URL;
const destino = process.env.TEST_DATABASE_URL;

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!origen) salir('Falta DATABASE_URL.');
if (!destino) salir('Define TEST_DATABASE_URL: la verificación restaura el respaldo en esa base.');
if (destino === origen) salir('TEST_DATABASE_URL no puede ser igual a DATABASE_URL.');
const nombreDestino = new URL(destino).pathname.replace(/^\//, '');
if (!/test|prueba/i.test(nombreDestino)) salir(`La base "${nombreDestino}" no parece de pruebas. Su nombre debe contener "test" o "prueba".`);

function ejecutar(programa, argumentos) {
  const r = spawnSync(programa, argumentos, { encoding: 'utf8' });
  if (r.error || r.status !== 0) salir(`Falló ${programa}: ${r.error ? r.error.message : r.stderr.trim()}`);
}

async function conteos(url) {
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    const resultado = {};
    for (const { tablename } of rows) {
      const { rows: [{ total }] } = await pool.query(`SELECT COUNT(*)::int AS total FROM "${tablename}"`);
      resultado[tablename] = total;
    }
    return resultado;
  } finally {
    await pool.end();
  }
}

(async () => {
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'respaldo-')), 'verificacion.sql');
  try {
    ejecutar('pg_dump', ['--no-owner', '--no-privileges', '--dbname', origen, '--file', archivo]);
    console.log('Respaldo generado:', `${(fs.statSync(archivo).size / 1024).toFixed(0)} KB`);

    const limpiar = new Pool({ connectionString: destino });
    await limpiar.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await limpiar.end();

    ejecutar('psql', ['--quiet', '--set', 'ON_ERROR_STOP=1', '--dbname', destino, '--file', archivo]);
    console.log(`Respaldo restaurado en "${nombreDestino}"`);

    const [a, b] = [await conteos(origen), await conteos(destino)];
    const tablas = Object.keys(a);
    const distintas = tablas.filter((t) => a[t] !== b[t]);
    const filas = tablas.reduce((suma, t) => suma + a[t], 0);
    if (distintas.length || tablas.length !== Object.keys(b).length) {
      for (const t of distintas) console.error(`Diferencia en ${t}: origen ${a[t]}, restaurado ${b[t]}`);
      salir('La restauración no coincide con el original.');
    }
    console.log(`Verificado: ${tablas.length} tablas y ${filas} filas coinciden con el original.`);
  } finally {
    fs.rmSync(path.dirname(archivo), { recursive: true, force: true });
  }
})().catch((e) => salir(`Error: ${e.message}`));
