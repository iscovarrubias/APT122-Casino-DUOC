// Crea un usuario de prueba por rol, con contraseña "Test1234" para los tres.
// Solo para desarrollo/pruebas de Sprint 1, no usar en producción.
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function seed() {
  const passwordHash = await bcrypt.hash('Test1234', 10);

  const usuarios = [
    { nombre: 'Estudiante de Prueba', email: 'estudiante@duocuc.cl', rol: 'Estudiante' },
    { nombre: 'Personal de Prueba', email: 'personal@duocuc.cl', rol: 'Personal Casino' },
    { nombre: 'Admin de Prueba', email: 'admin@duocuc.cl', rol: 'Administrador' },
  ];

  for (const u of usuarios) {
    const rol = await pool.query('SELECT id_rol FROM rol WHERE nombre = $1', [u.rol]);
    const sede = await pool.query('SELECT id_sede FROM sede LIMIT 1');

    await pool.query(
      `INSERT INTO usuario (nombre, email, password_hash, id_rol, id_sede)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [u.nombre, u.email, passwordHash, rol.rows[0].id_rol, sede.rows[0].id_sede]
    );
    console.log(`Usuario listo: ${u.email} (${u.rol})`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
