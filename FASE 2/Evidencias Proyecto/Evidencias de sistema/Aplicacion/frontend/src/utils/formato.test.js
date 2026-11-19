import { describe, it, expect } from 'vitest';
import {
  estadoEfectivo, NO_DISPONIBLE, calcularCaloriasTotales, calcularPrecioTotal, CATEGORIAS_MENU, colorTextoSobre,
  conGrupoOpcion, agruparComponentes, calcularCaloriasConOpcion,
} from './formato';

describe('estadoEfectivo', () => {
  it('una jornada cerrada deja todo cerrado', () => {
    expect(estadoEfectivo({ jornada_estado: 'cerrada', disponibilidad: 'disponible' })).toBe('cerrada');
  });

  it('un plato marcado agotado queda agotado', () => {
    expect(estadoEfectivo({ jornada_estado: 'abierta', disponibilidad: 'agotado', cantidad_restante: 10 })).toBe('agotado');
  });

  it('sin stock restante con la jornada abierta cuenta como agotado', () => {
    expect(estadoEfectivo({ jornada_estado: 'abierta', disponibilidad: 'disponible', cantidad_restante: 0 })).toBe('agotado');
  });

  it('con stock respeta la disponibilidad indicada', () => {
    expect(estadoEfectivo({ jornada_estado: 'abierta', disponibilidad: 'baja_disponibilidad', cantidad_restante: 4 })).toBe('baja_disponibilidad');
  });

  it('sin jornada iniciada avisa que aún no comienza, sin marcarlo como disponible', () => {
    expect(estadoEfectivo({ jornada_estado: null, disponibilidad: 'disponible', cantidad_restante: null })).toBe('sin_iniciar');
  });

  it('sin jornada iniciada, un plato marcado agotado sigue agotado', () => {
    expect(estadoEfectivo({ jornada_estado: null, disponibilidad: 'agotado', cantidad_restante: null })).toBe('agotado');
  });

  it('solo agotado y cerrada se muestran como no disponibles', () => {
    expect(NO_DISPONIBLE).toEqual(['agotado', 'cerrada']);
  });
});

describe('totales del combo', () => {
  it('suma las calorías cuando todos los componentes tienen información', () => {
    const componentes = [
      { informacion_nutricional: { calorias: 450 } },
      { informacion_nutricional: { calorias: 120 } },
    ];
    expect(calcularCaloriasTotales(componentes)).toBe(570);
  });

  it('no muestra un total parcial si a un componente le falta la información', () => {
    expect(calcularCaloriasTotales([{ informacion_nutricional: { calorias: 450 } }, { informacion_nutricional: null }])).toBeNull();
  });

  it('suma los precios tratando los vacíos como cero', () => {
    expect(calcularPrecioTotal([{ precio: 3500 }, { precio: null }, { precio: '500' }])).toBe(4000);
  });
});

describe('categorías', () => {
  it('mantiene el orden oficial del menú', () => {
    expect(CATEGORIAS_MENU).toEqual(['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico']);
  });
});

describe('colorTextoSobre', () => {
  it('usa texto oscuro sobre el naranja de la marca y blanco sobre colores oscuros', () => {
    expect(colorTextoSobre('#F5A623')).toBe('#1B1F27');
    expect(colorTextoSobre('#D11B1B')).toBe('#FFFFFF');
    expect(colorTextoSobre('#3C7424')).toBe('#FFFFFF');
  });
});

const PREPARACIONES_DIA = [
  { componente: 'Plato Principal', informacion_nutricional: { calorias: 450 } },
  { componente: 'Ensalada',        informacion_nutricional: { calorias: 80 } },
  { componente: 'Sopa',            informacion_nutricional: { calorias: 120 } },
  { componente: 'Pan',             informacion_nutricional: { calorias: 70 } },
  { componente: 'Postre',          informacion_nutricional: { calorias: 250 } },
  { componente: 'Fruta',           informacion_nutricional: { calorias: 80 } },
  { componente: 'Bebida',          informacion_nutricional: { calorias: 110 } },
];

const COMPOSICION_PRINCIPAL = [
  { tipo: 'Bebida',          grupo_opcion: null },
  { tipo: 'Ensalada',        grupo_opcion: null },
  { tipo: 'Fruta',           grupo_opcion: 1 },
  { tipo: 'Pan',             grupo_opcion: null },
  { tipo: 'Plato Principal', grupo_opcion: null },
  { tipo: 'Postre',          grupo_opcion: 1 },
  { tipo: 'Sopa',            grupo_opcion: null },
];

describe('conGrupoOpcion', () => {
  it('anota cada componente con su grupo_opcion según la composición de la categoría', () => {
    const anotados = conGrupoOpcion(PREPARACIONES_DIA, COMPOSICION_PRINCIPAL);
    expect(anotados.find((c) => c.componente === 'Postre').grupo_opcion).toBe(1);
    expect(anotados.find((c) => c.componente === 'Fruta').grupo_opcion).toBe(1);
    expect(anotados.find((c) => c.componente === 'Ensalada').grupo_opcion).toBeNull();
  });

  it('deja grupo_opcion en null cuando el componente no está en la composición', () => {
    const anotados = conGrupoOpcion(PREPARACIONES_DIA, []);
    expect(anotados.every((c) => c.grupo_opcion === null)).toBe(true);
  });

  it('no muta los componentes originales', () => {
    const original = { componente: 'Postre', informacion_nutricional: { calorias: 250 } };
    const anotados = conGrupoOpcion([original], COMPOSICION_PRINCIPAL);
    expect(original).not.toHaveProperty('grupo_opcion');
    expect(anotados[0].grupo_opcion).toBe(1);
  });
});

describe('agruparComponentes', () => {
  it('separa base y grupos mutuamente excluyentes', () => {
    const anotados = conGrupoOpcion(PREPARACIONES_DIA, COMPOSICION_PRINCIPAL);
    const { base, grupos } = agruparComponentes(anotados);
    expect(base.map((c) => c.componente).sort()).toEqual(
      ['Bebida', 'Ensalada', 'Pan', 'Plato Principal', 'Sopa']
    );
    expect(grupos[1].map((c) => c.componente).sort()).toEqual(['Fruta', 'Postre']);
  });

  it('sin grupos devuelve todo en base', () => {
    const soloBase = PREPARACIONES_DIA.filter((c) => c.componente !== 'Postre' && c.componente !== 'Fruta')
      .map((c) => ({ ...c, grupo_opcion: null }));
    const { base, grupos } = agruparComponentes(soloBase);
    expect(base).toHaveLength(5);
    expect(Object.keys(grupos)).toHaveLength(0);
  });
});

describe('calcularCaloriasConOpcion', () => {
  it('suma la base + la opción elegida (postre)', () => {
    const anotados = conGrupoOpcion(PREPARACIONES_DIA, COMPOSICION_PRINCIPAL);
    expect(calcularCaloriasConOpcion(anotados, { 1: 'Postre' })).toBe(1080);
  });

  it('suma la base + la opción elegida (fruta)', () => {
    const anotados = conGrupoOpcion(PREPARACIONES_DIA, COMPOSICION_PRINCIPAL);
    expect(calcularCaloriasConOpcion(anotados, { 1: 'Fruta' })).toBe(910);
  });

  it('sin opción elegida usa la primera del grupo (orden natural)', () => {
    const anotados = conGrupoOpcion(PREPARACIONES_DIA, COMPOSICION_PRINCIPAL);
    expect(calcularCaloriasConOpcion(anotados, {})).toBe(1080);
  });

  it('devuelve null si algún componente no tiene info nutricional (regla todo o nada)', () => {
    const conFaltante = PREPARACIONES_DIA.map((c) =>
      c.componente === 'Sopa' ? { componente: 'Sopa', informacion_nutricional: null } : c
    );
    const anotados = conGrupoOpcion(conFaltante, COMPOSICION_PRINCIPAL);
    expect(calcularCaloriasConOpcion(anotados, { 1: 'Postre' })).toBeNull();
  });

  it('funciona con JUNAEB: sin grupos, solo base', () => {
    const junaeb = [
      { componente: 'Plato Principal', informacion_nutricional: { calorias: 450 } },
      { componente: 'Bebida',          informacion_nutricional: { calorias: 110 } },
    ].map((c) => ({ ...c, grupo_opcion: null }));
    expect(calcularCaloriasConOpcion(junaeb, {})).toBe(560);
  });

  it('funciona con Hipocalórico: fruta como único del grupo', () => {
    const hipo = [
      { componente: 'Plato Principal', informacion_nutricional: { calorias: 350 }, grupo_opcion: null },
      { componente: 'Ensalada',        informacion_nutricional: { calorias: 80 },  grupo_opcion: null },
      { componente: 'Sopa',            informacion_nutricional: { calorias: 120 }, grupo_opcion: null },
      { componente: 'Fruta',           informacion_nutricional: { calorias: 80 },  grupo_opcion: null },
      { componente: 'Bebida',          informacion_nutricional: { calorias: 0 },   grupo_opcion: null },
    ];
    expect(calcularCaloriasConOpcion(hipo, {})).toBe(630);
  });
});
