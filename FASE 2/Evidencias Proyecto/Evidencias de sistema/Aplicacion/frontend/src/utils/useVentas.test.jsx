import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({ registrarVenta: vi.fn() }));

import { registrarVenta } from '../api/gestion';
import { useVentas } from './useVentas';
import { resolverOpcionVenta } from './opciones';

const COMPOSICION = {
  General: [
    { tipo: 'Postre', grupo_opcion: 1 },
    { tipo: 'Fruta', grupo_opcion: 1 },
    { tipo: 'Bebida', grupo_opcion: null },
  ],
  JUNAEB: [{ tipo: 'Bebida', grupo_opcion: null }],
};
const COMPONENTES = [
  { componente: 'Postre', preparacion: 'Flan', restante: 10, disponibilidad: 'disponible' },
  { componente: 'Fruta', preparacion: 'Manzana', restante: 10, disponibilidad: 'disponible' },
];

function Caja({ estado, cargar, setError, setAviso }) {
  const { vender, modales } = useVentas({ estado, cargar, setError, setAviso });
  return (
    <>
      <button type="button" onClick={() => vender('General')}>
        General
      </button>
      <button type="button" onClick={() => vender('General', 'solo_plato')}>
        General solo plato
      </button>
      <button type="button" onClick={() => vender('JUNAEB')}>
        JUNAEB
      </button>
      <button type="button" onClick={() => vender('JUNAEB', 'solo_plato')}>
        JUNAEB solo plato
      </button>
      {modales}
    </>
  );
}

describe('useVentas: flujo de la caja', () => {
  let props;
  beforeEach(() => {
    vi.clearAllMocks();
    registrarVenta.mockResolvedValue({});
    props = { estado: { composicion: COMPOSICION, componentes: COMPONENTES }, cargar: vi.fn(), setError: vi.fn(), setAviso: vi.fn() };
  });

  it('si hay postre y fruta pregunta qué eligió el estudiante antes de vender', async () => {
    const usuario = userEvent.setup();
    render(<Caja {...props} />);
    await usuario.click(screen.getByText('General'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(registrarVenta).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole('button', { name: /Fruta/ }));
    expect(registrarVenta).toHaveBeenCalledWith('General', 'Fruta', 'combo');
    await waitFor(() => expect(props.setAviso).toHaveBeenCalledWith('General - Fruta registrado'));
    expect(props.cargar).toHaveBeenCalled();
  });

  it('cancelar la pregunta no registra ninguna venta', async () => {
    const usuario = userEvent.setup();
    render(<Caja {...props} />);
    await usuario.click(screen.getByText('General'));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(registrarVenta).not.toHaveBeenCalled();
  });

  it('si el postre se agotó vende con fruta sin preguntar', async () => {
    props.estado.componentes = [{ ...COMPONENTES[0], restante: 0 }, COMPONENTES[1]];
    const usuario = userEvent.setup();
    render(<Caja {...props} />);
    await usuario.click(screen.getByText('General'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(registrarVenta).toHaveBeenCalledWith('General', 'Fruta', 'combo');
  });

  it('solo plato no pregunta por acompañamientos', async () => {
    const usuario = userEvent.setup();
    render(<Caja {...props} />);
    await usuario.click(screen.getByText('General solo plato'));
    expect(registrarVenta).toHaveBeenCalledWith('General', null, 'solo_plato');
    await waitFor(() => expect(props.setAviso).toHaveBeenCalledWith('General - Solo plato registrado'));
  });

  it('JUNAEB no se puede vender como solo plato', async () => {
    const usuario = userEvent.setup();
    render(<Caja {...props} />);
    await usuario.click(screen.getByText('JUNAEB solo plato'));
    expect(registrarVenta).not.toHaveBeenCalled();
  });

  it('un doble toque accidental registra una sola venta', async () => {
    const usuario = userEvent.setup();
    render(<Caja {...props} />);
    await usuario.dblClick(screen.getByText('JUNAEB'));
    await waitFor(() => expect(registrarVenta).toHaveBeenCalledTimes(1));
  });

  it('si la venta falla muestra el motivo y no da aviso de éxito', async () => {
    registrarVenta.mockRejectedValue(new Error('No hay una jornada abierta. Inicia la jornada primero.'));
    const usuario = userEvent.setup();
    render(<Caja {...props} />);
    await usuario.click(screen.getByText('JUNAEB'));
    await waitFor(() => expect(props.setError).toHaveBeenCalledWith('No hay una jornada abierta. Inicia la jornada primero.'));
    expect(props.setAviso).not.toHaveBeenCalled();
  });
});

describe('resolverOpcionVenta', () => {
  const comp = (componente, restante = 5, disponibilidad = 'disponible') => ({ componente, restante, disponibilidad });

  it('sin grupos de opción no hay nada que elegir', () => {
    expect(resolverOpcionVenta(COMPOSICION.JUNAEB, [comp('Bebida')])).toBe(null);
    expect(resolverOpcionVenta(null, [])).toBe(null);
  });

  it('con dos opciones disponibles hay que elegir', () => {
    expect(resolverOpcionVenta(COMPOSICION.General, [comp('Postre'), comp('Fruta')])).toEqual({ opciones: ['Postre', 'Fruta'] });
  });

  it('una opción agotada por estado o por stock se descarta', () => {
    expect(resolverOpcionVenta(COMPOSICION.General, [comp('Postre', 5, 'agotado'), comp('Fruta')])).toEqual({
      opcion: 'Fruta',
      auto: true,
    });
    expect(resolverOpcionVenta(COMPOSICION.General, [comp('Postre', -1), comp('Fruta')])).toEqual({ opcion: 'Fruta', auto: true });
  });

  it('si el menú del día solo trae una de las opciones se usa esa', () => {
    expect(resolverOpcionVenta(COMPOSICION.General, [comp('Postre')])).toEqual({ opcion: 'Postre', auto: true });
  });

  it('si ambas están agotadas igual vende la primera para no frenar la fila (se corrige en el cierre)', () => {
    expect(resolverOpcionVenta(COMPOSICION.General, [comp('Postre', 0), comp('Fruta', 0)])).toEqual({ opcion: 'Postre', auto: true });
  });

  it('si el menú no trae ninguna de las opciones no inventa una', () => {
    expect(resolverOpcionVenta(COMPOSICION.General, [comp('Bebida')])).toBe(null);
  });
});
