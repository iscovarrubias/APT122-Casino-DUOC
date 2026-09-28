import EstadoBadge from './EstadoBadge';
import TablaNutricional from './TablaNutricional';
import AlergenoPills from './AlergenoPills';
import { formatearPrecio, calcularCaloriasTotales, calcularPrecioTotal } from '../utils/formato';

const ICONOS_COMPONENTE = {
  'Plato Principal': '',
  Entrada: '',
  Postre: '',
  Bebida: '',
};

export default function MenuPrincipal({ categoria, componentes }) {
  const principal = componentes.find((c) => c.componente === 'Plato Principal');
  const compartidos = componentes.filter((c) => c.componente !== 'Plato Principal');

  if (!principal) {
    return (
      <div className="estado-info">
        No hay un plato principal planificado para "{categoria}" todavía.
      </div>
    );
  }

  const caloriasTotales = calcularCaloriasTotales(componentes);
  const precioTotal = calcularPrecioTotal(componentes);
  const nombresCompartidos = compartidos.map((c) => c.componente.toLowerCase()).join(', ');

  return (
    <>
      <div className="contenido-principal">
        <div className="card-principal">
          <div className="card-imagen">
            {ICONOS_COMPONENTE[principal.componente]}
            <span className="badge-categoria">{categoria}</span>
            <div className="badge-precio">
              <span className="precio-label">PRECIO DEL COMBO</span>
              <span className="precio-valor">{formatearPrecio(precioTotal)}</span>
            </div>
          </div>
          <div className="card-body">
            <h2>{principal.nombre}</h2>
            {compartidos.length > 0 && (
              <p className="incluye">Incluye: {nombresCompartidos}.</p>
            )}
            <div className="stats-row">
              <div className="stat">
                <span className="valor">{caloriasTotales != null ? `${caloriasTotales} kcal` : 'No disponible'}</span>
                <span className="etiqueta">CALORÍAS TOTALES DEL COMBO</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <EstadoBadge estado={principal.disponibilidad} />
                <span className="etiqueta" style={{ marginTop: 6 }}>DISPONIBILIDAD</span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-detalle">
          <h3>Ingredientes</h3>
          <p className="ingredientes-texto">
            {principal.ingredientes && principal.ingredientes.length > 0
              ? principal.ingredientes.join(', ') + '.'
              : 'Sin ingredientes registrados.'}
          </p>

          <h3>Información nutricional</h3>
          <TablaNutricional info={principal.informacion_nutricional} />

          <h3>Alérgenos</h3>
          <AlergenoPills alergenos={principal.alergenos} />
        </div>
      </div>

      {compartidos.length > 0 && (
        <section className="seccion-incluye">
          <h2>El menú también incluye</h2>
          <div className="grid-incluye">
            {compartidos.map((c) => (
              <div key={c.id_menu_preparacion} className="card-incluye">
                <div className="card-imagen">{ICONOS_COMPONENTE[c.componente] || '🍽️'}</div>
                <div className="card-body">
                  <h3>{c.nombre}</h3>
                  <div className="stats-row">
                    <div className="stat">
                      <span className="valor">
                        {c.informacion_nutricional ? `${c.informacion_nutricional.calorias} kcal` : 'No disponible'}
                      </span>
                      <span className="etiqueta">CALORÍAS</span>
                    </div>
                    <div className="stat-divider" />
                    <div className="stat">
                      <EstadoBadge estado={c.disponibilidad} />
                    </div>
                  </div>
                  <p className="ingredientes-texto" style={{ marginTop: 4 }}>
                    {c.ingredientes && c.ingredientes.length > 0 ? c.ingredientes.join(', ') + '.' : 'Sin ingredientes registrados.'}
                  </p>
                  <AlergenoPills alergenos={c.alergenos} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
