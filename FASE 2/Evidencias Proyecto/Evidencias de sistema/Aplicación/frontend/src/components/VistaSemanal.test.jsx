import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../api/menu', () => ({ obtenerHistorialMenu: vi.fn() }));

import { obtenerHistorialMenu } from '../api/menu';
import VistaSemanal from './VistaSemanal';

const componente = (preparacion, extra = {}) => ({
  componente: 'Plato Principal', categoria: 'Principal', preparacion,
  disponibilidad: 'disponible', jornada_estado: 'abierta', cantidad_restante: 20, ...extra,
});

describe('VistaSemanal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00-03:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('marca como agotado un plato de hoy sin disponibilidad', async () => {
    obtenerHistorialMenu.mockResolvedValue({
      menus: [{
        fecha: '2026-10-29',
        componentes: [
          componente('Arroz con pollo'),
          componente('Cazuela de vacuno', { categoria: 'Vegetariano', disponibilidad: 'agotado' }),
        ],
      }],
    });
    render(<VistaSemanal />);
    const plato = await screen.findByText('Cazuela de vacuno');
    expect(plato.closest('li')).toHaveClass('no-disponible');
    expect(screen.getByText('Agotado')).toBeInTheDocument();
    expect(screen.getByText('Arroz con pollo').closest('li')).not.toHaveClass('no-disponible');
  });

  it('muestra todo como cerrado cuando la jornada de hoy terminó', async () => {
    obtenerHistorialMenu.mockResolvedValue({
      menus: [{ fecha: '2026-10-29', componentes: [componente('Arroz con pollo', { jornada_estado: 'cerrada' })] }],
    });
    render(<VistaSemanal />);
    await screen.findByText('Arroz con pollo');
    expect(screen.getByText('Cerrado')).toBeInTheDocument();
  });

  it('no marca como agotado un día que no es hoy', async () => {
    obtenerHistorialMenu.mockResolvedValue({
      menus: [
        { fecha: '2026-10-29', componentes: [componente('Arroz con pollo')] },
        { fecha: '2026-10-28', componentes: [componente('Pastel de choclo', { jornada_estado: 'cerrada' })] },
      ],
    });
    render(<VistaSemanal />);
    await screen.findByText('Arroz con pollo');
    expect(screen.queryByText('Cerrado')).not.toBeInTheDocument();
  });

  it('informa cuando no se pudo cargar el menú semanal', async () => {
    obtenerHistorialMenu.mockRejectedValue(new Error('sin conexión'));
    render(<VistaSemanal />);
    expect(await screen.findByText(/No se pudo cargar el menú semanal/)).toBeInTheDocument();
  });
});
