import { useState, useEffect, useCallback } from 'react';
import { consultarPlanificacion, cambiarDisponibilidad } from '../api/gestion';
import { hoyChile, formatearHora, ESTADO_TEXTO } from '../utils/formato';

const INTERVALO_MS = 30000;
const ESTADOS = ['disponible', 'baja_disponibilidad', 'agotado'];

function etiqueta(c) {
  return c.categoria ? `${c.componente} · ${c.categoria}` : c.componente;
}

export default function KioscoPage() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [pendiente, setPendiente] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setPlan(await consultarPlanificacion(hoyChile()));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  async function cambiar(componente, estado) {
    if (componente.disponibilidad === estado) return;
    setPendiente(componente.id_menu_preparacion);
    try {
      await cambiarDisponibilidad(componente.id_menu_preparacion, estado);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendiente(null);
    }
  }

  if (!plan && !error) return <div className="estado-info">Cargando el menú de hoy…</div>;

  return (
    <>
      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}

      {plan && !plan.menu && (
        <div className="estado-info">
          Todavía no hay un menú planificado para hoy. Pide a administración o a quien planifica el menú que lo cargue.
        </div>
      )}

      {plan?.menu && !plan.menu.publicado && (
        <div className="mensaje mensaje-aviso">
          El menú de hoy aún no está publicado: los estudiantes no ven estos platos. Puedes publicarlo en Planificación del menú.
        </div>
      )}

      <div className="kiosco-lista">
        {plan?.componentes.map((c) => (
          <section key={c.id_menu_preparacion} className={`kiosco-fila estado-${c.disponibilidad}`}>
            <div className="kiosco-info">
              <span className="kiosco-tipo">{etiqueta(c)}</span>
              <span className="kiosco-nombre">{c.preparacion}</span>
              {c.disponibilidad_actualizada_en && (
                <span className="kiosco-hora">Último cambio a las {formatearHora(c.disponibilidad_actualizada_en)}</span>
              )}
            </div>
            <div className="kiosco-botones" role="group" aria-label={`Disponibilidad de ${c.preparacion}`}>
              {ESTADOS.map((estado) => (
                <button
                  key={estado}
                  className={`kiosco-boton ${estado} ${c.disponibilidad === estado ? 'actual' : ''}`}
                  aria-pressed={c.disponibilidad === estado}
                  disabled={pendiente === c.id_menu_preparacion}
                  onClick={() => cambiar(c, estado)}
                >
                  {ESTADO_TEXTO[estado]}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
