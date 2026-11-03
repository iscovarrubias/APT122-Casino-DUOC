import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ListChecks, ClipboardList } from 'lucide-react';
import ExportarVentana from './ExportarVentana';
import CampoFecha from './CampoFecha';
import { cargarPeriodo, nombreArchivo } from '../utils/exportarMenu';
import { exportarExcel, descargarBlob } from '../utils/exportarExcel';
import { HojaCalendario, HojaDetalle, HojaTotal } from './HojasMenu';

const HOJAS = {
  calendario: { etiqueta: 'Hoja de calendario', ayuda: 'Los almuerzos de cada día en una grilla', Icono: CalendarDays, Hoja: HojaCalendario, ancho: 1400 },
  detalle: { etiqueta: 'Detalle por día', ayuda: 'Cada día con cantidades y precios', Icono: ListChecks, Hoja: HojaDetalle, ancho: 960 },
  total: { etiqueta: 'Total a preparar', ayuda: 'Suma de cada preparación del período', Icono: ClipboardList, Hoja: HojaTotal, ancho: 1100 },
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const sumar = (f, n) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const lunesDe = (f) => { const d = new Date(`${f}T12:00:00Z`).getUTCDay(); return sumar(f, d === 0 ? -6 : 1 - d); };
const etiquetaDia = (f) => `${Number(f.slice(8))} ${MESES[Number(f.slice(5, 7)) - 1].slice(0, 3)}`;

export default function ExportarMenu({ fecha: fechaInicial, mes, vistaMes, onCerrar }) {
  const [fecha, setFecha] = useState(vistaMes ? `${mes}-${fechaInicial.slice(0, 7) === mes ? fechaInicial.slice(8) : '01'}` : fechaInicial);
  const [modo, setModo] = useState(vistaMes ? 'mes' : 'semana');
  const [hoja, setHoja] = useState('calendario');
  const [trabajando, setTrabajando] = useState(null);
  const [error, setError] = useState(null);
  const [captura, setCaptura] = useState(null);
  const refHoja = useRef(null);

  const mesBase = fecha.slice(0, 7);
  const mover = (dias) => setFecha((f) => sumar(f, dias));
  const moverMes = (n) => setFecha((f) => new Date(Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1 + n, 1, 12)).toISOString().slice(0, 10));
  const lunes = lunesDe(fecha);
  const mesTexto = `${MESES[Number(mesBase.slice(5, 7)) - 1]} de ${mesBase.slice(0, 4)}`;
  const nombreMes = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);

  async function excel() {
    setTrabajando('excel');
    setError(null);
    try {
      await exportarExcel(await cargarPeriodo({ modo, fecha, mes: mesBase }));
    } catch (err) {
      setError(err.message || 'No se pudo generar el Excel.');
    } finally {
      setTrabajando(null);
    }
  }

  async function imagen() {
    setTrabajando('imagen');
    setError(null);
    try {
      const periodo = await cargarPeriodo({ modo, fecha, mes: mesBase });
      setCaptura({ periodo, hoja });
    } catch (err) {
      setError(err.message || 'No se pudo preparar la imagen.');
      setTrabajando(null);
    }
  }

  useEffect(() => {
    if (!captura) return undefined;
    let activo = true;
    (async () => {
      try {
        const { toPng } = await import('html-to-image');
        await document.fonts?.ready;
        const nodo = refHoja.current;
        await Promise.all([...nodo.querySelectorAll('img')].map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const alto = nodo.scrollHeight;
        const escala = Math.max(0.6, Math.min(2, 14000 / alto));
        const url = await toPng(nodo, { pixelRatio: escala, backgroundColor: '#ffffff', skipFonts: true, cacheBust: false });
        const blob = await (await fetch(url)).blob();
        if (activo) descargarBlob(blob, nombreArchivo(captura.periodo, captura.hoja === 'calendario' ? 'calendario' : captura.hoja === 'detalle' ? 'detalle_por_dia' : 'total_a_preparar', 'png'));
      } catch (err) {
        if (activo) setError(err.message || 'No se pudo generar la imagen.');
      } finally {
        if (activo) { setCaptura(null); setTrabajando(null); }
      }
    })();
    return () => { activo = false; };
  }, [captura]);

  const { Hoja, ancho } = HOJAS[captura?.hoja || hoja];

  const selector = (
    <>
      <button type="button" className="exv-flecha" onClick={() => (modo === 'mes' ? moverMes(-1) : mover(-7))}
        aria-label={modo === 'mes' ? 'Mes anterior' : 'Semana anterior'}>‹</button>
      {modo === 'semana' ? (
        <label className="campo"><span>Semana del</span>
          <CampoFecha value={fecha} onChange={(v) => v && setFecha(v)} ariaLabel="Día de la semana a exportar" /></label>
      ) : (
        <strong>{nombreMes}</strong>
      )}
      <button type="button" className="exv-flecha" onClick={() => (modo === 'mes' ? moverMes(1) : mover(7))}
        aria-label={modo === 'mes' ? 'Mes siguiente' : 'Semana siguiente'}>›</button>
    </>
  );

  return (
    <>
      <ExportarVentana
        titulo="Exportar menú"
        onCerrar={onCerrar}
        trabajando={trabajando}
        error={error}
        onErrorCerrar={() => setError(null)}
        modos={[{ id: 'semana', texto: 'Semana' }, { id: 'mes', texto: 'Mes completo' }]}
        modo={modo}
        onModo={setModo}
        selector={selector}
        resumen={modo === 'semana' ? `${etiquetaDia(lunes)} al ${etiquetaDia(sumar(lunes, 5))}` : nombreMes}
        excelNota="Un archivo con 3 hojas: calendario, detalle por día y total a preparar."
        imagenes={HOJAS}
        imagenElegida={hoja}
        onElegirImagen={setHoja}
        onDescargar={(formato) => (formato === 'excel' ? excel() : imagen())}
      />
      {captura && (
        <div className="hx-oculto" aria-hidden="true">
          <div ref={refHoja} style={{ width: ancho }}>
            <Hoja periodo={captura.periodo} />
          </div>
        </div>
      )}
    </>
  );
}
