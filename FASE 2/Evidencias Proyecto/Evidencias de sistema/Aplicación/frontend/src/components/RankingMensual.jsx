import { useState, useEffect } from 'react';
import { consultarMensual } from '../api/gestion';
import { hoyChile } from '../utils/formato';
import CampoFecha from './CampoFecha';

export default function RankingMensual() {
  const [mes, setMes] = useState(hoyChile().slice(0, 7));
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setDatos(null);
    consultarMensual(mes)
      .then((d) => { if (activo) { setDatos(d); setError(null); } })
      .catch((err) => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, [mes]);

  return (
    <section className="tarjeta tarjeta-ancha" style={{ marginTop: 22 }}>
      <div className="barra-herramientas">
        <h2>Informe mensual: qué se agota más rápido</h2>
        <label className="campo campo-en-linea"><span>Mes</span>
          <CampoFecha modo="mes" value={mes} onChange={(v) => v && setMes(v)} ariaLabel="Mes del informe" /></label>
      </div>
      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {!datos && !error && <p className="texto-suave">Calculando…</p>}
      {datos && datos.resumen.jornadas_cerradas === 0 && (
        <p className="texto-suave">No hay jornadas cerradas en este mes. El informe se arma con las jornadas que la caja y la cocina registran.</p>
      )}
      {datos && datos.resumen.jornadas_cerradas > 0 && (
        <>
          <p className="texto-suave">
            {datos.resumen.jornadas_cerradas} jornada(s) cerradas · {datos.resumen.con_conteo_de_cocina} con conteo de sobrante de la cocina ·{' '}
            {datos.resumen.cierres_automaticos} con cierre automático.
          </p>
          <table className="tabla tabla-compacta">
            <thead><tr><th>Preparación</th><th>Se agotó</th><th>Minutos hasta agotarse</th><th>Vendidas por jornada</th><th>Sobrante promedio</th></tr></thead>
            <tbody>
              {datos.platos.map((p) => (
                <tr key={p.id_preparacion}>
                  <td>{p.nombre}</td>
                  <td>{p.dias_agotado} de {p.jornadas} ({p.porcentaje_agotado}%)</td>
                  <td>{p.minutos_hasta_agotarse ?? '—'}</td>
                  <td>{p.vendidas_por_jornada}</td>
                  <td>{p.sobrante_promedio ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="texto-suave">
            Son porciones registradas en caja, no ventas oficiales: si un día se olvida registrar, el consumo se subestima. Cuando un plato se agota
            no se observa la demanda posterior. El sobrante solo cuenta jornadas con conteo de la cocina en las que el plato no se agotó.
          </p>
        </>
      )}
    </section>
  );
}
