import { useEffect, useRef, useState } from 'react';
import { Heart, BarChart3, Clock, ListChecks, MessageSquareText, Star, Table2 } from 'lucide-react';
import ExportarVentana from './ExportarVentana';
import CampoFecha from './CampoFecha';
import { descargarBlob } from '../utils/exportarExcel';
import { sumarDias, lunesDe, ultimoDiaMes, sumarMeses, nombreMes, etiquetaRango } from '../utils/periodos';
import {
  cargarVentas, cargarOpinionesExport, cargarGeneral, excelVentas, excelOpiniones, excelGeneral, nombreArchivoAnalisis,
} from '../utils/exportarAnalisis';
import {
  HojaVentasResumen, HojaVentasHora, HojaPreparaciones, HojaGeneral, HojaOpinionesResumen, HojaOpinionesLista, HojaFavoritos,
} from './HojasAnalisis';

const TIPOS = {
  ventas: {
    titulo: 'Exportar ventas y agotamiento',
    excel: 'Hojas con resumen, preparaciones, ventas por hora, informe general y día a día, con sus gráficos.',
    imagenes: {
      resumen: { etiqueta: 'Comparación entre menús', ayuda: 'KPIs y tabla de Principal, JUNAEB, Vegetariano e Hipocalórico', Icono: BarChart3, Hoja: HojaVentasResumen, ancho: 1100 },
      hora: { etiqueta: 'Ventas por hora', ayuda: 'Gráfico de barras por hora del día', Icono: Clock, Hoja: HojaVentasHora, ancho: 900 },
      preparaciones: { etiqueta: 'Preparaciones', ayuda: 'Tabla con las preparaciones más vendidas', Icono: ListChecks, Hoja: HojaPreparaciones, ancho: 1100 },
    },
    cargar: (desde, hasta) => cargarVentas(desde, hasta),
    excelFn: (d) => excelVentas(d),
    parte: 'ventas_y_agotamiento',
  },
  general: {
    titulo: 'Exportar informe general',
    excel: 'La tabla de qué se agota más rápido y un gráfico con las 10 preparaciones que más se agotan.',
    imagenes: {
      general: { etiqueta: 'Informe general', ayuda: 'Qué se agota más rápido en el período', Icono: Table2, Hoja: HojaGeneral, ancho: 1100 },
    },
    cargar: (desde, hasta) => cargarGeneral(desde, hasta),
    excelFn: (d) => excelGeneral(d),
    parte: 'informe_general',
  },
  opiniones: {
    titulo: 'Exportar opiniones',
    excel: 'Todas las opiniones con correo y estado, resumen por preparación, estrellas y favoritos, con gráficos.',
    imagenes: {
      resumen: { etiqueta: 'Resumen de opiniones', ayuda: 'KPIs, estrellas y promedio por preparación', Icono: Star, Hoja: HojaOpinionesResumen, ancho: 1000 },
      favoritos: { etiqueta: 'Favoritos', ayuda: 'Las preparaciones más marcadas como favoritas', Icono: Heart, Hoja: HojaFavoritos, ancho: 1000 },
      lista: { etiqueta: 'Comentarios', ayuda: 'Las opiniones con comentario, una por una', Icono: MessageSquareText, Hoja: HojaOpinionesLista, ancho: 1000 },
    },
    cargar: (desde, hasta, extra) => cargarOpinionesExport(desde, hasta, extra),
    excelFn: (d) => excelOpiniones(d),
    parte: 'opiniones',
  },
};

export default function ExportarAnalisis({ tipo, desdeInicial, hastaInicial, onCerrar }) {
  const conf = TIPOS[tipo];
  const [modo, setModo] = useState('rango');
  const [ancla, setAncla] = useState(hastaInicial);
  const [desdeR, setDesdeR] = useState(desdeInicial);
  const [hastaR, setHastaR] = useState(hastaInicial);
  const [imagenElegida, setImagenElegida] = useState(Object.keys(conf.imagenes)[0]);
  const [conEliminadas, setConEliminadas] = useState(true);
  const [soloComentario, setSoloComentario] = useState(false);
  const [trabajando, setTrabajando] = useState(null);
  const [error, setError] = useState(null);
  const [captura, setCaptura] = useState(null);
  const refHoja = useRef(null);

  const mes = ancla.slice(0, 7);
  const lunes = lunesDe(ancla);
  let desde = desdeR; let hasta = hastaR;
  if (modo === 'semana') { desde = lunes; hasta = sumarDias(lunes, 5); }
  if (modo === 'mes') { desde = `${mes}-01`; hasta = ultimoDiaMes(mes); }
  const extra = tipo === 'opiniones' ? { estado: conEliminadas ? '' : 'vigente', soloComentario } : undefined;

  const mover = (n) => setAncla((a) => (modo === 'mes' ? `${sumarMeses(a.slice(0, 7), n)}-01` : sumarDias(a, 7 * n)));

  async function excel() {
    setTrabajando('excel'); setError(null);
    try { await conf.excelFn(await conf.cargar(desde, hasta, extra)); }
    catch (err) { setError(err.message || 'No se pudo generar el Excel.'); }
    finally { setTrabajando(null); }
  }

  async function imagen() {
    setTrabajando('imagen'); setError(null);
    try { setCaptura({ datos: await conf.cargar(desde, hasta, extra), clave: imagenElegida }); }
    catch (err) { setError(err.message || 'No se pudo preparar la imagen.'); setTrabajando(null); }
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
        const escala = Math.max(0.6, Math.min(2, 14000 / nodo.scrollHeight));
        const url = await toPng(nodo, { pixelRatio: escala, backgroundColor: '#ffffff', skipFonts: true, cacheBust: false });
        const blob = await (await fetch(url)).blob();
        if (activo) descargarBlob(blob, nombreArchivoAnalisis(`${conf.parte}_${captura.clave}`, captura.datos.desde, captura.datos.hasta, 'png'));
      } catch (err) {
        if (activo) setError(err.message || 'No se pudo generar la imagen.');
      } finally {
        if (activo) { setCaptura(null); setTrabajando(null); }
      }
    })();
    return () => { activo = false; };
  }, [captura, conf.parte]);

  const hojaActiva = conf.imagenes[captura?.clave || imagenElegida];
  const Hoja = hojaActiva.Hoja;

  const selector = (
    <>
      {modo !== 'rango' && <button type="button" className="exv-flecha" onClick={() => mover(-1)} aria-label={modo === 'mes' ? 'Mes anterior' : 'Semana anterior'}>‹</button>}
      {modo === 'semana' && (
        <label className="campo"><span>Semana del</span>
          <CampoFecha value={ancla} onChange={(v) => v && setAncla(v)} ariaLabel="Día de la semana a exportar" /></label>
      )}
      {modo === 'mes' && <strong>{nombreMes(mes)}</strong>}
      {modo === 'rango' && (
        <>
          <label className="campo"><span>Desde</span><CampoFecha value={desdeR} max={hastaR} onChange={(v) => v && setDesdeR(v)} ariaLabel="Exportar desde" /></label>
          <label className="campo"><span>Hasta</span><CampoFecha value={hastaR} min={desdeR} onChange={(v) => v && setHastaR(v)} ariaLabel="Exportar hasta" /></label>
        </>
      )}
      {modo !== 'rango' && <button type="button" className="exv-flecha" onClick={() => mover(1)} aria-label={modo === 'mes' ? 'Mes siguiente' : 'Semana siguiente'}>›</button>}
    </>
  );

  return (
    <>
      <ExportarVentana
        titulo={conf.titulo}
        onCerrar={onCerrar}
        trabajando={trabajando}
        error={error}
        onErrorCerrar={() => setError(null)}
        modos={[{ id: 'semana', texto: 'Semana' }, { id: 'mes', texto: 'Mes' }, { id: 'rango', texto: 'Rango' }]}
        modo={modo}
        onModo={setModo}
        selector={selector}
        resumen={etiquetaRango(desde, hasta)}
        extras={tipo === 'opiniones' && (
          <div className="exv-extras">
            <label className="campo-check"><input type="checkbox" checked={conEliminadas} onChange={(e) => setConEliminadas(e.target.checked)} /><span>Incluir eliminadas y editadas</span></label>
            <label className="campo-check"><input type="checkbox" checked={soloComentario} onChange={(e) => setSoloComentario(e.target.checked)} /><span>Solo con comentario</span></label>
          </div>
        )}
        excelNota={conf.excel}
        imagenes={conf.imagenes}
        imagenElegida={imagenElegida}
        onElegirImagen={setImagenElegida}
        onDescargar={(formato) => (formato === 'excel' ? excel() : imagen())}
      />
      {captura && (
        <div className="hx-oculto" aria-hidden="true">
          <div ref={refHoja} style={{ width: hojaActiva.ancho }}>
            <Hoja d={captura.datos} />
          </div>
        </div>
      )}
    </>
  );
}
