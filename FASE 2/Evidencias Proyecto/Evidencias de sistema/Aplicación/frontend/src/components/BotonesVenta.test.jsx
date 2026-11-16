import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BotonesVenta } from './PanelVentas';

const plato = (categoria, preparacion) => ({
  id_menu_preparacion: categoria.length, componente: 'Plato Principal', categoria, preparacion, restante: 10,
  disponibilidad: 'disponible', precio: 3000,
});
const componentes = [plato('General', 'Pollo'), plato('JUNAEB', 'Cazuela'), plato('Vegetariano', 'Lentejas'), plato('Hipocalórico', 'Pescado')];

describe('BotonesVenta', () => {
  it('muestra Más opciones en todas las categorías menos JUNAEB', () => {
    render(<BotonesVenta componentes={componentes} onVender={() => {}} />);
    expect(screen.getAllByText('Más opciones')).toHaveLength(3);
    expect(screen.queryByRole('group', { name: 'Más opciones de JUNAEB' })).not.toBeInTheDocument();
  });

  it('tocar la categoría vende el combo y los botones pequeños el tipo elegido', async () => {
    const onVender = vi.fn();
    render(<BotonesVenta componentes={componentes} onVender={onVender} />);
    await userEvent.click(screen.getByRole('button', { name: /^JUNAEB/ }));
    expect(onVender).toHaveBeenLastCalledWith('JUNAEB', 'combo');
    await userEvent.click(screen.getByRole('button', { name: 'Solo plato de General' }));
    expect(onVender).toHaveBeenLastCalledWith('General', 'solo_plato');
    await userEvent.click(screen.getByRole('button', { name: 'Completo con bebida de máquina de Hipocalórico' }));
    expect(onVender).toHaveBeenLastCalledWith('Hipocalórico', 'completo_maquina');
  });
});
