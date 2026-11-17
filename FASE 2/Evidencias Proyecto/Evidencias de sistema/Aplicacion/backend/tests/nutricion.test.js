const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularNutricion } = require('../src/utils/nutricion');

const ing = (nombre, cantidad_g, kcal, p, c, g, extra = {}) => ({
  nombre, cantidad_g, calorias_100g: kcal, proteinas_100g: p, carbohidratos_100g: c, grasas_100g: g, ...extra,
});

test('CP-15 calcula la suma por porción (RF-22)', () => {
  const r = calcularNutricion({
    porciones: 2,
    ingredientes: [ing('A', 150, 200, 10, 20, 5), ing('B', 50, 100, 2, 30, 1)],
  });
  assert.equal(r.completo, true);
  assert.deepEqual(r.por_porcion, { calorias: 175, proteinas_g: 8, carbohidratos_g: 22.5, grasas_g: 4 });
});

test('CP-16 redondea a un decimal', () => {
  const r = calcularNutricion({ porciones: 1, ingredientes: [ing('Choclo', 33, 97, 3.2, 22, 1.2)] });
  assert.equal(r.por_porcion.calorias, 32);
  assert.equal(r.por_porcion.proteinas_g, 1.1);
});

test('CP-17 todo o nada: falta la cantidad de un ingrediente', () => {
  const r = calcularNutricion({ porciones: 1, ingredientes: [ing('A', 100, 100, 1, 1, 1), ing('B', null, 50, 1, 1, 1)] });
  assert.equal(r.completo, false);
  assert.equal(r.por_porcion, null);
  assert.deepEqual(r.sin_datos, [{ nombre: 'B', motivo: 'sin_cantidad' }]);
});

test('CP-18 todo o nada: falta un valor nutricional', () => {
  const r = calcularNutricion({ porciones: 1, ingredientes: [ing('Pollo', 100, null, null, null, null)] });
  assert.equal(r.completo, false);
  assert.deepEqual(r.sin_datos, [{ nombre: 'Pollo', motivo: 'sin_datos_nutricionales' }]);
});

test('CP-19 omite los ingredientes sin cuantificar y los informa', () => {
  const r = calcularNutricion({
    porciones: 1,
    ingredientes: [ing('A', 100, 100, 1, 1, 1), { nombre: 'Sal', sin_cuantificar: true, cantidad_g: null }],
  });
  assert.equal(r.completo, true);
  assert.deepEqual(r.omitidos, ['Sal']);
  assert.equal(r.por_porcion.calorias, 100);
});

test('CP-20 rechaza porciones inválidas', () => {
  for (const porciones of [0, -1, 2.5, null, undefined, 'abc']) {
    const r = calcularNutricion({ porciones, ingredientes: [ing('A', 100, 100, 1, 1, 1)] });
    assert.equal(r.completo, false, `porciones=${porciones}`);
    assert.ok(r.problemas.includes('porciones_invalidas'));
  }
});

test('CP-21 rechaza una receta sin ingredientes o solo con sin cuantificar', () => {
  assert.ok(calcularNutricion({ porciones: 1, ingredientes: [] }).problemas.includes('sin_ingredientes'));
  const r = calcularNutricion({ porciones: 1, ingredientes: [{ nombre: 'Sal', sin_cuantificar: true }] });
  assert.equal(r.completo, false);
  assert.ok(r.problemas.includes('sin_ingredientes_cuantificables'));
});

test('CP-22 acepta números como texto (pg devuelve NUMERIC como string)', () => {
  const r = calcularNutricion({ porciones: '2', ingredientes: [ing('A', '200.0', '100.0', '2.0', '10.0', '1.0')] });
  assert.equal(r.completo, true);
  assert.equal(r.por_porcion.calorias, 100);
});

test('CP-23 rechaza cantidades o valores negativos', () => {
  assert.equal(calcularNutricion({ porciones: 1, ingredientes: [ing('A', -10, 100, 1, 1, 1)] }).completo, false);
  assert.equal(calcularNutricion({ porciones: 1, ingredientes: [ing('A', 10, -100, 1, 1, 1)] }).completo, false);
});
