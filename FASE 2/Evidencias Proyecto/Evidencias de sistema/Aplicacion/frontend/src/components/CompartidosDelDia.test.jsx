import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompartidosDelDia } from './PanelVentas';

const base = { cantidad_planificada: 10, disponibilidad: 'disponible', total_disponible: 10 };
const componentes = [
  { ...base, id_menu_preparacion: 1, componente: 'Sopa', categoria: null, preparacion: 'Crema de zapallo', restante: 8 },
  { ...base, id_menu_preparacion: 2, componente: 'Bebida', categoria: 'JUNAEB', preparacion: 'Agua mineral', restante: 5 },
  { ...base, id_menu_preparacion: 3, componente: 'Plato Principal', categoria: 'JUNAEB', preparacion: 'Pollo', restante: 5 },
];

describe('CompartidosDelDia', () => {
  it('muestra los acompañamientos especiales de una categoría junto a los compartidos', () => {
    render(<CompartidosDelDia componentes={componentes} composicion={{ General: [{ tipo: 'Sopa' }] }} />);
    expect(screen.getByText('Crema de zapallo')).toBeInTheDocument();
    expect(screen.getByText('Agua mineral')).toBeInTheDocument();
    expect(screen.getByText('Especial para: JUNAEB')).toBeInTheDocument();
    expect(screen.queryByText('Pollo')).not.toBeInTheDocument();
  });
});
