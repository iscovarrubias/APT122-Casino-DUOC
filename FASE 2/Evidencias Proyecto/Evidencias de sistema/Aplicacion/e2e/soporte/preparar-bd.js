const path = require('node:path');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const BACKEND = path.resolve(__dirname, '../../backend');
const requerir = (modulo) => require(require.resolve(modulo, { paths: [BACKEND] }));
const { Client } = requerir('pg');
const bcrypt = requerir('bcrypt');

const URL_BD = process.env.DATABASE_URL;
const SEMILLAS_SQL = ['seed_demo.sql', 'seed_bebida_sin_azucar.sql', 'seed_demo_nutricion.sql', 'seed_opiniones_demo.sql'];
const USUARIOS_EXTRA = [
  ['Cajero de Prueba', 'cajero@duocuc.cl', 'Cajero'],
  ['Nutricionista de Prueba', 'nutricionista@duocuc.cl', 'Nutricionista'],
];

async function main() {
  const nombre = new URL(URL_BD).pathname.slice(1);
  if (!/(e2e|test)/i.test(nombre)) throw new Error(`La base "${nombre}" no parece de pruebas; se esperaba "e2e" o "test" en el nombre.`);

  const cliente = new Client({ connectionString: URL_BD });
  await cliente.connect();
  await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const correr = (archivo) =>
    execFileSync(process.execPath, [path.join(BACKEND, 'database', archivo)], { cwd: BACKEND, env: process.env, stdio: 'ignore' });
  correr('migrar.js');
  correr('seed_sprint1.js');
  for (const archivo of SEMILLAS_SQL) {
    await cliente.query(fs.readFileSync(path.join(BACKEND, 'database', archivo), 'utf8'));
  }
  correr('seed_ventas_simuladas.js');

  const hash = await bcrypt.hash('Test1234', 10);
  for (const [nombreUsuario, email, rol] of USUARIOS_EXTRA) {
    await cliente.query(
      `INSERT INTO usuario (nombre, email, password_hash, id_rol, id_sede)
       VALUES ($1, $2, $3, (SELECT id_rol FROM rol WHERE nombre = $4), (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1))
       ON CONFLICT (email) DO NOTHING`,
      [nombreUsuario, email, hash, rol]
    );
  }
  await cliente.end();
  console.log(`Base de pruebas E2E lista: ${nombre}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
