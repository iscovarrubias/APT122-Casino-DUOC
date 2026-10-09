import { useState, useEffect, useCallback } from 'react';
import { consultarAnalisis } from '../api/gestion';
import { hoyChile, haceDiasChile } from '../utils/formato';

function Barra({ porcentaje, etiqueta }) {
  return (
    <div className="barra" role="img" aria-label={etiqueta}>
      <div className="barra-relleno" style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%` }} />
    </div>
  );
}

export default function AnalisisPage() {
  const [desde, setDesde] = useState(haceDiasChile(30));
  const [hasta, setHasta] = useState(hoyChile());
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await consultarAnalisis(desde, hasta));
    } catch (err) {
      setDatos(null);
      setError(err.message);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const maxHora = datos ? Math.max(1, ...datos.ventas_por_hora.map((h) => h.unidades)) : 1;
  const sinDatos = datos && !datos.agotamientos.length && !datos.ventas_por_hora.length && !datos.mas_vendidas.length;

  return (
    <>
      <div className="barra-herramientas">
        <div className="barra-estado">
          <label className="campo campo-en-linea"><span>Desde</span>
            <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} /></label>
          <label className="campo campo-en-linea"><span>Hasta</span>
            <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && setHasta(e.target.value)} /></label>
        </div>
      </div>

      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {!datos && !error && <div className="estado-info">Calculando análisis…</div>}

      {datos?.origenes.contiene_simulados && (
        <div className="mensaje mensaje-aviso" role="status">
          Estos resultados incluyen datos simulados (escenario C: aún no hay acceso a los datos de caja del concesionario).
          Sirven para demostrar el análisis, no para decidir cuánto preparar.
        </div>
      )}

      {sinDatos && (
        <div className="estado-info">
          No hay datos en este rango. Los agotamientos salen de los cambios de disponibilidad que registra el personal;
          las ventas, de los datos cargados (reales, importados o simulados).
        </div>
      )}

      {datos && !sinDatos && (
        <div className="rejilla-analisis">
          <section className="tarjeta">
            <h2>Frecuencia de agotamiento</h2>
            <p className="texto-suave">De los días en que la preparación estuvo en el menú, en cuántos se agotó y a qué hora ocurrió en promedio.</p>
            {datos.agotamientos.length === 0 ? <p className="texto-suave">Ninguna preparación se agotó en este rango.</p> : (
              <table className="tabla tabla-compacta">
                <thead><tr><th>Preparación</th><th>Se agotó</th><th>Hora promedio</th></tr></thead>
                <tbody>
                  {datos.agotamientos.map((a) => (
                    <tr key={a.id_preparacion}>
                      <td>{a.nombre}</td>
                      <td>
                        <div className="barra-fila">
                          <Barra porcentaje={a.porcentaje} etiqueta={`${a.porcentaje}% de los días`} />
                          <span>{a.dias_agotado} de {a.dias_en_menu} días ({a.porcentaje}%)</span>
                        </div>
                      </td>
                      <td>{a.hora_promedio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="tarjeta">
            <h2>Ventas por hora</h2>
            <p className="texto-suave">Unidades vendidas en todo el rango, según la hora del día.</p>
            {datos.ventas_por_hora.length === 0 ? <p className="texto-suave">No hay ventas cargadas en este rango.</p> : (
              <div className="barras-horas">
                {datos.ventas_por_hora.map((h) => (
                  <div key={h.hora} className="barra-fila">
                    <span className="barra-hora">{String(h.hora).padStart(2, '0')}:00</span>
                    <Barra porcentaje={(h.unidades / maxHora) * 100} etiqueta={`${h.unidades} unidades`} />
                    <span>{h.unidades.toLocaleString('es-CL')}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="tarjeta tarjeta-ancha">
            <h2>Preparaciones más vendidas</h2>
            <p className="texto-suave">Lo vendido frente a lo planificado. Un consumo cercano al 100 % indica que se prepara justo lo necesario o que falta.</p>
            {datos.mas_vendidas.length === 0 ? <p className="texto-suave">No hay ventas cargadas en este rango.</p> : (
              <table className="tabla tabla-compacta">
                <thead><tr><th>Preparación</th><th>Vendidas</th><th>Planificadas</th><th>Consumo</th></tr></thead>
                <tbody>
                  {datos.mas_vendidas.map((m) => (
                    <tr key={m.id_preparacion}>
                      <td>{m.nombre}</td>
                      <td>{m.vendidas.toLocaleString('es-CL')}</td>
                      <td>{m.planificadas.toLocaleString('es-CL')}</td>
                      <td>
                        <div className="barra-fila">
                          <Barra porcentaje={m.porcentaje_consumo ?? 0} etiqueta={`${m.porcentaje_consumo}% de lo planificado`} />
                          <span>{m.porcentaje_consumo != null ? `${m.porcentaje_consumo}%` : '—'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </>
  );
}
