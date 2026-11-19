import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import MenuPrincipal from './MenuPrincipal';

const item = (componente, nombre, calorias, extra = {}) => ({
  id_menu_preparacion: nombre, id_preparacion: nombre, nombre, componente, categoria: null,
  precio: 0, disponibilidad: 'disponible', ingredientes: [], alergenos: [],
  informacion_nutricional: calorias == null ? null : { calorias, proteinas_g: 1, carbohidratos_g: 1, grasas_g: 1 },
  ...extra,
});

const regla = (tipo, grupo_opcion = null) => ({ tipo, grupo_opcion });

const DIA = [
  item('Plato Principal', 'Lentejas', 400, { categoria: 'JUNAEB', precio: 2350 }),
  item('Ensalada', 'Ensalada chilena', 80),
  item('Sopa', 'Sopa de verduras', 120),
  item('Postre', 'Flan', null, { alergenos: ['Lácteos'] }),
  item('Fruta', 'Manzana', 80),
  item('Bebida', 'Jugo', 110),
];

const montar = (categoria, componentes, composicion) =>
  render(
    <ConfirmacionProvider>
      <MenuPrincipal categoria={categoria} componentes={componentes} composicionDeCategoria={composicion} />
    </ConfirmacionProvider>
  );

describe('MenuPrincipal', () => {
  it('suma solo lo que incluye la categoría', () => {
    montar('JUNAEB', DIA, [regla('Bebida')]);
    expect(screen.getByText('510 kcal')).toBeInTheDocument();
  });

  it('no muestra componentes que la categoría no incluye', () => {
    montar('JUNAEB', DIA, [regla('Bebida')]);
    expect(screen.queryByText('Ensalada chilena')).not.toBeInTheDocument();
    expect(screen.queryByText('Flan')).not.toBeInTheDocument();
  });

  it('antes de iniciar la jornada avisa en vez de decir "Disponible" y no muestra porciones', () => {
    const sinJornada = DIA.map((c) => ({ ...c, jornada_estado: null, cantidad_restante: null }));
    montar('JUNAEB', sinJornada, [regla('Bebida')]);
    expect(screen.getAllByText('Aún no inicia la jornada').length).toBeGreaterThan(0);
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument();
    expect(screen.queryByText(/Quedan/)).not.toBeInTheDocument();
  });

  it('con la jornada abierta muestra disponible y las porciones que quedan', () => {
    const abierta = DIA.map((c) => ({ ...c, jornada_estado: 'abierta', cantidad_restante: 30, stock_actualizado_en: '2026-11-19T12:05:00' }));
    montar('JUNAEB', abierta, [regla('Bebida')]);
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0);
    expect(screen.queryByText('Aún no inicia la jornada')).not.toBeInTheDocument();
  });
});
