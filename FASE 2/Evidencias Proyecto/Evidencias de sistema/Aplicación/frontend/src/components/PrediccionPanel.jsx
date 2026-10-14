import { useState, useEffect } from 'react';
import { consultarPrediccionHoy, consultarConfiabilidad } from '../api/gestion';
import { suscribirCambios } from '../utils/eventos';

const fmt = (v, sufijo = '') => (v === null || v === undefined ? '—' : `${v}${sufijo}`);

function textoEstimacion(e) {
  if (!e) return 'Sin datos suficientes';
  if (e.estado === 'agotado') return 'Agotado';
  if (e.agotaria) return `Se agotaría cerca de las ${e.hora} (en ${e.minutos_restantes} min)`;
  return 'Alcanza hasta el cierre';
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

  return (
    <section className="tarjeta tarjeta-ancha" style={{ marginTop: 22 }}>
      <h2>Predicción: hora de agotamiento y cuánto preparar</h2>
      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}

      <h3 className="subtitulo-panel">Hoy: hora estimada de agotamiento</h3>
      {!hoy && !error && <p className="texto-suave">Calculando…</p>}
      {hoy && hoy.categorias.length === 0 && <p className="texto-suave">No hay una jornada abierta. La estimación aparece cuando la cocina inicia la jornada.</p>}
      {hoy && hoy.categorias.length > 0 && (
        <table className="tabla tabla-compacta">
          <thead><tr><th>Categoría</th><th>Quedan</th><th>Vendidas</th><th>Estimación</th></tr></thead>
          <tbody>
            {hoy.categorias.map((c) => (
              <tr key={c.categoria}><td>{c.categoria}</td><td>{Math.max(c.restante, 0)}</td><td>{c.vendidas}</td><td>{textoEstimacion(c.estimacion)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className="subtitulo-panel" style={{ marginTop: 20 }}>¿Qué tan confiable es? Probada con días pasados</h3>
      <p className="texto-suave">
        Para cada día anterior, el sistema estima usando solo lo que se sabía antes y lo compara con lo que realmente ocurrió.
        Ese error promedio es lo que indica cuánto confiar en la predicción.
      </p>
      {conf?.contiene_simulados && (
        <div className="mensaje mensaje-aviso" role="status">
          Hay datos simulados en el historial: estos resultados demuestran cómo funciona el método, no la precisión real del casino.
        </div>
      )}
      {!conf && !error && <p className="texto-suave">Calculando…</p>}
      {conf && d.dias === 0 && <p className="texto-suave">Todavía no hay historia suficiente para probar la predicción (se necesitan al menos 5 días con ventas por categoría).</p>}
      {conf && d.dias > 0 && (
        <>
          <ul className="lista-metricas">
            <li><strong>Cuánto preparar.</strong> Con la cantidad sugerida el plato alcanzó en el <strong>{fmt(d.cobertura_sugerencia, ' %')}</strong> de los días probados
              ({d.dias}); con lo que se planificó, en el {fmt(d.cobertura_planificado, ' %')}. Sobrante promedio: {fmt(d.sobrante_sugerencia)} porciones con la sugerencia
              frente a {fmt(d.sobrante_planificado)} con lo planificado.</li>
            <li><strong>Error al estimar la demanda.</strong> {fmt(d.mae_modelo)} porciones en promedio; el promedio simple de todos los días se equivoca en {fmt(d.mae_base)}
              {d.mejora_pct != null && ` (el modelo mejora ${d.mejora_pct} %)`}.</li>
            <li><strong>Hora de agotamiento.</strong> Error promedio de {fmt(a.mae_modelo_min, ' min')} (extrapolar el ritmo en línea recta se equivoca en {fmt(a.mae_simple_min, ' min')});
              {' '}dentro de ±15 minutos en el {fmt(a.dentro_15_min_pct, ' %')} de {a.dias} días probados.</li>
          </ul>
          <table className="tabla tabla-compacta">
            <thead><tr><th>Categoría</th><th>Días</th><th>Error demanda</th><th>Promedio simple</th><th>Alcanzó (sugerido / planificado)</th><th>Error hora (min)</th></tr></thead>
            <tbody>
              {conf.categorias.map((c) => (
                <tr key={c.categoria}>
                  <td>{c.categoria}</td><td>{c.dias_con_datos}</td><td>{fmt(c.demanda.mae_modelo)}</td><td>{fmt(c.demanda.mae_base)}</td>
                  <td>{fmt(c.demanda.cobertura_sugerencia, ' %')} / {fmt(c.demanda.cobertura_planificado, ' %')}</td><td>{fmt(c.agotamiento.mae_modelo_min)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <details style={{ marginTop: 14 }}>
        <summary><strong>Cómo se calcula</strong></summary>
        <p className="texto-suave">
          <strong>Cuánto preparar:</strong> se promedia lo vendido en los últimos 4 mismos días de la semana para esa categoría (lo más reciente pesa más) y se agrega un margen
          según cuánto varía; se redondea a múltiplos de 5. Si un plato se agotó, lo vendido fue un mínimo de la demanda real, así que ese día se corrige al alza en un 15 %
          (es una suposición, no una medición).
        </p>
        <p className="texto-suave">
          <strong>Hora de agotamiento:</strong> con las ventas históricas por tramos de 5 minutos se proyecta cuánto se vendería de aquí al cierre, ajustado al ritmo de hoy
          (si hoy se vende el doble de rápido, se agota antes). Si lo que queda alcanza hasta el cierre, indica que no se agotaría.
        </p>
      </details>
    </section>
  );
}
