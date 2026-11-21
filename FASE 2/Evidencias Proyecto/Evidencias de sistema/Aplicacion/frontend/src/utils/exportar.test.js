import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../api/gestion', () => ({
  consultarMes: vi.fn(),
  consultarAnalisisDetalle: vi.fn(),
  consultarMensual: vi.fn(),
  consultarOpinionesDetalle: vi.fn(),
  consultarFavoritosDetalle: vi.fn(),
}));

import * as api from '../api/gestion';
import {
  construirPeriodo,
  cargarPeriodo,
  principalesDe,
  acompDe,
  combosDe,
  diasDelPeriodo,
  categoriasDelPeriodo,
  totalesDelPeriodo,
  nombreLargo,
  encabezadoDia,
  rangoSemana,
  lineasIncluye,
  nombreArchivo,
  estiloCategoria,
} from './exportarMenu';
import { exportarExcel, descargarBlob } from './exportarExcel';
import {
  excelVentas,
  excelGeneral,
  excelOpiniones,
  resumirOpiniones,
  nombreArchivoAnalisis,
  cargarVentas,
  cargarOpinionesExport,
  cargarGeneral,
  graficoBarras,
} from './exportarAnalisis';
import { capturarDescargas, abrirExcel, textosDeHoja, simularCanvas, leerBlob } from '../pruebas/descargas';

const comp = (componente, categoria, preparacion, cantidad, precio = 3500) => ({ componente, categoria, preparacion, cantidad, precio });
const dia = (fecha, componentes, publicado = true) => ({ fecha, publicado, componentes });
const SEMANA = [
  dia('2026-11-16', [
    comp('Bebida', null, 'Jugo de naranja', 200, null),
    comp('Plato Principal', 'Vegetariano', 'Budín de zapallitos', 40),
    comp('Plato Principal', 'General', 'Pollo arvejado', 120),
    comp('Postre', 'General', 'Flan', 100, null),
    comp('Postre', 'Vegetariano', 'Flan', 30, null),
  ]),
  dia('2026-11-17', [comp('Plato Principal', 'JUNAEB', 'Arroz con pollo', 80), comp('Plato Principal', 'General', 'Pollo arvejado', 110)]),
  dia('2026-11-20', [comp('Plato Principal', 'Hipocalórico', 'Pollo a la plancha', 30)], false),
];

describe('exportarMenu: armar el período a exportar', () => {
  it('una semana dentro del mismo mes', () => {
    const p = construirPeriodo({ modo: 'semana', fecha: '2026-11-18', dias: SEMANA });
    expect(p.semanas).toHaveLength(1);
    expect(p.subtitulo).toBe('Semana del 16 al 20 de noviembre de 2026');
    expect(p.etiquetaMes).toBe('NOVIEMBRE 2026');
    expect(p.conSabado).toBe(false);
    expect(p.archivo).toBe('semana_2026-11-16');
  });

  it('una semana que cruza de mes nombra ambos meses', () => {
    const p = construirPeriodo({ modo: 'semana', fecha: '2026-12-01', dias: [] });
    expect(p.subtitulo).toBe('Semana del 30 de noviembre al 4 de diciembre de 2026');
    expect(p.etiquetaMes).toBe('NOV – DIC 2026');
  });

  it('un mes completo marca los días que quedan fuera', () => {
    const p = construirPeriodo({ modo: 'mes', fecha: '2026-11-18', mes: '2026-11', dias: SEMANA });
    expect(p.semanas[0].lunes).toBe('2026-10-26');
    expect(p.semanas.at(-1).lunes).toBe('2026-11-30');
    expect(p.semanas[0].dias.find((d) => d.fecha === '2026-10-31').fuera).toBe(true);
    expect(p.subtitulo).toBe('Mes de noviembre de 2026');
    expect(p.archivo).toBe('mes_2026-11');
  });

  it('el sábado solo se incluye si algún sábado tiene menú', () => {
    const conSabado = construirPeriodo({
      modo: 'semana',
      fecha: '2026-11-18',
      dias: [...SEMANA, dia('2026-11-21', [comp('Plato Principal', 'General', 'Cazuela', 50)])],
    });
    expect(conSabado.conSabado).toBe(true);
    expect(diasDelPeriodo(conSabado)).toHaveLength(6);
  });

  it('ordena los platos por categoría y deja los acompañamientos después', () => {
    const p = construirPeriodo({ modo: 'semana', fecha: '2026-11-18', dias: SEMANA });
    const lunes = p.semanas[0].dias[0];
    expect(lunes.comps.map((c) => c.categoria || c.tipo).slice(0, 2)).toEqual(['General', 'Vegetariano']);
    expect(principalesDe(lunes)).toHaveLength(2);
    expect(combosDe(lunes)).toBe(160);
    expect(acompDe(lunes).find((a) => a.preparacion === 'Flan').categorias).toEqual(['General', 'Vegetariano']);
    expect(lineasIncluye(lunes)).toContain('Postre: Flan (General, Vegetariano)');
  });

  it('suma lo que hay que preparar en el período y en qué días', () => {
    const p = construirPeriodo({ modo: 'semana', fecha: '2026-11-18', dias: SEMANA });
    const pollo = totalesDelPeriodo(p).find((t) => t.preparacion === 'Pollo arvejado');
    expect(pollo.total).toBe(230);
    expect(pollo.textoDias).toBe('lun 16, mar 17');
    expect(totalesDelPeriodo(p)[0].tipo).toBe('Plato Principal');
  });

  it('agrega al final las categorías que no son las cuatro de siempre', () => {
    const p = construirPeriodo({
      modo: 'semana',
      fecha: '2026-11-18',
      dias: [dia('2026-11-16', [comp('Plato Principal', 'Especial', 'Paella', 10)])],
    });
    expect(categoriasDelPeriodo(p)).toEqual(['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico', 'Especial']);
    expect(estiloCategoria('Especial').texto).toBe('374151');
  });

  it('escribe nombres de días y archivos en español', () => {
    expect(nombreLargo('2026-11-20')).toBe('Viernes 20 de noviembre de 2026');
    expect(encabezadoDia('2026-11-18')).toBe('MIÉRCOLES 18');
    const p = construirPeriodo({ modo: 'semana', fecha: '2026-11-18', dias: SEMANA });
    expect(rangoSemana(p.semanas[0], false)).toBe('16 nov – 20 nov');
    expect(nombreArchivo(p, 'calendario', 'png')).toBe('Planificacion_semana_2026-11-16_calendario.png');
    expect(nombreArchivo(p, '', 'xlsx')).toBe('Planificacion_semana_2026-11-16.xlsx');
  });

  it('una semana que cruza de mes consulta los dos meses', async () => {
    api.consultarMes.mockImplementation(async (mes) => ({
      dias: mes === '2026-12' ? [dia('2026-12-02', [comp('Plato Principal', 'General', 'Charquicán', 90)])] : [],
    }));
    const p = await cargarPeriodo({ modo: 'semana', fecha: '2026-12-01' });
    expect(api.consultarMes.mock.calls.map((c) => c[0])).toEqual(['2026-11', '2026-12']);
    expect(p.semanas[0].dias[2].tiene).toBe(true);
  });
});

describe('Exportación a Excel', () => {
  let descargas;
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('sin logo en pruebas'));
    descargas = capturarDescargas();
    simularCanvas();
  });
  afterEach(() => vi.restoreAllMocks());

  it('descargarBlob descarga con el nombre indicado', async () => {
    descargarBlob(new Blob(['hola']), 'archivo.txt');
    expect(descargas).toHaveLength(1);
    expect(descargas[0].nombre).toBe('archivo.txt');
    expect(new TextDecoder().decode(await leerBlob(descargas[0].blob))).toBe('hola');
  });

  it('la planificación genera un Excel real con calendario, detalle y total a preparar', async () => {
    const p = construirPeriodo({ modo: 'semana', fecha: '2026-11-18', dias: SEMANA });
    await exportarExcel(p);
    expect(descargas[0].nombre).toBe('Planificacion_semana_2026-11-16.xlsx');
    const libro = await abrirExcel(descargas[0].blob);
    expect(libro.worksheets).toHaveLength(3);
    const todo = libro.worksheets.flatMap(textosDeHoja).join(' | ');
    expect(todo).toMatch(/Pollo arvejado/);
    expect(todo).toMatch(/Budín de zapallitos/);
    expect(todo).toMatch(/Arroz con pollo/);
    expect(todo).toMatch(/PLANIFICACIÓN/);
    const total = libro.worksheets[2];
    expect(textosDeHoja(total)).toContain('230');
  }, 20000);

  const DETALLE = {
    por_categoria: [
      {
        categoria: 'General',
        es_principal: true,
        dias: 5,
        precio_promedio: '3500',
        vendidas: 480,
        planificadas: 600,
        porcentaje_consumo: 80,
        dias_agotado: 1,
        porcentaje_agotado: 20,
        hora_agotamiento: '13:40',
        ritmo_hora: 160,
      },
      {
        categoria: 'JUNAEB',
        es_principal: true,
        dias: 5,
        precio_promedio: null,
        vendidas: 300,
        planificadas: 300,
        porcentaje_consumo: 100,
        dias_agotado: 4,
        porcentaje_agotado: 80,
        hora_agotamiento: '13:05',
        ritmo_hora: 210,
      },
      { categoria: 'Postre', es_principal: false, vendidas: 200, planificadas: 250 },
    ],
    preparaciones: [
      {
        nombre: 'Pollo arvejado',
        componente: 'Plato Principal',
        dias: 2,
        vendidas: 220,
        planificadas: 230,
        porcentaje_consumo: 95.6,
        dias_agotado: 1,
        hora_agotamiento: '13:50',
        ritmo_hora: 120,
      },
    ],
    ventas_por_hora: [
      { hora: 12, unidades: 300 },
      { hora: 13, unidades: 420 },
      { hora: 14, unidades: 60 },
    ],
    por_dia: [
      { fecha: '2026-11-16T00:00:00', categoria: 'General', vendidas: 110, planificadas: 120, precio: '3500', hora_agotado: null },
      { fecha: '2026-11-17T00:00:00', categoria: 'JUNAEB', vendidas: 80, planificadas: 80, precio: null, hora_agotado: '13:02' },
    ],
  };
  const GENERAL = {
    resumen: { jornadas_cerradas: 5, con_conteo_de_cocina: 4, con_correccion: 1 },
    platos: [
      {
        nombre: 'Arroz con pollo',
        jornadas: 5,
        dias_agotado: 4,
        porcentaje_agotado: 80,
        minutos_hasta_agotarse: 65,
        agotado_sin_hora: 0,
        vendidas_por_jornada: 60,
        sobrante_promedio: 0,
      },
    ],
  };

  it('el informe de ventas trae resumen, preparaciones, horas, informe general y día a día', async () => {
    api.consultarAnalisisDetalle.mockResolvedValue(DETALLE);
    api.consultarMensual.mockResolvedValue(GENERAL);
    const datos = await cargarVentas('2026-11-16', '2026-11-20');
    expect(datos.etiqueta).toBe('16 de noviembre de 2026 al 20 de noviembre de 2026');
    await excelVentas(datos);
    expect(descargas[0].nombre).toBe('ventas_y_agotamiento_2026-11-16_a_2026-11-20.xlsx');
    const libro = await abrirExcel(descargas[0].blob);
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Resumen', 'Preparaciones', 'Ventas por hora', 'Informe general', 'Día a día']);
    const resumen = textosDeHoja(libro.getWorksheet('Resumen'));
    expect(resumen).toContain('780');
    expect(resumen).toContain('900');
    expect(resumen).not.toContain('Postre');
    expect(textosDeHoja(libro.getWorksheet('Ventas por hora'))).toContain('13:00');
    expect(textosDeHoja(libro.getWorksheet('Día a día'))).toContain('Lunes 16 de noviembre de 2026');
    expect(libro.getWorksheet('Resumen').getImages().length).toBe(2);
  }, 20000);

  it('sin datos de un período el informe igual se genera, con guiones en vez de vacíos', async () => {
    await excelVentas(
      {
        desde: '2026-11-01',
        hasta: '2026-11-30',
        etiqueta: 'Noviembre de 2026',
        detalle: { por_categoria: [], preparaciones: [], ventas_por_hora: [], por_dia: [] },
        general: { platos: [] },
      },
      { graficos: false }
    );
    const libro = await abrirExcel(descargas[0].blob);
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Resumen', 'Preparaciones', 'Ventas por hora']);
    expect(textosDeHoja(libro.getWorksheet('Resumen'))).toContain('—');
  }, 20000);

  it('el informe general muestra qué se agota más rápido', async () => {
    api.consultarMensual.mockResolvedValue(GENERAL);
    await excelGeneral(await cargarGeneral('2026-11-01', '2026-11-30'));
    expect(descargas[0].nombre).toBe('informe_general_2026-11-01_a_2026-11-30.xlsx');
    const textos = textosDeHoja((await abrirExcel(descargas[0].blob)).worksheets[0]);
    expect(textos).toContain('Arroz con pollo');
    expect(textos.join(' ')).toMatch(/5 jornada\(s\) cerrada\(s\)/);
  }, 20000);

  const OPINIONES = [
    {
      id_preparacion: 1,
      preparacion: 'Pollo arvejado',
      estrellas: 5,
      estado: 'vigente',
      comentario: 'Muy rico',
      autor: 'Ana P.',
      correo: 'an.p@duocuc.cl',
      categoria: 'General',
      creado_en: '2026-11-16T13:00:00',
    },
    {
      id_preparacion: 1,
      preparacion: 'Pollo arvejado',
      estrellas: 3,
      estado: 'vigente',
      comentario: '',
      autor: 'Beto R.',
      correo: 'be.r@duocuc.cl',
      creado_en: '2026-11-16T13:10:00',
    },
    {
      id_preparacion: 1,
      preparacion: 'Pollo arvejado',
      estrellas: 1,
      estado: 'editada',
      comentario: 'Antes',
      autor: 'Beto R.',
      creado_en: '2026-11-16T13:05:00',
    },
    {
      id_preparacion: 2,
      preparacion: 'Flan',
      estrellas: 2,
      estado: 'eliminada',
      comentario: 'Borrada',
      autor: 'Caro S.',
      creado_en: '2026-11-17T13:00:00',
    },
  ];

  it('resumirOpiniones promedia solo las opiniones vigentes', () => {
    const { filas, estrellas } = resumirOpiniones(OPINIONES);
    const pollo = filas.find((f) => f.nombre === 'Pollo arvejado');
    expect(pollo).toMatchObject({ total: 3, vigentes: 2, promedio: 4, editadas: 1, comentarios: 2 });
    expect(filas.find((f) => f.nombre === 'Flan')).toMatchObject({ eliminadas: 1, promedio: null });
    expect(estrellas).toEqual([0, 0, 1, 0, 1]);
  });

  it('el informe de opiniones incluye historial, por preparación, estrellas y favoritos', async () => {
    api.consultarOpinionesDetalle.mockResolvedValue({ opiniones: OPINIONES });
    api.consultarFavoritosDetalle.mockResolvedValue({
      resumen: { total: 3, estudiantes: 2 },
      por_preparacion: [
        { nombre: 'Flan', total: 2 },
        { nombre: 'Pollo arvejado', total: 1 },
      ],
      favoritos: [{ preparacion: 'Flan', autor: 'Ana P.', correo: 'an.p@duocuc.cl', creado_en: '2026-11-16T12:00:00' }],
    });
    const datos = await cargarOpinionesExport('2026-11-01', '2026-11-30', { estado: 'vigente', soloComentario: true });
    expect(api.consultarOpinionesDetalle).toHaveBeenCalledWith({
      desde: '2026-11-01',
      hasta: '2026-11-30',
      estado: 'vigente',
      con_comentario: true,
      limite: 5000,
    });
    await excelOpiniones(datos);
    const libro = await abrirExcel(descargas[0].blob);
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Opiniones', 'Por preparación', 'Estrellas', 'Favoritos']);
    const historial = textosDeHoja(libro.getWorksheet('Opiniones'));
    expect(historial).toContain('Editada (versión anterior)');
    expect(historial).toContain('Eliminada por el estudiante');
    expect(historial).toContain('Sin registrar');
    expect(textosDeHoja(libro.getWorksheet('Favoritos')).join(' ')).toMatch(/3 marca\(s\) de 2 estudiante\(s\)/);
  }, 20000);

  it('graficoBarras dibuja y entrega un PNG', async () => {
    const buffer = await graficoBarras({
      titulo: 'Prueba',
      etiquetas: ['A', 'B'],
      series: [
        { nombre: 'x', valores: [1, 0], color: '#000' },
        { nombre: 'y', valores: [null, 3], color: ['#111', '#222'] },
      ],
    });
    expect(new Uint8Array(buffer).slice(0, 4)).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  });

  it('los nombres de archivo no llevan espacios', () => {
    expect(nombreArchivoAnalisis('ventas y agotamiento', '2026-11-01', '2026-11-30', 'xlsx')).toBe(
      'ventas_y_agotamiento_2026-11-01_a_2026-11-30.xlsx'
    );
  });
});
