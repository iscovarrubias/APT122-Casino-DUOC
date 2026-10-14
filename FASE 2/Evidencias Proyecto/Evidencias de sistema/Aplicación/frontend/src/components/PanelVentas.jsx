import { colorDeCategoria, formatearHora, ESTADO_TEXTO } from '../utils/formato';

export const CATEGORIAS = ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];

function textoEstimacion(e) {
  if (!e) return null;
  if (e.estado === 'agotado') return null;
  return e.agotaria ? `Se agotaría cerca de las ${e.hora}` : 'Alcanza hasta el cierre';
}

export function BotonesVenta({ componentes, onVender, deshabilitado, estimaciones = {} }) {
  return (
    <div className="caja-botones">
      {CATEGORIAS.map((cat) => {
        const principal = componentes.find((c) => c.categoria === cat && c.componente === 'Plato Principal');
        const { color } = colorDeCategoria(cat);
        return (
          <button key={cat} type="button" className={`caja-boton ${principal?.disponibilidad || ''}`} style={{ '--color': color }}
            disabled={!principal || deshabilitado} onClick={() => onVender(cat)}>
            <span className="caja-categoria">{cat}</span>
            <span className="caja-plato">{principal ? principal.preparacion : 'Sin plato principal'}</span>
            {principal && (
              <>
                <span className="caja-restante" aria-label="Porciones que quedan">{Math.max(principal.restante, 0)}</span>
                <span className="caja-estado">{ESTADO_TEXTO[principal.disponibilidad]}</span>
                {textoEstimacion(estimaciones[cat]) && <span className="caja-estimacion">{textoEstimacion(estimaciones[cat])}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CompartidosDelDia({ componentes }) {
  const compartidos = componentes.filter((c) => !c.categoria);
  if (!compartidos.length) return null;
  return (
    <div className="chips-compartidos">
      {compartidos.map((c) => (
        <div key={c.id_menu_preparacion} className={`chip-comp ${c.disponibilidad}`}>
          <strong>{c.componente}</strong>
          <span>{c.preparacion}</span>
          <span className="texto-suave">Quedan {Math.max(c.restante, 0)} · {ESTADO_TEXTO[c.disponibilidad]}</span>
        </div>
      ))}
    </div>
  );
}

export function UltimasVentas({ ventas, ocupado, onAnular }) {
  return (
    <div className="tarjeta">
      <h2>Últimas ventas</h2>
      {ventas.length === 0 && <p className="texto-suave">Aún no hay ventas registradas.</p>}
      {ventas.map((v) => (
        <div key={v.id_venta_combo} className="en-linea" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={v.anulada ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : undefined}>
            {formatearHora(v.registrada_en)} · {v.categoria}
          </span>
          {v.anulada ? <span className="insignia insignia-neutra">Anulada</span> : (
            <button className="boton boton-peligro" disabled={ocupado} onClick={() => onAnular(v.id_venta_combo)}>Deshacer</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function MenuDelDia({ componentes }) {
  const compartidos = componentes.filter((c) => !c.categoria);
  return (
    <div className="tarjeta">
      <h2>Menú de hoy</h2>
      <p className="texto-suave">
        Incluye en todos los combos: {compartidos.length ? compartidos.map((c) => `${c.componente}: ${c.preparacion}`).join(' · ') : '—'}
      </p>
      <div className="rejilla-4">
        {CATEGORIAS.map((cat) => {
          const principal = componentes.find((c) => c.categoria === cat && c.componente === 'Plato Principal');
          return (
            <div key={cat}>
              <strong style={{ color: colorDeCategoria(cat).color }}>{cat}</strong>
              <div>{principal ? principal.preparacion : <span className="texto-suave">Sin plato principal</span>}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
