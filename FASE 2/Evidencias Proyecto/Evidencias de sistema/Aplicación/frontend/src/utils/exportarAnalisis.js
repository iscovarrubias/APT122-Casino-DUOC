import { consultarAnalisisDetalle, consultarMensual, consultarOpinionesDetalle, consultarFavoritosDetalle } from '../api/gestion';
import { etiquetaRango } from './periodos';
import { descargarBlob } from './exportarExcel';

const NARANJA = 'FFEA7A12';
const OSCURO = 'FF2B2B2B';
const GRIS = 'FF6B7280';
const CLARO = 'FFF2F2F2';
const DURAZNO = 'FFFCD5B5';
const LINEA = 'FF4F6228';
const FUENTE = 'Calibri';
const INICIO = 4;
const CHIP = {
  verde: { texto: 'FF2E6B1F', fondo: 'FFE1EFD8' },
  naranja: { texto: 'FF9A5B00', fondo: 'FFFDECD2' },
  rojo: { texto: 'FFD11B1B', fondo: 'FFFBE3E3' },
};
const ESTILO_CAT = {
  Principal: { texto: 'FF9A5B00', fondo: 'FFFDECD2' }, JUNAEB: { texto: 'FFD11B1B', fondo: 'FFFBE3E3' },
  Vegetariano: { texto: 'FF3C7424', fondo: 'FFE1EFD8' }, Hipocalórico: { texto: 'FF318386', fondo: 'FFD7EAEB' },
};
const COLORES = { Principal: '#F5A623', JUNAEB: '#D11B1B', Vegetariano: '#3C7424', Hipocalórico: '#318386', Compartido: '#8a94a6' };
const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const lineaVerde = { style: 'thin', color: { argb: LINEA } };
const cajaFina = { top: lineaVerde, left: lineaVerde, bottom: lineaVerde, right: lineaVerde };

export const nombreArchivoAnalisis = (parte, desde, hasta, ext) =>
  `${parte}_${desde}_a_${hasta}.${ext}`.replace(/\s+/g, '_');

export async function cargarVentas(desde, hasta) {
  const [detalle, general] = await Promise.all([consultarAnalisisDetalle(desde, hasta), consultarMensual({ desde, hasta })]);
  return { desde, hasta, etiqueta: etiquetaRango(desde, hasta), detalle, general };
}

export async function cargarOpinionesExport(desde, hasta, { estado = '', soloComentario = false } = {}) {
  const [d, favoritos] = await Promise.all([
    consultarOpinionesDetalle({ desde, hasta, estado, con_comentario: soloComentario, limite: 5000 }),
    consultarFavoritosDetalle({ desde, hasta }),
  ]);
  return { desde, hasta, etiqueta: etiquetaRango(desde, hasta), ...d, favoritos };
}

export const cargarGeneral = async (desde, hasta) => ({ desde, hasta, etiqueta: etiquetaRango(desde, hasta), general: await consultarMensual({ desde, hasta }) });

function aPng(canvas) {
  return new Promise((res) => canvas.toBlob((b) => b.arrayBuffer().then(res), 'image/png'));
}

export async function graficoBarras({ titulo, etiquetas, series, ancho = 900, alto = 420, sufijo = '' }) {
  const esc = 2;
  const c = document.createElement('canvas');
  c.width = ancho * esc; c.height = alto * esc;
  const g = c.getContext('2d');
  g.scale(esc, esc);
  g.fillStyle = '#fff'; g.fillRect(0, 0, ancho, alto);
  g.fillStyle = '#1F3864'; g.font = 'bold 18px Calibri, Arial, sans-serif'; g.textAlign = 'left';
  g.fillText(titulo, 24, 32);
  const izq = 56; const der = 20; const sup = series.length > 1 ? 74 : 56; const inf = 56;
  const w = ancho - izq - der; const h = alto - sup - inf;
  const max = Math.max(1, ...series.flatMap((s) => s.valores.map((v) => v || 0)));
  const tope = Math.ceil(max / 5) * 5 || 5;
  g.font = '12px Calibri, Arial, sans-serif'; g.strokeStyle = '#E4E7EC'; g.fillStyle = '#6B7280'; g.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = sup + h - (h * i) / 5;
    g.beginPath(); g.moveTo(izq, y); g.lineTo(izq + w, y); g.stroke();
    g.fillText(`${Math.round((tope * i) / 5)}${sufijo}`, izq - 8, y + 4);
  }
  const n = etiquetas.length || 1;
  const grupo = w / n;
  const ancha = Math.min(46, (grupo * 0.7) / series.length);
  etiquetas.forEach((et, i) => {
    const x0 = izq + grupo * i + (grupo - ancha * series.length) / 2;
    series.forEach((s, k) => {
      const v = s.valores[i] || 0;
      const bh = (h * v) / tope;
      g.fillStyle = (Array.isArray(s.color) ? s.color[i] : s.color) || '#1F3864';
      g.fillRect(x0 + k * ancha, sup + h - bh, ancha - 2, bh);
      if (v > 0 && ancha >= 14) {
        g.fillStyle = '#1F2937'; g.textAlign = 'center'; g.font = '11px Calibri, Arial, sans-serif';
        g.fillText(String(v), x0 + k * ancha + (ancha - 2) / 2, sup + h - bh - 4);
      }
    });
    g.fillStyle = '#374151'; g.textAlign = 'center'; g.font = '12px Calibri, Arial, sans-serif';
    const texto = String(et);
    g.fillText(texto.length > 14 ? `${texto.slice(0, 13)}…` : texto, izq + grupo * i + grupo / 2, sup + h + 20);
  });
  if (series.length > 1) {
    let x = izq;
    g.textAlign = 'left'; g.font = '12px Calibri, Arial, sans-serif';
    series.forEach((s) => {
      g.fillStyle = s.color; g.fillRect(x, 46, 12, 12);
      g.fillStyle = '#374151'; g.fillText(s.nombre, x + 18, 57);
      x += 30 + g.measureText(s.nombre).width;
    });
  }
  return aPng(c);
}

async function cargarLogo(wb) {
  try {
    const resp = await fetch('/logo-excel.png');
    if (!resp.ok) return null;
    return wb.addImage({ buffer: await resp.arrayBuffer(), extension: 'png' });
  } catch {
    return null;
  }
}

function encabezado(ws, titulo, subtitulo, columnas, pie = 'Análisis de la oferta') {
  const ultima = Math.max(columnas, 6);
  ws._ultima = ultima;
  ws.views = [{ showGridLines: false }];
  ws.getRow(1).height = 49.5;
  ws.getRow(2).height = 58;
  const corte = Math.max(1, Math.floor(ultima / 2));
  ws.mergeCells(2, 1, 2, corte);
  const t = ws.getCell(2, 1);
  t.value = { richText: [
    { text: 'ANÁLISIS\n', font: { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } } },
    { text: titulo, font: { name: 'Segoe UI Black', size: 24, bold: true, italic: true, color: { argb: NARANJA } } },
  ] };
  t.alignment = { vertical: 'bottom', horizontal: 'left', wrapText: true };
  ws.mergeCells(2, corte + 1, 2, ultima);
  const m = ws.getCell(2, corte + 1);
  m.value = subtitulo.split(' · ')[0];
  m.font = { name: 'Segoe UI Black', size: 14, bold: true, color: { argb: NARANJA } };
  m.alignment = { vertical: 'bottom', horizontal: 'right', wrapText: true };
  let siguiente = 4;
  if (subtitulo.includes(' · ')) {
    ws.getRow(3).height = 24;
    ws.mergeCells(3, 1, 3, ultima);
    const sub = ws.getCell(3, 1);
    sub.value = subtitulo.split(' · ').slice(1).join('  ·  ');
    sub.font = { name: FUENTE, size: 12, bold: true, color: { argb: OSCURO } };
    sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= ultima; c++) { ws.getCell(3, c).fill = relleno(CLARO); ws.getCell(3, c).border = cajaFina; }
    ws.getRow(4).height = 8;
    siguiente = 5;
  } else {
    ws.getRow(3).height = 12.75;
  }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  ws.headerFooter = { oddFooter: `&L${pie}&RPágina &P de &N` };
  return siguiente;
}

function colocarLogos(wb) {
  wb.eachSheet((ws) => {
    if (wb.logoId === null || wb.logoId === undefined || !ws._ultima) return;
    for (let c = 1; c <= ws._ultima; c++) { if (!ws.getColumn(c).width) ws.getColumn(c).width = 22; }
    const px = (c) => Math.round((ws.getColumn(c).width || 8.43) * 7 + 5);
    let total = 0;
    for (let c = 1; c <= ws._ultima; c++) total += px(c);
    let x = Math.max(0, total / 2 - 85);
    let col = 0;
    while (col < ws._ultima && x >= px(col + 1)) { x -= px(col + 1); col += 1; }
    ws.addImage(wb.logoId, { tl: { col: col + x / px(col + 1), row: 0.1 }, ext: { width: 170, height: 58 } });
  });
}

function tabla(ws, fila, columnas, filas) {
  const cab = ws.getRow(fila);
  columnas.forEach((c, i) => {
    const celda = cab.getCell(i + 1);
    celda.value = c.t;
    celda.font = { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } };
    celda.fill = relleno(DURAZNO);
    celda.alignment = { vertical: 'middle', horizontal: c.izq ? 'left' : 'center', wrapText: true, indent: c.izq ? 1 : 0 };
    celda.border = cajaFina;
  });
  cab.height = 24;
  filas.forEach((f, r) => {
    const fila_ = ws.getRow(fila + 1 + r);
    fila_.height = 21;
    columnas.forEach((c, i) => {
      const celda = fila_.getCell(i + 1);
      const v = c.v(f);
      celda.value = v === undefined || v === null || v === '' ? '—' : v;
      celda.font = { name: FUENTE, size: 11, color: { argb: 'FF1F2937' } };
      celda.alignment = { vertical: 'middle', horizontal: c.izq ? 'left' : 'center', wrapText: !!c.envolver, indent: c.izq ? 1 : 0 };
      celda.border = cajaFina;
      if (c.fmt && typeof v === 'number') celda.numFmt = c.fmt;
      const est = c.cat ? ESTILO_CAT[v] : c.chip && CHIP[c.chip(f)];
      if (est) { celda.font = { name: FUENTE, size: 11, bold: true, color: { argb: est.texto } }; celda.fill = relleno(est.fondo); }
      if (c.negrita) celda.font = { ...celda.font, bold: true, color: { argb: OSCURO } };
    });
    if (filas.some((x) => String(columnas[0].v(x)).length > 40) || columnas.some((c) => c.envolver)) fila_.height = 32;
  });
  columnas.forEach((c, i) => { if (c.w) ws.getColumn(i + 1).width = c.w; });
  return fila + filas.length + 2;
}

function kpis(ws, fila, items) {
  items.forEach(([titulo, valor], i) => {
    const a = ws.getCell(fila, 1 + i * 2); const b = ws.getCell(fila + 1, 1 + i * 2);
    ws.mergeCells(fila, 1 + i * 2, fila, 2 + i * 2); ws.mergeCells(fila + 1, 1 + i * 2, fila + 1, 2 + i * 2);
    a.value = titulo; a.font = { name: FUENTE, size: 10, bold: true, color: { argb: GRIS } }; a.alignment = { horizontal: 'center', vertical: 'middle' };
    b.value = valor; b.font = { name: FUENTE, size: 18, bold: true, color: { argb: OSCURO } }; b.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let k = 0; k < 2; k++) for (const x of [ws.getCell(fila, 1 + i * 2 + k), ws.getCell(fila + 1, 1 + i * 2 + k)]) x.fill = relleno(CLARO);
    ws.getCell(fila, 1 + i * 2).border = { top: lineaVerde, left: lineaVerde }; ws.getCell(fila, 2 + i * 2).border = { top: lineaVerde, right: lineaVerde };
    ws.getCell(fila + 1, 1 + i * 2).border = { bottom: lineaVerde, left: lineaVerde }; ws.getCell(fila + 1, 2 + i * 2).border = { bottom: lineaVerde, right: lineaVerde };
  });
  ws.getRow(fila).height = 20;
  ws.getRow(fila + 1).height = 30;
  return fila + 3;
}

function subtitulo(ws, fila, texto) {
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.font = { name: FUENTE, size: 13, bold: true, color: { argb: OSCURO } };
  return fila + 1;
}

async function guardar(wb, nombre) {
  colocarLogos(wb);
  const buffer = await wb.xlsx.writeBuffer();
  descargarBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre);
}

async function nuevoLibro() {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Casinos DUOC UC';
  wb.logoId = await cargarLogo(wb);
  const crear = wb.addWorksheet.bind(wb);
  wb.addWorksheet = (nombre, ...resto) => { const ws = crear(nombre, ...resto); ws._logo = wb.logoId; return ws; };
  return wb;
}

const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaConDia = (f) => `${DIAS_ES[new Date(`${f}T12:00:00Z`).getUTCDay()]} ${Number(f.slice(8))} de ${MESES_ES[Number(f.slice(5, 7)) - 1]} de ${f.slice(0, 4)}`;
const pct = (v) => (v == null ? null : v / 100);
const FMT_PCT = '0.0%';
function imagen(wb, ws, buffer, col, fila, ancho = 640, alto = 300) {
  const id = wb.addImage({ buffer, extension: 'png' });
  ws.addImage(id, { tl: { col, row: fila }, ext: { width: ancho, height: alto } });
}

export async function excelVentas(d, { graficos = true } = {}) {
  const wb = await nuevoLibro();
  const { detalle, general } = d;
  const principales = detalle.por_categoria.filter((c) => c.es_principal);
  const totalV = principales.reduce((s, c) => s + c.vendidas, 0);
  const totalP = principales.reduce((s, c) => s + c.planificadas, 0);

  const ws = wb.addWorksheet('Resumen');
  [14, 14, 14, 14, 14, 14, 14, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  encabezado(ws, 'Ventas y agotamiento', d.etiqueta, 8);
  let f = kpis(ws, INICIO, [['COMBOS VENDIDOS', totalV], ['PLANIFICADOS', totalP], ['CONSUMO', totalP ? Math.round((1000 * totalV) / totalP) / 1000 : '—']]);
  if (totalP) ws.getCell(INICIO + 1, 5).numFmt = '0.0%';
  const colCat = [
    { t: 'Menú', v: (x) => x.categoria, izq: true, w: 18, cat: true },
    { t: 'Días', v: (x) => x.dias, w: 13 },
    { t: 'Precio promedio', v: (x) => (x.precio_promedio ? Number(x.precio_promedio) : null), fmt: '"$"#,##0', w: 16 },
    { t: 'Vendidas', v: (x) => x.vendidas, w: 12 },
    { t: 'Planificadas', v: (x) => x.planificadas, w: 14 },
    { t: 'Consumo', v: (x) => pct(x.porcentaje_consumo), fmt: FMT_PCT, w: 12 },
    { t: 'Días agotado', v: (x) => x.dias_agotado, w: 14 },
    { t: '% días agotado', v: (x) => pct(x.porcentaje_agotado), fmt: FMT_PCT, w: 15 },
  ];
  f = tabla(ws, f, colCat, principales);
  const colExtra = [{ t: 'Hora agotado', v: (x) => x.hora_agotamiento }, { t: 'Ritmo (u/h)', v: (x) => x.ritmo_hora }];
  subtitulo(ws, f, 'Hora de agotamiento y ritmo por menú');
  tabla(ws, f + 1, [{ t: 'Menú', v: (x) => x.categoria, izq: true, cat: true }, ...colExtra], principales);
  f += principales.length + 4;
  if (graficos && principales.length) {
    const img1 = await graficoBarras({
      titulo: 'Vendidas vs planificadas por menú', etiquetas: principales.map((c) => c.categoria),
      series: [{ nombre: 'Planificadas', valores: principales.map((c) => c.planificadas), color: '#B8C2D6' }, { nombre: 'Vendidas', valores: principales.map((c) => c.vendidas), color: '#1F3864' }],
    });
    imagen(wb, ws, img1, 0, f - 1, 620, 290);
    const img2 = await graficoBarras({
      titulo: 'Consumo por menú (%)', etiquetas: principales.map((c) => c.categoria), sufijo: '',
      series: [{ nombre: 'Consumo %', valores: principales.map((c) => c.porcentaje_consumo || 0), color: principales.map((c) => COLORES[c.categoria] || '#1F3864') }],
    });
    imagen(wb, ws, img2, 6, f - 1, 620, 290);
  }

  const wp = wb.addWorksheet('Preparaciones');
  encabezado(wp, 'Preparaciones', d.etiqueta, 8);
  tabla(wp, INICIO, [
    { t: 'Preparación', v: (x) => x.nombre, izq: true, w: 36 },
    { t: 'Tipo', v: (x) => (x.componente === 'Plato Principal' ? 'Plato principal' : x.componente), izq: true, w: 18 },
    { t: 'Días en menú', v: (x) => x.dias, w: 14 },
    { t: 'Vendidas', v: (x) => x.vendidas, w: 12 },
    { t: 'Planificadas', v: (x) => x.planificadas, w: 14 },
    { t: 'Consumo', v: (x) => pct(x.porcentaje_consumo), fmt: FMT_PCT, w: 12 },
    { t: 'Días agotado', v: (x) => x.dias_agotado, w: 14 },
    { t: 'Hora de agotamiento', v: (x) => x.hora_agotamiento, w: 20 },
    { t: 'Ritmo (u/h)', v: (x) => x.ritmo_hora, w: 12 },
  ], detalle.preparaciones);
  wp.views = [{ showGridLines: false, state: 'frozen', ySplit: INICIO }];

  const wh = wb.addWorksheet('Ventas por hora');
  encabezado(wh, 'Ventas por hora', d.etiqueta, 4);
  const fh = tabla(wh, INICIO, [{ t: 'Hora', v: (x) => `${String(x.hora).padStart(2, '0')}:00`, w: 12 }, { t: 'Unidades', v: (x) => x.unidades, w: 14 }], detalle.ventas_por_hora);
  if (graficos && detalle.ventas_por_hora.length) {
    imagen(wb, wh, await graficoBarras({
      titulo: 'Unidades vendidas por hora', etiquetas: detalle.ventas_por_hora.map((h) => `${String(h.hora).padStart(2, '0')}h`),
      series: [{ nombre: 'Unidades', valores: detalle.ventas_por_hora.map((h) => h.unidades), color: '#F5A623' }],
    }), 3, INICIO - 1, 640, 300);
  }
  void fh;

  if (general?.platos?.length) {
    const wg = wb.addWorksheet('Informe general');
    const ig = encabezado(wg, 'Informe general', `${d.etiqueta} · Qué se agota más rápido · ${general.resumen.jornadas_cerradas} jornada(s) cerrada(s)`, 7);
    tabla(wg, ig, [
      { t: 'Preparación', v: (x) => x.nombre, izq: true, w: 36 },
      { t: 'Jornadas', v: (x) => x.jornadas, w: 12 },
      { t: 'Días agotado', v: (x) => x.dias_agotado, w: 14 },
      { t: '% agotado', v: (x) => pct(x.porcentaje_agotado), fmt: FMT_PCT, w: 12 },
      { t: 'Minutos hasta agotarse', v: (x) => x.minutos_hasta_agotarse, w: 22 },
      { t: 'Vendidas por jornada', v: (x) => x.vendidas_por_jornada, w: 20 },
      { t: 'Sobrante promedio', v: (x) => x.sobrante_promedio, w: 18 },
    ], general.platos);
  }
  if (detalle.por_dia?.length) {
    const wd = wb.addWorksheet('Día a día');
    encabezado(wd, 'Día a día', d.etiqueta, 6);
    const cols = [
      { t: 'Menú', v: (x) => x.categoria, izq: true, w: 16, cat: true },
      { t: 'Vendidas', v: (x) => x.vendidas, w: 12 },
      { t: 'Planificadas', v: (x) => x.planificadas, w: 14 },
      { t: 'Precio', v: (x) => (x.precio ? Number(x.precio) : null), fmt: '"$"#,##0', w: 12 },
      { t: 'Hora agotado', v: (x) => x.hora_agotado, w: 14 },
    ];
    const dias = [...new Set(detalle.por_dia.map((x) => String(x.fecha).slice(0, 10)))].sort();
    let fd = INICIO;
    dias.forEach((dia) => {
      wd.getRow(fd).height = 23.25;
      wd.mergeCells(fd, 1, fd, 5);
      const c = wd.getCell(fd, 1);
      c.value = fechaConDia(dia);
      c.font = { name: FUENTE, size: 13, bold: true, color: { argb: 'FF000000' } };
      c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      for (let k = 1; k <= 5; k++) wd.getCell(fd, k).fill = relleno(CLARO);
      fd = tabla(wd, fd + 1, cols, detalle.por_dia.filter((x) => String(x.fecha).slice(0, 10) === dia));
    });
  }
  await guardar(wb, nombreArchivoAnalisis('ventas_y_agotamiento', d.desde, d.hasta, 'xlsx'));
}

export async function excelGeneral(d) {
  const wb = await nuevoLibro();
  const g = d.general;
  const ws = wb.addWorksheet('Informe general');
  const ini = encabezado(ws, 'Informe general', `${d.etiqueta} · Qué se agota más rápido · ${g.resumen.jornadas_cerradas} jornada(s) cerrada(s) · ${g.resumen.con_conteo_de_cocina} con conteo de cocina`, 7);
  const f = tabla(ws, ini, [
    { t: 'Preparación', v: (x) => x.nombre, izq: true, w: 36 },
    { t: 'Jornadas', v: (x) => x.jornadas, w: 12 },
    { t: 'Días agotado', v: (x) => x.dias_agotado, w: 14 },
    { t: '% agotado', v: (x) => pct(x.porcentaje_agotado), fmt: FMT_PCT, w: 12 },
    { t: 'Minutos hasta agotarse', v: (x) => x.minutos_hasta_agotarse, w: 22 },
    { t: 'Vendidas por jornada', v: (x) => x.vendidas_por_jornada, w: 20 },
    { t: 'Sobrante promedio', v: (x) => x.sobrante_promedio, w: 18 },
  ], g.platos);
  const top = g.platos.slice(0, 10);
  if (top.length) {
    imagen(wb, ws, await graficoBarras({
      titulo: '% de jornadas en que se agotó (top 10)', etiquetas: top.map((p) => p.nombre),
      series: [{ nombre: '% agotado', valores: top.map((p) => p.porcentaje_agotado || 0), color: '#D11B1B' }], ancho: 1000, alto: 380,
    }), 0, f, 760, 290);
  }
  await guardar(wb, nombreArchivoAnalisis('informe_general', d.desde, d.hasta, 'xlsx'));
}

const ESTADO = { vigente: 'Vigente', editada: 'Editada (versión anterior)', eliminada: 'Eliminada por el estudiante' };
export const resumirOpiniones = (ops) => {
  const porPrep = new Map();
  ops.forEach((o) => {
    const x = porPrep.get(o.id_preparacion) || { nombre: o.preparacion, total: 0, vigentes: 0, suma: 0, eliminadas: 0, editadas: 0, comentarios: 0 };
    x.total += 1;
    if (o.estado === 'vigente') { x.vigentes += 1; x.suma += o.estrellas; }
    if (o.estado === 'eliminada') x.eliminadas += 1;
    if (o.estado === 'editada') x.editadas += 1;
    if (o.comentario) x.comentarios += 1;
    porPrep.set(o.id_preparacion, x);
  });
  const estrellas = [1, 2, 3, 4, 5].map((n) => ops.filter((o) => o.estado === 'vigente' && o.estrellas === n).length);
  return { filas: [...porPrep.values()].map((x) => ({ ...x, promedio: x.vigentes ? Math.round((10 * x.suma) / x.vigentes) / 10 : null })).sort((a, b) => b.total - a.total), estrellas };
};
const marca = (m) => (m ? String(m).replace('T', ' ').slice(0, 16) : '');

export async function excelOpiniones(d, { graficos = true } = {}) {
  const wb = await nuevoLibro();
  const ws = wb.addWorksheet('Opiniones');
  const ini = encabezado(ws, 'Opiniones', `${d.etiqueta} · ${d.opiniones.length} opinión(es) de los estudiantes`, 10);
  tabla(ws, ini, [
    { t: 'Fecha', v: (o) => marca(o.creado_en), w: 18 },
    { t: 'Estudiante', v: (o) => o.autor, izq: true, w: 26 },
    { t: 'Correo', v: (o) => o.correo, izq: true, w: 32 },
    { t: 'Preparación', v: (o) => o.preparacion, izq: true, w: 30 },
    { t: 'Menú', v: (o) => o.categoria || 'Sin registrar', w: 14, cat: true },
    { t: 'Fecha del menú', v: (o) => (o.fecha_menu ? String(o.fecha_menu).slice(0, 10) : 'Sin registrar'), w: 16 },
    { t: 'Estrellas', v: (o) => o.estrellas, w: 10 },
    { t: 'Comentario', v: (o) => o.comentario, izq: true, w: 60, envolver: true },
    { t: 'Estado', v: (o) => ESTADO[o.estado], izq: true, w: 28, chip: (o) => ({ vigente: 'verde', editada: 'naranja', eliminada: 'rojo' }[o.estado]) },
    { t: 'Cerrada el', v: (o) => marca(o.cerrada_en), w: 18 },
  ], d.opiniones);
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: ini }];
  ws.autoFilter = { from: { row: ini, column: 1 }, to: { row: ini + d.opiniones.length, column: 10 } };

  const { filas, estrellas } = resumirOpiniones(d.opiniones);
  const wp = wb.addWorksheet('Por preparación');
  encabezado(wp, 'Por preparación', d.etiqueta, 7);
  tabla(wp, INICIO, [
    { t: 'Preparación', v: (x) => x.nombre, izq: true, w: 36 },
    { t: 'Opiniones', v: (x) => x.total, w: 12 },
    { t: 'Vigentes', v: (x) => x.vigentes, w: 12 },
    { t: 'Promedio (vigentes)', v: (x) => x.promedio, w: 20 },
    { t: 'Con comentario', v: (x) => x.comentarios, w: 16 },
    { t: 'Editadas', v: (x) => x.editadas, w: 12 },
    { t: 'Eliminadas', v: (x) => x.eliminadas, w: 12 },
  ], filas);
  const we = wb.addWorksheet('Estrellas');
  encabezado(we, 'Estrellas', d.etiqueta, 3);
  tabla(we, INICIO, [{ t: 'Estrellas', v: (x) => x.n, w: 12 }, { t: 'Opiniones', v: (x) => x.c, w: 12 }], estrellas.map((c, i) => ({ n: i + 1, c })));
  if (graficos) {
    imagen(wb, we, await graficoBarras({
      titulo: 'Opiniones vigentes por cantidad de estrellas', etiquetas: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
      series: [{ nombre: 'Opiniones', valores: estrellas, color: ['#D11B1B', '#E8743B', '#F5A623', '#8DB255', '#3C7424'] }], ancho: 720, alto: 360,
    }), 3, INICIO - 1, 560, 280);
    const top = filas.filter((x) => x.promedio != null).sort((a, b) => b.promedio - a.promedio).slice(0, 10);
    if (top.length) {
      imagen(wb, wp, await graficoBarras({
        titulo: 'Promedio de estrellas por preparación (top 10)', etiquetas: top.map((x) => x.nombre),
        series: [{ nombre: 'Promedio', valores: top.map((x) => x.promedio), color: '#F5A623' }], ancho: 1000, alto: 380,
      }), 0, filas.length + 6, 760, 290);
    }
  }
  const fav = d.favoritos;
  if (fav) {
    const wf = wb.addWorksheet('Favoritos');
    const inf = encabezado(wf, 'Favoritos', `${d.etiqueta} · ${fav.resumen.total} marca(s) de ${fav.resumen.estudiantes} estudiante(s)`, 5);
    const ff = tabla(wf, inf, [{ t: 'Preparación', v: (x) => x.nombre, izq: true, w: 36 }, { t: 'Favoritos', v: (x) => x.total, w: 12 }], fav.por_preparacion);
    tabla(wf, ff + 1, [
      { t: 'Preparación', v: (x) => x.preparacion, izq: true, w: 36 }, { t: 'Estudiante', v: (x) => x.autor, izq: true, w: 26 },
      { t: 'Correo', v: (x) => x.correo, izq: true, w: 32 }, { t: 'Fecha', v: (x) => marca(x.creado_en), w: 18 },
    ], fav.favoritos);
    const top = fav.por_preparacion.slice(0, 10);
    if (graficos && top.length) {
      imagen(wb, wf, await graficoBarras({
        titulo: 'Preparaciones más marcadas como favoritas (top 10)', etiquetas: top.map((x) => x.nombre),
        series: [{ nombre: 'Favoritos', valores: top.map((x) => x.total), color: '#D11B1B' }], ancho: 1000, alto: 380,
      }), 6, inf - 1, 760, 290);
    }
  }
  await guardar(wb, nombreArchivoAnalisis('opiniones', d.desde, d.hasta, 'xlsx'));
}
