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
});