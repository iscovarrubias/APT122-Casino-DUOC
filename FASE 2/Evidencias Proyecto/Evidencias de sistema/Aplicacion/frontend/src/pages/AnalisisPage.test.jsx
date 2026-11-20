import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/gestion', () => ({
  consultarAnalisisDetalle: vi.fn(), consultarPrediccionHoy: vi.fn(), consultarConfiabilidad: vi.fn(), consultarMensual: vi.fn(),
  consultarOpiniones: vi.fn(), consultarOpinionesDetalle: vi.fn(), consultarFavoritosDetalle: vi.fn(),
}));
vi.mock('../utils/eventos', () => ({ suscribirCambios: vi.fn(() => () => {}) }));
vi.mock('../components/ExportarAnalisis', () => ({
  default: ({ tipo, desdeInicial, hastaInicial, onCerrar }) => (
    <div role="dialog" aria-label="Exportar">{`exportar ${tipo} ${desdeInicial} ${hastaInicial}`}<button type="button" onClick={onCerrar}>Cerrar exportar</button></div>
  ),
}));

import * as api from '../api/gestion';
import AnalisisPage from './AnalisisPage';

const cat = (categoria, extra) => ({ categoria, es_principal: true, dias: 5, precio_promedio: 3500, vendidas: 400, planificadas: 500, porcentaje_consumo: 80, dias_agotado: 1, porcentaje_agotado: 20, hora_agotamiento: '13:40', ritmo_hora: 100, ...extra });
const DETALLE = {
  por_categoria: [cat('General', { ritmo_hora: 180, precio_promedio: 3000 }), cat('JUNAEB', { ritmo_hora: 90, precio_promedio: 3500, porcentaje_agotado: 95 }), { categoria: 'Postre', es_principal: false, vendidas: 10, planificadas: 20 }],
  preparaciones: [
    { id_preparacion: 7, nombre: 'Pollo arvejado', componente: 'Plato Principal', dias: 3, vendidas: 300, planificadas: 320, porcentaje_consumo: 94, dias_agotado: 2, hora_agotamiento: '13:20', ritmo_hora: 150 },
    { id_preparacion: 8, nombre: 'Flan', componente: 'Postre', dias: 5, vendidas: 200, planificadas: 250, porcentaje_consumo: 80, dias_agotado: 0, hora_agotamiento: null, ritmo_hora: 60 },
  ],
  ventas_por_hora: [{ hora: 12, unidades: 300 }, { hora: 13, unidades: 500 }],
  por_dia: [{ fecha: '2026-11-16', categoria: 'General', vendidas: 100, planificadas: 110, precio: 3000, hora_agotado: '13:30' }],
};
const SIN_DATOS = { por_categoria: [], preparaciones: [{ id_preparacion: 1, nombre: 'X', vendidas: 0, dias_agotado: 0 }], ventas_por_hora: [], por_dia: [] };

describe('AnalisisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.consultarAnalisisDetalle.mockImplementation(async (d, h, filtro) => (filtro?.id_preparacion
      ? { ...DETALLE, por_categoria: [cat('General', { ritmo_hora: 200 }), cat('Vegetariano', { ritmo_hora: 100 })] }
      : DETALLE));
  });

  it('muestra los indicadores del período, el hallazgo y la tabla de menús', async () => {
    render(<AnalisisPage />);
    expect(await screen.findByText('800')).toBeInTheDocument();
    expect(screen.getByText('de 1.000 planificados')).toBeInTheDocument();
    expect(screen.getByText('Consumo', { selector: '.kpi span' }).closest('.kpi')).toHaveTextContent('80 %');
    expect(screen.getByText(/se vende más rápido como General a \$3\.000 \(180 u\/h\) que como JUNAEB/)).toBeInTheDocument();
    expect(screen.getByText(/La categoría que rota más rápido es también la más barata/)).toBeInTheDocument();
    expect(screen.getByText(/como JUNAEB se agotó el 95 % de los días/)).toBeInTheDocument();
    expect(screen.getByText('13:00')).toBeInTheDocument();
  });

  it('filtrar por categoría pide el detalle de esa categoría', async () => {
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await screen.findByText('Comparación entre menús');
    await usuario.click(within(screen.getByRole('group', { name: 'Categoría' })).getByRole('button', { name: /Vegetariano/ }));
    await waitFor(() => expect(api.consultarAnalisisDetalle).toHaveBeenCalledWith(expect.any(String), expect.any(String), { categoria: 'Vegetariano' }));
    expect(await screen.findByText('Ventas por hora - Vegetariano')).toBeInTheDocument();
  });

  it('tocar una preparación la analiza por categoría y permite ir a sus opiniones', async () => {
    api.consultarOpiniones.mockResolvedValue({ promedios: [], favoritos: [] });
    api.consultarOpinionesDetalle.mockResolvedValue({ opiniones: [], preparaciones: [{ id_preparacion: 7, nombre: 'Pollo arvejado', total: 2 }], resumen: { total: 0, con_comentario: 0, promedio_vigentes: null, eliminadas: 0, editadas: 0 } });
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await usuario.click(await screen.findByRole('button', { name: 'Pollo arvejado' }));
    expect(await screen.findByRole('heading', { name: 'Pollo arvejado' })).toBeInTheDocument();
    expect(api.consultarAnalisisDetalle).toHaveBeenCalledWith(expect.any(String), expect.any(String), { id_preparacion: '7' });
    expect(screen.getByText('Cómo se vendió en cada categoría')).toBeInTheDocument();
    expect(screen.getByText('16/11')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Ver opiniones de esta preparación' }));
    expect(screen.getByRole('tab', { name: 'Opiniones' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(api.consultarOpinionesDetalle).toHaveBeenLastCalledWith(expect.objectContaining({ id_preparacion: '7' })));
  });

  it('en modo preparación sin elegir muestra la lista para escoger', async () => {
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await screen.findByText('Comparación entre menús');
    await usuario.click(screen.getByRole('button', { name: 'Preparación' }));
    expect(screen.getByText('Elige una preparación')).toBeInTheDocument();
    await usuario.selectOptions(screen.getByRole('combobox'), '8');
    expect(await screen.findByRole('heading', { name: 'Flan' })).toBeInTheDocument();
  });

  it('sin ventas en el período lo explica', async () => {
    api.consultarAnalisisDetalle.mockResolvedValue(SIN_DATOS);
    render(<AnalisisPage />);
    expect(await screen.findByText(/No hay datos en este rango/)).toBeInTheDocument();
  });

  it('los atajos de período cambian el rango consultado', async () => {
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await screen.findByText('Comparación entre menús');
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => {
      const [desde, hasta] = api.consultarAnalisisDetalle.mock.calls.at(-1);
      expect(desde.slice(8)).toBe('01');
      expect(hasta > desde).toBe(true);
    });
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toHaveClass('activo');
  });

  it('exportar abre la ventana con el mismo rango', async () => {
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await screen.findByText('Comparación entre menús');
    await usuario.click(screen.getAllByRole('button', { name: /Exportar/ })[0]);
    expect(screen.getByRole('dialog', { name: 'Exportar' })).toHaveTextContent(/exportar ventas \d{4}-\d{2}-\d{2} \d{4}-\d{2}-\d{2}/);
    await usuario.click(screen.getByRole('button', { name: 'Cerrar exportar' }));
    expect(screen.queryByRole('dialog', { name: 'Exportar' })).not.toBeInTheDocument();
  });

  it('si el análisis no carga ofrece reintentar', async () => {
    api.consultarAnalisisDetalle.mockRejectedValue(Object.assign(new Error('caído'), { estado: 500 }));
    render(<AnalisisPage />);
    expect(await screen.findByRole('button', { name: /Reintentar|Intentar/i })).toBeInTheDocument();
  });

  it('la pestaña de predicción muestra la hora estimada y qué tan confiable es', async () => {
    api.consultarPrediccionHoy.mockResolvedValue({ categorias: [
      { categoria: 'General', restante: 40, vendidas: 160, estimacion: { agotaria: true, hora: '13:45', minutos_restantes: 35 } },
      { categoria: 'JUNAEB', restante: -1, vendidas: 80, estimacion: { estado: 'agotado' } },
      { categoria: 'Vegetariano', restante: 30, vendidas: 10, estimacion: { agotaria: false } },
      { categoria: 'Hipocalórico', restante: 20, vendidas: 0, estimacion: null },
    ] });
    api.consultarConfiabilidad.mockResolvedValue({
      global: { demanda: { dias: 20, cobertura_sugerencia: 90, cobertura_planificado: 70, sobrante_sugerencia: 8, sobrante_planificado: 15, mae_modelo: 6, mae_base: 11, mejora_pct: 45 }, agotamiento: { dias: 15, mae_modelo_min: 12, mae_simple_min: 25, dentro_15_min_pct: 73 } },
      categorias: [{ categoria: 'General', dias_con_datos: 20, demanda: { mae_modelo: 6, mae_base: 11, cobertura_sugerencia: 90, cobertura_planificado: 70 }, agotamiento: { mae_modelo_min: 12 } }],
    });
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await usuario.click(screen.getByRole('tab', { name: 'Predicción' }));
    expect(await screen.findByText('Se agotaría cerca de las 13:45 - en 35 min')).toBeInTheDocument();
    expect(screen.getByText('Agotado')).toBeInTheDocument();
    expect(screen.getByText('Alcanza hasta el cierre')).toBeInTheDocument();
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    expect(await screen.findByText('Mejor que el promedio simple (45 %)')).toBeInTheDocument();
    expect(screen.getByText('Mejor que la línea recta')).toBeInTheDocument();
  });

  it('la predicción avisa cuando todavía no hay jornada ni historia', async () => {
    api.consultarPrediccionHoy.mockResolvedValue({ categorias: [] });
    api.consultarConfiabilidad.mockResolvedValue({ global: { demanda: { dias: 0, mejora_pct: -10 }, agotamiento: { mae_modelo_min: 30, mae_simple_min: 20 } }, categorias: [] });
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await usuario.click(screen.getByRole('tab', { name: 'Predicción' }));
    expect(await screen.findByText(/No hay una jornada abierta/)).toBeInTheDocument();
    expect(await screen.findByText(/Todavía no hay historia suficiente/)).toBeInTheDocument();
  });

  it('el informe general lista lo que se agota más rápido', async () => {
    api.consultarMensual.mockResolvedValue({
      resumen: { jornadas_cerradas: 6, con_conteo_de_cocina: 5, cierres_automaticos: 1, con_correccion: 0 },
      platos: [{ id_preparacion: 4, nombre: 'Arroz con pollo', dias_agotado: 5, jornadas: 6, porcentaje_agotado: 83, minutos_hasta_agotarse: 62, agotado_sin_hora: 0, vendidas_por_jornada: 70, sobrante_promedio: null }],
    });
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await usuario.click(screen.getByRole('tab', { name: 'Informe general' }));
    expect(await screen.findByText('Arroz con pollo')).toBeInTheDocument();
    expect(screen.getByText('5 de 6 (83%)')).toBeInTheDocument();
    expect(screen.getByText(/6 jornada\(s\) cerradas, 5 con conteo/)).toBeInTheDocument();
  });

  it('el informe general sin jornadas cerradas lo explica', async () => {
    api.consultarMensual.mockResolvedValue({ resumen: { jornadas_cerradas: 0 }, platos: [] });
    const usuario = userEvent.setup();
    render(<AnalisisPage />);
    await usuario.click(screen.getByRole('tab', { name: 'Informe general' }));
    expect(await screen.findByText(/No hay jornadas cerradas en este período/)).toBeInTheDocument();
  });
});
