import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Download } from 'lucide-react';
import { consultarAnalisisDetalle } from '../api/gestion';
import RankingMensual from '../components/RankingMensual';
import PrediccionPanel from '../components/PrediccionPanel';
import OpinionesPanel from '../components/OpinionesPanel';
import { hoyChile, haceDiasChile, colorDeCategoria, formatearPrecio } from '../utils/formato';
import Mensaje from '../components/Mensaje';
import Ayuda from '../components/Ayuda';
import SelectorPeriodo from '../components/SelectorPeriodo';
import ExportarAnalisis from '../components/ExportarAnalisis';

const CATEGORIAS = ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];
const colorCat = (c) => (c === 'Compartido' ? '#8a94a6' : colorDeCategoria(c).color);
const num = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-CL'));
const fechaCorta = (f) => `${String(f).slice(8, 10)}/${String(f).slice(5, 7)}`;

function Barra({ porcentaje, etiqueta, color }) {
  return (
    <div className="barra" role="img" aria-label={etiqueta}>
      <div className="barra-relleno" style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

function Kpi({ titulo, valor, nota, ayuda }) {
  return (
    <div className="kpi">
      <span>{titulo}{ayuda && <Ayuda titulo={titulo}>{ayuda}</Ayuda>}</span>
      <strong>{valor}</strong>
      {nota && <small>{nota}</small>}
    </div>
  );
}

function VentasPorHora({ horas }) {
  const max = Math.max(1, ...horas.map((h) => h.unidades));
  if (!horas.length) return <p className="texto-suave">No hay ventas registradas en este rango.</p>;
  return (
    <div className="barras-horas">
      {horas.map((h) => (
        <div key={h.hora} className="barra-fila">
          <span className="barra-hora">{String(h.hora).padStart(2, '0')}:00</span>
          <Barra porcentaje={(h.unidades / max) * 100} etiqueta={`${h.unidades} unidades`} />
          <span>{num(h.unidades)}</span>
        </div>
      ))}
    </div>
  );
}

function hallazgo(filas, sujeto) {
  const con = filas.filter((f) => f.categoria !== 'Compartido' && f.ritmo_hora != null && f.vendidas > 0);
  if (con.length < 2) return null;
  const orden = [...con].sort((a, b) => b.ritmo_hora - a.ritmo_hora);
  const rapido = orden[0];
  const lento = orden[orden.length - 1];
  if (rapido.ritmo_hora < lento.ritmo_hora * 1.15) return `${sujeto} se vende a un ritmo parecido en todas las categorías (entre ${lento.ritmo_hora} y ${rapido.ritmo_hora} unidades por hora).`;
  const precio = (f) => (f.precio_promedio ? ` a ${formatearPrecio(f.precio_promedio)}` : '');
  let texto = `${sujeto} se vende más rápido como ${rapido.categoria}${precio(rapido)} (${rapido.ritmo_hora} u/h) que como ${lento.categoria}${precio(lento)} (${lento.ritmo_hora} u/h).`;
  if (rapido.precio_promedio && lento.precio_promedio && rapido.precio_promedio < lento.precio_promedio) {
    texto += ' La categoría que rota más rápido es también la más barata.';
  }
  const agotadoRapido = rapido.porcentaje_agotado;
  const agotadoLento = lento.porcentaje_agotado;
  if (agotadoRapido != null && agotadoLento != null && agotadoLento >= 90 && agotadoRapido < agotadoLento) {
    texto += ` Aun así, como ${lento.categoria} se agotó el ${agotadoLento} % de los días, solo que más tarde.`;
  }
  return texto;
}

function TablaCategorias({ filas, etiqueta = 'Menú' }) {
  return (
    <div className="tabla-scroll">
      <table className="tabla tabla-compacta tabla-analisis">
        <thead>
          <tr>
            <th>{etiqueta}</th>
            <th>Precio <Ayuda titulo="Precio promedio">Precio promedio del combo en los días del rango.</Ayuda></th>
            <th>Vendidas</th>
            <th>Consumo <Ayuda titulo="Consumo">Lo vendido frente a lo planificado. Cerca del 100 % indica que se prepara justo lo necesario o que falta.</Ayuda></th>
            <th>Se agotó <Ayuda titulo="Se agotó">Días en que el personal marcó la preparación como agotada, sobre los días en que estuvo en el menú.</Ayuda></th>
            <th>Hora <Ayuda titulo="Hora de agotamiento">Hora promedio a la que se marcó como agotada.</Ayuda></th>
            <th>Ritmo <Ayuda titulo="Ritmo de venta">Unidades por hora entre la primera y la última venta del día. Permite comparar qué tan rápido sale cada opción aunque se haya planificado una cantidad distinta.</Ayuda></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.categoria}>
              <td><span className="punto-cat" style={{ background: colorCat(f.categoria) }} />{f.categoria}<small className="celda-sub">{f.dias} {f.dias === 1 ? 'día' : 'días'}</small></td>
              <td>{f.precio_promedio ? formatearPrecio(f.precio_promedio) : '—'}</td>
              <td>{num(f.vendidas)}<small className="celda-sub">de {num(f.planificadas)}</small></td>
              <td>
                <div className="barra-fila">
                  <Barra porcentaje={f.porcentaje_consumo ?? 0} etiqueta={`${f.porcentaje_consumo}% de lo planificado`} color={colorCat(f.categoria)} />
                  <span>{f.porcentaje_consumo != null ? `${f.porcentaje_consumo} %` : '—'}</span>
                </div>
              </td>
              <td>{f.dias_agotado} de {f.dias}<small className="celda-sub">{f.porcentaje_agotado != null ? `${f.porcentaje_agotado} %` : ''}</small></td>
              <td>{f.hora_agotamiento || '—'}</td>
              <td><strong>{f.ritmo_hora ?? '—'}</strong> <small>u/h</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaPreparaciones({ filas, onElegir, limite = 25 }) {
  if (!filas.length) return <p className="texto-suave">No hay preparaciones con datos en este rango.</p>;
  return (
    <div className="tabla-scroll">
      <table className="tabla tabla-compacta tabla-analisis">
        <thead>
          <tr><th>Preparación</th><th>Días en menú</th><th>Vendidas</th><th>Consumo</th><th>Se agotó</th><th>Hora</th><th>Ritmo</th></tr>
        </thead>
        <tbody>
          {filas.slice(0, limite).map((f) => (
            <tr key={f.id_preparacion}>
              <td>
                <button type="button" className="enlace-tabla" onClick={() => onElegir(f.id_preparacion)} title="Analizar esta preparación">{f.nombre}</button>
                <small className="celda-sub">{f.componente === 'Plato Principal' ? 'Plato principal' : f.componente}</small>
              </td>
              <td>{f.dias}</td>
              <td>{num(f.vendidas)}<small className="celda-sub">de {num(f.planificadas)}</small></td>
              <td>
                <div className="barra-fila">
                  <Barra porcentaje={f.porcentaje_consumo ?? 0} etiqueta={`${f.porcentaje_consumo}% de lo planificado`} />
                  <span>{f.porcentaje_consumo != null ? `${f.porcentaje_consumo} %` : '—'}</span>
                </div>
              </td>
              <td>{f.dias_agotado} de {f.dias}</td>
              <td>{f.hora_agotamiento || '—'}</td>
              <td>{f.ritmo_hora ?? '—'} <small>u/h</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length > limite && <p className="texto-suave">Se muestran las {limite} con más ventas de {filas.length}.</p>}
    </div>
  );
}

function VentasYAgotamiento({ onVerOpiniones }) {
  const [desde, setDesde] = useState(haceDiasChile(30));
  const [hasta, setHasta] = useState(hoyChile());
  const [modo, setModo] = useState('menu');
  const [categoria, setCategoria] = useState('');
  const [idPrep, setIdPrep] = useState('');
  const [todos, setTodos] = useState(null);
  const [foco, setFoco] = useState(null);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const base = await consultarAnalisisDetalle(desde, hasta);
      setTodos(base);
      if (modo === 'preparacion' && idPrep) setFoco(await consultarAnalisisDetalle(desde, hasta, { id_preparacion: idPrep }));
      else if (modo === 'menu' && categoria) setFoco(await consultarAnalisisDetalle(desde, hasta, { categoria }));
      else setFoco(base);
    } catch (err) {
      setTodos(null); setFoco(null);
      setError(err.message);
    }
  }, [desde, hasta, modo, categoria, idPrep]);

  useEffect(() => { cargar(); }, [cargar]);

  const principales = (todos?.por_categoria || []).filter((c) => c.es_principal);
  const sinDatos = todos && !todos.preparaciones.some((p) => p.vendidas > 0 || p.dias_agotado > 0);
  const totalVend = principales.reduce((s, c) => s + c.vendidas, 0);
  const totalPlan = principales.reduce((s, c) => s + c.planificadas, 0);
  const prepElegida = idPrep ? todos?.preparaciones.find((p) => String(p.id_preparacion) === String(idPrep)) : null;
  const filasPrep = foco && idPrep ? foco.por_categoria : [];
  const opcionesPrep = [...(todos?.preparaciones || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <>
      <section className="tarjeta barra-analisis">
        <SelectorPeriodo
          desde={desde}
          hasta={hasta}
          onCambio={(d, h) => { setDesde(d); setHasta(h); }}
          accion={(
            <button type="button" className="boton boton-secundario boton-exportar" onClick={() => setExportando(true)}>
              <Download size={16} aria-hidden="true" /> Exportar
            </button>
          )}
          lado={(
            <div className="campo-en-linea">
              <span className="etiqueta-segmentado">Analizar por
                <Ayuda titulo="Menú o preparación">
                  <b>Menú</b> compara las categorías (Principal, JUNAEB, Vegetariano, Hipocalórico). <b>Preparación</b> sigue un plato en particular y lo separa por la
                  categoría en que se vendió: sirve cuando el mismo plato se vende distinto según el precio o el menú.
                </Ayuda>
              </span>
              <div className="exv-pildoras" role="group" aria-label="Analizar por">
                <button type="button" className={modo === 'menu' ? 'activo' : ''} onClick={() => setModo('menu')}>Menú</button>
                <button type="button" className={modo === 'preparacion' ? 'activo' : ''} onClick={() => setModo('preparacion')}>Preparación</button>
              </div>
            </div>
          )}
        />

        {modo === 'menu' && (
          <div className="chips" role="group" aria-label="Categoría">
            <button className={`chip ${categoria === '' ? 'activo' : ''}`} onClick={() => setCategoria('')}>Todos los menús</button>
            {CATEGORIAS.map((c) => (
              <button key={c} className={`chip ${categoria === c ? 'activo' : ''}`} style={{ '--chip': colorDeCategoria(c).color }} onClick={() => setCategoria(c)}>
                <span className="punto-cat" style={{ background: colorDeCategoria(c).color }} />{c}
              </button>
            ))}
          </div>
        )}
        {modo === 'preparacion' && (
          <label className="campo" style={{ maxWidth: 420 }}><span>Preparación a analizar</span>
            <select value={idPrep} onChange={(e) => setIdPrep(e.target.value)}>
              <option value="">Elige una preparación…</option>
              {opcionesPrep.map((p) => <option key={p.id_preparacion} value={p.id_preparacion}>{p.nombre}</option>)}
            </select>
          </label>
        )}
      </section>

      {exportando && <ExportarAnalisis tipo="ventas" desdeInicial={desde} hastaInicial={hasta} onCerrar={() => setExportando(false)} />}
      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      {!todos && !error && <div className="estado-info">Calculando análisis…</div>}
      {sinDatos && (
        <div className="estado-info">
          No hay datos en este rango. Los agotamientos salen de los cambios de disponibilidad que registra el personal; las ventas, del registro de caja.
        </div>
      )}

      {todos && !sinDatos && modo === 'menu' && (
        <>
          <div className="kpis">
            <Kpi titulo="Combos vendidos" valor={num(totalVend)} nota={`de ${num(totalPlan)} planificados`} />
            <Kpi titulo="Consumo" valor={totalPlan ? `${Math.round((1000 * totalVend) / totalPlan) / 10} %` : '—'} ayuda="Lo vendido frente a lo planificado, sumando las cuatro categorías." />
            <Kpi titulo="Días analizados" valor={Math.max(0, ...principales.map((c) => c.dias))} />
          </div>
          {hallazgo(principales, 'El plato principal') && (
            <div className="hallazgo"><Lightbulb size={18} aria-hidden="true" /> <span>{hallazgo(principales, 'El plato principal')}</span></div>
          )}
          <section className="tarjeta">
            <h2>Comparación entre menús</h2>
            <TablaCategorias filas={principales} />
          </section>
          <section className="tarjeta">
            <h2>Ventas por hora{categoria ? ` · ${categoria}` : ''}</h2>
            <p className="texto-suave">Unidades vendidas en todo el rango, según la hora del día.</p>
            <VentasPorHora horas={foco?.ventas_por_hora || []} />
          </section>
          <section className="tarjeta">
            <h2>Preparaciones{categoria ? ` en ${categoria}` : ''}</h2>
            <p className="texto-suave">Toca una para ver cómo se vendió en cada categoría.</p>
            <TablaPreparaciones filas={foco?.preparaciones || []} onElegir={(id) => { setModo('preparacion'); setIdPrep(String(id)); }} limite={12} />
          </section>
        </>
      )}

      {todos && !sinDatos && modo === 'preparacion' && !idPrep && (
        <section className="tarjeta">
          <h2>Elige una preparación</h2>
          <p className="texto-suave">Selecciónala arriba o toca una de la lista para ver cómo se vendió en cada categoría y a qué ritmo.</p>
          <TablaPreparaciones filas={todos.preparaciones} onElegir={(id) => setIdPrep(String(id))} />
        </section>
      )}

      {todos && !sinDatos && modo === 'preparacion' && idPrep && prepElegida && foco && (
        <>
          <div className="encabezado-prep">
            <div>
              <h2>{prepElegida.nombre}</h2>
              <span className="texto-suave">{prepElegida.componente === 'Plato Principal' ? 'Plato principal' : prepElegida.componente} · {prepElegida.dias} {prepElegida.dias === 1 ? 'día' : 'días'} en el menú</span>
            </div>
            <button type="button" className="boton boton-secundario" onClick={() => onVerOpiniones(prepElegida.id_preparacion)}>Ver opiniones de esta preparación</button>
          </div>
          <div className="kpis">
            <Kpi titulo="Vendidas" valor={num(prepElegida.vendidas)} nota={`de ${num(prepElegida.planificadas)} planificadas`} />
            <Kpi titulo="Consumo" valor={prepElegida.porcentaje_consumo != null ? `${prepElegida.porcentaje_consumo} %` : '—'} />
            <Kpi titulo="Se agotó" valor={`${prepElegida.dias_agotado} de ${prepElegida.dias}`} nota={prepElegida.hora_agotamiento ? `a las ${prepElegida.hora_agotamiento} en promedio` : 'días'} />
            <Kpi titulo="Ritmo" valor={prepElegida.ritmo_hora != null ? `${prepElegida.ritmo_hora} u/h` : '—'} ayuda="Unidades por hora entre la primera y la última venta del día." />
          </div>
          {hallazgo(filasPrep, `“${prepElegida.nombre}”`) && (
            <div className="hallazgo"><Lightbulb size={18} aria-hidden="true" /> <span>{hallazgo(filasPrep, `“${prepElegida.nombre}”`)}</span></div>
          )}
          <section className="tarjeta">
            <h2>Cómo se vendió en cada categoría</h2>
            <TablaCategorias filas={filasPrep} etiqueta="Categoría" />
          </section>
          <section className="tarjeta">
            <h2>Ventas por hora</h2>
            <VentasPorHora horas={foco.ventas_por_hora} />
          </section>
          <div className="rejilla-analisis">
            <section className="tarjeta tarjeta-ancha">
              <h2>Día a día</h2>
              <div className="tabla-scroll tabla-alta">
                <table className="tabla tabla-compacta">
                  <thead><tr><th>Día</th><th>Categoría</th><th>Vendidas</th><th>Precio</th><th>Agotado</th></tr></thead>
                  <tbody>
                    {foco.por_dia.map((d, i) => (
                      <tr key={`${d.fecha}-${d.categoria}-${i}`}>
                        <td>{fechaCorta(d.fecha)}</td>
                        <td><span className="punto-cat" style={{ background: colorCat(d.categoria) }} />{d.categoria}</td>
                        <td>{d.vendidas}<small className="celda-sub">de {d.planificadas}</small></td>
                        <td>{d.precio ? formatearPrecio(d.precio) : '—'}</td>
                        <td>{d.hora_agotado || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

const PESTANAS = [
  { id: 'ventas', texto: 'Ventas y agotamiento' },
  { id: 'prediccion', texto: 'Predicción' },
  { id: 'opiniones', texto: 'Opiniones' },
  { id: 'ranking', texto: 'Informe general' },
];

export default function AnalisisPage() {
  const [pestana, setPestana] = useState('ventas');
  const [filtroOpinion, setFiltroOpinion] = useState(null);
  const limpiarFiltro = useCallback(() => setFiltroOpinion(null), []);

  return (
    <div className="v2">
      <div className="pestanas" role="tablist" aria-label="Secciones de análisis">
        {PESTANAS.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestana === p.id} className={`pestana ${pestana === p.id ? 'activa' : ''}`} onClick={() => setPestana(p.id)}>
            {p.texto}
          </button>
        ))}
      </div>

      <div hidden={pestana !== 'ventas'}>
        <VentasYAgotamiento onVerOpiniones={(id) => { setFiltroOpinion({ id_preparacion: id }); setPestana('opiniones'); }} />
      </div>
      {pestana === 'prediccion' && <PrediccionPanel />}
      {pestana === 'opiniones' && <OpinionesPanel filtroInicial={filtroOpinion} onFiltroAplicado={limpiarFiltro} />}
      {pestana === 'ranking' && <RankingMensual />}
    </div>
  );
}
