import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CorreccionCierre from './CorreccionCierre';

const componentes = [
  { id_menu_preparacion: 1, componente: 'Plato Principal', categoria: 'General', preparacion: 'Pollo', restante: 10 },
  { id_menu_preparacion: 2, componente: 'Sopa', categoria: null, preparacion: 'Crema', restante: 4 },
];

describe('CorreccionCierre', () => {
  it('no permite guardar sin cambios', () => {
    render(<CorreccionCierre componentes={componentes} ocupado={false} onGuardar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Guardar corrección' })).toBeDisabled();
  });

  it('envía solo los componentes corregidos', async () => {
    const onGuardar = vi.fn();
    render(<CorreccionCierre componentes={componentes} ocupado={false} onGuardar={onGuardar} onCancelar={() => {}} />);
    const entrada = screen.getByLabelText('Cantidad real de Pollo');
    await userEvent.clear(entrada);
    await userEvent.type(entrada, '5');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }));
    expect(onGuardar).toHaveBeenCalledWith({ 1: 5 });
  });
});
