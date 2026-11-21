import EstadoBadge from './EstadoBadge';
import BotonFavorito from './BotonFavorito';
import AvisoAlergias from './AvisoAlergias';
import Opinion from './Opinion';
import { useEstudiante } from '../utils/useEstudiante';
import TablaNutricional from './TablaNutricional';
import AlergenoPills from './AlergenoPills';
import ImagenOIcono from './ImagenOIcono';
import PrediccionAgotamiento from './PrediccionAgotamiento';
import {
  formatearPrecio,
  calcularPrecioTotal,
  colorDeCategoria,
  formatearHora,
  estadoEfectivo,
  NO_DISPONIBLE,
  conGrupoOpcion,
  agruparComponentes,
  calcularCaloriasConOpcion,
  colorTextoSobre,
} from '../utils/formato';
import { useState } from 'react';
import './flipCard.css';

function Restante({ item }) {
  if (item.cantidad_restante == null || NO_DISPONIBLE.includes(estadoEfectivo(item))) return null;
  return (
    <span className="etiqueta" style={{ marginTop: 6 }}>
      Quedan {item.cantidad_restante} - actualizado {formatearHora(item.stock_actualizado_en)}
    </span>
  );
}

function CardCompartida({ item, comboAgotado, alergias, categoria }) {
  return (
    <div className={`card-incluye ${comboAgotado || NO_DISPONIBLE.includes(estadoEfectivo(item)) ? 'no-disponible' : ''}`}>
      <div className="card-imagen">
        <ImagenOIcono url={item.imagen_url} tipo={item.componente} tamano={40} />
      </div>
      <div className="card-body">
        <div className="card-titulo-fila">
          <h3 className="card-titulo">{item.nombre}</h3>
          <BotonFavorito idPreparacion={item.id_preparacion} nombre={item.nombre} />
        </div>
        <p className="incluye-tipo">{item.componente}</p>

        <div className="stats-row">
          <div className="stat">
            <span className="valor">
              {item.informacion_nutricional ? `${Math.round(Number(item.informacion_nutricional.calorias))} kcal` : 'No disponible'}
            </span>
            <span className="etiqueta">Calorías</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <EstadoBadge estado={comboAgotado ? 'agotado' : estadoEfectivo(item)} />
            {!comboAgotado && <Restante item={item} />}
          </div>
        </div>

        <h4 className="subtitulo">Ingredientes</h4>
        <p className="ingredientes-texto">
          {item.ingredientes && item.ingredientes.length > 0 ? item.ingredientes.join(', ') + '.' : 'Sin ingredientes registrados.'}
        </p>

        <h4 className="subtitulo">Información nutricional</h4>
        <TablaNutricional info={item.informacion_nutricional} />

        <h4 className="subtitulo">Alérgenos</h4>
        <AlergenoPills alergenos={item.alergenos} resaltar={alergias} />
        <Opinion item={{ ...item, categoria }} />
      </div>
    </div>
  );
}

function CardOpcionFlip({ items, activo, onCambiar, comboAgotado, alergias, categoria }) {
  if (items.length === 1) {
    return <CardCompartida item={items[0]} comboAgotado={comboAgotado} alergias={alergias} categoria={categoria} />;
  }

  const frente = items[0];
  const reverso = items[1];
  const volteada = activo === items[1].componente;

  const alternar = () => onCambiar(volteada ? items[0].componente : items[1].componente);

  return (
    <div className="flip-card">
      <div className={`flip-card-inner ${volteada ? 'flipped' : ''}`}>
        <div className="flip-card-face flip-card-face--front" aria-hidden={volteada} inert={volteada}>
          <CardCompartida item={frente} comboAgotado={comboAgotado} alergias={alergias} categoria={categoria} />
        </div>
        <div className="flip-card-face flip-card-face--back" aria-hidden={!volteada} inert={!volteada}>
          <CardCompartida item={reverso} comboAgotado={comboAgotado} alergias={alergias} categoria={categoria} />
        </div>
      </div>
      <button
        type="button"
        className="flip-toggle"
        onClick={alternar}
        aria-label={`Ver con ${volteada ? items[0].componente : items[1].componente}`}
      >
        {volteada ? `← Ver con ${items[0].componente}` : `Ver con ${items[1].componente} →`}
      </button>
    </div>
  );
}

export default function MenuPrincipal({ categoria, componentes, composicionDeCategoria = [], prediccion = null }) {
  const { alergias } = useEstudiante();
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [opciones, setOpciones] = useState({});

  const tiposIncluidos = new Set(['Plato Principal', ...composicionDeCategoria.map((r) => r.tipo)]);
  const incluidos = composicionDeCategoria.length > 0 ? componentes.filter((c) => tiposIncluidos.has(c.componente)) : componentes;
  const anotados = conGrupoOpcion(incluidos, composicionDeCategoria);
  const { base, grupos } = agruparComponentes(anotados);

  const principal = anotados.find((c) => c.componente === 'Plato Principal');
  if (!principal) {
    return <div className="estado-info">No hay un Plato Principal planificado para "{categoria}" todavía.</div>;
  }

  const tiposDeCategoria = new Set(composicionDeCategoria.map((r) => r.tipo));
  const compartidosFijos = base.filter((c) => c.componente !== 'Plato Principal' && tiposDeCategoria.has(c.componente));
  const gruposLista = Object.entries(grupos).filter(([, items]) => items.some((x) => tiposDeCategoria.has(x.componente)));

  const ORDEN_COMPARTIDOS = ['Ensalada', 'Sopa', 'Pan', 'Postre', 'Fruta', 'Bebida'];
  const tiposVisibles = (() => {
    const tipos = [];
    for (const c of compartidosFijos) tipos.push(c.componente);
    for (const [, items] of gruposLista) {
      const nombres = items.map((x) => x.componente);
      tipos.push(nombres.length === 1 ? nombres[0] : nombres.join(' o '));
    }
    tipos.sort((a, b) => {
      const ia = ORDEN_COMPARTIDOS.indexOf(a.split(' ')[0]);
      const ib = ORDEN_COMPARTIDOS.indexOf(b.split(' ')[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return tipos;
  })();

  const estadoPrincipal = estadoEfectivo(principal);
  const comboAgotado = NO_DISPONIBLE.includes(estadoPrincipal);
  const caloriasTotales = calcularCaloriasConOpcion(anotados, opciones);
  const precioTotal = calcularPrecioTotal(incluidos);
  const nombresCompartidos = tiposVisibles.map((t) => t.toLowerCase()).join(', ');
  const { color, light, texto } = colorDeCategoria(categoria);

  const cambiarOpcion = (tipo) =>
    setOpciones((prev) => {
      const grupo = gruposLista.find(([, items]) => items.some((x) => x.componente === tipo));
      if (!grupo) return prev;
      return { ...prev, [grupo[0]]: tipo };
    });

  return (
    <div
      style={{
        '--accent-categoria': color,
        '--accent-categoria-light': light,
        '--accent-categoria-texto': texto,
        '--accent-categoria-sobre': colorTextoSobre(color),
      }}
    >
      <AvisoAlergias componentes={incluidos} />
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
            {(compartidosFijos.length > 0 || gruposLista.length > 0) && <p className="incluye">Incluye: {nombresCompartidos}.</p>}
            <div className="stats-row">
              <div className="stat">
                <span className="valor" aria-live="polite">
                  {caloriasTotales != null ? `${Math.round(caloriasTotales)} kcal` : 'No disponible'}
                </span>
                <span className="etiqueta">Calorías totales del combo</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="estado-con-prediccion">
                  <EstadoBadge estado={comboAgotado ? 'agotado' : estadoPrincipal} />
                  {!comboAgotado && <PrediccionAgotamiento categoria={categoria} estimacion={prediccion} />}
                </span>
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

      {(compartidosFijos.length > 0 || gruposLista.length > 0) && (
        <section className="seccion-incluye">
          <h2>Incluye en el combo</h2>
          <div className="grid-incluye">
            {compartidosFijos.map((c) => (
              <CardCompartida key={c.id_menu_preparacion} item={c} comboAgotado={comboAgotado} alergias={alergias} categoria={categoria} />
            ))}
            {gruposLista.map(([numero, items]) => (
              <CardOpcionFlip
                key={`grupo-${numero}`}
                items={items}
                activo={opciones[numero]}
                onCambiar={cambiarOpcion}
                comboAgotado={comboAgotado}
                alergias={alergias}
                categoria={categoria}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
