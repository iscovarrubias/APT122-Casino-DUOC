import {
  categoriasDelPeriodo, estiloCategoria, principalesDe, combosDe, diasDelPeriodo, totalesDelPeriodo,
  nombreLargo, encabezadoDia, rangoSemana, nombreTipo, lineasIncluye, nombreArchivo,
} from './exportarMenu';

const NARANJA = 'FFEA7A12';
const OSCURO = 'FF2B2B2B';
const GRIS_TEXTO = 'FF6B7280';
const GRIS_FONDO = 'FFF2F2F2';
const DURAZNO = 'FFFCD5B5';
const LINEA = 'FF4F6228';
const LINEA_CAL = 'FF1B2123';
const FUENTE = 'Calibri';

const rgb = (hex) => `FF${hex}`;
const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const lado = (argb) => ({ style: 'thin', color: { argb } });
const caja = (argb) => ({ top: lado(argb), left: lado(argb), bottom: lado(argb), right: lado(argb) });
const fmtPrecio = '"$"#,##0';

async function cargarLogo(wb) {
  try {
    const resp = await fetch('/logo-excel.png');
    if (!resp.ok) return null;
    return wb.addImage({ buffer: await resp.arrayBuffer(), extension: 'png' });
  } catch {
    return null;
  }
}

function banner(ws, { ultimaCol, colMes, mes, filaAlta, filaLogo, anchoTexto }) {
  ws.getRow(1).height = filaLogo;
  ws.getRow(2).height = filaAlta;
  const [c1, c2] = anchoTexto;
  ws.mergeCells(2, c1, 2, c2);
  const t = ws.getCell(2, c1);
  t.value = {
    richText: [
      { text: 'PLANIFICACIÓN\n', font: { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } } },
      { text: 'Almuerzos', font: { name: FUENTE, size: 28, bold: true, italic: true, color: { argb: NARANJA } } },
    ],
  };
  t.alignment = { vertical: 'bottom', horizontal: 'left', wrapText: true };
  ws.mergeCells(2, colMes, 2, ultimaCol);
  const m = ws.getCell(2, colMes);
  m.value = mes;
  m.font = { name: FUENTE, size: 20, bold: true, color: { argb: NARANJA } };
  m.alignment = { vertical: 'bottom', horizontal: 'right' };
}

function configurarPagina(ws, pie) {
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  ws.headerFooter = { oddFooter: `&L${pie}&RPágina &P de &N` };
  ws.views = [{ showGridLines: false }];
}

function hojaCalendario(wb, p, logo) {
  const ws = wb.addWorksheet('Calendario');
  const anchos = [3, 19.6, 35.9, 35.7, 33.9, 32.4, 32.4, 33, 3];
  anchos.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const fondoBanner = relleno(GRIS_FONDO);

  banner(ws, { ultimaCol: 8, colMes: 6, mes: p.etiquetaMes, filaAlta: 64, filaLogo: 49.5, anchoTexto: [2, 5] });
  for (let r = 1; r <= 2; r++) for (let c = 1; c <= 9; c++) ws.getCell(r, c).fill = fondoBanner;
  if (logo !== null) ws.addImage(logo, { tl: { col: 4.15, row: 0.1 }, ext: { width: 170, height: 58 } });
  ws.getRow(3).height = 10;

  const cats = categoriasDelPeriodo(p);
  let fila = 4;
  p.semanas.forEach((s, idx) => {
    ws.getRow(fila).height = 38;
    const cab = ws.getCell(fila, 2);
    cab.value = p.modo === 'mes' ? `Semana\n${rangoSemana(s)}` : '';
    cab.font = { name: FUENTE, size: 10, bold: true, color: { argb: GRIS_TEXTO } };
    cab.alignment = { vertical: 'middle', wrapText: true };
    s.dias.forEach((d, i) => {
      const c = ws.getCell(fila, 3 + i);
      c.value = d.fuera ? '' : encabezadoDia(d.fecha);
      c.font = { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } };
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
    });
    for (let c = 2; c <= 8; c++) ws.getCell(fila, c).border = { top: lado(LINEA_CAL), bottom: lado(LINEA_CAL), ...(c === 2 ? { left: lado(LINEA_CAL) } : {}), ...(c === 8 ? { right: lado(LINEA_CAL) } : {}) };
    fila += 1;

    cats.forEach((cat) => {
      const est = estiloCategoria(cat);
      ws.getRow(fila).height = 54;
      const et = ws.getCell(fila, 2);
      et.value = cat;
      et.font = { name: FUENTE, size: 14, bold: true, color: { argb: rgb(est.texto) } };
      et.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      s.dias.forEach((d, i) => {
        const c = ws.getCell(fila, 3 + i);
        const plato = d.fuera ? null : principalesDe(d).find((x) => x.categoria === cat);
        c.value = plato ? plato.preparacion : '—';
        c.font = plato ? { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } } : { name: FUENTE, size: 11, color: { argb: 'FFC4C4C4' } };
        c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
      });
      for (let c = 2; c <= 8; c++) {
        const celda = ws.getCell(fila, c);
        celda.fill = relleno(rgb(est.fila));
        celda.border = { bottom: lado(rgb(est.texto)), ...(c === 2 ? { left: lado(LINEA_CAL) } : {}), ...(c === 8 ? { right: lado(LINEA_CAL) } : {}) };
      }
      fila += 1;
    });

    const maxLineas = Math.max(3, ...s.dias.map((d) => (d.fuera ? 0 : lineasIncluye(d).length)));
    ws.getRow(fila).height = Math.max(78.75, maxLineas * 22);
    const inc = ws.getCell(fila, 2);
    inc.value = 'Incluye';
    inc.font = { name: FUENTE, size: 14, bold: true, color: { argb: 'FFEFA018' } };
    inc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    s.dias.forEach((d, i) => {
      const c = ws.getCell(fila, 3 + i);
      const lineas = d.fuera ? [] : lineasIncluye(d);
      if (!lineas.length) {
        c.value = '—';
        c.font = { name: FUENTE, size: 11, color: { argb: 'FFC4C4C4' } };
      } else {
        c.value = {
          richText: lineas.flatMap((l, k) => {
            const [rotulo, ...resto] = l.split(': ');
            return [
              { text: `${rotulo}: `, font: { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } } },
              { text: `${resto.join(': ')}${k < lineas.length - 1 ? '\n' : ''}`, font: { name: FUENTE, size: 11, color: { argb: OSCURO } } },
            ];
          }),
        };
      }
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
    });
    for (let c = 2; c <= 8; c++) {
      ws.getCell(fila, c).border = { bottom: lado(LINEA_CAL), ...(c === 2 ? { left: lado(LINEA_CAL) } : {}), ...(c === 8 ? { right: lado(LINEA_CAL) } : {}) };
    }
    fila += 1;
    ws.getRow(fila).height = 14;
    if (p.modo === 'mes' && (idx + 1) % 2 === 0 && idx < p.semanas.length - 1) ws.getRow(fila).addPageBreak();
    fila += 1;
  });

  ws.mergeCells(fila, 2, fila, 8);
  const nota = ws.getCell(fila, 2);
  nota.value = 'Menús son referenciales y pueden sufrir modificaciones por stock de productos*';
  nota.font = { name: FUENTE, size: 11, italic: true, color: { argb: GRIS_TEXTO } };
  nota.alignment = { horizontal: 'right', vertical: 'middle' };
  for (let c = 2; c <= 8; c++) ws.getCell(fila, c).fill = fondoBanner;
  ws.getRow(fila).height = 20;
  configurarPagina(ws, 'Planifica tu almuerzo');
  ws.pageSetup.printArea = `A1:I${fila}`;
}

function chipEstado(d) {
  if (!d.tiene) return { texto: 'Sin menú', color: GRIS_TEXTO, fondo: GRIS_FONDO };
  if (d.publicado) return { texto: 'Publicado', color: 'FF2E6B1F', fondo: 'FFE1EFD8' };
  return { texto: 'Borrador', color: 'FF9A5B00', fondo: 'FFFDECD2' };
}

function encabezadoHoja(ws, p, logo, titulo, anchos, colLogo) {
  anchos.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  banner(ws, { ultimaCol: 5, colMes: 4, mes: p.etiquetaMes, filaAlta: 66.75, filaLogo: 45.75, anchoTexto: [1, 3] });
  ws.getCell(2, 4).font = { name: FUENTE, size: 18, bold: true, color: { argb: NARANJA } };
  ws.getRow(3).height = 26;
  ws.mergeCells(3, 1, 3, 5);
  const sub = ws.getCell(3, 1);
  sub.value = `${titulo}  ·  ${p.subtitulo}`;
  sub.font = { name: FUENTE, size: 12, bold: true, color: { argb: OSCURO } };
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  for (let c = 1; c <= 5; c++) { ws.getCell(3, c).fill = relleno(GRIS_FONDO); ws.getCell(3, c).border = caja(LINEA); }
  ws.getRow(4).height = 8;
  if (logo !== null) ws.addImage(logo, { tl: { col: colLogo, row: 0.1 }, ext: { width: 170, height: 58 } });
}

function hojaDetalle(wb, p, logo) {
  const ws = wb.addWorksheet('Detalle por día');
  encabezadoHoja(ws, p, logo, 'Detalle de preparaciones por día', [20, 18, 44, 14, 20], 2.19);
  let f = 5;
  const dias = diasDelPeriodo(p);
  dias.forEach((d) => {
    ws.getRow(f).height = 26;
    ws.mergeCells(f, 1, f, 3);
    const t = ws.getCell(f, 1);
    t.value = nombreLargo(d.fecha);
    t.font = { name: FUENTE, size: 13, bold: true, color: { argb: 'FF000000' } };
    t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 3; c++) ws.getCell(f, c).fill = relleno(GRIS_FONDO);
    ws.mergeCells(f, 4, f, 5);
    const chip = chipEstado(d);
    const e = ws.getCell(f, 4);
    e.value = chip.texto;
    e.font = { name: FUENTE, size: 10, bold: true, color: { argb: chip.color } };
    e.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getCell(f, 4).fill = relleno(chip.fondo);
    ws.getCell(f, 5).fill = relleno(chip.fondo);
    f += 1;

    if (!d.tiene) {
      ws.mergeCells(f, 1, f, 5);
      const s = ws.getCell(f, 1);
      s.value = 'Sin menú programado para este día.';
      s.font = { name: FUENTE, size: 11, italic: true, color: { argb: GRIS_TEXTO } };
      s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      for (let c = 1; c <= 5; c++) ws.getCell(f, c).border = caja(LINEA);
      ws.getRow(f).height = 22;
      f += 2;
      return;
    }

    ws.getRow(f).height = 20;
    ['Componente', 'Categoría', 'Preparación', 'Cantidad', 'Precio del combo'].forEach((h, i) => {
      const c = ws.getCell(f, i + 1);
      c.value = h;
      c.font = { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } };
      c.alignment = { vertical: 'middle', horizontal: i >= 3 ? 'center' : 'left', indent: i >= 3 ? 0 : 1 };
      c.fill = relleno(DURAZNO);
      c.border = caja(LINEA);
    });
    f += 1;

    const inicio = f;
    let finPrincipales = f - 1;
    d.comps.forEach((c) => {
      const esPrincipal = c.tipo === 'Plato Principal';
      ws.getRow(f).height = 21;
      const vals = [nombreTipo(c.tipo), esPrincipal ? c.categoria : 'Compartido', c.preparacion, c.cantidad, esPrincipal ? c.precio : 'Incluido en el combo'];
      vals.forEach((v, i) => {
        const cel = ws.getCell(f, i + 1);
        cel.value = v;
        cel.border = caja(LINEA);
        cel.font = { name: FUENTE, size: 11, color: { argb: 'FF1F2937' } };
        cel.alignment = { vertical: 'middle', horizontal: i >= 3 ? 'center' : 'left', wrapText: i === 2, indent: i >= 3 ? 0 : 1 };
      });
      const cat = ws.getCell(f, 2);
      if (esPrincipal) {
        const est = estiloCategoria(c.categoria);
        cat.font = { name: FUENTE, size: 11, bold: true, color: { argb: rgb(est.texto) } };
        cat.fill = relleno(rgb(est.etiqueta));
        finPrincipales = f;
      } else {
        cat.font = { name: FUENTE, size: 11, color: { argb: GRIS_TEXTO } };
      }
      ws.getCell(f, 4).font = { name: FUENTE, size: 11, bold: true, color: { argb: 'FF1F2937' } };
      const precio = ws.getCell(f, 5);
      if (esPrincipal) { precio.numFmt = fmtPrecio; } else { precio.font = { name: FUENTE, size: 9, italic: true, color: { argb: GRIS_TEXTO } }; }
      f += 1;
    });

    ws.getRow(f).height = 22;
    ws.mergeCells(f, 1, f, 3);
    const tot = ws.getCell(f, 1);
    tot.value = 'Combos planificados del día';
    tot.font = { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } };
    tot.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    const suma = ws.getCell(f, 4);
    suma.value = finPrincipales >= inicio ? { formula: `SUM(D${inicio}:D${finPrincipales})`, result: combosDe(d) } : 0;
    suma.font = { name: FUENTE, size: 11, bold: true, color: { argb: OSCURO } };
    suma.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 5; c++) { ws.getCell(f, c).fill = relleno(DURAZNO); ws.getCell(f, c).border = caja(LINEA); }
    f += 2;
  });
  configurarPagina(ws, 'Detalle de preparaciones por día');
  ws.pageSetup.printArea = `A1:E${f}`;
}

function hojaTotal(wb, p, logo) {
  const ws = wb.addWorksheet('Total a preparar');
  encabezadoHoja(ws, p, logo, 'Total a preparar', [18, 44, 18, 16, 46], 1.94);
  const fila = 6;
  ws.getRow(fila).height = 24;
  ['Tipo', 'Preparación', 'Categoría', 'Cantidad total', 'Días en que se sirve'].forEach((h, i) => {
    const c = ws.getCell(fila, i + 1);
    c.value = h;
    c.font = { name: FUENTE, size: 12, bold: true, color: { argb: OSCURO } };
    c.alignment = { vertical: 'middle', horizontal: i === 3 ? 'center' : 'left', indent: i === 3 ? 0 : 1 };
    c.fill = relleno(DURAZNO);
    c.border = caja(LINEA);
  });
  let f = fila + 1;
  totalesDelPeriodo(p).forEach((t) => {
    const esPrincipal = t.tipo === 'Plato Principal';
    const largo = t.textoDias.length > 46 ? Math.ceil(t.textoDias.length / 46) : 1;
    ws.getRow(f).height = Math.max(21.95, 16 * largo + 6);
    const vals = [nombreTipo(t.tipo), t.preparacion, esPrincipal ? t.categoria : 'Compartido', t.total, t.textoDias];
    vals.forEach((v, i) => {
      const c = ws.getCell(f, i + 1);
      c.value = v;
      c.border = caja(LINEA);
      c.font = { name: FUENTE, size: 11, color: { argb: 'FF1F2937' } };
      c.alignment = { vertical: 'middle', horizontal: i === 3 ? 'center' : 'left', wrapText: i === 1 || i === 4, indent: i === 3 ? 0 : 1 };
    });
    ws.getCell(f, 4).font = { name: FUENTE, size: 12, bold: true, color: { argb: OSCURO } };
    ws.getCell(f, 5).font = { name: FUENTE, size: 10, color: { argb: GRIS_TEXTO } };
    const cat = ws.getCell(f, 3);
    if (esPrincipal) {
      const est = estiloCategoria(t.categoria);
      cat.font = { name: FUENTE, size: 11, bold: true, color: { argb: rgb(est.texto) } };
      cat.fill = relleno(rgb(est.etiqueta));
    } else {
      cat.font = { name: FUENTE, size: 11, color: { argb: GRIS_TEXTO } };
    }
    f += 1;
  });
  configurarPagina(ws, 'Total a preparar');
  ws.pageSetup.printArea = `A1:E${f}`;
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportarExcel(periodo) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Casinos DUOC UC';
  const logo = await cargarLogo(wb);
  hojaCalendario(wb, periodo, logo);
  hojaDetalle(wb, periodo, logo);
  hojaTotal(wb, periodo, logo);
  const buffer = await wb.xlsx.writeBuffer();
  descargarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    nombreArchivo(periodo, '', 'xlsx'),
  );
}
