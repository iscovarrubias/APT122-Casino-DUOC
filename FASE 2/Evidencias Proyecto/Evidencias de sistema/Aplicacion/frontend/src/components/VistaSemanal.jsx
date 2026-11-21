import { useState, useEffect, useCallback, useRef } from 'react';
import { obtenerHistorialMenu } from '../api/menu';
import { aISOChile, hoyChile, CATEGORIAS_COLOR } from '../utils/formato';
import PaginaError from './PaginaError';
import PantallaCarga from './PantallaCarga';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const CATEGORIAS_ORDEN = ['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];

const TIPOS_FILA = [
  { key: 'fondo', etiqueta: 'Fondo' },
  { key: 'ensalada', etiqueta: 'Ensalada' },
  { key: 'sopa', etiqueta: 'Sopa' },
  { key: 'pan', etiqueta: 'Pan' },
  { key: 'postre_fruta', etiqueta: 'Postre o fruta' },
  { key: 'bebida', etiqueta: 'Bebida' },
];

const COMPOSICION_POR_DEFECTO = {
  General: ['Ensalada', 'Sopa', 'Pan', 'Bebida', 'Postre', 'Fruta'],
  JUNAEB: ['Bebida'],
  Vegetariano: ['Ensalada', 'Sopa', 'Pan', 'Bebida', 'Postre', 'Fruta'],
  Hipocalórico: ['Ensalada', 'Sopa', 'Fruta', 'Bebida'],
};

function rangoSemana(fecha) {
  const dia = fecha.getDay();
  const offsetLunes = dia === 0 ? 1 : dia === 6 ? 2 : 1 - dia;
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
  if (!categoria) return { color: '#4B5563', light: '#EEF0F3', texto: '#4B5563' };
  return CATEGORIAS_COLOR[categoria] || CATEGORIAS_COLOR.General;
}

function componentesDeCategoria(componentes, categoria, composicionDeCategoria) {
  const especificos = componentes.filter((p) => p.categoria === categoria);

  let tiposDeCategoria;
  if (composicionDeCategoria && composicionDeCategoria.length > 0) {
    tiposDeCategoria = new Set(composicionDeCategoria.map((r) => r.tipo));
  } else {
    tiposDeCategoria = new Set(COMPOSICION_POR_DEFECTO[categoria] || []);
  }

  const compartidos = componentes.filter((p) => {
    if (p.categoria) return false;
    if (!tiposDeCategoria.has(p.componente)) return false;
    return !componentes.some((x) => x.categoria === categoria && x.componente === p.componente);
  });

  return [...especificos, ...compartidos];
}

function categoriasDelDia(menu, composicion) {
  if (!menu) return [];
  return CATEGORIAS_ORDEN.filter((cat) => {
    const comps = componentesDeCategoria(menu.componentes, cat, composicion[cat]);
    return comps.some((x) => x.componente === 'Plato Principal');
  });
}

function valorCelda(comps, tipoKey) {
  if (tipoKey === 'fondo') {
    const fondo = comps.find((c) => c.componente === 'Plato Principal');
    if (!fondo) return null;
    return { texto: fondo.preparacion, esFondo: true };
  }
  if (tipoKey === 'postre_fruta') {
    const postre = comps.find((c) => c.componente === 'Postre');
    const fruta = comps.find((c) => c.componente === 'Fruta');
    if (postre && fruta) return { texto: `${postre.preparacion} o ${fruta.preparacion}` };
    if (postre) return { texto: postre.preparacion };
    if (fruta) return { texto: fruta.preparacion };
    return null;
  }
  const tipoNombre = { ensalada: 'Ensalada', sopa: 'Sopa', pan: 'Pan', bebida: 'Bebida' }[tipoKey];
  const comp = comps.find((c) => c.componente === tipoNombre);
  return comp ? { texto: comp.preparacion } : null;
}

function TablaMenuDia({ menu, composicion }) {
  if (!menu) {
    return <p className="semanal-sin-menu">Aún no hay menú publicado para este día.</p>;
  }

  const categorias = categoriasDelDia(menu, composicion);
  if (categorias.length === 0) {
    return <p className="semanal-sin-menu">Este día no tiene menús cargados.</p>;
  }

  const compsPorCategoria = Object.fromEntries(
    categorias.map((cat) => [cat, componentesDeCategoria(menu.componentes, cat, composicion[cat])])
  );

  const hayPan = categorias.some((cat) => compsPorCategoria[cat].some((c) => c.componente === 'Pan'));
  const filas = TIPOS_FILA.filter((f) => f.key !== 'pan' || hayPan);

  return (
    <div className="semanal-tabla-scroll" tabIndex={0} role="region" aria-label="Menú de la semana por categoría">
      <table className="semanal-tabla">
        <thead>
          <tr>
            <th className="semanal-tabla-esquina" aria-hidden="true"></th>
            {categorias.map((cat) => {
              const { texto, light } = colorComponente(cat);
              return (
                <th key={cat}>
                  <span className="semanal-tipo" style={{ color: texto, background: light }}>
                    {cat}
                  </span>
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
                const celda = valorCelda(compsPorCategoria[cat], key);
                return (
                  <td key={cat}>
                    {celda ? (
                      <span className={celda.esFondo ? 'semanal-fondo' : ''}>{celda.texto}</span>
                    ) : (
                      <span className="texto-suave">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VistaSemanal() {
  const [menus, setMenus] = useState(null);
  const [composicion, setComposicion] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const inicializado = useRef(false);

  const hoy = hoyChile();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const { desde, hasta } = rangoSemana(new Date());
    try {
      const data = await obtenerHistorialMenu(desde, hasta);
      setMenus(data.menus);
      setComposicion(data.composicion || {});
    } catch (err) {
      setError(err);
      setMenus([]);
      setComposicion({});
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useEffect(() => {
    if (!inicializado.current && menus && menus.length > 0) {
      inicializado.current = true;
      const fechas = menus.map((m) => m.fecha).sort();
      setAbierto(fechas.includes(hoy) ? hoy : fechas[0]);
    }
  }, [menus, hoy]);

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

  if (cargando) return <PantallaCarga compacta mensaje="Cargando menú semanal…" />;

  if (error)
    return (
      <PaginaError
        compacta
        codigo={error.estado ?? 0}
        detalle={error.message}
        onReintentar={cargar}
        rutaInicio="/"
        textoInicio="Ir al Menú Diario"
      />
    );

  return (
    <div className="semanal-acordeon">
      {dias.map(({ nombre, fecha, fechaISO, menu, esHoy }) => {
        const expandido = abierto === fechaISO;
        const total = categoriasDelDia(menu, composicion).length;
        return (
          <section key={fechaISO} className={`semanal-card ${esHoy ? 'semanal-card-hoy' : ''} ${expandido ? 'abierto' : ''}`}>
            <button type="button" className="semanal-card-header" aria-expanded={expandido} onClick={() => alternar(fechaISO)}>
              <div className="semanal-card-titulo">
                <span className="semanal-card-dia">{nombre}</span>
                {esHoy && <span className="semanal-badge-hoy">Hoy</span>}
                <span className="semanal-card-fecha">{formatearFechaLarga(fecha)}</span>
              </div>
              <div className="semanal-card-resumen">
                {menu ? (
                  <span className="semanal-card-count">
                    {total} {total === 1 ? 'menú' : 'menús'}
                  </span>
                ) : (
                  <span className="semanal-card-vacio">Sin menú</span>
                )}
                <span className="semanal-chevron" aria-hidden="true">
                  {expandido ? '−' : '+'}
                </span>
              </div>
            </button>

            {expandido && (
              <div className="semanal-card-cuerpo">
                <TablaMenuDia menu={menu} composicion={composicion} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
