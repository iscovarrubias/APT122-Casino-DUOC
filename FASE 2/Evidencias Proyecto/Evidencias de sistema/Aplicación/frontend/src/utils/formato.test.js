import { describe, it, expect } from 'vitest';
import { estadoEfectivo, NO_DISPONIBLE, calcularCaloriasTotales, calcularPrecioTotal, CATEGORIAS_MENU, colorTextoSobre } from './formato';

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
    expect(CATEGORIAS_MENU).toEqual(['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico']);
  });
});

describe('colorTextoSobre', () => {
  it('usa texto oscuro sobre el naranja de la marca y blanco sobre colores oscuros', () => {
    expect(colorTextoSobre('#F5A623')).toBe('#1B1F27');
    expect(colorTextoSobre('#D11B1B')).toBe('#FFFFFF');
    expect(colorTextoSobre('#3C7424')).toBe('#FFFFFF');
  });
});
