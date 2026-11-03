import { useState, useEffect } from 'react';
import { MessageSquareText, Trash2, PencilLine, Download, Heart } from 'lucide-react';
import { consultarOpiniones, consultarOpinionesDetalle, consultarFavoritosDetalle } from '../api/gestion';
import { Estrellas } from './Opinion';
import { colorDeCategoria, parseFechaISO } from '../utils/formato';
import Mensaje from './Mensaje';
import Ayuda from './Ayuda';
import CampoFecha from './CampoFecha';
import ExportarAnalisis from './ExportarAnalisis';
import { hoyChile, haceDiasChile } from '../utils/formato';
import Cargando from './Cargando';

const CATEGORIAS = ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function fechaMenu(f) {
  if (!f) return null;
  const d = parseFechaISO(f);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
function fechaHora(marca) {
  if (!marca) return '';
  const [f, h = ''] = String(marca).split('T');
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a} ${h.slice(0, 5)}`;
}

const ESTADOS = [
  { valor: '', texto: 'Todas' },
  { valor: 'vigente', texto: 'Vigentes' },
  { valor: 'eliminada', texto: 'Eliminadas por el estudiante' },
  { valor: 'editada', texto: 'Versiones anteriores (editadas)' },
];

function TarjetaOpinion({ o, onFiltrarPlato }) {
  const color = o.categoria ? colorDeCategoria(o.categoria).color : '#9aa3b2';
  return (
    <article className={`opinion-card opinion-card--${o.estado}`} style={{ '--acento': color }}>
      <header className="opinion-card-cabeza">
        <div>
          <button type="button" className="opinion-plato" onClick={() => onFiltrarPlato(o.id_preparacion)} title="Ver solo las opiniones de esta preparación">
            {o.preparacion}
          </button>
          <div className="opinion-contexto">
            {o.categoria ? <span className="opinion-cat">{o.categoria}</span> : <span className="opinion-cat opinion-cat--vacia">Categoría sin registrar</span>}
            <span>{o.fecha_menu ? `Menú del ${fechaMenu(o.fecha_menu)}` : 'Menú sin registrar'}</span>
          </div>
        </div>
        <div className="opinion-estrellas"><Estrellas valor={o.estrellas} tam={16} /><b>{o.estrellas}</b></div>
      </header>
      {o.comentario
        ? <p className="opinion-texto">“{o.comentario}”</p>
        : <p className="opinion-texto opinion-texto--vacio">Solo calificó, sin comentario.</p>}
      <footer className="opinion-pie">
        <span>{o.autor || 'Estudiante'}{o.correo ? ` · ${o.correo}` : ''} · {fechaHora(o.creado_en)}</span>
        {o.estado === 'eliminada' && <span className="opinion-estado opinion-estado--eliminada"><Trash2 size={13} aria-hidden="true" /> Eliminada por el estudiante el {fechaHora(o.cerrada_en)}</span>}
        {o.estado === 'editada' && <span className="opinion-estado opinion-estado--editada"><PencilLine size={13} aria-hidden="true" /> Versión anterior: el estudiante la editó el {fechaHora(o.cerrada_en)}</span>}
      </footer>
    </article>
  );
}

function ListaOpiniones({ filtroInicial, onFiltroAplicado }) {
  const [filtros, setFiltros] = useState({ id_preparacion: '', categoria: '', estrellas: '', estado: '', con_comentario: false, desde: '', hasta: '' });
  const [datos, setDatos] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);
  const [verPromedios, setVerPromedios] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (filtroInicial?.id_preparacion) {
      setFiltros((f) => ({ ...f, id_preparacion: String(filtroInicial.id_preparacion) }));
      onFiltroAplicado?.();
    }
  }, [filtroInicial, onFiltroAplicado]);

  useEffect(() => {
    let activo = true;
    setDatos(null);
    consultarOpinionesDetalle(filtros)
      .then((d) => { if (activo) { setDatos(d); setError(null); } })
      .catch((e) => { if (activo) setError(e.message); });
    return () => { activo = false; };
  }, [filtros]);

  useEffect(() => { consultarOpiniones().then(setResumen).catch(() => {}); }, []);

  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const hayFiltros = Object.values(filtros).some(Boolean);
  const limpiar = () => setFiltros({ id_preparacion: '', categoria: '', estrellas: '', estado: '', con_comentario: false, desde: '', hasta: '' });
  const filtrarPlato = (id) => setFiltros((f) => ({ ...f, id_preparacion: String(id) }));
  const r = datos?.resumen;

  return (
    <div className="opiniones">
      <section className="tarjeta">
        <div className="seccion-titulo">
          <h2>Opiniones de los estudiantes</h2>
          <Ayuda titulo="Las opiniones se conservan">
            Cuando un estudiante elimina o edita su opinión, deja de verla en su perfil y de contar en el promedio público, pero aquí queda guardada
            (marcada como eliminada o como versión anterior). Sirve para detectar opiniones inapropiadas y para analizar comentarios que se repiten,
            por ejemplo si varios días dicen que un plato tiene poca sal.
          </Ayuda>
        </div>

        <div className="filtros-opiniones">
          <label className="campo"><span>Preparación</span>
            <select value={filtros.id_preparacion} onChange={cambiar('id_preparacion')}>
              <option value="">Todas</option>
              {(datos?.preparaciones || []).map((p) => <option key={p.id_preparacion} value={p.id_preparacion}>{p.nombre} ({p.total})</option>)}
            </select>
          </label>
          <label className="campo"><span>Menú (categoría)</span>
            <select value={filtros.categoria} onChange={cambiar('categoria')}>
              <option value="">Todos</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="campo"><span>Estrellas</span>
            <select value={filtros.estrellas} onChange={cambiar('estrellas')}>
              <option value="">Todas</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'estrella' : 'estrellas'}</option>)}
            </select>
          </label>
          <label className="campo"><span>Estado</span>
            <select value={filtros.estado} onChange={cambiar('estado')}>
              {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
            </select>
          </label>
          <label className="campo"><span>Desde</span>
            <CampoFecha value={filtros.desde || ''} onChange={(v) => setFiltros((f) => ({ ...f, desde: v || '' }))} ariaLabel="Opiniones desde" />
          </label>
          <label className="campo"><span>Hasta</span>
            <CampoFecha value={filtros.hasta || ''} onChange={(v) => setFiltros((f) => ({ ...f, hasta: v || '' }))} ariaLabel="Opiniones hasta" />
          </label>
        </div>
        <div className="filtros-opiniones-pie">
          <label className="campo-check">
            <input type="checkbox" checked={filtros.con_comentario} onChange={cambiar('con_comentario')} />
            <span>Solo con comentario</span>
          </label>
          <div className="filtros-opiniones-acciones">
            {hayFiltros && <button type="button" className="boton boton-secundario" onClick={limpiar}>Limpiar filtros</button>}
            <button type="button" className="boton boton-secundario boton-exportar" onClick={() => setExportando(true)}><Download size={16} aria-hidden="true" /> Exportar</button>
          </div>
        </div>
      </section>

      {exportando && <ExportarAnalisis tipo="opiniones" desdeInicial={filtros.desde || haceDiasChile(30)} hastaInicial={filtros.hasta || hoyChile()} onCerrar={() => setExportando(false)} />}
      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      {!datos && !error && <Cargando>Cargando opiniones…</Cargando>}

      {datos && (
        <>
          <div className="kpis">
            <div className="kpi"><span>Opiniones</span><strong>{r.total}</strong></div>
            <div className="kpi"><span>Con comentario</span><strong>{r.con_comentario}</strong></div>
            <div className="kpi"><span>Promedio (vigentes)</span><strong>{r.promedio_vigentes != null ? r.promedio_vigentes.toFixed(1) : '—'}</strong></div>
            <div className="kpi kpi--alerta"><span>Eliminadas por estudiantes</span><strong>{r.eliminadas}</strong></div>
            <div className="kpi"><span>Editadas</span><strong>{r.editadas}</strong></div>
          </div>

          {datos.opiniones.length === 0 ? (
            <div className="estado-info"><MessageSquareText size={20} aria-hidden="true" /> No hay opiniones con estos filtros.</div>
          ) : (
            <div className="opiniones-lista">
              {datos.opiniones.map((o) => <TarjetaOpinion key={o.id_opinion} o={o} onFiltrarPlato={filtrarPlato} />)}
              {datos.opiniones.length >= 500 && <p className="texto-suave">Se muestran las 500 más recientes. Usa los filtros para acotar.</p>}
            </div>
          )}
        </>
      )}

      {resumen && resumen.promedios.length > 0 && (
        <section className="tarjeta" style={{ marginTop: 18 }}>
          <button type="button" className="desplegable" aria-expanded={verPromedios} onClick={() => setVerPromedios((v) => !v)}>
            {verPromedios ? '▾' : '▸'} Promedio por preparación y favoritos
          </button>
          {verPromedios && (
            <div className="rejilla-analisis" style={{ marginTop: 12 }}>
              <div>
                <h3 className="subtitulo-panel">Calificación promedio (solo opiniones vigentes)</h3>
                <table className="tabla tabla-compacta">
                  <thead><tr><th>Preparación</th><th>Promedio</th><th>Votos</th></tr></thead>
                  <tbody>
                    {resumen.promedios.map((p) => (
                      <tr key={p.id_preparacion}>
                        <td><button type="button" className="enlace-tabla" onClick={() => filtrarPlato(p.id_preparacion)}>{p.nombre}</button></td>
                        <td><Estrellas valor={p.promedio} tam={14} /> {p.promedio.toFixed(1)}</td><td>{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="subtitulo-panel">Más marcados como favoritos</h3>
                {resumen.favoritos.length === 0 && <p className="texto-suave">Aún no hay favoritos.</p>}
                {resumen.favoritos.map((f) => <div key={f.id_preparacion}>{f.nombre}: <strong>{f.total}</strong></div>)}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ListaFavoritos() {
  const [filtros, setFiltros] = useState({ id_preparacion: '', desde: '', hasta: '' });
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let activo = true;
    setDatos(null);
    consultarFavoritosDetalle(filtros)
      .then((d) => { if (activo) { setDatos(d); setError(null); } })
      .catch((e) => { if (activo) setError(e.message); });
    return () => { activo = false; };
  }, [filtros]);

  const max = Math.max(1, ...(datos?.por_preparacion || []).map((x) => x.total));
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <div className="opiniones">
      <section className="tarjeta">
        <div className="seccion-titulo">
          <h2>Favoritos de los estudiantes</h2>
          <Ayuda titulo="Favoritos">
            Un estudiante puede marcar una preparación como favorita sin dejar una opinión. Aquí ves cuáles son las más marcadas y quién las marcó.
            Si el estudiante quita el favorito, deja de aparecer.
          </Ayuda>
        </div>
        <div className="filtros-opiniones">
          <label className="campo"><span>Preparación</span>
            <select value={filtros.id_preparacion} onChange={(e) => setFiltros((f) => ({ ...f, id_preparacion: e.target.value }))}>
              <option value="">Todas</option>
              {(datos?.por_preparacion || []).map((p) => <option key={p.id_preparacion} value={p.id_preparacion}>{p.nombre} ({p.total})</option>)}
            </select>
          </label>
          <label className="campo"><span>Desde</span>
            <CampoFecha value={filtros.desde} onChange={(v) => setFiltros((f) => ({ ...f, desde: v || '' }))} ariaLabel="Favoritos desde" /></label>
          <label className="campo"><span>Hasta</span>
            <CampoFecha value={filtros.hasta} onChange={(v) => setFiltros((f) => ({ ...f, hasta: v || '' }))} ariaLabel="Favoritos hasta" /></label>
        </div>
        <div className="filtros-opiniones-pie">
          <span />
          <div className="filtros-opiniones-acciones">
            {hayFiltros && <button type="button" className="boton boton-secundario" onClick={() => setFiltros({ id_preparacion: '', desde: '', hasta: '' })}>Limpiar filtros</button>}
            <button type="button" className="boton boton-secundario boton-exportar" onClick={() => setExportando(true)}><Download size={16} aria-hidden="true" /> Exportar</button>
          </div>
        </div>
      </section>
      {exportando && <ExportarAnalisis tipo="opiniones" desdeInicial={filtros.desde || haceDiasChile(30)} hastaInicial={filtros.hasta || hoyChile()} onCerrar={() => setExportando(false)} />}
      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      {!datos && !error && <Cargando>Cargando favoritos…</Cargando>}
      {datos && (
        <>
          <div className="kpis">
            <div className="kpi"><span>Marcas de favorito</span><strong>{datos.resumen.total}</strong></div>
            <div className="kpi"><span>Estudiantes</span><strong>{datos.resumen.estudiantes}</strong></div>
            <div className="kpi"><span>Preparaciones</span><strong>{datos.resumen.preparaciones}</strong></div>
          </div>
          {datos.favoritos.length === 0 ? (
            <div className="estado-info"><Heart size={20} aria-hidden="true" /> No hay favoritos con estos filtros.</div>
          ) : (
            <div className="rejilla-analisis">
              <section className="tarjeta">
                <h2>Más marcadas como favoritas</h2>
                <div className="barras-horas">
                  {datos.por_preparacion.slice(0, 15).map((p) => (
                    <div key={p.id_preparacion} className="barra-fila">
                      <button type="button" className="enlace-tabla barra-nombre" onClick={() => setFiltros((f) => ({ ...f, id_preparacion: String(p.id_preparacion) }))}>{p.nombre}</button>
                      <div className="barra"><div className="barra-relleno" style={{ width: `${(p.total / max) * 100}%`, background: '#D11B1B' }} /></div>
                      <span>{p.total}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="tarjeta">
                <h2>Quién la marcó</h2>
                <div className="tabla-scroll tabla-alta">
                  <table className="tabla tabla-compacta">
                    <thead><tr><th>Preparación</th><th>Estudiante</th><th>Fecha</th></tr></thead>
                    <tbody>
                      {datos.favoritos.map((f, i) => (
                        <tr key={`${f.id_preparacion}-${f.correo}-${i}`}>
                          <td>{f.preparacion}</td>
                          <td>{f.autor}<small className="celda-sub">{f.correo}</small></td>
                          <td>{fechaHora(f.creado_en).slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function OpinionesPanel(props) {
  const [vista, setVista] = useState('opiniones');
  return (
    <>
      <div className="segmentado vista-opiniones" role="group" aria-label="Qué ver">
        <button type="button" className={vista === 'opiniones' ? 'activo' : ''} onClick={() => setVista('opiniones')}>Opiniones</button>
        <button type="button" className={vista === 'favoritos' ? 'activo' : ''} onClick={() => setVista('favoritos')}><Heart size={14} aria-hidden="true" /> Favoritos</button>
      </div>
      {vista === 'opiniones' ? <ListaOpiniones {...props} /> : <ListaFavoritos />}
    </>
  );
}
