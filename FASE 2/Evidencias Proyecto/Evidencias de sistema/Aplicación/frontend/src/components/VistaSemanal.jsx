import { useState, useEffect, useCallback } from 'react';
import { obtenerHistorialMenu } from '../api/menu';
import { aISOChile, hoyChile, CATEGORIAS_COLOR } from '../utils/formato';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function rangoSemana(fecha) {
  const dia = fecha.getDay();
  const offsetLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + offsetLunes);
  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5);
  return { lunes, sabado, desde: aISOChile(lunes), hasta: aISOChile(sabado) };
}

function formatearFechaLarga(fecha) {
  return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
}

function colorComponente(categoria) {
  if (!categoria) return { color: '#6B7280', light: '#EEF0F3' };
  return CATEGORIAS_COLOR[categoria] || CATEGORIAS_COLOR.Principal;
}

export default function VistaSemanal() {
  const [menus, setMenus] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null); 

  const hoy = hoyChile();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const { desde, hasta } = rangoSemana(new Date());
    try {
      const data = await obtenerHistorialMenu(desde, hasta);
      setMenus(data.menus);
    } catch (err) {
      setError(err.message);
      setMenus([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (menus && abierto === null) setAbierto(hoy);
  }, [menus, abierto, hoy]);

  const { lunes } = rangoSemana(new Date());
  const dias = DIAS_SEMANA.map((nombre, i) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    const fechaISO = aISOChile(fecha);
    const menu = (menus || []).find((m) => m.fecha === fechaISO) || null;
    return { nombre, fecha, fechaISO, menu, esHoy: fechaISO === hoy };
  });

  function alternar(fechaISO) {
    setAbierto((actual) => (actual === fechaISO ? null : fechaISO));
  }

  if (cargando) return <div className="estado-info">Cargando menú semanal…</div>;
  if (error) return <div className="estado-info">No se pudo cargar el menú semanal. ({error})</div>;

  return (
    <div className="semanal-acordeon">
      {dias.map(({ nombre, fecha, fechaISO, menu, esHoy }) => {
        const expandido = abierto === fechaISO;
        const total = menu ? menu.componentes.length : 0;
        return (
          <section
            key={fechaISO}
            className={`semanal-card ${esHoy ? 'semanal-card-hoy' : ''} ${expandido ? 'abierto' : ''}`}
          >
            <button
              type="button"
              className="semanal-card-header"
              aria-expanded={expandido}
              onClick={() => alternar(fechaISO)}
            >
              <div className="semanal-card-titulo">
                <span className="semanal-card-dia">{nombre}</span>
                {esHoy && <span className="semanal-badge-hoy">Hoy</span>}
                <span className="semanal-card-fecha">{formatearFechaLarga(fecha)}</span>
              </div>
              <div className="semanal-card-resumen">
                {menu
                  ? <span className="semanal-card-count">{total} {total === 1 ? 'plato' : 'platos'}</span>
                  : <span className="semanal-card-vacio">Sin menú</span>}
                <span className="semanal-chevron" aria-hidden="true">{expandido ? '−' : '+'}</span>
              </div>
            </button>

            {expandido && (
              <div className="semanal-card-cuerpo">
                {!menu && (
                  <p className="semanal-sin-menu">Aún no hay menú publicado para este día.</p>
                )}
                {menu && (
                  <ul className="semanal-componentes">
                    {menu.componentes.map((c, i) => {
                      const { color, light } = colorComponente(c.categoria);
                      const etiqueta = c.categoria
                        ? `${c.componente} · ${c.categoria}`
                        : `${c.componente} · Compartido`;
                      return (
                        <li key={i}>
                          <span className="semanal-tipo" style={{ color, background: light }}>
                            {etiqueta}
                          </span>
                          <span className="semanal-nombre">{c.preparacion}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}