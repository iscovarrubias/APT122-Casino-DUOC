const { test } = require('node:test');
const assert = require('node:assert/strict');
const plantillas = require('../src/utils/plantillasCorreo');
const { semanaObjetivo, decidirSemanal } = require('../src/utils/avisosCorreo');

const fila = (fecha, id, nombre, extra = {}) => ({
  fecha,
  id_preparacion: id,
  nombre,
  componente: 'Plato Principal',
  categoria: 'General',
  ...extra,
});
const ENLACES = { enlaceSitio: 'https://casino.test', enlaceBaja: 'https://api.test/api/correos/baja?token=abc' };

test('COR-01 el domingo y el sábado apuntan a la semana siguiente; un día hábil, a la actual', () => {
  assert.deepEqual(semanaObjetivo('2026-11-22'), { lunes: '2026-11-23', viernes: '2026-11-27' });
  assert.deepEqual(semanaObjetivo('2026-11-21'), { lunes: '2026-11-23', viernes: '2026-11-27' });
  assert.deepEqual(semanaObjetivo('2026-11-23'), { lunes: '2026-11-23', viernes: '2026-11-27' });
  assert.deepEqual(semanaObjetivo('2026-11-26'), { lunes: '2026-11-23', viernes: '2026-11-27' });
  assert.deepEqual(semanaObjetivo('2026-12-27'), { lunes: '2026-12-28', viernes: '2027-01-01' });
});

test('COR-02 con menú semanal y favoritos se envía un solo correo: el semanal', () => {
  const filas = [fila('2026-11-23', 1, 'Pastel de choclo')];
  assert.equal(decidirSemanal({ menu_semanal: true, avisos_favoritos: true, favoritos: [1] }, filas), 'semanal');
  assert.equal(decidirSemanal({ menu_semanal: false, avisos_favoritos: true, favoritos: [1] }, filas), 'favoritos_semana');
  assert.equal(decidirSemanal({ menu_semanal: false, avisos_favoritos: true, favoritos: [9] }, filas), null);
  assert.equal(decidirSemanal({ menu_semanal: true, avisos_favoritos: false, favoritos: [] }, filas), 'semanal');
});

test('COR-03 el menú semanal destaca los favoritos y lo dice en el asunto', () => {
  const filas = [
    fila('2026-11-23', 1, 'Pastel de choclo'),
    fila('2026-11-24', 1, 'Pastel de choclo'),
    fila('2026-11-24', 2, 'Lentejas', { categoria: 'JUNAEB' }),
  ];
  const c = plantillas.correoMenuSemanal({
    nombre: 'Ana Pérez',
    lunes: '2026-11-23',
    viernes: '2026-11-27',
    filas,
    favoritos: [1],
    ...ENLACES,
  });
  assert.equal(c.asunto, 'Menú de la semana del 23 al 27 de noviembre: incluye tus favoritos');
  assert.match(c.html, /Hola Ana/);
  assert.match(c.html, /Pastel de choclo<\/strong> \(lunes y martes\)/);
  assert.equal((c.html.match(/★ Tu favorito/g) || []).length, 2);
  assert.match(c.html, /Lunes 23 de noviembre/);
  assert.match(c.texto, /Pastel de choclo \(tu favorito\)/);
});

test('COR-04 sin favoritos, el semanal es solo el menú', () => {
  const c = plantillas.correoMenuSemanal({
    nombre: 'Ana',
    lunes: '2026-11-30',
    viernes: '2026-12-04',
    filas: [fila('2026-11-30', 1, 'Cazuela')],
    favoritos: [],
    ...ENLACES,
  });
  assert.equal(c.asunto, 'Menú de la semana del 30 de noviembre al 4 de diciembre');
  assert.doesNotMatch(c.html, /Tu favorito/);
});

test('COR-05 el aviso semanal de favoritos cuenta platos distintos, no apariciones', () => {
  const filas = [
    fila('2026-11-23', 1, 'Pastel de choclo'),
    fila('2026-11-24', 1, 'Pastel de choclo'),
    fila('2026-11-25', 1, 'Pastel de choclo'),
  ];
  assert.equal(
    plantillas.correoFavoritosSemana({ nombre: 'Ana', lunes: '2026-11-23', viernes: '2026-11-27', filas, favoritos: [1], ...ENLACES })
      .asunto,
    'Esta semana está tu favorito: Pastel de choclo'
  );
  const dos = [...filas, fila('2026-11-25', 2, 'Flan', { componente: 'Postre', categoria: null })];
  assert.equal(
    plantillas.correoFavoritosSemana({
      nombre: 'Ana',
      lunes: '2026-11-23',
      viernes: '2026-11-27',
      filas: dos,
      favoritos: [1, 2],
      ...ENLACES,
    }).asunto,
    'Esta semana están 2 de tus favoritos'
  );
});

test('COR-06 el aviso del día nombra el favorito', () => {
  const c = plantillas.correoFavoritoDelDia({
    nombre: 'Ana',
    fecha: '2026-11-24',
    filas: [fila('2026-11-24', 1, 'Pastel de choclo')],
    favoritos: [1],
    ...ENLACES,
  });
  assert.equal(c.asunto, 'Hoy hay Pastel de choclo, tu favorito');
  assert.match(c.html, /martes 24 de noviembre/);
});

test('COR-07 todos los correos traen el enlace para darse de baja', () => {
  const filas = [fila('2026-11-24', 1, 'Pastel de choclo')];
  for (const c of [
    plantillas.correoMenuSemanal({ nombre: 'A', lunes: '2026-11-23', viernes: '2026-11-27', filas, favoritos: [1], ...ENLACES }),
    plantillas.correoFavoritosSemana({ nombre: 'A', lunes: '2026-11-23', viernes: '2026-11-27', filas, favoritos: [1], ...ENLACES }),
    plantillas.correoFavoritoDelDia({ nombre: 'A', fecha: '2026-11-24', filas, favoritos: [1], ...ENLACES }),
  ]) {
    assert.match(c.html, /Dejar de recibir estos correos/);
    assert.ok(c.html.includes(ENLACES.enlaceBaja));
    assert.ok(c.texto.includes(ENLACES.enlaceBaja));
  }
});

test('COR-08 los nombres se escapan para que no se pueda inyectar HTML', () => {
  const c = plantillas.correoMenuSemanal({
    nombre: '<script>x</script>',
    lunes: '2026-11-23',
    viernes: '2026-11-27',
    filas: [fila('2026-11-23', 1, '<img src=x onerror=alert(1)>')],
    favoritos: [],
    ...ENLACES,
  });
  assert.doesNotMatch(c.html, /<script>/);
  assert.doesNotMatch(c.html, /<img src=x/);
  assert.match(c.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('COR-09 el semanal arma una pestaña desplegable por día y abre los días con favoritos', () => {
  const filas = [
    fila('2026-11-23', 5, 'Cazuela'),
    fila('2026-11-24', 1, 'Pastel de choclo'),
    fila('2026-11-24', 2, 'Lentejas', { categoria: 'JUNAEB' }),
  ];
  const c = plantillas.correoMenuSemanal({ nombre: 'Ana', lunes: '2026-11-23', viernes: '2026-11-27', filas, favoritos: [1], ...ENLACES });
  const secciones = c.html.match(/<details[^>]*>/g);
  assert.equal(secciones.length, 2);
  assert.doesNotMatch(secciones[0], /open/);
  assert.match(secciones[1], /open/);
  assert.match(c.html, /2 opciones/);
  const sinFavoritos = plantillas.correoMenuSemanal({
    nombre: 'Ana',
    lunes: '2026-11-23',
    viernes: '2026-11-27',
    filas,
    favoritos: [],
    ...ENLACES,
  });
  assert.match(sinFavoritos.html.match(/<details[^>]*>/g)[0], /open/);
});

test('COR-10 los acompañamientos compartidos solo aparecen en las categorías que los incluyen', () => {
  const filas = [
    fila('2026-11-23', 1, 'Cazuela'),
    fila('2026-11-23', 2, 'Lentejas', { categoria: 'JUNAEB' }),
    fila('2026-11-23', 3, 'Pan amasado', { componente: 'Pan', categoria: null }),
    fila('2026-11-23', 4, 'Jugo', { componente: 'Bebida', categoria: null }),
  ];
  const [dia] = plantillas.agruparPorDia(filas);
  const grilla = plantillas.grillaDelDia(dia, {});
  assert.deepEqual(grilla.categorias, ['General', 'JUNAEB']);
  const pan = grilla.filas.find((f) => f.etiqueta === 'Pan');
  assert.deepEqual(
    pan.celdas.map((c) => c && c.nombre),
    ['Pan amasado', null]
  );
  const conPan = plantillas.grillaDelDia(dia, { JUNAEB: [{ tipo: 'Pan' }] });
  assert.deepEqual(
    conPan.filas.find((f) => f.etiqueta === 'Pan').celdas.map((c) => c && c.nombre),
    ['Pan amasado', 'Pan amasado']
  );
  assert.equal(
    grilla.filas.some((f) => f.etiqueta === 'Sopa'),
    false
  );
});

test('COR-11 los correos llevan el logo del casino y no usan emojis', () => {
  const filas = [fila('2026-11-24', 1, 'Pastel de choclo')];
  for (const c of [
    plantillas.correoMenuSemanal({ nombre: 'A', lunes: '2026-11-23', viernes: '2026-11-27', filas, favoritos: [1], ...ENLACES }),
    plantillas.correoFavoritosSemana({ nombre: 'A', lunes: '2026-11-23', viernes: '2026-11-27', filas, favoritos: [1], ...ENLACES }),
    plantillas.correoFavoritoDelDia({ nombre: 'A', fecha: '2026-11-24', filas, favoritos: [1], ...ENLACES }),
  ]) {
    assert.ok(c.html.includes(`src="cid:${plantillas.LOGO_CID}"`));
    assert.match(c.html, /alt="Casinos DUOC UC"/);
    assert.match(c.html, /correo automático, por favor no lo respondas/);
    assert.match(c.texto, /no lo respondas/);
    assert.doesNotMatch(c.html + c.asunto + c.texto, /[\u{1F000}-\u{1FAFF}\u{2B50}\u{2705}\u{FE0F}]/u);
  }
});
