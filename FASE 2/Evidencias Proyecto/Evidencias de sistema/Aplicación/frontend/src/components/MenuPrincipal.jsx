import EstadoBadge from './EstadoBadge';
import BotonFavorito from './BotonFavorito';
import AvisoAlergias from './AvisoAlergias';
import Opinion from './Opinion';
import { useEstudiante } from '../utils/useEstudiante';
import TablaNutricional from './TablaNutricional';
import AlergenoPills from './AlergenoPills';
import ImagenOIcono from './ImagenOIcono';
import { formatearPrecio, calcularCaloriasTotales, calcularPrecioTotal, colorDeCategoria, formatearHora, estadoEfectivo, NO_DISPONIBLE } from '../utils/formato';
import { useState } from 'react';

function Restante({ item }) {
  if (item.cantidad_restante == null || NO_DISPONIBLE.includes(estadoEfectivo(item))) return null;
  return (
    <span className="etiqueta" style={{ marginTop: 6 }}>
      Quedan {item.cantidad_restante} · actualizado {formatearHora(item.stock_actualizado_en)}
    </span>
  );
}

export default function MenuPrincipal({ categoria, componentes }) {
  const { alergias } = useEstudiante();
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const principal = componentes.find((c) => c.componente === 'Plato Principal');
  const compartidos = componentes.filter((c) => c.componente !== 'Plato Principal');

  if (!principal) {
    return (
      <div className="estado-info">
        No hay un plato principal planificado para "{categoria}" todavía.
      </div>
    );
  }

  const estadoPrincipal = estadoEfectivo(principal);
  const comboAgotado = NO_DISPONIBLE.includes(estadoPrincipal);
  const caloriasTotales = calcularCaloriasTotales(componentes);
  const precioTotal = calcularPrecioTotal(componentes);
  const nombresCompartidos = compartidos.map((c) => c.componente.toLowerCase()).join(', ');
  const { color, light } = colorDeCategoria(categoria);

  return (
    <div style={{ '--accent-categoria': color, '--accent-categoria-light': light }}>
      <AvisoAlergias componentes={componentes} />
      <div className="contenido-principal">
        <div className={`card-principal ${comboAgotado ? 'no-disponible' : ''}`}>
          {comboAgotado && (
            <div className="sello-agotado" aria-label="Agotado">
              AGOTADO
            </div>
          )}
          <div className="card-imagen">
            <ImagenOIcono url={principal.imagen_url} tipo={principal.componente} tamano={56} />
            <span className="badge-categoria">{categoria}</span>
            <div className="badge-precio">
              <span className="precio-label">Precio del combo</span>
              <span className="precio-valor">{formatearPrecio(precioTotal)}</span>
            </div>
          </div>
          <div className="card-body">
            <div className="card-titulo-fila">
              <h2>{principal.nombre}</h2>
              <BotonFavorito idPreparacion={principal.id_preparacion} nombre={principal.nombre} />
            </div>
            {compartidos.length > 0 && (
              <p className="incluye">Incluye: {nombresCompartidos}.</p>
            )}
            <div className="stats-row">
              <div className="stat">
              <span className="valor">{caloriasTotales != null ? `${Math.round(caloriasTotales)} kcal` : 'No disponible'}</span>
                <span className="etiqueta">Calorías totales del combo</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <EstadoBadge estado={comboAgotado ? 'agotado' : estadoPrincipal} />
                {!comboAgotado && <Restante item={principal} />}
              </div>
            </div>
            <button
              type="button"
              className="boton boton-secundario boton-detalles"
              onClick={() => setDetalleAbierto((v) => !v)}
              aria-expanded={detalleAbierto}
            >
              {detalleAbierto ? 'Ocultar detalles' : 'Ver detalles'}
            </button>
          </div>
        </div>

        <div className={`panel-detalle ${detalleAbierto ? 'abierto' : ''}`}>
          <h3>Ingredientes</h3>
          <p className="ingredientes-texto">
            {principal.ingredientes && principal.ingredientes.length > 0
              ? principal.ingredientes.join(', ') + '.'
              : 'Sin ingredientes registrados.'}
          </p>

          <h3>Información nutricional</h3>
          <TablaNutricional info={principal.informacion_nutricional} />

          <h3>Alérgenos</h3>
          <AlergenoPills alergenos={principal.alergenos} resaltar={alergias} />

          <Opinion item={{ ...principal, categoria }} />
        </div>
      </div>

{compartidos.length > 0 && (
  <section className="seccion-incluye">
    <h2>Incluye en el combo</h2>
    <div className="grid-incluye">
      {compartidos.map((c) => (
      <div key={c.id_menu_preparacion} className={`card-incluye ${comboAgotado || NO_DISPONIBLE.includes(estadoEfectivo(c)) ? 'no-disponible' : ''}`}>
          <div className="card-imagen">
            <ImagenOIcono url={c.imagen_url} tipo={c.componente} tamano={40} />
          </div>
          <div className="card-body">
            <div className="card-titulo-fila">
              <h3 className="card-titulo">{c.nombre}</h3>
              <BotonFavorito idPreparacion={c.id_preparacion} nombre={c.nombre} />
            </div>
            <p className="incluye-tipo">{c.componente}</p>

            <div className="stats-row">
              <div className="stat">
              <span className="valor">
                {c.informacion_nutricional ? `${Math.round(Number(c.informacion_nutricional.calorias))} kcal` : 'No disponible'}
              </span>
                <span className="etiqueta">Calorías</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <EstadoBadge estado={comboAgotado ? 'agotado' : estadoEfectivo(c)} />
                {!comboAgotado && <Restante item={c} />}
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
            <AlergenoPills alergenos={c.alergenos} resaltar={alergias} />
            <Opinion item={{ ...c, categoria }} />
          </div>
        </div>
      ))}
    </div>
  </section>
      )}
    </div>
  );
}