import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/menu', () => ({ obtenerMenuHoy: vi.fn(), obtenerHistorialMenu: vi.fn() }));
vi.mock('../utils/eventos', () => ({ suscribirCambios: () => () => {} }));
vi.mock('../components/Sidebar', () => ({ default: () => null }));
vi.mock('../components/PerfilEstudianteModal', () => ({ default: () => null }));

import { obtenerMenuHoy, obtenerHistorialMenu } from '../api/menu';
import ConfirmacionProvider from '../context/ConfirmacionProvider';
import VistaPublica from './VistaPublica';

const montar = () => render(<ConfirmacionProvider><VistaPublica /></ConfirmacionProvider>);

const plato = (extra) => ({
  id_menu_preparacion: 1, id_preparacion: 1, nombre: 'Charquicán con huevo', componente: 'Plato Principal', categoria: 'General',
  precio: 4800, disponibilidad: 'disponible', ingredientes: [], alergenos: [], informacion_nutricional: null, ...extra,
});

describe('VistaPublica - avisos de la jornada', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    obtenerHistorialMenu.mockResolvedValue({ menus: [], composicion: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('el fin de semana sin menú invita a revisar el menú semanal', async () => {
    vi.setSystemTime(new Date('2026-11-21T10:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({ fecha: '2026-11-21', preparaciones: [], composicion: {} });
    montar();
    expect(await screen.findByText('Los fines de semana no hay menú disponible')).toBeInTheDocument();
    expect(screen.queryByText(/Todavía no hay un menú publicado/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver menú semanal' }));
    expect(obtenerHistorialMenu).toHaveBeenCalled();
  });

  it('un día hábil sin menú mantiene el mensaje de siempre', async () => {
    vi.setSystemTime(new Date('2026-11-23T10:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({ fecha: '2026-11-23', preparaciones: [], composicion: {} });
    montar();
    expect(await screen.findByText(/Todavía no hay un menú publicado/)).toBeInTheDocument();
    expect(screen.queryByText('Los fines de semana no hay menú disponible')).not.toBeInTheDocument();
  });

  it('con la jornada cerrada avisa que terminó y sigue mostrando el menú', async () => {
    vi.setSystemTime(new Date('2026-11-23T16:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({
      fecha: '2026-11-23', composicion: {},
      preparaciones: [plato({ jornada_estado: 'cerrada', cantidad_restante: 3 })],
    });
    montar();
    expect(await screen.findByText('La jornada de almuerzos de hoy ya cerró')).toBeInTheDocument();
    expect(screen.getByText('Charquicán con huevo')).toBeInTheDocument();
  });

  it('antes de iniciar la jornada no muestra el aviso de cierre', async () => {
    vi.setSystemTime(new Date('2026-11-23T09:00:00-03:00'));
    obtenerMenuHoy.mockResolvedValue({
      fecha: '2026-11-23', composicion: {},
      preparaciones: [plato({ jornada_estado: null, cantidad_restante: null })],
    });
    montar();
    expect(await screen.findAllByText('Aún no inicia la jornada')).not.toHaveLength(0);
    expect(screen.queryByText('La jornada de almuerzos de hoy ya cerró')).not.toBeInTheDocument();
  });
});
