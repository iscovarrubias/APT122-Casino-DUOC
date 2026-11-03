import {
  categoriasDelPeriodo, estiloCategoria, principalesDe, acompDe, combosDe, diasDelPeriodo, totalesDelPeriodo,
  nombreLargo, encabezadoDia, rangoSemana, nombreTipo,
} from '../utils/exportarMenu';

const hex = (c) => `#${c}`;
const formatoPrecio = (n) => (n === null || n === undefined ? '' : `$${Number(n).toLocaleString('es-CL')}`);

function Cabecera({ periodo, titulo }) {
  return (
    <header className="hx-cabecera">
      <div className="hx-logo"><img src="/logo.svg" alt="Casinos DuocUC" /></div>
      <div className="hx-titulos">
        <div>
          <small>PLANIFICACIÓN</small>
          <strong>Almuerzos</strong>
        </div>
        <span className="hx-mes">{periodo.etiquetaMes}</span>
      </div>
      {titulo && <div className="hx-subtitulo">{titulo}  ·  {periodo.subtitulo}</div>}
    </header>
  );
}

export function HojaCalendario({ periodo }) {
  const cats = categoriasDelPeriodo(periodo);
  return (
    <div className="hx-hoja">
      <Cabecera periodo={periodo} />
      {periodo.semanas.map((s) => (
        <table className="hx-cal" key={s.lunes}>
          <thead>
            <tr>
              <th className="hx-cal-lateral">{periodo.modo === 'mes' ? <>Semana<br />{rangoSemana(s)}</> : ''}</th>
              {s.dias.map((d) => <th key={d.fecha}>{d.fuera ? '' : encabezadoDia(d.fecha)}</th>)}
            </tr>
          </thead>
          <tbody>
            {cats.map((cat) => {
              const est = estiloCategoria(cat);
              return (
                <tr key={cat} style={{ background: hex(est.fila), borderBottom: `1.5px solid ${hex(est.texto)}` }}>
                  <th className="hx-cal-cat" style={{ color: hex(est.texto) }}>{cat}</th>
                  {s.dias.map((d) => {
                    const plato = d.fuera ? null : principalesDe(d).find((c) => c.categoria === cat);
                    return <td key={d.fecha} className={plato ? '' : 'hx-vacio'}>{plato ? plato.preparacion : '—'}</td>;
                  })}
                </tr>
              );
            })}
            <tr className="hx-cal-incluye">
              <th className="hx-cal-cat" style={{ color: '#EFA018' }}>Incluye</th>
              {s.dias.map((d) => {
                const extra = d.fuera ? [] : acompDe(d);
                return (
                  <td key={d.fecha} className={extra.length ? '' : 'hx-vacio'}>
                    {extra.length ? extra.map((c) => <div key={c.tipo + c.preparacion}><b>{c.tipo}:</b> {c.preparacion}</div>) : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      ))}
      <footer className="hx-pie">Menús son referenciales y pueden sufrir modificaciones por stock de productos*</footer>
    </div>
  );
}

function chip(d) {
  if (!d.tiene) return { texto: 'Sin menú', clase: 'sin' };
  return d.publicado ? { texto: 'Publicado', clase: 'pub' } : { texto: 'Borrador', clase: 'bor' };
}

export function HojaDetalle({ periodo }) {
  return (
    <div className="hx-hoja">
      <Cabecera periodo={periodo} titulo="Detalle de preparaciones por día" />
      {diasDelPeriodo(periodo).map((d) => {
        const c = chip(d);
        return (
          <section className="hx-dia" key={d.fecha}>
            <div className="hx-dia-cabeza">
              <strong>{nombreLargo(d.fecha)}{!d.tiene && <em className="hx-nota-dia"> — sin menú programado</em>}</strong>
              <span className={`hx-chip hx-chip--${c.clase}`}>{c.texto}</span>
            </div>
            {d.tiene ? (
              <table className="hx-tabla">
                <thead>
                  <tr><th>Componente</th><th>Categoría</th><th>Preparación</th><th className="hx-centro">Cantidad</th><th className="hx-centro">Precio del combo</th></tr>
                </thead>
                <tbody>
                  {d.comps.map((x) => {
                    const principal = x.tipo === 'Plato Principal';
                    const est = principal ? estiloCategoria(x.categoria) : null;
                    return (
                      <tr key={x.tipo + x.categoria + x.preparacion}>
                        <td>{nombreTipo(x.tipo)}</td>
                        <td style={principal ? { background: hex(est.etiqueta), color: hex(est.texto), fontWeight: 700 } : { color: '#6B7280' }}>
                          {principal ? x.categoria : 'Compartido'}
                        </td>
                        <td>{x.preparacion}</td>
                        <td className="hx-centro hx-fuerte">{x.cantidad}</td>
                        <td className="hx-centro">{principal ? formatoPrecio(x.precio) : <i className="hx-incluido">Incluido en el combo</i>}</td>
                      </tr>
                    );
                  })}
                  <tr className="hx-total">
                    <td colSpan={3} className="hx-derecha">Combos planificados del día</td>
                    <td className="hx-centro">{combosDe(d)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function HojaTotal({ periodo }) {
  const filas = totalesDelPeriodo(periodo);
  return (
    <div className="hx-hoja">
      <Cabecera periodo={periodo} titulo="Total a preparar" />
      {filas.length === 0 ? (
        <div className="hx-sin-menu">No hay menús planificados en este período.</div>
      ) : (
        <table className="hx-tabla hx-tabla--total">
          <thead>
            <tr><th>Tipo</th><th>Preparación</th><th>Categoría</th><th className="hx-centro">Cantidad total</th><th>Días en que se sirve</th></tr>
          </thead>
          <tbody>
            {filas.map((t) => {
              const principal = t.tipo === 'Plato Principal';
              const est = principal ? estiloCategoria(t.categoria) : null;
              return (
                <tr key={t.tipo + t.categoria + t.preparacion}>
                  <td>{nombreTipo(t.tipo)}</td>
                  <td>{t.preparacion}</td>
                  <td style={principal ? { background: hex(est.etiqueta), color: hex(est.texto), fontWeight: 700 } : { color: '#6B7280' }}>
                    {principal ? t.categoria : 'Compartido'}
                  </td>
                  <td className="hx-centro hx-fuerte hx-grande">{t.total}</td>
                  <td className="hx-dias">{t.textoDias}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
