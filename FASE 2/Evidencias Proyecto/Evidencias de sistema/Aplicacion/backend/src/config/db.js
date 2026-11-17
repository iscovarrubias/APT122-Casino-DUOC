const { Pool, types } = require('pg');
types.setTypeParser(1082, (valor) => valor);
types.setTypeParser(1114, (valor) => valor.replace(' ', 'T'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;
