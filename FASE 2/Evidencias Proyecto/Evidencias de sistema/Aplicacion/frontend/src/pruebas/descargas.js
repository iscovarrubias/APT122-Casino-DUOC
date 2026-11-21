import { vi } from 'vitest';
import ExcelJS from 'exceljs';

export function capturarDescargas() {
  const descargas = [];
  const blobs = new Map();
  let contador = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    const url = `blob:prueba/${++contador}`;
    blobs.set(url, blob);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function registrar() {
    descargas.push({ nombre: this.download, blob: blobs.get(this.href) });
  });
  return descargas;
}

export function leerBlob(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = rechazar;
    lector.readAsArrayBuffer(blob);
  });
}

export async function abrirExcel(blob) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(await leerBlob(blob));
  return libro;
}

export function textosDeHoja(hoja) {
  const textos = [];
  hoja.eachRow((fila) =>
    fila.eachCell((celda) => {
      const v = celda.value;
      if (v && typeof v === 'object' && v.richText) textos.push(v.richText.map((r) => r.text).join(''));
      else if (v !== null && v !== undefined) textos.push(String(v));
    })
  );
  return textos;
}

export function simularCanvas() {
  const contexto = new Proxy(
    {},
    {
      get: (objetivo, prop) => {
        if (prop === 'measureText') return (t) => ({ width: String(t).length * 7 });
        if (prop in objetivo) return objetivo[prop];
        return () => {};
      },
      set: (objetivo, prop, valor) => {
        objetivo[prop] = valor;
        return true;
      },
    }
  );
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contexto);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    callback({ arrayBuffer: async () => png.buffer });
  });
}
