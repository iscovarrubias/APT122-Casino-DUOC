const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resumenPublico, estadoPublico, hhmm } = require('../src/utils/prediccionPublica');

test('PUB-01 redondea la hora estimada a 5 minutos', () => {
  assert.deepEqual(estadoPublico({ agotaria: true, minuto: 802, minutos_restantes: 40 }), {
    estado: 'se_agota',
    hora: '13:20',
    minutos_restantes: 40,
  });
  assert.equal(estadoPublico({ agotaria: true, minuto: 798, minutos_restantes: 1 }).hora, '13:20');
  assert.equal(estadoPublico({ agotaria: true, minuto: 797, minutos_restantes: 1 }).hora, '13:15');
});

test('PUB-02 distingue agotado, alcanza y sin datos', () => {
  assert.deepEqual(estadoPublico({ estado: 'agotado' }), { estado: 'agotado' });
  assert.deepEqual(estadoPublico({ agotaria: false, esperado_restante: 3 }), { estado: 'alcanza' });
  assert.equal(estadoPublico(null), null);
});

test('PUB-03 el resumen público omite categorías sin estimación y no expone datos internos', () => {
  const r = resumenPublico({
    fecha: '2026-11-23',
    contiene_simulados: true,
    categorias: [
      { categoria: 'General', restante: 10, vendidas: 30, estimacion: { agotaria: true, minuto: 790, minutos_restantes: 20, escala: 1.2 } },
      { categoria: 'JUNAEB', restante: 5, vendidas: 2, estimacion: null },
    ],
  });
  assert.deepEqual(r, {
    fecha: '2026-11-23',
    categorias: [{ categoria: 'General', estado: 'se_agota', hora: '13:10', minutos_restantes: 20 }],
  });
  assert.equal(JSON.stringify(r).includes('vendidas'), false);
  assert.equal(JSON.stringify(r).includes('escala'), false);
});

test('PUB-04 sin jornada abierta devuelve una lista vacía', () => {
  assert.deepEqual(resumenPublico({ fecha: '2026-11-23', categorias: [] }), { fecha: '2026-11-23', categorias: [] });
  assert.deepEqual(resumenPublico(null), { fecha: null, categorias: [] });
  assert.equal(hhmm(605), '10:05');
});
