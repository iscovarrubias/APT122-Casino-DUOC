import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoriaTabs from './CategoriaTabs';

describe('CategoriaTabs', () => {
  it('muestra las cuatro categorías', () => {
    render(<CategoriaTabs categoriaActiva="Principal" onSeleccionar={() => {}} />);
    for (const nombre of ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument();
    }
  });

  it('avisa qué categoría se eligió', async () => {
    const alElegir = vi.fn();
    render(<CategoriaTabs categoriaActiva="Principal" onSeleccionar={alElegir} />);
    await userEvent.click(screen.getByRole('button', { name: 'JUNAEB' }));
    expect(alElegir).toHaveBeenCalledWith('JUNAEB');
  });

  it('marca como agotada una categoría sin disponibilidad y sigue siendo elegible', async () => {
    const alElegir = vi.fn();
    render(<CategoriaTabs categoriaActiva="Principal" onSeleccionar={alElegir} estados={{ Vegetariano: 'agotado', JUNAEB: 'cerrada' }} />);
    const agotada = screen.getByRole('button', { name: 'Vegetariano (agotado)' });
    expect(agotada).toHaveClass('tab-agotada');
    expect(screen.getByRole('button', { name: 'JUNAEB (cerrado)' })).toHaveClass('tab-agotada');
    expect(screen.getByRole('button', { name: 'Principal' })).not.toHaveClass('tab-agotada');
    await userEvent.click(agotada);
    expect(alElegir).toHaveBeenCalledWith('Vegetariano');
  });
});
