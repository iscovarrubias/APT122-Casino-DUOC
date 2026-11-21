import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/menu', () => ({ obtenerHistorialMenu: vi.fn() }));

import { obtenerHistorialMenu } from '../api/menu';
import VistaSemanal from './VistaSemanal';

const comp = (componente, preparacion, categoria = null) => ({ componente, preparacion, categoria });
const regla = (tipo, grupo_opcion = null) => ({ tipo, grupo_opcion });

const COMPOSICION = {
  General: [regla('Ensalada'), regla('Sopa'), regla('Bebida'), regla('Postre', 1), regla('Fruta', 1)],
  JUNAEB: [regla('Bebida')],
};

const COMPONENTES = [
  comp('Plato Principal', 'Arroz con pollo', 'General'),
  comp('Plato Principal', 'Lentejas con arroz', 'JUNAEB'),
  comp('Ensalada', 'Ensalada chilena'),
  comp('Sopa', 'Sopa de verduras'),
  comp('Postre', 'Flan de caramelo'),
  comp('Fruta', 'Manzana'),
  comp('Bebida', 'Jugo de naranja'),
];

describe('VistaSemanal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00-03:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('muestra el plato de fondo de cada menú del día actual', async () => {
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-10-29', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    expect(await screen.findByText('Arroz con pollo')).toBeInTheDocument();
    expect(screen.getByText('Lentejas con arroz')).toBeInTheDocument();
    expect(screen.getByText('2 menús')).toBeInTheDocument();
  });

  it('aplica la composición de cada menú', async () => {
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-10-29', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    await screen.findByText('Arroz con pollo');
    expect(screen.getAllByText('Ensalada chilena')).toHaveLength(1);
    expect(screen.getAllByText('Jugo de naranja')).toHaveLength(2);
  });

  it('une postre y fruta en una sola celda', async () => {
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-10-29', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    expect(await screen.findByText('Flan de caramelo o Manzana')).toBeInTheDocument();
  });

  it('oculta la fila de pan si ningún menú lo incluye', async () => {
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-10-29', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    await screen.findByText('Arroz con pollo');
    expect(screen.queryByRole('rowheader', { name: 'Pan' })).not.toBeInTheDocument();
  });

  it('muestra la fila de pan cuando un menú lo incluye', async () => {
    obtenerHistorialMenu.mockResolvedValue({
      menus: [{ fecha: '2026-10-29', componentes: [...COMPONENTES, comp('Pan', 'Pan amasado')] }],
      composicion: { ...COMPOSICION, General: [...COMPOSICION.General, regla('Pan')] },
    });
    render(<VistaSemanal />);
    expect(await screen.findByRole('rowheader', { name: 'Pan' })).toBeInTheDocument();
    expect(screen.getByText('Pan amasado')).toBeInTheDocument();
  });

  it('no muestra etiquetas de agotado en la vista semanal', async () => {
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-10-29', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    await screen.findByText('Arroz con pollo');
    expect(screen.queryByText(/Agotado/)).not.toBeInTheDocument();
  });

  it('indica los días sin menú publicado', async () => {
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-10-29', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    await screen.findByText('Arroz con pollo');
    expect(screen.getAllByText('Sin menú')).toHaveLength(4);
  });

  it('permite cerrar el día actual', async () => {
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-10-29', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    await screen.findByText('Arroz con pollo');
    await userEvent.click(screen.getByRole('button', { name: /Jueves/ }));
    expect(screen.queryByText('Arroz con pollo')).not.toBeInTheDocument();
  });

  it('informa cuando no se pudo cargar el menú semanal', async () => {
    const err = Object.assign(new Error('sin conexión'), { estado: 0 });
    obtenerHistorialMenu.mockRejectedValue(err);
    render(<VistaSemanal />);
    expect(await screen.findByText(/No pudimos conectar con el servidor/)).toBeInTheDocument();
  });

  it('el fin de semana muestra la semana siguiente y abre el primer día con menú', async () => {
    vi.setSystemTime(new Date('2026-10-31T15:00:00-03:00'));
    obtenerHistorialMenu.mockResolvedValue({ menus: [{ fecha: '2026-11-02', componentes: COMPONENTES }], composicion: COMPOSICION });
    render(<VistaSemanal />);
    expect(await screen.findByText('Arroz con pollo')).toBeInTheDocument();
    expect(obtenerHistorialMenu).toHaveBeenCalledWith('2026-11-02', '2026-11-07');
  });
});
