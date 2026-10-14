import { useState, useEffect } from 'react';
import { consultarOpinionesDePlato } from '../api/gestion';
import { Estrellas } from './Opinion';

export default function OpinionModal({ idPreparacion, nombrePlato, onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    consultarOpinionesDePlato(idPreparacion)
      .then((d) => { if (activo) setDatos(d); })
      .catch((err) => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, [idPreparacion]);

  const opiniones = datos?.opiniones || [];
  const promedio = opiniones.length
    ? Math.round((opiniones.reduce((s, o) => s + o.estrellas, 0) / opiniones.length) * 10) / 10
    : null;

  function formatearFecha(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={`Opiniones de ${nombrePlato}`}>
      <div className="modal">
        <h2>Opiniones de "{nombrePlato}"</h2>

        {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
        {!datos && !error && <p className="texto-suave">Cargando opiniones…</p>}

        {datos && opiniones.length === 0 && (
          <p className="texto-suave">
            Todavía no hay comentarios con texto para este plato. Las calificaciones sin comentario igual cuentan en el promedio general.
          </p>
        )}

        {datos && opiniones.length > 0 && (
          <>
            <div className="opinion-resumen">
              <Estrellas valor={promedio} tam={20} />
              <strong>{promedio.toFixed(1)}</strong>
              <span className="texto-suave" style={{ margin: 0 }}>
                · {opiniones.length} {opiniones.length === 1 ? 'opinión con texto' : 'opiniones con texto'}
              </span>
            </div>

            <div className="opiniones-lista">
              {opiniones.map((o) => (
                <article key={o.id_calificacion} className="opinion-item">
                  <header className="opinion-item-cabeza">
                    <strong>{o.autor}</strong>
                    <span className="texto-suave" style={{ margin: 0 }}>{formatearFecha(o.actualizado_en)}</span>
                  </header>
                  <Estrellas valor={o.estrellas} tam={14} />
                  <p>{o.comentario}</p>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="modal-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}