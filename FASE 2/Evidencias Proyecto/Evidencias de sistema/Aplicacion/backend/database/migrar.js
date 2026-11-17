require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const DIR = __dirname;
const baseline = process.argv.includes('--baseline');

const orden = (f) => Number((f.match(/sprint(\d+)/) || [])[1] || 0);
const migraciones = () => fs.readdirSync(DIR)
  .filter((f) => /^migracion_.*\.sql$/.test(f))
  .sort((a, b) => orden(a) - orden(b) || a.localeCompare(b));

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const cliente = await pool.connect();
  try {
    await cliente.query(`CREATE TABLE IF NOT EXISTS schema_migraciones (
      nombre VARCHAR(120) PRIMARY KEY, aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const hechas = new Set((await cliente.query('SELECT nombre FROM schema_migraciones')).rows.map((r) => r.nombre));
    const hayEsquema = (await cliente.query("SELECT to_regclass('public.usuario') AS t")).rows[0].t !== null;

    if (!hayEsquema) {
      console.log('Base vacía: creando el esquema base (schema.sql).');
      await cliente.query(fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8'));
    } else if (hechas.size === 0 && !baseline) {
      throw new Error('La base ya tiene tablas pero no hay registro de migraciones. Si ya aplicaste todo a mano, ejecuta: npm run migrar -- --baseline');
    }

    for (const archivo of migraciones()) {
      if (hechas.has(archivo)) continue;
      if (baseline) {
        await cliente.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
        console.log('Registrada sin ejecutar:', archivo);
        continue;
      }
      console.log('Aplicando', archivo);
      try {
        await cliente.query(fs.readFileSync(path.join(DIR, archivo), 'utf8'));
        await cliente.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
      } catch (err) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw new Error(`Falló ${archivo}: ${err.message}`);
      }
    }
    console.log('Migraciones al día.');
  } finally {
    cliente.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
