import EstadoBadge from './EstadoBadge';
import TablaNutricional from './TablaNutricional';
import AlergenoPills from './AlergenoPills';
import { IconPlato, IconEnsalada, IconPostre, IconBebida } from './iconos';
import { formatearPrecio, calcularCaloriasTotales, calcularPrecioTotal, colorDeCategoria } from '../utils/formato';
import { useState } from 'react';

const ICONOS_COMPONENTE = {
  'Plato Principal': IconPlato,
  Entrada: IconEnsalada,
  Postre: IconPostre,
  Bebida: IconBebida,
};

function IconoComponente({ tipo, tamano = 40 }) {
  const Icono = ICONOS_COMPONENTE[tipo] || IconPlato;
  return <Icono width={tamano} height={tamano} strokeWidth={1.3} />;
}

function ImagenOIcono({ url, tipo, tamano }) {
  const [fallo, setFallo] = useState(false);

  if (url && !fallo) {
    return (
      <img
        src={url}
        alt=""
        className="card-foto"
        loading="lazy"
        onError={() => setFallo(true)}
      />
    );
  }
  return <IconoComponente tipo={tipo} tamano={tamano} />;
}

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
  const { color, light } = colorDeCategoria(categoria);

  return (
    <div style={{ '--accent-categoria': color, '--accent-categoria-light': light }}>
      <div className="contenido-principal">
        <div className="card-principal">
          <div className="card-imagen">
            <ImagenOIcono url={principal.imagen_url} tipo={principal.componente} tamano={56} />
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
    <h2>Incluye:</h2>
    <div className="grid-incluye">
      {compartidos.map((c) => (
        <div key={c.id_menu_preparacion} className="card-incluye">
          <div className="card-imagen">
            <ImagenOIcono url={c.imagen_url} tipo={c.componente} tamano={40} />
          </div>
          <div className="card-body">
            <h3 className="card-titulo">{c.nombre}</h3>
            <p className="incluye-tipo">{c.componente}</p>

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
                <span className="etiqueta" style={{ marginTop: 6 }}>DISPONIBILIDAD</span>
              </div>
            </div>

            <h4 className="subtitulo">Ingredientes</h4>
            <p className="ingredientes-texto">
              {c.ingredientes && c.ingredientes.length > 0
                ? c.ingredientes.join(', ') + '.'
                : 'Sin ingredientes registrados.'}
            </p>

            <h4 className="subtitulo">Información nutricional</h4>
            <TablaNutricional info={c.informacion_nutricional} />

            <h4 className="subtitulo">Alérgenos</h4>
            <AlergenoPills alergenos={c.alergenos} />
          </div>
        </div>
      ))}
    </div>
  </section>
      )}
    </div>
  );
}