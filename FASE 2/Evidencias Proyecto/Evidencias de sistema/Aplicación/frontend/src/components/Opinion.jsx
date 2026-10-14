import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useEstudiante } from '../utils/estudiante';
import OpinionModal from './OpinionModal';

export function Estrellas({ valor, tam = 16 }) {
  const llenas = Math.round(Number(valor) || 0);
  return (
    <span className="estrellas" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={tam} fill={i <= llenas ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export default function Opinion({ item }) {
  const { usuario, calificacionDe, guardarCalificacion, quitarCalificacion } = useEstudiante();
  const [abierto, setAbierto] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const mia = calificacionDe(item.id_preparacion);

  useEffect(() => {
    if (mia) { setEstrellas(mia.estrellas); setComentario(mia.comentario || ''); }
    else { setEstrellas(0); setComentario(''); }
  }, [mia, item.id_preparacion]);

  const promedio = item.calificacion_promedio;
  const total = item.calificaciones_total || 0;

  async function enviar(e) {
    e.preventDefault();
    if (estrellas < 1) return setError('Elige al menos una estrella.');
    setGuardando(true);
    setError(null);
    try {
      await guardarCalificacion(item.id_preparacion, estrellas, comentario.trim() || undefined);
      setAbierto(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!window.confirm('¿Borrar tu calificación de este plato?')) return;
    setGuardando(true);
    try {
      await quitarCalificacion(item.id_preparacion);
      setAbierto(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="opinion">
      <div className="opinion-fila">
        <Estrellas valor={promedio || 0} />
        <span>
          {promedio != null
            ? `${Number(promedio).toFixed(1)} · ${total} ${total === 1 ? 'voto' : 'votos'}`
            : 'Todavía sin calificaciones'}
        </span>

        {total > 0 && (
          <button
            type="button"
            className="boton boton-secundario boton-chico"
            onClick={() => setModalAbierto(true)}
          >
            Ver opiniones
          </button>
        )}

        {usuario && usuario.rol === 'Estudiante' && (
          <>
            <button type="button" className="boton boton-secundario boton-chico" onClick={() => setAbierto(!abierto)}>
              {mia ? 'Editar mi calificación' : 'Calificar'}
            </button>
            {mia && (
              <button type="button" className="boton boton-peligro boton-chico" onClick={borrar} disabled={guardando}>
                Borrar
              </button>
            )}
          </>
        )}
      </div>

      {abierto && usuario?.rol === 'Estudiante' && (
        <form className="opinion-form" onSubmit={enviar}>
          <div className="opinion-estrellas" role="radiogroup" aria-label="Estrellas">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                className="boton-icono"
                aria-label={`${i} estrellas`}
                aria-pressed={estrellas === i}
                onClick={() => setEstrellas(i)}
              >
                <Star size={22} fill={i <= estrellas ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea
            rows="2"
            placeholder="¿Qué te pareció? (opcional, máx. 300 caracteres)"
            maxLength="300"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <p className="texto-suave" style={{ margin: 0, fontSize: '0.78rem' }}>
            Tu opinión es pública: otros estudiantes verán tu nombre, tu calificación y tu comentario.
          </p>
          {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
          <div className="en-linea">
            <button type="submit" className="boton boton-primario boton-chico" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="boton boton-secundario boton-chico" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modalAbierto && (
        <OpinionModal
          idPreparacion={item.id_preparacion}
          nombrePlato={item.nombre}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}