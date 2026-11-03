require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (!process.env.DATABASE_URL) { console.error('Falta DATABASE_URL.'); process.exit(1); }
const dir = path.resolve(process.env.RESPALDO_DIR || path.join(__dirname, '..', 'respaldos'));
const conservar = Number(process.env.RESPALDO_CONSERVAR) || 14;
fs.mkdirSync(dir, { recursive: true });

const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const nombre = `casino_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.sql`;
const destino = path.join(dir, nombre);

const r = spawnSync('pg_dump', ['--no-owner', '--no-privileges', '--dbname', process.env.DATABASE_URL, '--file', destino], { encoding: 'utf8' });
if (r.error || r.status !== 0) {
  fs.rmSync(destino, { force: true });
  console.error('No se pudo respaldar:', r.error ? r.error.message : r.stderr.trim());
  process.exit(1);
}
console.log('Respaldo creado:', destino);

const viejos = fs.readdirSync(dir).filter((f) => /^casino_\d{8}_\d{4}\.sql$/.test(f)).sort().reverse().slice(conservar);
for (const f of viejos) { fs.rmSync(path.join(dir, f)); console.log('Eliminado respaldo antiguo:', f); }
