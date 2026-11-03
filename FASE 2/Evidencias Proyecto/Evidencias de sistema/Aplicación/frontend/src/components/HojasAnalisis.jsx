import { resumirOpiniones } from '../utils/exportarAnalisis';
import { fechaCorta } from '../utils/periodos';

const COL = { Principal: '#F5A623', JUNAEB: '#D11B1B', Vegetariano: '#3C7424', Hipocalórico: '#318386', Compartido: '#8a94a6' };
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('es-CL'));
const precio = (n) => (n ? `$${Number(n).toLocaleString('es-CL')}` : '—');

function Cabecera({ titulo, d }) {
  return (
    <header className="ha-cab">
      <img src="/logo.svg" alt="Casinos DuocUC" />
      <div><small>ANÁLISIS</small><h1>{titulo}</h1><span>{d.etiqueta}</span></div>
    </header>
  );
}
function Kpis({ items }) {
  return <div className="ha-kpis">{items.map(([t, v, n]) => <div key={t}><span>{t}</span><strong>{v}</strong>{n && <small>{n}</small>}</div>)}</div>;
}
function Barras({ filas, color = '#F5A623' }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className="ha-barras">
      {filas.map((f) => (
        <div key={f.etiqueta}>
          <span className="ha-b-et">{f.etiqueta}</span>
          <div className="ha-b-riel"><div style={{ width: `${(f.valor / max) * 100}%`, background: f.color || color }} /></div>
          <b>{f.texto ?? num(f.valor)}</b>
        </div>
      ))}
    </div>
  );
}

export function HojaVentasResumen({ d }) {
  const { detalle } = d;
  const pr = detalle.por_categoria.filter((c) => c.es_principal);
  const v = pr.reduce((s, c) => s + c.vendidas, 0);
  const p = pr.reduce((s, c) => s + c.planificadas, 0);
  return (
    <div className="ha-hoja">
      <Cabecera titulo="Ventas y agotamiento" d={d} />
      <Kpis items={[['Combos vendidos', num(v), `de ${num(p)} planificados`], ['Consumo', p ? `${Math.round((1000 * v) / p) / 10} %` : '—'], ['Días analizados', Math.max(0, ...pr.map((c) => c.dias))]]} />
      <h2>Comparación entre menús</h2>
      <table className="ha-tabla">
        <thead><tr><th>Menú</th><th>Precio</th><th>Vendidas</th><th>Consumo</th><th>Se agotó</th><th>Hora</th><th>Ritmo</th></tr></thead>
        <tbody>
          {pr.map((c) => (
            <tr key={c.categoria}>
              <td><i style={{ background: COL[c.categoria] }} />{c.categoria}</td>
              <td>{precio(c.precio_promedio)}</td>
              <td>{num(c.vendidas)} <small>de {num(c.planificadas)}</small></td>
              <td>{c.porcentaje_consumo != null ? `${c.porcentaje_consumo} %` : '—'}</td>
              <td>{c.dias_agotado} de {c.dias}</td>
              <td>{c.hora_agotamiento || '—'}</td>
              <td>{c.ritmo_hora ?? '—'} u/h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HojaVentasHora({ d }) {
  const h = d.detalle.ventas_por_hora;
  return (
    <div className="ha-hoja">
      <Cabecera titulo="Ventas por hora" d={d} />
      <p className="ha-nota">Unidades vendidas en todo el período, según la hora del día.</p>
      {h.length ? <Barras filas={h.map((x) => ({ etiqueta: `${String(x.hora).padStart(2, '0')}:00`, valor: x.unidades }))} /> : <p>No hay ventas registradas en este período.</p>}
    </div>
  );
}

export function HojaPreparaciones({ d }) {
  const filas = d.detalle.preparaciones.slice(0, 40);
  return (
    <div className="ha-hoja">
      <Cabecera titulo="Preparaciones" d={d} />
      <table className="ha-tabla">
        <thead><tr><th>Preparación</th><th>Días</th><th>Vendidas</th><th>Consumo</th><th>Se agotó</th><th>Hora</th><th>Ritmo</th></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id_preparacion}>
              <td>{f.nombre}<small>{f.componente === 'Plato Principal' ? 'Plato principal' : f.componente}</small></td>
              <td>{f.dias}</td><td>{num(f.vendidas)} <small>de {num(f.planificadas)}</small></td>
              <td>{f.porcentaje_consumo != null ? `${f.porcentaje_consumo} %` : '—'}</td>
              <td>{f.dias_agotado} de {f.dias}</td><td>{f.hora_agotamiento || '—'}</td><td>{f.ritmo_hora ?? '—'} u/h</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.detalle.preparaciones.length > 40 && <p className="ha-nota">Se muestran las 40 con más ventas de {d.detalle.preparaciones.length}.</p>}
    </div>
  );
}

export function HojaGeneral({ d }) {
  const g = d.general;
  return (
    <div className="ha-hoja">
      <Cabecera titulo="Informe general: qué se agota más rápido" d={d} />
      <p className="ha-nota">{g.resumen.jornadas_cerradas} jornada(s) cerradas · {g.resumen.con_conteo_de_cocina} con conteo de sobrante de la cocina · {g.resumen.cierres_automaticos} con cierre automático.</p>
      <table className="ha-tabla">
        <thead><tr><th>Preparación</th><th>Se agotó</th><th>Minutos hasta agotarse</th><th>Vendidas por jornada</th><th>Sobrante promedio</th></tr></thead>
        <tbody>
          {g.platos.slice(0, 40).map((p) => (
            <tr key={p.id_preparacion}>
              <td>{p.nombre}</td><td>{p.dias_agotado} de {p.jornadas} ({p.porcentaje_agotado}%)</td>
              <td>{p.minutos_hasta_agotarse ?? '—'}</td><td>{p.vendidas_por_jornada}</td><td>{p.sobrante_promedio ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HojaOpinionesResumen({ d }) {
  const { filas, estrellas } = resumirOpiniones(d.opiniones);
  const r = d.resumen;
  return (
    <div className="ha-hoja">
      <Cabecera titulo="Opiniones de los estudiantes" d={d} />
      <Kpis items={[['Opiniones', num(r.total)], ['Con comentario', num(r.con_comentario)], ['Promedio (vigentes)', r.promedio_vigentes != null ? r.promedio_vigentes.toFixed(1) : '—'], ['Eliminadas', num(r.eliminadas)], ['Editadas', num(r.editadas)]]} />
      <h2>Estrellas (opiniones vigentes)</h2>
      <Barras color="#F5A623" filas={estrellas.map((c, i) => ({ etiqueta: `${i + 1} ★`, valor: c }))} />
      <h2>Por preparación</h2>
      <table className="ha-tabla">
        <thead><tr><th>Preparación</th><th>Opiniones</th><th>Promedio</th><th>Con comentario</th><th>Editadas</th><th>Eliminadas</th></tr></thead>
        <tbody>
          {filas.slice(0, 30).map((x) => (
            <tr key={x.nombre}><td>{x.nombre}</td><td>{x.total}</td><td>{x.promedio ?? '—'}</td><td>{x.comentarios}</td><td>{x.editadas}</td><td>{x.eliminadas}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HojaFavoritos({ d }) {
  const f = d.favoritos;
  return (
    <div className="ha-hoja">
      <Cabecera titulo="Favoritos de los estudiantes" d={d} />
      <Kpis items={[['Marcas de favorito', num(f.resumen.total)], ['Estudiantes', num(f.resumen.estudiantes)], ['Preparaciones', num(f.resumen.preparaciones)]]} />
      <h2>Más marcadas como favoritas</h2>
      {f.por_preparacion.length ? <Barras color="#D11B1B" filas={f.por_preparacion.slice(0, 15).map((x) => ({ etiqueta: x.nombre, valor: x.total }))} /> : <p>No hay favoritos en este período.</p>}
    </div>
  );
}

export function HojaOpinionesLista({ d }) {
  const lista = d.opiniones.filter((o) => o.comentario).slice(0, 24);
  return (
    <div className="ha-hoja">
      <Cabecera titulo="Comentarios de los estudiantes" d={d} />
      {lista.length === 0 && <p>No hay comentarios en este período.</p>}
      <div className="ha-opiniones">
        {lista.map((o) => (
          <article key={o.id_opinion} style={{ borderLeftColor: COL[o.categoria] || '#8a94a6' }}>
            <header><strong>{o.preparacion}</strong><span>{'★'.repeat(o.estrellas)}<em>{'★'.repeat(5 - o.estrellas)}</em></span></header>
            <small>{o.categoria || 'Menú sin registrar'}{o.fecha_menu ? ` · menú del ${fechaCorta(String(o.fecha_menu).slice(0, 10))}` : ''}</small>
            <p>“{o.comentario}”</p>
            <small>{o.autor || 'Estudiante'}{o.estado !== 'vigente' ? ` · ${o.estado === 'eliminada' ? 'eliminada por el estudiante' : 'versión anterior'}` : ''}</small>
          </article>
        ))}
      </div>
      {d.opiniones.filter((o) => o.comentario).length > 24 && <p className="ha-nota">Se muestran los 24 comentarios más recientes.</p>}
    </div>
  );
}
