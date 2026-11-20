import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  consultarJornadaHoy: vi.fn(), iniciarJornada: vi.fn(), cerrarJornada: vi.fn(), corregirCierre: vi.fn(),
  ajustarStock: vi.fn(), anularVenta: vi.fn(), consultarPrediccionHoy: vi.fn(), registrarVenta: vi.fn(),
}));
vi.mock('../utils/eventos', () => ({ suscribirCambios: vi.fn(() => () => {}) }));

import * as api from '../api/gestion';
import { suscribirCambios } from '../utils/eventos';
import KioscoPage from './KioscoPage';

const comp = (id, componente, categoria, preparacion, restante = 20, extra = {}) => ({
  id_menu_preparacion: id, componente, categoria, preparacion, restante, cantidad_planificada: 20, total_disponible: 20,
  vendidas: 20 - restante, disponibilidad: restante <= 0 ? 'agotado' : restante <= 6 ? 'baja_disponibilidad' : 'disponible', precio: 3500, ...extra,
});
const COMPONENTES = [
  comp(5, 'Postre', null, 'Flan'),
  comp(2, 'Plato Principal', 'JUNAEB', 'Arroz con pollo', 4),
  comp(1, 'Plato Principal', 'General', 'Pollo arvejado'),
  comp(6, 'Bebida', null, 'Jugo de naranja'),
];
const MENU = { id_menu: 1, publicado: true };
const ABIERTA = { menu: MENU, jornada: { estado: 'abierta', iniciada_en: '2026-11-20T12:00:00' }, componentes: COMPONENTES, composicion: {}, ventas_recientes: [] };

describe('KioscoPage: disponibilidad de la cocina', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.consultarPrediccionHoy.mockResolvedValue({ categorias: [{ categoria: 'General', estimacion: { hora: '13:40' } }] });
    ['iniciarJornada', 'cerrarJornada', 'corregirCierre', 'ajustarStock', 'anularVenta'].forEach((f) => api[f].mockResolvedValue({}));
  });
  afterEach(() => vi.restoreAllMocks());

  it('se suscribe al tiempo real y se desuscribe al salir', async () => {
    const baja = vi.fn();
    suscribirCambios.mockReturnValue(baja);
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    const { unmount } = render(<KioscoPage />);
    await screen.findByText(/Jornada abierta desde/);
    expect(suscribirCambios).toHaveBeenCalled();
    unmount();
    expect(baja).toHaveBeenCalled();
  });

  it('sin menú indica dónde cargarlo', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ menu: null, componentes: [] });
    render(<KioscoPage />);
    expect(await screen.findByText(/Cárgalo en Planificación del menú/)).toBeInTheDocument();
  });

  it('con el menú sin publicar el botón de iniciar queda deshabilitado', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ menu: { ...MENU, publicado: false }, jornada: null, componentes: COMPONENTES });
    render(<KioscoPage />);
    expect(await screen.findByRole('button', { name: 'Iniciar jornada' })).toBeDisabled();
  });

  it('ordena platos por categoría y luego acompañamientos, e inicia con lo que preparó la cocina', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ menu: MENU, jornada: null, componentes: COMPONENTES });
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await screen.findByText('Iniciar jornada', { selector: 'h2' });
    const filas = screen.getAllByText((_, el) => el?.classList?.contains('stock-fila')).map((f) => f.textContent);
    expect(filas[0]).toMatch(/General/);
    expect(filas[1]).toMatch(/JUNAEB/);
    expect(filas[2]).toMatch(/Postre/);
    const campoPollo = screen.getByText(/Pollo arvejado/).closest('label').querySelector('input');
    await usuario.clear(campoPollo);
    await usuario.type(campoPollo, '45');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar jornada' }));
    await waitFor(() => expect(api.iniciarJornada).toHaveBeenCalledWith({ 1: '45' }));
  });

  it('fija cuántas quedan de un plato y limpia el campo', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await usuario.click(await screen.findByText('Corregir cantidades o registrar reposición'));
    const campo = screen.getByLabelText('Cuántas quedan de Pollo arvejado');
    const fila = campo.closest('.stock-fila');
    expect(within(fila).getByRole('button', { name: 'Fijar' })).toBeDisabled();
    await usuario.type(campo, '7');
    await usuario.click(within(fila).getByRole('button', { name: 'Fijar' }));
    await waitFor(() => expect(api.ajustarStock).toHaveBeenCalledWith(1, { accion: 'quedan', cantidad: 7 }));
    expect(await screen.findByText('Cantidad actualizada.')).toBeInTheDocument();
    expect(campo).toHaveValue(null);
  });

  it('registra una reposición con la cantidad que indica la cocina', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    vi.spyOn(window, 'prompt').mockReturnValue('12');
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await usuario.click(await screen.findByText('Corregir cantidades o registrar reposición'));
    const fila = screen.getByLabelText('Cuántas quedan de Flan').closest('.stock-fila');
    await usuario.click(within(fila).getByRole('button', { name: 'Repuse…' }));
    await waitFor(() => expect(api.ajustarStock).toHaveBeenCalledWith(5, { accion: 'reposicion', cantidad: 12 }));
  });

  it('cancelar la reposición no registra nada', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await usuario.click(await screen.findByText('Corregir cantidades o registrar reposición'));
    await usuario.click(within(screen.getByLabelText('Cuántas quedan de Flan').closest('.stock-fila')).getByRole('button', { name: 'Repuse…' }));
    expect(api.ajustarStock).not.toHaveBeenCalled();
  });

  it('el cierre muestra la diferencia entre el conteo y el sistema, y envía los sobrantes', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar jornada' }));
    const fila = screen.getAllByText(/sistema: 4/)[0].closest('label');
    await usuario.type(fila.querySelector('input'), '1');
    expect(within(fila).getByText('-3')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    await waitFor(() => expect(api.cerrarJornada).toHaveBeenCalledWith({ 2: '1' }));
  });

  it('se puede volver a la jornada sin cerrar', async () => {
    api.consultarJornadaHoy.mockResolvedValue(ABIERTA);
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar jornada' }));
    await usuario.click(screen.getByRole('button', { name: 'Seguir en la jornada' }));
    expect(screen.getByText(/Jornada abierta desde/)).toBeInTheDocument();
    expect(api.cerrarJornada).not.toHaveBeenCalled();
  });

  it('con la jornada cerrada muestra la tabla final y permite corregir el conteo', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ ...ABIERTA, jornada: { estado: 'cerrada', cerrada_en: '2026-11-20T15:30:00', cierre_automatico: true }, componentes: [comp(1, 'Plato Principal', 'General', 'Pollo arvejado', 3, { ajuste_cierre: -2 })] });
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    expect(await screen.findByText(/cierre automático: sin conteo de sobrantes/)).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('-2')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Corregir conteo' }));
    expect(screen.queryByRole('button', { name: 'Corregir conteo' })).not.toBeInTheDocument();
  });

  it('si una acción falla muestra el motivo', async () => {
    api.consultarJornadaHoy.mockResolvedValue({ menu: MENU, jornada: null, componentes: COMPONENTES });
    api.iniciarJornada.mockRejectedValue(new Error('La jornada ya fue iniciada por otra persona.'));
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await usuario.click(await screen.findByRole('button', { name: 'Iniciar jornada' }));
    expect(await screen.findByText('La jornada ya fue iniciada por otra persona.')).toBeInTheDocument();
  });

  it('si no carga ofrece reintentar', async () => {
    api.consultarJornadaHoy.mockRejectedValueOnce(Object.assign(new Error('caído'), { estado: 503 })).mockResolvedValue(ABIERTA);
    const usuario = userEvent.setup();
    render(<KioscoPage />);
    await usuario.click(await screen.findByRole('button', { name: /Reintentar|Intentar/i }));
    expect(await screen.findByText(/Jornada abierta desde/)).toBeInTheDocument();
  });
});
