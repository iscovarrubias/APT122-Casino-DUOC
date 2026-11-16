import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResumenCierre from './ResumenCierre';

const comp = (extra) => ({
  id_menu_preparacion: extra.preparacion, componente: 'Plato Principal', categoria: 'General',
  disponibilidad: 'disponible', disponibilidad_actualizada_en: null, restante: 5, ...extra,
});

describe('ResumenCierre', () => {
  it('indica cuántas unidades quedaron de un plato', () => {
    render(<ResumenCierre componentes={[comp({ preparacion: 'Pollo', restante: 5 })]} />);
    expect(screen.getByText('Quedaron 5 unidades')).toBeInTheDocument();
  });

  it('usa el singular cuando queda una unidad', () => {
    render(<ResumenCierre componentes={[comp({ preparacion: 'Pollo', restante: 1 })]} />);
    expect(screen.getByText('Quedaron 1 unidad')).toBeInTheDocument();
  });

  it('indica que se agotó y a qué hora', () => {
    render(<ResumenCierre componentes={[comp({
      preparacion: 'Pollo', restante: 0, disponibilidad: 'agotado', disponibilidad_actualizada_en: '2026-11-13T13:42:00',
    })]} />);
    expect(screen.getByText('Se agotó a las 13:42')).toBeInTheDocument();
  });

  it('avisa cuando se vendió por sobre lo registrado', () => {
    render(<ResumenCierre componentes={[comp({ preparacion: 'Pollo', restante: -2, disponibilidad: 'agotado' })]} />);
    expect(screen.getByText(/2 sobre lo registrado/)).toBeInTheDocument();
  });

  it('separa platos y acompañamientos', () => {
    render(<ResumenCierre componentes={[
      comp({ preparacion: 'Pollo' }),
      comp({ preparacion: 'Ensalada chilena', componente: 'Ensalada', categoria: null, restante: 12 }),
    ]} />);
    expect(screen.getByText('Platos')).toBeInTheDocument();
    expect(screen.getByText('Acompañamientos')).toBeInTheDocument();
    expect(screen.getByText('Quedaron 12 unidades')).toBeInTheDocument();
  });
});
