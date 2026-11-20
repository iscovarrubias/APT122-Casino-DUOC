process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://nadie@127.0.0.1:1/ninguna';
process.env.JWT_SECRET = 'secreto-exclusivo-para-pruebas-automatizadas';

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectarFormato, subirImagen, TAMANO_MAXIMO } = require('../src/middleware/subida');
const { errorHandler, ApiError } = require('../src/middleware/errorHandler');

const cabeceras = {
  jpg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]),
  gif: Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00', 'latin1'),
  webp: Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBP')]),
};

test.describe('Detección de imágenes por su contenido', () => {
  test('UT-20 reconoce JPG, PNG, GIF y WEBP por sus primeros bytes', () => {
    assert.deepEqual(detectarFormato(cabeceras.jpg), { tipo: 'image/jpeg', ext: '.jpg' });
    assert.deepEqual(detectarFormato(cabeceras.png), { tipo: 'image/png', ext: '.png' });
    assert.deepEqual(detectarFormato(cabeceras.gif), { tipo: 'image/gif', ext: '.gif' });
    assert.deepEqual(detectarFormato(cabeceras.webp), { tipo: 'image/webp', ext: '.webp' });
  });

  test('UT-21 rechaza archivos que no son imágenes aunque se llamen .png', () => {
    for (const contenido of ['<?php system($_GET["c"]); ?>', '<svg onload=alert(1)></svg>', 'MZ\x90\x00ejecutable...', '%PDF-1.7 documento', 'texto plano cualquiera']) {
      assert.equal(detectarFormato(Buffer.from(contenido, 'latin1')), null, contenido);
    }
  });

  test('UT-22 rechaza archivos demasiado cortos o vacíos', () => {
    assert.equal(detectarFormato(Buffer.alloc(0)), null);
    assert.equal(detectarFormato(cabeceras.png.subarray(0, 8)), null);
  });

  test('UT-23 un RIFF que no es WEBP (por ejemplo un WAV) no pasa', () => {
    assert.equal(detectarFormato(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')])), null);
  });

  test('UT-24 el tamaño máximo es 3 MB', () => {
    assert.equal(TAMANO_MAXIMO, 3 * 1024 * 1024);
  });

  const verificar = subirImagen.single('imagen')[1];
  const correr = (file) => new Promise((resolver) => verificar({ file }, {}, (err) => resolver(err)));

  test('UT-25 el contenido debe coincidir con el tipo declarado por el navegador', async () => {
    const err = await correr({ buffer: cabeceras.jpg, mimetype: 'image/png' });
    assert.equal(err.status, 400);
  });

  test('UT-26 una imagen verdadera pasa y queda marcado su formato', async () => {
    const file = { buffer: cabeceras.webp, mimetype: 'image/webp' };
    assert.equal(await correr(file), undefined);
    assert.equal(file.formato.ext, '.webp');
  });

  test('UT-27 sin archivo deja seguir (el controlador decide)', async () => {
    assert.equal(await correr(undefined), undefined);
  });
});

function responder(err) {
  const res = { codigo: null, cuerpo: null, status(c) { this.codigo = c; return this; }, json(b) { this.cuerpo = b; return this; } };
  const original = console.error;
  console.error = () => {};
  try { errorHandler(err, {}, res, () => {}); } finally { console.error = original; }
  return res;
}

test.describe('Manejo central de errores', () => {
  test('UT-28 los errores de la API conservan su código y mensaje', () => {
    const r = responder(new ApiError(409, 'Ya existe'));
    assert.equal(r.codigo, 409);
    assert.deepEqual(r.cuerpo, { error: 'Ya existe' });
  });

  test('UT-29 los errores de formato de PostgreSQL se responden como 400 y no como 500', () => {
    for (const code of ['22P02', '22003', '22007', '22008', '2201W', '2201X']) {
      const r = responder(Object.assign(new Error('detalle interno de postgres'), { code }));
      assert.equal(r.codigo, 400, code);
      assert.doesNotMatch(r.cuerpo.error, /postgres|interno/);
    }
  });

  test('UT-30 las violaciones de restricciones se traducen a mensajes claros', () => {
    assert.equal(responder(Object.assign(new Error(), { code: '23505' })).codigo, 409);
    assert.equal(responder(Object.assign(new Error(), { code: '23503' })).codigo, 400);
    assert.equal(responder(Object.assign(new Error(), { code: '23502' })).codigo, 400);
    assert.equal(responder(Object.assign(new Error(), { code: '23514' })).codigo, 400);
  });

  test('UT-31 un error inesperado responde 500 genérico sin filtrar el detalle', () => {
    const r = responder(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=secreta'));
    assert.equal(r.codigo, 500);
    assert.deepEqual(r.cuerpo, { error: 'Error interno del servidor.' });
  });

  test('UT-32 JSON inválido y archivos demasiado grandes tienen su propio mensaje', () => {
    const sintaxis = Object.assign(new SyntaxError('Unexpected token'), { status: 400, body: '{' });
    assert.equal(responder(sintaxis).codigo, 400);
    assert.match(responder(sintaxis).cuerpo.error, /JSON/);
    const multer = Object.assign(new Error('File too large'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' });
    assert.equal(responder(multer).codigo, 413);
    assert.match(responder(multer).cuerpo.error, /3 MB/);
  });
});
