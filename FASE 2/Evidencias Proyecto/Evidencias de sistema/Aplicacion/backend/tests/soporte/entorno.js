require('dotenv').config();

const urlPruebas = process.env.TEST_DATABASE_URL;

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!urlPruebas) {
  salir('Define TEST_DATABASE_URL en el archivo .env con una base de datos exclusiva para pruebas. Las pruebas de integración crean y borran datos.');
}

if (urlPruebas === process.env.DATABASE_URL) {
  salir('TEST_DATABASE_URL no puede ser igual a DATABASE_URL: las pruebas borrarían datos de la base de trabajo.');
}

const nombreBase = new URL(urlPruebas).pathname.replace(/^\//, '');
if (!/test|prueba/i.test(nombreBase)) {
  salir(`La base "${nombreBase}" no parece de pruebas. Su nombre debe contener "test" o "prueba".`);
}

process.env.DATABASE_URL = urlPruebas;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-exclusivo-para-pruebas-automatizadas';
