import { useState, useEffect, useCallback, useRef } from 'react';
import {
  consultarPlanificacion, listarPreparaciones, agregarComponente, actualizarComponente,
  quitarComponente, publicarMenu, despublicarMenu, consultarMes, copiarMenus, consultarSugerencias,
} from '../api/gestion';
import { hoyChile, colorDeCategoria } from '../utils/formato';
import Mensaje from '../components/Mensaje';
import CampoFecha from '../components/CampoFecha';
import { Utensils, Ticket, Leaf, Salad, CakeSlice, CupSoda } from 'lucide-react';

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
const corta = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

function TarjetaRanura({ titulo, Icono, color, esPlato, tipo, categoria, componente, preparaciones, precioSugerido, sugerencia, simulado, dia, ocupado, onGuardar, onQuitar, onCambio }) {
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
        <Icono size={22} />
        <span>{titulo.toUpperCase()}</span>
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
            <span>Cantidad planificada</span>
            <input type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
          {esPlato ? (
            <label className="campo">
              <span>Precio del combo (CLP)</span>
              <input type="number" min="0" step="1" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </label>
          ) : (
            <p className="texto-suave plan-incluido">Incluido en el precio del combo.</p>
          )}
        </div>
        {sugerencia && (
          <p className="plan-sugerencia">
            Sugerido: <strong>{sugerencia.sugerido}</strong>
            {sugerencia.n != null && (
              <span className="texto-suave"> · {sugerencia.base === 'mismo_dia' ? `últimos ${sugerencia.n} ${dia}s` : `últimos ${sugerencia.n} días`} (rango {sugerencia.minimo}–{sugerencia.maximo})</span>
            )}
            {' '}
            <button type="button" className="boton boton-secundario boton-chico" onClick={() => setCantidad(String(sugerencia.sugerido))}>Usar</button>
            {simulado && <span className="insignia insignia-aviso" style={{ marginLeft: 8 }}>datos simulados</span>}
          </p>
        )}
        <div className="celda-acciones">
          <button className="boton boton-primario" disabled={ocupado || incompleta || sinCambios}
            onClick={() => onGuardar({ tipo, categoria, componente, id_preparacion: Number(idPreparacion), cantidad: Number(cantidad), precio: esPlato ? Number(precio) : undefined })}>
            {componente ? 'Guardar cambios' : 'Agregar'}
          </button>
          {componente && (
            <button className="boton boton-peligro" disabled={ocupado} onClick={() => onQuitar(componente)}>Quitar</button>
          )}
        </div>
      </div>
    </article>
  );
}

function PanelCopiar({ fecha, onCopiado, onCerrar }) {
  const [modo, setModo] = useState('dia');
  const [destino, setDestino] = useState(sumarDias(fecha, 7));
  const [sobrescribir, setSobrescribir] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  async function copiar() {
    setOcupado(true);
    setError(null);
    try {
      const pares = modo === 'dia'
        ? [{ origen: fecha, destino }]
        : [0, 1, 2, 3, 4, 5].map((i) => ({ origen: sumarDias(lunesDe(fecha), i), destino: sumarDias(lunesDe(destino), i) }));
      const r = await copiarMenus(pares, sobrescribir);
      const omitidos = r.omitidos.filter((o) => modo === 'dia' || !/no tiene menú/.test(o.motivo));
      const detalle = omitidos.length ? ` Omitidos: ${omitidos.map((o) => `${corta(o.fecha)} (${o.motivo.replace(/\.$/, '')})`).join('; ')}.` : '';
      onCopiado(`Se copiaron ${r.copiados} día(s); quedaron sin publicar.${detalle}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="tarjeta">
      <h2>Copiar menú</h2>
      <div className="en-linea" style={{ marginBottom: 10 }}>
        <label className="campo-check"><input type="radio" name="modo-copia" checked={modo === 'dia'} onChange={() => setModo('dia')} />
          <span>Este día ({nombreDia(fecha)} {corta(fecha)})</span></label>
        <label className="campo-check"><input type="radio" name="modo-copia" checked={modo === 'semana'} onChange={() => setModo('semana')} />
          <span>Toda la semana (lunes a sábado)</span></label>
      </div>
      <div className="en-linea">
        <label className="campo campo-en-linea">
          <span>{modo === 'dia' ? 'Copiar a la fecha' : 'A la semana que contiene el'}</span>
          <CampoFecha value={destino} onChange={(v) => v && setDestino(v)} ariaLabel="Fecha de destino" />
        </label>
        <label className="campo-check">
          <input type="checkbox" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} />
          <span>Reemplazar lo que ya esté cargado</span>
        </label>
      </div>
      {error && <div className="mensaje mensaje-error" role="alert" style={{ marginTop: 10 }}>{error}</div>}
      <div className="en-linea" style={{ marginTop: 12 }}>
        <button className="boton boton-primario" disabled={ocupado} onClick={copiar}>{ocupado ? 'Copiando…' : 'Copiar'}</button>
        <button className="boton boton-secundario" onClick={onCerrar}>Cancelar</button>
      </div>
    </div>
  );
}

function VistaMes({ mes, onCambiarMes, onElegir, version }) {
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
  const titulo = new Date(Date.UTC(anio, m - 1, 1)).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <>
      <div className="barra-herramientas">
        <div className="en-linea">
          <button className="boton boton-secundario" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
          <strong style={{ textTransform: 'capitalize' }}>{titulo}</strong>
          <button className="boton boton-secundario" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
        </div>
        <span className="texto-suave">Haz clic en un día para planificarlo.</span>
      </div>
      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      <div className="mes-grid">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((n) => <div key={n} className="mes-cabeza">{n}</div>)}
        {semanas.flat().map((f, i) => {
          if (!f) return <div key={`v${i}`} className="mes-celda vacia-fuera" />;
          const info = mapa.get(f);
          const principales = (info?.componentes || []).filter((c) => c.componente === 'Plato Principal');
          return (
            <button key={f} type="button" className={`mes-celda ${f === hoyChile() ? 'hoy' : ''}`} onClick={() => onElegir(f)}>
              <span className="mes-dia">{Number(f.slice(8))}</span>
              {info
                ? <span className={`insignia ${info.publicado ? 'insignia-ok' : 'insignia-neutra'}`}>{info.publicado ? 'Publicado' : 'Borrador'}</span>
                : <span className="texto-suave" style={{ margin: 0 }}>Sin menú</span>}
              {principales.map((c) => (
                <span key={c.categoria} className="mes-plato"><i style={{ background: colorDeCategoria(c.categoria).color }} />{c.preparacion}</span>
              ))}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function PlanificacionPage() {
  const [fecha, setFecha] = useState(hoyChile());
  const [vista, setVista] = useState('dia');
  const [mes, setMes] = useState(hoyChile().slice(0, 7));
  const [version, setVersion] = useState(0);
  const [plan, setPlan] = useState(null);
  const [sugerencias, setSugerencias] = useState(null);
  const [preparaciones, setPreparaciones] = useState([]);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiando, setCopiando] = useState(false);
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

  return (
    <>
      <div className="barra-herramientas">
        <div className="barra-estado">
          <label className="campo campo-en-linea">
            <span>Fecha del menú</span>
            <CampoFecha value={fecha} onChange={(v) => v && setFecha(v)} ariaLabel="Fecha del menú" />
          </label>
          <div className="segmentado" role="group" aria-label="Vista">
            <button className={vista === 'dia' ? 'activo' : ''} onClick={() => setVista('dia')}>Día</button>
            <button className={vista === 'mes' ? 'activo' : ''} onClick={() => { setMes(fecha.slice(0, 7)); setVista('mes'); }}>Mes</button>
          </div>
          <button className="boton boton-secundario" onClick={() => setCopiando(!copiando)}>Copiar…</button>
        </div>

        {vista === 'dia' && (
          <div className="barra-estado">
            {plan?.menu && (
              <span className={`insignia ${publicado ? 'insignia-ok' : 'insignia-neutra'}`}>
                {publicado ? 'Publicado' : 'Sin publicar'}
              </span>
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
        )}
      </div>

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

      {copiando && (
        <PanelCopiar fecha={fecha} onCerrar={() => setCopiando(false)}
          onCopiado={(m) => { setCopiando(false); setAviso(m); setVersion((v) => v + 1); cargar(); }} />
      )}

      {vista === 'mes' && (
        <VistaMes mes={mes} onCambiarMes={setMes} version={version} onElegir={(f) => { setFecha(f); setVista('dia'); }} />
      )}

      {vista === 'dia' && (
        <>
          {plan && faltantes > 0 && (
            <Mensaje tipo="aviso">
              Faltan {faltantes} de 7 componentes para completar el día.
            </Mensaje>
          )}
          {!plan && !error && <div className="estado-info">Cargando planificación…</div>}

          {plan && (
            <>
              <section className="plan-seccion">
                <div className="plan-seccion-cabeza">
                  <div>
                    <h2>Platos principales</h2>
                    <p className="texto-suave">Un plato por categoría, cada uno con su precio. El precio propuesto es el último usado en esa categoría.</p>
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
                        sugerencia={sugeridaDe(categoria)} simulado={sugerencias?.contiene_simulados} dia={dia}
                        ocupado={ocupado} onGuardar={guardar} onQuitar={quitar}
                        onCambio={registrarCambioTarjeta}
                      />
                    );
                  })}
                </div>
              </section>

              <section className="plan-seccion">
                <h2>Acompañamientos</h2>
                <p className="texto-suave">Iguales para las cuatro categorías: se sirven con todos los combos del día. La cantidad sugerida es la suma de las cuatro categorías.</p>
                <div className="plan-grid plan-grid-3">
                  {ACOMPANAMIENTOS.map(({ tipo, Icono, color }) => {
                    const comp = buscar(tipo, null);
                    return (
                      <TarjetaRanura
                        key={`${tipo}-${comp?.id_menu_preparacion ?? 'nuevo'}-${comp?.id_preparacion}-${comp?.cantidad_planificada}-${sugerencias?.compartidos?.sugerido}`}
                        titulo={tipo} Icono={Icono} color={color}
                        esPlato={false} tipo={tipo} componente={comp}
                        preparaciones={preparaciones} sugerencia={sugerencias?.compartidos || null}
                        simulado={sugerencias?.contiene_simulados} dia={dia}
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
      )}
    </>
  );
}