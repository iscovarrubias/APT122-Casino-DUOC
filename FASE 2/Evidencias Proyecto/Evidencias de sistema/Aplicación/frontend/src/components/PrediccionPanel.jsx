import { useState, useEffect } from 'react';
import { consultarPrediccionHoy, consultarConfiabilidad } from '../api/gestion';
import { suscribirCambios } from '../utils/eventos';
import { colorDeCategoria } from '../utils/formato';
import Mensaje from './Mensaje';
import Ayuda from './Ayuda';

const fmt = (v, sufijo = '') => (v === null || v === undefined ? '—' : `${v}${sufijo}`);

function estadoEstimacion(e) {
  if (!e) return { clase: 'neutro', texto: 'Sin datos suficientes', detalle: null };
  if (e.estado === 'agotado') return { clase: 'malo', texto: 'Agotado', detalle: null };
  if (e.agotaria) return { clase: 'aviso', texto: `Se agotaría cerca de las ${e.hora}`, detalle: `en ${e.minutos_restantes} min` };
  return { clase: 'bueno', texto: 'Alcanza hasta el cierre', detalle: null };
}

function Indicador({ titulo, ayuda, valor, unidad, nota, etiqueta }) {
  return (
    <div className="indicador">
      <div className="indicador-titulo">
        <span>{titulo}</span>
        <Ayuda titulo={titulo}>{ayuda}</Ayuda>
      </div>
      <div className="indicador-valor">{valor}<small>{unidad}</small></div>
      {etiqueta && <span className={`indicador-etiqueta indicador-etiqueta--${etiqueta.clase}`}>{etiqueta.texto}</span>}
      <p className="indicador-nota">{nota}</p>
    </div>
  );
}

export default function PrediccionPanel() {
  const [hoy, setHoy] = useState(null);
  const [conf, setConf] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    const cargarHoy = () => consultarPrediccionHoy().then((d) => { if (activo) setHoy(d); }).catch((e) => { if (activo) setError(e.message); });
    cargarHoy();
    consultarConfiabilidad().then((d) => { if (activo) setConf(d); }).catch((e) => { if (activo) setError(e.message); });
    const intervalo = setInterval(cargarHoy, 30000);
    const cerrar = suscribirCambios(cargarHoy);
    return () => { activo = false; clearInterval(intervalo); cerrar(); };
  }, []);

  const d = conf?.global.demanda;
  const a = conf?.global.agotamiento;
  const mejoraDemanda = d?.mejora_pct;
  const etiquetaDemanda = mejoraDemanda == null ? null
    : mejoraDemanda >= 0
      ? { clase: 'bueno', texto: `Mejor que el promedio simple (${mejoraDemanda} %)` }
      : { clase: 'malo', texto: `Peor que el promedio simple (${Math.abs(mejoraDemanda)} %)` };
  const etiquetaHora = a?.mae_modelo_min == null || a?.mae_simple_min == null ? null
    : a.mae_modelo_min <= a.mae_simple_min
      ? { clase: 'bueno', texto: 'Mejor que la línea recta' }
      : { clase: 'malo', texto: 'Peor que la línea recta' };

  return (
    <div className="prediccion">
      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}

      <section className="tarjeta">
        <div className="seccion-titulo">
          <h2>Hoy: hora estimada de agotamiento</h2>
          <Ayuda titulo="Hora de agotamiento">
            Con las ventas históricas por tramos de 5 minutos se proyecta cuánto se vendería de aquí al cierre, ajustado al ritmo de hoy
            (si hoy se vende el doble de rápido, se agota antes). Si lo que queda alcanza hasta el cierre, indica que no se agotaría.
          </Ayuda>
        </div>
        {!hoy && !error && <p className="texto-suave">Calculando…</p>}
        {hoy && hoy.categorias.length === 0 && (
          <p className="estado-vacio">No hay una jornada abierta. La estimación aparece cuando la cocina inicia la jornada.</p>
        )}
        {hoy && hoy.categorias.length > 0 && (
          <div className="hoy-rejilla">
            {hoy.categorias.map((c) => {
              const e = estadoEstimacion(c.estimacion);
              return (
                <div key={c.categoria} className="hoy-tarjeta" style={{ '--acento': colorDeCategoria(c.categoria).color }}>
                  <strong>{c.categoria}</strong>
                  <span className={`indicador-etiqueta indicador-etiqueta--${e.clase}`}>{e.texto}{e.detalle ? ` · ${e.detalle}` : ''}</span>
                  <div className="hoy-cifras">
                    <span><b>{Math.max(c.restante, 0)}</b> quedan</span>
                    <span><b>{c.vendidas}</b> vendidas</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="tarjeta">
        <div className="seccion-titulo">
          <h2>¿Qué tan confiable es?</h2>
          <Ayuda titulo="Probada con días pasados">
            Para cada día anterior, el sistema estima usando solo lo que se sabía antes y lo compara con lo que realmente ocurrió.
            Ese error promedio es lo que indica cuánto confiar en la predicción.
          </Ayuda>
        </div>
        {!conf && !error && <p className="texto-suave">Calculando…</p>}
        {conf && d.dias === 0 && (
          <p className="estado-vacio">Todavía no hay historia suficiente para probar la predicción (se necesitan al menos 5 días con ventas por categoría).</p>
        )}
        {conf && d.dias > 0 && (
          <>
            <div className="indicadores">
              <Indicador
                titulo="Cuánto preparar"
                valor={fmt(d.cobertura_sugerencia)} unidad=" %"
                nota={`de ${d.dias} días probados alcanzó con la cantidad sugerida (con lo planificado: ${fmt(d.cobertura_planificado, ' %')}). Sobrante promedio: ${fmt(d.sobrante_sugerencia)} porciones con la sugerencia frente a ${fmt(d.sobrante_planificado)} con lo planificado.`}
                ayuda={<>
                  Se promedia lo vendido en los últimos 4 mismos días de la semana para esa categoría (lo más reciente pesa más) y se agrega un margen
                  según cuánto varía; se redondea a múltiplos de 5. Si un plato se agotó, lo vendido fue un mínimo de la demanda real, así que ese día se
                  corrige al alza en un 15 % (es una suposición, no una medición).
                </>}
              />
              <Indicador
                titulo="Error al estimar la demanda"
                valor={fmt(d.mae_modelo)} unidad=" porciones"
                etiqueta={etiquetaDemanda}
                nota={`es lo que se equivoca en promedio. El promedio simple de todos los días se equivoca en ${fmt(d.mae_base)}.`}
                ayuda="Diferencia promedio entre las porciones que el sistema estimó y las que realmente se pidieron. Mientras más bajo, mejor. Se compara con un promedio simple de todos los días para saber si el modelo realmente aporta."
              />
              <Indicador
                titulo="Hora de agotamiento"
                valor={fmt(a.mae_modelo_min)} unidad=" min"
                etiqueta={etiquetaHora}
                nota={`de error promedio (extrapolar el ritmo en línea recta se equivoca en ${fmt(a.mae_simple_min, ' min')}). Dentro de ±15 minutos en el ${fmt(a.dentro_15_min_pct, ' %')} de ${a.dias} días probados.`}
                ayuda="Diferencia promedio entre la hora en que el sistema dijo que se agotaría el plato y la hora en que realmente se agotó. Se compara con proyectar el ritmo actual en línea recta."
              />
            </div>

            <h3 className="subtitulo-panel" style={{ marginTop: 20 }}>Detalle por categoría</h3>
            <div className="tabla-scroll">
              <table className="tabla tabla-compacta">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Días</th>
                    <th>Error demanda <Ayuda titulo="Error demanda">Porciones de diferencia entre lo estimado y lo real.</Ayuda></th>
                    <th>Promedio simple <Ayuda titulo="Promedio simple">Error que tendría estimar siempre el promedio de todos los días.</Ayuda></th>
                    <th>Alcanzó <Ayuda titulo="Alcanzó (sugerido / planificado)">Porcentaje de días en que no se agotó el plato, usando la cantidad sugerida por el sistema frente a la que se planificó.</Ayuda></th>
                    <th>Error hora (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {conf.categorias.map((c) => (
                    <tr key={c.categoria}>
                      <td><span className="punto-cat" style={{ background: colorDeCategoria(c.categoria).color }} />{c.categoria}</td>
                      <td>{c.dias_con_datos}</td><td>{fmt(c.demanda.mae_modelo)}</td><td>{fmt(c.demanda.mae_base)}</td>
                      <td>{fmt(c.demanda.cobertura_sugerencia, ' %')} / {fmt(c.demanda.cobertura_planificado, ' %')}</td>
                      <td>{fmt(c.agotamiento.mae_modelo_min)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
