import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('html-to-image', () => ({ toPng: vi.fn(async () => 'data:image/png;base64,iVBORw0KGgo=') }));
vi.mock('../utils/exportarAnalisis', async (original) => ({
  ...(await original()),
  cargarVentas: vi.fn(),
  cargarGeneral: vi.fn(),
  cargarOpinionesExport: vi.fn(),
  excelVentas: vi.fn(),
  excelGeneral: vi.fn(),
  excelOpiniones: vi.fn(),
}));
vi.mock('../utils/exportarMenu', async (original) => ({ ...(await original()), cargarPeriodo: vi.fn() }));
vi.mock('../utils/exportarExcel', () => ({ exportarExcel: vi.fn(), descargarBlob: vi.fn() }));

import { toPng } from 'html-to-image';
import * as analisis from '../utils/exportarAnalisis';
import * as menu from '../utils/exportarMenu';
import { exportarExcel, descargarBlob } from '../utils/exportarExcel';
import ExportarAnalisis from './ExportarAnalisis';
import ExportarMenu from './ExportarMenu';
import {
  HojaVentasResumen,
  HojaVentasHora,
  HojaPreparaciones,
  HojaGeneral,
  HojaOpinionesResumen,
  HojaOpinionesLista,
  HojaFavoritos,
} from './HojasAnalisis';
import { HojaCalendario, HojaDetalle, HojaTotal } from './HojasMenu';

const cat = (categoria, extra = {}) => ({
  categoria,
  es_principal: true,
  dias: 5,
  precio_promedio: 3500,
  vendidas: 400,
  planificadas: 500,
  porcentaje_consumo: 80,
  dias_agotado: 1,
  porcentaje_agotado: 20,
  hora_agotamiento: '13:40',
  ritmo_hora: 100,
  ...extra,
});
const VENTAS = {
  desde: '2026-11-16',
  hasta: '2026-11-20',
  etiqueta: '16 al 20 de noviembre',
  detalle: {
    por_categoria: [
      cat('General'),
      cat('JUNAEB', { vendidas: 300, planificadas: 300, porcentaje_consumo: 100 }),
      { categoria: 'Compartido', es_principal: false, vendidas: 5, planificadas: 5 },
    ],
    preparaciones: [
      {
        id_preparacion: 1,
        nombre: 'Pollo arvejado',
        componente: 'Plato Principal',
        dias: 2,
        vendidas: 220,
        planificadas: 230,
        porcentaje_consumo: 95,
        dias_agotado: 1,
        hora_agotamiento: '13:50',
        ritmo_hora: 120,
      },
    ],
    ventas_por_hora: [
      { hora: 12, unidades: 300 },
      { hora: 13, unidades: 420 },
    ],
    por_dia: [],
  },
  general: {
    resumen: { jornadas_cerradas: 5, con_conteo_de_cocina: 4 },
    platos: [
      {
        id_preparacion: 4,
        nombre: 'Arroz con pollo',
        jornadas: 5,
        dias_agotado: 4,
        porcentaje_agotado: 80,
        minutos_hasta_agotarse: 65,
        vendidas_por_jornada: 60,
        sobrante_promedio: 2,
      },
    ],
  },
};
const OPINIONES = {
  desde: '2026-11-01',
  hasta: '2026-11-30',
  etiqueta: 'Noviembre de 2026',
  opiniones: [
    {
      id_opinion: 1,
      id_preparacion: 1,
      preparacion: 'Pollo arvejado',
      estrellas: 5,
      estado: 'vigente',
      comentario: 'Muy rico',
      autor: 'Ana P.',
      creado_en: '2026-11-16T13:00:00',
      categoria: 'General',
    },
    {
      id_opinion: 2,
      id_preparacion: 2,
      preparacion: 'Flan',
      estrellas: 2,
      estado: 'eliminada',
      comentario: '',
      autor: 'Beto R.',
      creado_en: '2026-11-17T13:00:00',
    },
  ],
  resumen: { total: 2, con_comentario: 1, promedio_vigentes: 5, eliminadas: 1, editadas: 0 },
  favoritos: {
    resumen: { total: 3, estudiantes: 2, preparaciones: 2 },
    por_preparacion: [{ id_preparacion: 2, nombre: 'Flan', total: 2 }],
    favoritos: [{ preparacion: 'Flan', autor: 'Ana P.', correo: 'an@duocuc.cl', creado_en: '2026-11-16T12:00:00' }],
  },
};

describe('Hojas que se convierten en imagen', () => {
  it('las hojas de ventas muestran sus cifras', () => {
    const { container, rerender } = render(<HojaVentasResumen d={VENTAS} />);
    expect(container).toHaveTextContent('Comparación entre menús');
    expect(container).toHaveTextContent('700');
    rerender(<HojaVentasHora d={VENTAS} />);
    expect(container).toHaveTextContent('13:00');
    rerender(<HojaPreparaciones d={VENTAS} />);
    expect(container).toHaveTextContent('Pollo arvejado');
    rerender(<HojaGeneral d={VENTAS} />);
    expect(container).toHaveTextContent('Arroz con pollo');
  });

  it('las hojas de opiniones muestran resumen, comentarios y favoritos', () => {
    const { container, rerender } = render(<HojaOpinionesResumen d={OPINIONES} />);
    expect(container).toHaveTextContent('Pollo arvejado');
    rerender(<HojaOpinionesLista d={OPINIONES} />);
    expect(container).toHaveTextContent('Muy rico');
    expect(container).not.toHaveTextContent('Beto R.');
    rerender(<HojaFavoritos d={OPINIONES} />);
    expect(container).toHaveTextContent('Flan');
  });

  it('las hojas del menú muestran el calendario, el detalle y el total', () => {
    const periodo = menu.construirPeriodo({
      modo: 'semana',
      fecha: '2026-11-18',
      dias: [
        {
          fecha: '2026-11-16',
          publicado: true,
          componentes: [
            { componente: 'Plato Principal', categoria: 'General', preparacion: 'Pollo arvejado', cantidad: 120, precio: 3500 },
            { componente: 'Postre', categoria: null, preparacion: 'Flan', cantidad: 100, precio: null },
          ],
        },
        {
          fecha: '2026-11-17',
          publicado: false,
          componentes: [{ componente: 'Plato Principal', categoria: 'JUNAEB', preparacion: 'Cazuela', cantidad: 80, precio: null }],
        },
      ],
    });
    const { container, rerender } = render(<HojaCalendario periodo={periodo} />);
    expect(container).toHaveTextContent('Pollo arvejado');
    expect(container).toHaveTextContent('Cazuela');
    rerender(<HojaDetalle periodo={periodo} />);
    expect(container).toHaveTextContent('Flan');
    rerender(<HojaTotal periodo={periodo} />);
    expect(container).toHaveTextContent('120');
  });
});

describe('ExportarAnalisis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analisis.cargarVentas.mockResolvedValue(VENTAS);
    analisis.cargarGeneral.mockResolvedValue(VENTAS);
    analisis.cargarOpinionesExport.mockResolvedValue(OPINIONES);
    globalThis.fetch = vi.fn(async () => ({ blob: async () => new Blob(['png'], { type: 'image/png' }) }));
  });

  it('descarga el Excel de ventas del rango elegido', async () => {
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="ventas" desdeInicial="2026-11-16" hastaInicial="2026-11-20" onCerrar={() => {}} />);
    expect(screen.getByText('16 de noviembre de 2026 al 20 de noviembre de 2026')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    await waitFor(() => expect(analisis.excelVentas).toHaveBeenCalledWith(VENTAS));
    expect(analisis.cargarVentas).toHaveBeenCalledWith('2026-11-16', '2026-11-20');
  });

  it('en modo mes exporta el mes completo y se mueve entre meses', async () => {
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="general" desdeInicial="2026-11-16" hastaInicial="2026-11-20" onCerrar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Mes' }));
    expect(screen.getAllByText('Noviembre de 2026').length).toBeGreaterThan(0);
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    await waitFor(() => expect(analisis.cargarGeneral).toHaveBeenCalledWith('2026-10-01', '2026-10-31'));
  });

  it('en modo semana exporta de lunes a sábado', async () => {
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="ventas" desdeInicial="2026-11-01" hastaInicial="2026-11-19" onCerrar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Semana' }));
    await usuario.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    await waitFor(() => expect(analisis.cargarVentas).toHaveBeenCalledWith('2026-11-23', '2026-11-28'));
  });

  it('las opiniones pueden excluir eliminadas y pedir solo con comentario', async () => {
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="opiniones" desdeInicial="2026-11-01" hastaInicial="2026-11-30" onCerrar={() => {}} />);
    await usuario.click(screen.getByLabelText('Incluir eliminadas y editadas'));
    await usuario.click(screen.getByLabelText('Solo con comentario'));
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    await waitFor(() =>
      expect(analisis.cargarOpinionesExport).toHaveBeenCalledWith('2026-11-01', '2026-11-30', { estado: 'vigente', soloComentario: true })
    );
    expect(analisis.excelOpiniones).toHaveBeenCalledWith(OPINIONES);
  });

  it('genera la imagen PNG de la hoja elegida con un nombre claro', async () => {
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="ventas" desdeInicial="2026-11-16" hastaInicial="2026-11-20" onCerrar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Imagen (PNG)' }));
    await usuario.click(screen.getByRole('radio', { name: /Ventas por hora/ }));
    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }));
    await waitFor(() =>
      expect(descargarBlob).toHaveBeenCalledWith(expect.any(Blob), 'ventas_y_agotamiento_hora_2026-11-16_a_2026-11-20.png')
    );
    expect(toPng).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Descargar imagen' })).toBeEnabled();
  });

  it('si falla la generación muestra el error y libera los botones', async () => {
    analisis.excelVentas.mockRejectedValue(new Error('Sin datos para exportar.'));
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="ventas" desdeInicial="2026-11-16" hastaInicial="2026-11-20" onCerrar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    expect(await screen.findByText('Sin datos para exportar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });

  it('si la imagen falla también avisa', async () => {
    toPng.mockRejectedValueOnce(new Error('No se pudo dibujar.'));
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="opiniones" desdeInicial="2026-11-01" hastaInicial="2026-11-30" onCerrar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Imagen (PNG)' }));
    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }));
    expect(await screen.findByText('No se pudo dibujar.')).toBeInTheDocument();
  });

  it('cerrar avisa a quien la abrió', async () => {
    const onCerrar = vi.fn();
    const usuario = userEvent.setup();
    render(<ExportarAnalisis tipo="general" desdeInicial="2026-11-01" hastaInicial="2026-11-30" onCerrar={onCerrar} />);
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe('ExportarMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    menu.cargarPeriodo.mockResolvedValue(menu.construirPeriodo({ modo: 'semana', fecha: '2026-11-18', dias: [] }));
    globalThis.fetch = vi.fn(async () => ({ blob: async () => new Blob(['png'], { type: 'image/png' }) }));
  });

  it('desde la vista semanal exporta la semana y se mueve de a 7 días', async () => {
    const usuario = userEvent.setup();
    render(<ExportarMenu fecha="2026-11-18" mes="2026-11" vistaMes={false} onCerrar={() => {}} />);
    expect(screen.getByText('16 nov al 20 nov')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    expect(screen.getByText('23 nov al 27 nov')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    await waitFor(() => expect(menu.cargarPeriodo).toHaveBeenCalledWith({ modo: 'semana', fecha: '2026-11-25', mes: '2026-11' }));
    expect(exportarExcel).toHaveBeenCalled();
  });

  it('desde la vista mensual exporta el mes y se mueve de a un mes', async () => {
    const usuario = userEvent.setup();
    render(<ExportarMenu fecha="2026-11-18" mes="2026-11" vistaMes onCerrar={() => {}} />);
    expect(screen.getAllByText('Noviembre de 2026').length).toBeGreaterThan(0);
    await usuario.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getAllByText('Diciembre de 2026').length).toBeGreaterThan(0);
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    await waitFor(() => expect(menu.cargarPeriodo).toHaveBeenCalledWith({ modo: 'mes', fecha: '2026-12-01', mes: '2026-12' }));
  });

  it('descarga la imagen del total a preparar', async () => {
    const usuario = userEvent.setup();
    render(<ExportarMenu fecha="2026-11-18" mes="2026-11" vistaMes={false} onCerrar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Imagen (PNG)' }));
    await usuario.click(screen.getByRole('radio', { name: /Total a preparar/ }));
    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }));
    await waitFor(() =>
      expect(descargarBlob).toHaveBeenCalledWith(expect.any(Blob), 'Planificacion_semana_2026-11-16_total_a_preparar.png')
    );
  });

  it('si no se puede cargar el período muestra el error', async () => {
    menu.cargarPeriodo.mockRejectedValue(new Error('No se pudo conectar con el servidor.'));
    const usuario = userEvent.setup();
    render(<ExportarMenu fecha="2026-11-18" mes="2026-11" vistaMes={false} onCerrar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument();
  });
});
