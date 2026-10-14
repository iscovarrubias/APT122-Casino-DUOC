import { useState, useEffect } from 'react';
import { consultarOpiniones } from '../api/gestion';
import { Estrellas } from './Opinion';
import { formatearHora } from '../utils/formato';

export default function OpinionesPanel() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { consultarOpiniones().then(setDatos).catch((e) => setError(e.message)); }, []);

  return (
    <section className="tarjeta tarjeta-ancha" style={{ marginTop: 22 }}>
      <h2>Opiniones de los estudiantes</h2>
      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {!datos && !error && <p className="texto-suave">Cargando…</p>}
      {datos && datos.promedios.length === 0 && <p className="texto-suave">Todavía no hay calificaciones.</p>}
      {datos && datos.promedios.length > 0 && (
        <div className="rejilla-analisis">
          <div>
            <h3 className="subtitulo-panel">Calificación promedio</h3>
            <table className="tabla tabla-compacta">
              <thead><tr><th>Preparación</th><th>Promedio</th><th>Votos</th></tr></thead>
              <tbody>
                {datos.promedios.map((p) => (
                  <tr key={p.id_preparacion}><td>{p.nombre}</td><td><Estrellas valor={p.promedio} tam={14} /> {p.promedio.toFixed(1)}</td><td>{p.total}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="subtitulo-panel">Más marcados como favoritos</h3>
            {datos.favoritos.length === 0 && <p className="texto-suave">Aún no hay favoritos.</p>}
            {datos.favoritos.map((f) => <div key={f.id_preparacion}>{f.nombre}: <strong>{f.total}</strong></div>)}
            <h3 className="subtitulo-panel" style={{ marginTop: 14 }}>Comentarios recientes</h3>
            {datos.comentarios.length === 0 && <p className="texto-suave">Aún no hay comentarios.</p>}
            {datos.comentarios.map((c, i) => (
              <p key={i} style={{ margin: '0 0 8px' }}><strong>{c.nombre}</strong> <Estrellas valor={c.estrellas} tam={12} /> {formatearHora(c.actualizado_en) && ''}<br />{c.comentario}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
