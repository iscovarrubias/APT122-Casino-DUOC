import { useState, useEffect, useCallback, useRef } from 'react';
import {
  consultarPlanificacion, listarPreparaciones, agregarComponente, actualizarComponente,
  quitarComponente, publicarMenu, despublicarMenu, consultarMes, copiarMenus, consultarSugerencias,
} from '../api/gestion';
import { hoyChile, colorDeCategoria } from '../utils/formato';
import Mensaje from '../components/Mensaje';
import CampoFecha from '../components/CampoFecha';
import Ayuda from '../components/Ayuda';
import ExportarMenu from '../components/ExportarMenu';
import { Utensils, Ticket, Leaf, Salad, CakeSlice, CupSoda, Copy, Download, X, BarChart3, Trash2 } from 'lucide-react';
import Cargando from '../components/Cargando';

const PRINCIPALES = [
  { categoria: 'Principal', Icono: Utensils },
  { categoria: 'JUNAEB', Icono: Ticket },
  { categoria: 'Vegetariano', Icono: Leaf },
  { categoria: 'Hipocalórico', Icono: Salad },
];

const ACOMPANAMIENTOS = [
  { tipo: 'Entrada', Icono: Salad, color: '#318386' },
  { tipo: 'Postre', Icono: CakeSlice, color: '#B15FBB' },
  { tipo: 'Bebida', Icono: CupSoda, color: '#4C8FD1' },
];

const aTexto = (v) => (v === null || v === undefined || v === '' ? '' : String(Number(v)));
const sumarDias = (f, n) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const lunesDe = (f) => { const d = new Date(`${f}T12:00:00Z`).getUTCDay(); return sumarDias(f, d === 0 ? -6 : 1 - d); };
const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const nombreDia = (f) => NOMBRES_DIA[(new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7];
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const nombreLargo = (f) => { const d = nombreDia(f); return `${d.charAt(0).toUpperCase()}${d.slice(1)} ${Number(f.slice(8))} de ${MESES_L[Number(f.slice(5, 7)) - 1]}`; };
function etiquetaRelativa(f) {
  const hoy = hoyChile();
  const dif = Math.round((new Date(`${f}T12:00:00Z`) - new Date(`${hoy}T12:00:00Z`)) / 86400000);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Mañana';
  if (dif === -1) return 'Ayer';
  return dif > 0 ? `En ${dif} días` : `Hace ${-dif} días`;
}
const corta = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

function TarjetaRanura({ titulo, Icono, color, esPlato, tipo, categoria, componente, preparaciones, precioSugerido, sugerencia, dia, ocupado, onGuardar, onQuitar, onCambio }) {
  const precioActual = aTexto(componente?.precio);
  const [idPreparacion, setIdPreparacion] = useState(componente ? String(componente.id_preparacion) : '');
  const [cantidad, setCantidad] = useState(componente ? String(componente.cantidad_planificada) : '');
  const [precio, setPrecio] = useState(componente ? precioActual : aTexto(precioSugerido));

  useEffect(() => {
    if (onCambio) onCambio({ tipo: esPlato ? 'Plato Principal' : tipo, categoria, idPreparacion, cantidad, precio: esPlato ? precio : undefined });
  }, [idPreparacion, cantidad, precio, tipo, categoria, esPlato, onCambio]);

  const activas = preparaciones.filter((p) => p.activa && (esPlato ? (!p.tipo || p.tipo === 'Plato Principal') : p.tipo === tipo));
  const actual = componente && !activas.some((p) => p.id_preparacion === componente.id_preparacion)
    ? { id_preparacion: componente.id_preparacion, nombre: `${componente.preparacion} (desactivada)` }
    : null;

  const precioInvalido = esPlato && (precio === '' || isNaN(Number(precio)) || Number(precio) < 0);
  const incompleta = !idPreparacion || cantidad === '' || !Number.isInteger(Number(cantidad)) || Number(cantidad) < 0 || precioInvalido;
  const sinCambios = componente
    && String(componente.id_preparacion) === idPreparacion
    && String(componente.cantidad_planificada) === cantidad
    && (!esPlato || precioActual === precio);

  return (
    <article className="plan-card" style={{ '--acento': color }}>
      <header className="plan-card-cabeza">
        <Icono size={18} />
        <span>{titulo}</span>
        {componente && <span className="plan-card-estado">Cargado</span>}
      </header>
      <div className="plan-card-cuerpo">
        <label className="campo">
          <span>{esPlato ? 'Plato' : tipo}</span>
          <select value={idPreparacion} onChange={(e) => setIdPreparacion(e.target.value)} aria-label={`Preparación para ${titulo}`}>
            <option value="">Elegir preparación</option>
            {actual && <option value={actual.id_preparacion}>{actual.nombre}</option>}
            {activas.map((p) => <option key={p.id_preparacion} value={p.id_preparacion}>{p.nombre}</option>)}
          </select>
        </label>
        <div className="plan-campos">
          <label className="campo">
            <span>{esPlato ? 'Cantidad planificada' : 'Cantidad'}</span>
            <input type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
          {esPlato ? (
            <label className="campo">
              <span>Precio del combo (CLP)</span>
              <input type="number" min="0" step="1" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </label>
          ) : (
            <p className="plan-incluido">Incluido en el precio del combo.</p>
          )}
        </div>
        {sugerencia && (
          <p className="plan-sugerencia" title={sugerencia.n != null ? `Rango probable: ${sugerencia.minimo}–${sugerencia.maximo}` : undefined}>
            <BarChart3 size={14} aria-hidden="true" />
            <span>
              Sugerido: <strong>{sugerencia.sugerido}</strong>
              {sugerencia.n != null && (
                <span className="texto-suave">{sugerencia.base === 'mismo_dia' ? `últimos ${sugerencia.n} ${/s$/.test(dia) ? dia : `${dia}s`}` : `últimos ${sugerencia.n} días`}</span>
              )}
            </span>
            <button type="button" className="boton-texto" onClick={() => setCantidad(String(sugerencia.sugerido))}>Usar</button>
          </p>
        )}
        <div className="plan-acciones">
          <button className="boton boton-primario" disabled={ocupado || incompleta || sinCambios}
            onClick={() => onGuardar({ tipo, categoria, componente, id_preparacion: Number(idPreparacion), cantidad: Number(cantidad), precio: esPlato ? Number(precio) : undefined })}>
            {componente ? 'Guardar cambios' : 'Agregar'}
          </button>
          {componente && (
            <button type="button" className="plan-quitar" disabled={ocupado} onClick={() => onQuitar(componente)}
              aria-label={`Quitar ${titulo} del menú`} title="Quitar del menú">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function etiquetaCopia(tipo, f) {
  if (!f) return null;
  if (tipo === 'semana') return `Semana del ${nombreDia(lunesDe(f))} ${corta(lunesDe(f))}`;
  return `${nombreDia(f)} ${corta(f)}`;
}

function PanelCopiar({ copia, onCambiar, onCopiado, onCerrar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const { tipo, origen, destino, paso, sobrescribir } = copia;
  const listo = origen && destino;
  const esSemana = tipo === 'semana';

  async function pegar() {
    setOcupado(true);
    setError(null);
    try {
      const pares = esSemana
        ? [0, 1, 2, 3, 4, 5].map((i) => ({ origen: sumarDias(lunesDe(origen), i), destino: sumarDias(lunesDe(destino), i) }))
        : [{ origen, destino }];
      const r = await copiarMenus(pares, sobrescribir);
      const omitidos = r.omitidos.filter((o) => !esSemana || !/no tiene menú/.test(o.motivo));
      const detalle = omitidos.length ? ` Omitidos: ${omitidos.map((o) => `${corta(o.fecha)} (${o.motivo.replace(/\.$/, '')})`).join('; ')}.` : '';
      onCopiado(`Se copiaron ${r.copiados} día(s); quedaron sin publicar.${detalle}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const paso1 = (
    <button type="button" className={`copia-paso ${paso === 'origen' ? 'activo' : ''} ${origen ? 'hecho' : ''}`}
      onClick={() => onCambiar({ paso: 'origen' })}>
      <span className="copia-num">{origen ? '✓' : '1'}</span>
      <span className="copia-texto">
        <strong>Copiar</strong>
        <span>{origen ? etiquetaCopia(tipo, origen) : `Elige ${esSemana ? 'la semana' : 'el día'} en el calendario`}</span>
      </span>
    </button>
  );
  const paso2 = (
    <button type="button" className={`copia-paso ${paso === 'destino' ? 'activo' : ''} ${destino ? 'hecho' : ''}`}
      disabled={!origen} onClick={() => onCambiar({ paso: 'destino' })}>
      <span className="copia-num">{destino ? '✓' : '2'}</span>
      <span className="copia-texto">
        <strong>Pegar en</strong>
        <span>{destino ? etiquetaCopia(tipo, destino) : `Elige ${esSemana ? 'la semana' : 'el día'} de destino`}</span>
      </span>
    </button>
  );

  return (
    <div className="tarjeta copia-panel">
      <div className="copia-cabeza">
        <h2>Copiar y pegar menú</h2>
        <div className="segmentado" role="group" aria-label="Qué copiar">
          <button type="button" className={!esSemana ? 'activo' : ''}
            onClick={() => onCambiar({ tipo: 'dia', origen: null, destino: null, paso: 'origen' })}>Un día</button>
          <button type="button" className={esSemana ? 'activo' : ''}
            onClick={() => onCambiar({ tipo: 'semana', origen: null, destino: null, paso: 'origen' })}>Una semana</button>
        </div>
      </div>
      <p className="texto-suave copia-ayuda">
        {paso === 'origen'
          ? `Paso 1: haz clic en ${esSemana ? 'cualquier día de la semana' : 'el día'} que quieres copiar. Solo se pueden elegir los que ya tienen menú.`
          : `Paso 2: haz clic en ${esSemana ? 'cualquier día de la semana' : 'el día'} donde quieres pegarlo. Puedes cambiar de mes con las flechas.`}
      </p>
      <div className="copia-pasos">{paso1}<span className="copia-flecha" aria-hidden="true">→</span>{paso2}</div>
      <label className="campo-check">
        <input type="checkbox" checked={sobrescribir} onChange={(e) => onCambiar({ sobrescribir: e.target.checked })} />
        <span>Reemplazar lo que ya esté cargado en el destino</span>
      </label>
      {error && <Mensaje tipo="error" style={{ marginTop: 10 }} onCerrar={() => setError(null)}>{error}</Mensaje>}
      <div className="en-linea" style={{ marginTop: 12 }}>
        <button className="boton boton-primario" disabled={!listo || ocupado} onClick={pegar}>{ocupado ? 'Pegando…' : 'Pegar'}</button>
        <button className="boton boton-secundario" onClick={onCerrar}>Cancelar</button>
      </div>
    </div>
  );
}

function VistaMes({ mes, onCambiarMes, onElegir, version, copia }) {
  const [dias, setDias] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setDias(null);
    consultarMes(mes).then((d) => { if (activo) { setDias(d.dias); setError(null); } }).catch((e) => { if (activo) setError(e.message); });
    return () => { activo = false; };
  }, [mes, version]);

  const [anio, m] = mes.split('-').map(Number);
  const total = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  const semanas = [];
  let semana = null;
  for (let d = 1; d <= total; d++) {
    const fecha = `${mes}-${String(d).padStart(2, '0')}`;
    const dow = (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7;
    if (dow === 6) continue;
    if (!semana || dow === 0) { semana = Array(6).fill(null); semanas.push(semana); }
    semana[dow] = fecha;
  }
  const mapa = new Map((dias || []).map((d) => [d.fecha, d]));
  const mover = (n) => onCambiarMes(new Date(Date.UTC(anio, m - 1 + n, 1)).toISOString().slice(0, 7));
  const tituloMes = new Date(Date.UTC(anio, m - 1, 1)).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const titulo = tituloMes.charAt(0).toUpperCase() + tituloMes.slice(1);

  return (
    <>
      <div className="barra-herramientas">
        <div className="en-linea">
          <button className="boton boton-secundario" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
          <strong>{titulo}</strong>
          <button className="boton boton-secundario" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
        </div>
        <span className="texto-suave">{copia ? 'Modo copiar y pegar: sigue los pasos de arriba.' : 'Haz clic en un día para planificarlo.'}</span>
      </div>
      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      <div className="mes-grid">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((n) => <div key={n} className="mes-cabeza">{n}</div>)}
        {semanas.flat().map((f, i) => {
          if (!f) return <div key={`v${i}`} className="mes-celda vacia-fuera" />;
          const info = mapa.get(f);
          const principales = (info?.componentes || [])
            .filter((c) => c.componente === 'Plato Principal')
            .sort((x, y) => PRINCIPALES.findIndex((q) => q.categoria === x.categoria) - PRINCIPALES.findIndex((q) => q.categoria === y.categoria));
          const claveSel = (x) => (copia?.tipo === 'semana' ? lunesDe(x) : x);
          const esOrigen = copia?.origen && claveSel(f) === claveSel(copia.origen);
          const esDestino = copia?.destino && claveSel(f) === claveSel(copia.destino);
          const semanaConMenu = semanas.some((fila) => fila.includes(f) && fila.some((x) => x && mapa.get(x)));
          const bloqueada = copia?.paso === 'origen' && !(copia.tipo === 'semana' ? semanaConMenu : info);
          const clases = ['mes-celda', f === hoyChile() ? 'hoy' : '', copia ? 'mes-celda--copia' : '',
            esOrigen ? 'sel-origen' : '', esDestino ? 'sel-destino' : '', bloqueada ? 'bloqueada' : ''].filter(Boolean).join(' ');
          return (
            <button key={f} type="button" className={clases} disabled={bloqueada}
              onClick={() => (copia ? onElegir(f, true) : onElegir(f))}>
              {esOrigen && <span className="mes-etiqueta mes-etiqueta--origen">Copiar</span>}
              {esDestino && <span className="mes-etiqueta mes-etiqueta--destino">Pegar aquí</span>}
              <span className="mes-fila">
                <span className="mes-dia">{Number(f.slice(8))}</span>
                <span className={`mes-estado-txt ${info ? (info.publicado ? 'pub' : 'bor') : 'sin'}`}>
                  {info ? (info.publicado ? 'Publicado' : 'Borrador') : 'Sin menú'}
                </span>
              </span>
              {principales.map((c) => (
                <span key={c.categoria} className="mes-pildora" style={{ '--acento': colorDeCategoria(c.categoria).color }} title={`${c.categoria}: ${c.preparacion}`}>{c.preparacion}</span>
              ))}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function PlanificacionPage() {
  const [fechaBase, setFecha] = useState(hoyChile());
  const [fechaModal, setFechaModal] = useState(null);
  const fecha = fechaModal || fechaBase;
  const modalDia = !!fechaModal;
  const [vista, setVista] = useState('dia');
  const [mes, setMes] = useState(hoyChile().slice(0, 7));
  const [version, setVersion] = useState(0);
  const [plan, setPlan] = useState(null);
  const [sugerencias, setSugerencias] = useState(null);
  const [preparaciones, setPreparaciones] = useState([]);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [copia, setCopia] = useState(null);
  const cambiarCopia = (cambios) => setCopia((c) => (c ? { ...c, ...cambios } : c));
  function elegirParaCopia(f) {
    setCopia((c) => {
      if (!c) return c;
      if (c.paso === 'origen') return { ...c, origen: f, destino: null, paso: 'destino' };
      return { ...c, destino: f };
    });
  }
  const [guardandoTodo, setGuardandoTodo] = useState(false);
  const estadosTarjetas = useRef({});
  const registrarCambioTarjeta = useCallback((estado) => {
    const clave = `${estado.tipo}-${estado.categoria || 'sin'}`;
    estadosTarjetas.current[clave] = estado;
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [p, lista, sug] = await Promise.all([
        consultarPlanificacion(fecha), listarPreparaciones(), consultarSugerencias(fecha).catch(() => null),
      ]);
      setPlan(p);
      setPreparaciones(lista);
      setSugerencias(sug);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [fecha]);

  useEffect(() => {
    setPlan(null);
    setAviso(null);
    cargar();
  }, [cargar]);

  async function ejecutar(accion, mensajeOk) {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await accion();
      await cargar();
      setVersion((v) => v + 1);
      setAviso(mensajeOk);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const guardar = ({ tipo, categoria, componente, id_preparacion, cantidad, precio }) =>
    ejecutar(
      () => (componente
        ? actualizarComponente(componente.id_menu_preparacion, { id_preparacion, cantidad_planificada: cantidad, ...(precio !== undefined ? { precio } : {}) })
        : agregarComponente({
            fecha, id_preparacion, cantidad_planificada: cantidad,
            tipo_componente: tipo, categoria: categoria || undefined, ...(precio !== undefined ? { precio } : {}),
          })),
      'Cambios guardados.'
    );

  const quitar = (componente) => {
    if (!window.confirm(`¿Quitar "${componente.preparacion}" del menú? Se pierde su historial de disponibilidad de ese día.`)) return;
    return ejecutar(() => quitarComponente(componente.id_menu_preparacion), 'Componente quitado.');
  };

  const buscar = (tipo, categoria) =>
    plan?.componentes.find((c) => c.componente === tipo && (c.categoria || null) === (categoria || null));

  async function guardarTodo() {
    setError(null);
    setAviso(null);

    const faltantes = [];
    const aGuardar = [];

    for (const r of [...PRINCIPALES, ...ACOMPANAMIENTOS]) {
      const tipo = r.tipo || 'Plato Principal';
      const categoria = r.categoria || null;
      const nombre = r.categoria ? `Plato principal · ${r.categoria}` : r.tipo;
      const clave = `${tipo}-${categoria || 'sin'}`;
      const estado = estadosTarjetas.current[clave];

      if (!estado || !estado.idPreparacion) {
        faltantes.push(`${nombre}: falta el plato`);
        continue;
      }
      const cantidadNum = Number(estado.cantidad);
      if (estado.cantidad === '' || !Number.isInteger(cantidadNum) || cantidadNum < 0) {
        faltantes.push(`${nombre}: falta la cantidad`);
        continue;
      }
      if (tipo === 'Plato Principal') {
        const precioNum = Number(estado.precio);
        if (estado.precio === '' || isNaN(precioNum) || precioNum < 0) {
          faltantes.push(`${nombre}: falta el precio`);
          continue;
        }
      }

      const componente = buscar(tipo, categoria);
      aGuardar.push({
        tipo, categoria, componente,
        id_preparacion: Number(estado.idPreparacion),
        cantidad: cantidadNum,
        precio: tipo === 'Plato Principal' ? Number(estado.precio) : undefined,
      });
    }

    if (faltantes.length > 0) {
      setError(`No se agregó nada. Falta: ${faltantes.join(', ')}.`);
      return;
    }

    setGuardandoTodo(true);
    try {
      for (const item of aGuardar) {
        if (item.componente) {
          await actualizarComponente(item.componente.id_menu_preparacion, {
            id_preparacion: item.id_preparacion,
            cantidad_planificada: item.cantidad,
            ...(item.precio !== undefined ? { precio: item.precio } : {}),
          });
        } else {
          await agregarComponente({
            fecha,
            id_preparacion: item.id_preparacion,
            cantidad_planificada: item.cantidad,
            tipo_componente: item.tipo,
            categoria: item.categoria || undefined,
            ...(item.precio !== undefined ? { precio: item.precio } : {}),
          });
        }
      }
      await cargar();
      setVersion((v) => v + 1);
      setAviso(`${aGuardar.length} cambio(s) guardado(s).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoTodo(false);
    }
  }

  const sugeridaDe = (categoria) => sugerencias?.categorias.find((c) => c.categoria === categoria)?.estimacion || null;

  const faltantes = plan ? Math.max(7 - plan.componentes.length, 0) : 0;
  const publicado = !!plan?.menu?.publicado;
  const dia = nombreDia(fecha);

  const cerrarModalDia = () => { setFechaModal(null); setVersion((v) => v + 1); };
  const barraPublicar = (
          <div className="barra-estado">
      {plan?.menu && (
        <span className={`v2-estado ${publicado ? '' : 'inactivo'}`}>{publicado ? 'Publicado' : 'Sin publicar'}</span>
      )}
      {plan?.menu && (
        <button
          className={`boton ${publicado ? 'boton-secundario' : 'boton-primario'}`}
          disabled={ocupado}
          onClick={() => ejecutar(
            () => (publicado ? despublicarMenu(plan.menu.id_menu) : publicarMenu(plan.menu.id_menu)),
            publicado ? 'Menú despublicado.' : 'Menú publicado. Ya lo ven los estudiantes.'
          )}
        >
          {publicado ? 'Despublicar menú' : 'Publicar menú'}
        </button>
      )}
    </div>
  );
  const mensajes = (
    <>
      {error && (
        <Mensaje tipo="error" autoCerrar onCerrar={() => setError(null)}>
          {error}
        </Mensaje>
      )}
      {aviso && (
        <Mensaje tipo="ok" autoCerrar onCerrar={() => setAviso(null)}>
          {aviso}
        </Mensaje>
      )}
    </>
  );
  const editorDia = (
    <>
          {plan && (
            <p className={`plan-progreso ${faltantes === 0 ? 'completo' : ''}`}>
              {faltantes === 0 ? 'Día completo: los 7 componentes están cargados.' : `Faltan ${faltantes} de 7 componentes para completar el día.`}
            </p>
          )}
          {!plan && !error && <Cargando>Cargando planificación…</Cargando>}

          {plan && (
            <>
              <section className="plan-seccion">
                <div className="plan-seccion-cabeza">
                  <div>
                    <h2>Platos principales<Ayuda titulo="Platos principales">Un plato por categoría, cada uno con su precio. El precio propuesto es el último usado en esa categoría.</Ayuda></h2>
                  </div>
                  <button
                    className="boton boton-primario"
                    onClick={guardarTodo}
                    disabled={ocupado || guardandoTodo || !plan}
                  >
                    {guardandoTodo ? 'Agregando…' : 'Agregar todo el menú'}
                  </button>
                </div>
                <div className="plan-grid">
                  {PRINCIPALES.map(({ categoria, Icono }) => {
                    const comp = buscar('Plato Principal', categoria);
                    return (
                      <TarjetaRanura
                        key={`${categoria}-${comp?.id_menu_preparacion ?? 'nuevo'}-${comp?.id_preparacion}-${comp?.cantidad_planificada}-${comp?.precio}-${sugeridaDe(categoria)?.sugerido}`}
                        titulo={categoria} Icono={Icono} color={colorDeCategoria(categoria).color}
                        esPlato tipo="Plato Principal" categoria={categoria} componente={comp}
                        preparaciones={preparaciones} precioSugerido={plan.precios_recientes?.[categoria]}
                        sugerencia={sugeridaDe(categoria)} dia={dia}
                        ocupado={ocupado} onGuardar={guardar} onQuitar={quitar}
                        onCambio={registrarCambioTarjeta}
                      />
                    );
                  })}
                </div>
              </section>

              <section className="plan-seccion">
                <h2>Acompañamientos<Ayuda titulo="Acompañamientos">Iguales para las cuatro categorías: se sirven con todos los combos del día. La cantidad sugerida es la suma de las cuatro categorías.</Ayuda></h2>
                <div className="plan-grid plan-grid-3">
                  {ACOMPANAMIENTOS.map(({ tipo, Icono, color }) => {
                    const comp = buscar(tipo, null);
                    return (
                      <TarjetaRanura
                        key={`${tipo}-${comp?.id_menu_preparacion ?? 'nuevo'}-${comp?.id_preparacion}-${comp?.cantidad_planificada}-${sugerencias?.compartidos?.sugerido}`}
                        titulo={tipo} Icono={Icono} color={color}
                        esPlato={false} tipo={tipo} componente={comp}
                        preparaciones={preparaciones} sugerencia={sugerencias?.compartidos || null}
                        dia={dia}
                        ocupado={ocupado} onGuardar={guardar} onQuitar={quitar}
                        onCambio={registrarCambioTarjeta}
                      />
                    );
                  })}
                </div>
              </section>
            </>
          )}
    </>
  );

  return (
    <div className="v2 v2-plan">
      <div className="barra-herramientas">
        <div className="barra-estado">
          <label className="campo campo-en-linea">
            <span className="v2-solo-lector">Fecha del menú</span>
            <CampoFecha value={fechaBase} onChange={(v) => v && setFecha(v)} ariaLabel="Fecha del menú" />
          </label>
          <span className={`fecha-relativa ${fechaBase === hoyChile() ? 'es-hoy' : ''}`}>{etiquetaRelativa(fechaBase)} · {nombreDia(fechaBase)}</span>
          <div className="segmentado" role="group" aria-label="Vista">
            <button className={vista === 'dia' ? 'activo' : ''} onClick={() => { setCopia(null); setVista('dia'); }}>Día</button>
            <button className={vista === 'mes' ? 'activo' : ''} onClick={() => { setMes(fechaBase.slice(0, 7)); setVista('mes'); }}>Mes</button>
          </div>
          {vista === 'mes' && (
            <button
              className={`boton boton-secundario ${copia ? 'boton-activo' : ''}`}
              title="Copiar el menú de un día o una semana a otra fecha"
              onClick={() => setCopia(copia ? null : { tipo: 'dia', origen: null, destino: null, paso: 'origen', sobrescribir: false })}
            >
              <Copy size={16} aria-hidden="true" /> Copiar y pegar
            </button>
          )}
          <button className="boton boton-secundario" title="Descargar la semana o el mes en Excel o imagen" onClick={() => setExportando(true)}>
            <Download size={16} aria-hidden="true" /> Exportar
          </button>
        </div>

        {vista === 'dia' && barraPublicar}
      </div>

      {!modalDia && mensajes}

      {exportando && <ExportarMenu fecha={fechaBase} mes={mes} vistaMes={vista === 'mes'} onCerrar={() => setExportando(false)} />}

      {copia && vista === 'mes' && (
        <PanelCopiar copia={copia} onCambiar={cambiarCopia} onCerrar={() => setCopia(null)}
          onCopiado={(m) => { setCopia(null); setAviso(m); setVersion((v) => v + 1); cargar(); }} />
      )}

      {vista === 'mes' && (
        <VistaMes mes={mes} onCambiarMes={setMes} version={version} copia={copia}
          onElegir={(f, paraCopia) => { if (paraCopia) elegirParaCopia(f); else setFechaModal(f); }} />
      )}

      {vista === 'dia' && editorDia}

      {vista === 'mes' && modalDia && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Planificar día">
          <div className="modal modal-dia">
            <div className="modal-form-cabeza">
              <div>
                <h2>{nombreLargo(fecha)}</h2>
                <span className={`fecha-relativa ${fecha === hoyChile() ? 'es-hoy' : ''}`}>{etiquetaRelativa(fecha)}</span>
              </div>
              <div className="barra-estado">
                {barraPublicar}
                <button type="button" className="prep-icono" onClick={cerrarModalDia} title="Cerrar" aria-label="Cerrar"><X size={20} /></button>
              </div>
            </div>
            <div className="modal-dia-cuerpo">
              {mensajes}
              {editorDia}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
