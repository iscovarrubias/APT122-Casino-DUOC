import { ETIQUETA_VENTA } from '../utils/useVentas';
import { colorDeCategoria, formatearHora, formatearPrecio, ESTADO_TEXTO, CATEGORIAS_MENU as CATEGORIAS } from '../utils/formato';

function textoEstimacion(e) {
  if (!e) return null;
  if (e.estado === 'agotado') return null;
  return e.agotaria ? `Se agotaría cerca de las ${e.hora}` : 'Alcanza hasta el cierre';
}

export function BotonesVenta({ componentes, onVender, deshabilitado, estimaciones = {} }) {
  const COLOR_FONDO = { General: '#B8730D' };

  return (
    <div className="caja-botones">
      {CATEGORIAS.map((cat) => {
        const principal = componentes.find((c) => c.categoria === cat && c.componente === 'Plato Principal');
        const color = COLOR_FONDO[cat] || colorDeCategoria(cat).color;
        const precio = principal?.precio != null ? Number(principal.precio) : null;
        const conOpciones = principal && cat !== 'JUNAEB';
        return (
          <div key={cat} className="caja-tarjeta" style={{ '--color': color }}>
          <button type="button" className={`caja-boton ${principal?.disponibilidad || ''}`} style={{ '--color': color }}
            disabled={!principal || deshabilitado} onClick={() => onVender(cat, 'combo')}>
            <span className="caja-categoria">
              <span>{cat}</span>
              {precio != null && <span className="caja-precio">{formatearPrecio(precio)}</span>}
            </span>
            <span className="caja-plato">{principal ? principal.preparacion : 'Sin Plato Principal'}</span>
            {principal && (
              <>
                <span className="caja-restante" aria-label="Porciones que quedan">{Math.max(principal.restante, 0)}</span>
                <span className="caja-estado">{ESTADO_TEXTO[principal.disponibilidad]}</span>
                {textoEstimacion(estimaciones[cat]) && <span className="caja-estimacion">{textoEstimacion(estimaciones[cat])}</span>}
              </>
            )}
          </button>
          {conOpciones && (
            <div className="caja-mas" role="group" aria-label={`Más opciones de ${cat}`}>
              <span className="caja-mas-titulo">Más opciones</span>
              <div className="caja-mas-botones">
                <button type="button" className="caja-mas-boton" disabled={deshabilitado}
                  aria-label={`Solo plato de ${cat}`} onClick={() => onVender(cat, 'solo_plato')}>
                  Solo plato
                </button>
                <button type="button" className="caja-mas-boton" disabled={deshabilitado}
                  aria-label={`Completo con bebida de máquina de ${cat}`} onClick={() => onVender(cat, 'completo_maquina')}>
                  Completo + máquina
                </button>
              </div>
            </div>
          )}
          </div>
        );
      })}
    </div>
  );
}

export function ComposicionDelDia({ componentes, composicion = {} }) {
  const TIPOS = [
    { key: 'fondo', etiqueta: 'Fondo' },
    { key: 'ensalada', etiqueta: 'Ensalada' },
    { key: 'sopa', etiqueta: 'Sopa' },
    { key: 'pan', etiqueta: 'Pan' },
    { key: 'postre_fruta', etiqueta: 'Postre o fruta' },
    { key: 'bebida', etiqueta: 'Bebida' },
  ];

  const CATEGORIAS_ORDEN = ['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];

  const compDeCategoria = (cat) => {
    const reglas = composicion[cat] || [];
    const tiposDeCategoria = new Set(reglas.map((r) => r.tipo));
    const especificos = componentes.filter((c) => c.categoria === cat);
    const compartidos = componentes.filter((c) => {
      if (c.categoria) return false;
      if (!tiposDeCategoria.has(c.componente)) return false;
      return !componentes.some((x) => x.categoria === cat && x.componente === c.componente);
    });
    return [...especificos, ...compartidos];
  };

  const valorCelda = (comps, key) => {
    if (key === 'fondo') {
      const fondo = comps.find((c) => c.componente === 'Plato Principal');
      return fondo?.preparacion || null;
    }
    if (key === 'postre_fruta') {
      const postre = comps.find((c) => c.componente === 'Postre');
      const fruta = comps.find((c) => c.componente === 'Fruta');
      if (postre && fruta) return `${postre.preparacion} o ${fruta.preparacion}`;
      if (postre) return postre.preparacion;
      if (fruta) return fruta.preparacion;
      return null;
    }
    const tipoNombre = { ensalada: 'Ensalada', sopa: 'Sopa', pan: 'Pan', bebida: 'Bebida' }[key];
    const comp = comps.find((c) => c.componente === tipoNombre);
    return comp?.preparacion || null;
  };

  const categorias = CATEGORIAS_ORDEN.filter((cat) => {
    const comps = compDeCategoria(cat);
    return comps.some((x) => x.componente === 'Plato Principal');
  });
  if (categorias.length === 0) return null;

  const compsPorCat = Object.fromEntries(categorias.map((cat) => [cat, compDeCategoria(cat)]));
  const hayPan = categorias.some((cat) => compsPorCat[cat].some((c) => c.componente === 'Pan'));
  const filas = TIPOS.filter((f) => f.key !== 'pan' || hayPan);

  return (
    <details className="tarjeta composicion-details">
      <summary>Ver qué incluye cada menú hoy</summary>
      <div className="semanal-tabla-scroll" style={{ marginTop: 12 }}>
        <table className="semanal-tabla">
          <thead>
            <tr>
              <th className="semanal-tabla-esquina" aria-hidden="true"></th>
              {categorias.map((cat) => {
                const { color, light } = colorDeCategoria(cat);
                return (
                  <th key={cat}>
                    <span className="semanal-tipo" style={{ color, background: light }}>{cat}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ key, etiqueta }) => (
              <tr key={key}>
                <th scope="row">{etiqueta}</th>
                {categorias.map((cat) => {
                  const v = valorCelda(compsPorCat[cat], key);
                  return (
                    <td key={cat}>
                      {v ? <span className={key === 'fondo' ? 'semanal-fondo' : ''}>{v}</span> : <span className="texto-suave">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function CompartidosDelDia({ componentes, composicion = {} }) {
  const compartidos = [
    ...componentes.filter((c) => !c.categoria),
    ...componentes.filter((c) => c.categoria && c.componente !== 'Plato Principal'),
  ];
  if (!compartidos.length) return null;

  const categoriasDelTipo = (tipo) =>
    Object.entries(composicion)
      .filter(([, reglas]) => reglas.some((r) => r.tipo === tipo))
      .map(([cat]) => cat);

  return (
    <div className="chips-compartidos">
      {compartidos.map((c) => {
        const especial = Boolean(c.categoria);
        const cats = especial ? [c.categoria] : categoriasDelTipo(c.componente);
        return (
          <div key={c.id_menu_preparacion} className={`chip-comp ${c.disponibilidad}`}>
            <strong>{c.componente}</strong>
            <span>{c.preparacion}</span>
            <span className="texto-suave">Quedan {Math.max(c.restante, 0)} - {ESTADO_TEXTO[c.disponibilidad]}</span>
            {cats.length > 0 && (
              <span className="chip-comp-cats">
                {especial ? 'Especial para' : 'Para'}: {cats.join(', ')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function UltimasVentas({ ventas, ocupado, onAnular }) {
  return (
    <section className="ultimas-ventas">
      <h2 className="v2-subtitulo">Últimas ventas</h2>
      {ventas.length === 0 && <p className="ultimas-vacio">Aún no hay ventas registradas.</p>}
      {ventas.length > 0 && (
        <ul className="ultimas-lista">
          {ventas.map((v) => (
            <li key={v.id_venta_combo} className={v.anulada ? 'anulada' : ''}>
              <span className="ultimas-hora">{formatearHora(v.registrada_en)}</span>
              <span className="ultimas-cat"><i style={{ background: colorDeCategoria(v.categoria).color }} aria-hidden="true" />{v.categoria}</span>
              {v.tipo_venta && v.tipo_venta !== 'combo' && <span className="ultimas-nota">{ETIQUETA_VENTA[v.tipo_venta]}</span>}
              {v.anulada
                ? <span className="ultimas-nota">Anulada</span>
                : <button type="button" className="boton-texto peligro" disabled={ocupado} onClick={() => onAnular(v.id_venta_combo)}>Deshacer</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MenuDelDia({ componentes, composicion = {} }) {
  const ORDEN_TIPO = { Ensalada: 1, Sopa: 2, Pan: 3, Postre: 4, Fruta: 4, Bebida: 5 };

  return (
    <div className="tarjeta">
      <h2>Menú de hoy por categoría</h2>
      <div className="rejilla-4">
        {CATEGORIAS.map((cat) => {
          const principal = componentes.find((c) => c.categoria === cat && c.componente === 'Plato Principal');
          const reglas = composicion[cat] || [];
          const acompanamientos = reglas
            .filter((r) => r.tipo !== 'Plato Principal')
            .map((r) => {
              const comp = componentes.find((c) => c.componente === r.tipo && c.categoria === cat)
                || componentes.find((c) => c.componente === r.tipo && !c.categoria);
              if (!comp) return null;
              return { tipo: r.tipo, preparacion: comp.preparacion, grupo: r.grupo_opcion };
            })
            .filter(Boolean);
          const items = [];
          const gruposVistos = new Map();
          acompanamientos.forEach((a) => {
            if (!a.grupo) {
              items.push({ tipos: [a.tipo], etiqueta: a.tipo, texto: a.preparacion });
              return;
            }
            if (!gruposVistos.has(a.grupo)) {
              gruposVistos.set(a.grupo, { etiqueta: null, tipos: [], opciones: [] });
            }
            const grupo = gruposVistos.get(a.grupo);
            grupo.opciones.push(a.preparacion);
            grupo.tipos.push(a.tipo);
            grupo.etiqueta = grupo.opciones.length > 1
              ? grupo.opciones.map((_, i) => acompanamientos.filter((x) => x.grupo === a.grupo)[i].tipo).join(' o ')
              : a.tipo;
          });
          gruposVistos.forEach((g) => {
            items.push({ tipos: g.tipos, etiqueta: g.etiqueta, texto: g.opciones.join(' o ') });
          });
          const ordenDe = (it) => Math.min(...it.tipos.map((t) => ORDEN_TIPO[t] ?? 99));
          items.sort((a, b) => ordenDe(a) - ordenDe(b));

          return (
            <div key={cat} className="menu-cat-bloque">
              <strong style={{ color: colorDeCategoria(cat).color }}>{cat}</strong>
              <div className="menu-cat-fondo">
                {principal ? principal.preparacion : <span className="texto-suave">Sin Plato Principal</span>}
              </div>
              {items.length > 0 && (
                <ul className="menu-cat-lista">
                  {items.map((it, i) => (
                    <li key={i}>
                      <span className="menu-cat-tipo">{it.etiqueta}:</span> {it.texto}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}