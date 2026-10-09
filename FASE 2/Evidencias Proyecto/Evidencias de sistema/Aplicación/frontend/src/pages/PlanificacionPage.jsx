import { useState, useEffect, useCallback } from 'react';
import {
  consultarPlanificacion, listarPreparaciones, agregarComponente, actualizarComponente,
  quitarComponente, publicarMenu, despublicarMenu,
} from '../api/gestion';
import { hoyChile } from '../utils/formato';

const CATEGORIAS = ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];
const RANURAS = [
  ...CATEGORIAS.map((categoria) => ({ tipo: 'Plato Principal', categoria })),
  { tipo: 'Entrada', categoria: null },
  { tipo: 'Postre', categoria: null },
  { tipo: 'Bebida', categoria: null },
];

const COMPARTIDOS = ['Entrada', 'Postre', 'Bebida'];

const nombreRanura = (r) => (r.categoria ? `Plato principal · ${r.categoria}` : r.tipo);

function FilaRanura({ ranura, componente, preparaciones, ocupado, onGuardar, onQuitar }) {
  const [idPreparacion, setIdPreparacion] = useState(componente ? String(componente.id_preparacion) : '');
  const [cantidad, setCantidad] = useState(componente ? String(componente.cantidad_planificada) : '');

  const sinCambios =
    componente &&
    String(componente.id_preparacion) === idPreparacion &&
    String(componente.cantidad_planificada) === cantidad;
  const incompleta = !idPreparacion || cantidad === '' || !Number.isInteger(Number(cantidad)) || Number(cantidad) < 0;

  const activas = preparaciones.filter((p) => {
    if (!p.activa) return false;
    if (!p.tipo) return true;
    if (ranura.categoria) return p.tipo === 'Plato Principal';
    return p.tipo === ranura.tipo;
  });
  const actual = componente && !activas.some((p) => p.id_preparacion === componente.id_preparacion)
    ? { id_preparacion: componente.id_preparacion, nombre: `${componente.preparacion} (desactivada)` }
    : null;

  return (
    <tr>
      <td className="celda-etiqueta">{nombreRanura(ranura)}</td>
      <td>
        <select
          value={idPreparacion}
          onChange={(e) => setIdPreparacion(e.target.value)}
          aria-label={`Preparación para ${nombreRanura(ranura)}`}
        >
          <option value="">Elegir preparación</option>
          {actual && <option value={actual.id_preparacion}>{actual.nombre}</option>}
          {activas.map((p) => (
            <option key={p.id_preparacion} value={p.id_preparacion}>{p.nombre}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number" min="0" step="1" className="entrada-corta" value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          aria-label={`Cantidad planificada para ${nombreRanura(ranura)}`}
        />
      </td>
      <td className="celda-acciones">
        <button className="boton boton-primario" disabled={ocupado || incompleta || sinCambios}
          onClick={() => onGuardar(ranura, componente, Number(idPreparacion), Number(cantidad))}>
          {componente ? 'Guardar cambios' : 'Agregar'}
        </button>
        {componente && (
          <button className="boton boton-peligro" disabled={ocupado} onClick={() => onQuitar(componente)}>
            Quitar
          </button>
        )}
      </td>
    </tr>
  );
}

function ModalAcompanamientos({ fecha, componentes, preparaciones, onCerrar, onGuardado }) {
  const buscarExistente = (tipo) =>
    componentes.find((c) => c.componente === tipo && !c.categoria) || null;

  const [filas, setFilas] = useState(() =>
    Object.fromEntries(
      COMPARTIDOS.map((tipo) => {
        const actual = buscarExistente(tipo);
        return [tipo, {
          id_preparacion: actual ? String(actual.id_preparacion) : '',
          cantidad: actual ? String(actual.cantidad_planificada) : '',
        }];
      })
    )
  );
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const preparacionesDe = (tipo) =>
    preparaciones.filter((p) => p.activa && (!p.tipo || p.tipo === tipo));

  const cambiarFila = (tipo, campo, valor) =>
    setFilas((f) => ({ ...f, [tipo]: { ...f[tipo], [campo]: valor } }));

  const filaLista = (f) =>
    f.id_preparacion !== '' &&
    f.cantidad !== '' &&
    Number.isInteger(Number(f.cantidad)) &&
    Number(f.cantidad) >= 0;

  const algoParaGuardar = COMPARTIDOS.some((tipo) => filaLista(filas[tipo]));

  async function guardar(evento) {
    evento.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      for (const tipo of COMPARTIDOS) {
        const fila = filas[tipo];
        if (!filaLista(fila)) continue;

        const actual = buscarExistente(tipo);
        const id_preparacion = Number(fila.id_preparacion);
        const cantidad_planificada = Number(fila.cantidad);

        if (actual) {
          const sinCambios =
            actual.id_preparacion === id_preparacion &&
            actual.cantidad_planificada === cantidad_planificada;
          if (!sinCambios) {
            await actualizarComponente(actual.id_menu_preparacion, {
              id_preparacion, cantidad_planificada,
            });
          }
        } else {
          await agregarComponente({
            fecha, id_preparacion, cantidad_planificada, tipo_componente: tipo,
          });
        }
      }
      onGuardado('Acompañamientos guardados.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Agregar acompañamientos">
      <form className="modal formulario" onSubmit={guardar}>
        <h2>Agregar acompañamientos</h2>
        <p className="texto-suave">
          Entrada, postre y bebida se sirven iguales para las cuatro categorías del día.
          Puedes dejar en blanco los que no correspondan.
        </p>

        {COMPARTIDOS.map((tipo) => {
          const fila = filas[tipo];
          const existente = buscarExistente(tipo);
          const opciones = preparacionesDe(tipo);
          return (
            <div key={tipo} className="rejilla-2">
              <label className="campo">
                <span>{tipo}</span>
                <select
                  value={fila.id_preparacion}
                  onChange={(e) => cambiarFila(tipo, 'id_preparacion', e.target.value)}
                >
                  <option value="">Sin {tipo.toLowerCase()}</option>
                  {existente &&
                    !opciones.some((p) => p.id_preparacion === existente.id_preparacion) && (
                      <option value={existente.id_preparacion}>
                        {existente.preparacion} (desactivada)
                      </option>
                    )}
                  {opciones.map((p) => (
                    <option key={p.id_preparacion} value={p.id_preparacion}>{p.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>Cantidad planificada</span>
                <input
                  type="number" min="0" step="1" value={fila.cantidad}
                  onChange={(e) => cambiarFila(tipo, 'cantidad', e.target.value)}
                  disabled={fila.id_preparacion === ''}
                />
              </label>
            </div>
          );
        })}

        {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}

        <div className="modal-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={guardando || !algoParaGuardar}>
            {guardando ? 'Guardando…' : 'Guardar los acompañamientos'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PlanificacionPage() {
  const [fecha, setFecha] = useState(hoyChile());
  const [plan, setPlan] = useState(null);
  const [preparaciones, setPreparaciones] = useState([]);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [modalAcomp, setModalAcomp] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [p, lista] = await Promise.all([consultarPlanificacion(fecha), listarPreparaciones()]);
      setPlan(p);
      setPreparaciones(lista);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [fecha]);

  useEffect(() => {
    setPlan(null);
    setAviso(null);
    cargar();
  }, [cargar]);

  async function ejecutar(accion, mensajeOk) {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await accion();
      await cargar();
      setAviso(mensajeOk);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const guardar = (ranura, componente, id_preparacion, cantidad) =>
    ejecutar(
      () =>
        componente
          ? actualizarComponente(componente.id_menu_preparacion, { id_preparacion, cantidad_planificada: cantidad })
          : agregarComponente({
              fecha, id_preparacion, cantidad_planificada: cantidad,
              tipo_componente: ranura.tipo, categoria: ranura.categoria || undefined,
            }),
      'Cambios guardados.'
    );

  const quitar = (componente) => {
    if (!window.confirm(`¿Quitar "${componente.preparacion}" del menú? Se pierde su historial de disponibilidad de ese día.`)) return;
    return ejecutar(() => quitarComponente(componente.id_menu_preparacion), 'Componente quitado.');
  };

  const buscar = (ranura) =>
    plan?.componentes.find((c) => c.componente === ranura.tipo && (c.categoria || null) === ranura.categoria);

  const faltantes = plan ? RANURAS.filter((r) => !buscar(r)).length : RANURAS.length;
  const publicado = !!plan?.menu?.publicado;

  return (
    <>
      <div className="barra-herramientas">
        <label className="campo campo-en-linea">
          <span>Fecha del menú</span>
          <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </label>

        <div className="barra-estado">
          {plan?.menu && (
            <span className={`insignia ${publicado ? 'insignia-ok' : 'insignia-neutra'}`}>
              {publicado ? 'Publicado' : 'Sin publicar'}
            </span>
          )}
          {plan?.menu && (
            <button
              className={`boton ${publicado ? 'boton-secundario' : 'boton-primario'}`}
              disabled={ocupado}
              onClick={() =>
                ejecutar(
                  () => (publicado ? despublicarMenu(plan.menu.id_menu) : publicarMenu(plan.menu.id_menu)),
                  publicado ? 'Menú despublicado.' : 'Menú publicado. Ya lo ven los estudiantes.'
                )
              }
            >
              {publicado ? 'Despublicar menú' : 'Publicar menú'}
            </button>
          )}
          {plan && (
            <button
              className="boton boton-secundario"
              disabled={ocupado}
              onClick={() => { setAviso(null); setModalAcomp(true); }}
            >
              Agregar acompañamientos
            </button>
          )}
        </div>
      </div>

      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {aviso && <div className="mensaje mensaje-ok" role="status">{aviso}</div>}
      {plan && faltantes > 0 && (
        <div className="mensaje mensaje-aviso">
          Faltan {faltantes} de 7 componentes para completar el día. Los estudiantes verán lo que esté cargado al publicar.
        </div>
      )}

      {!plan && !error && <div className="estado-info">Cargando planificación…</div>}

      {plan && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr><th>Componente</th><th>Preparación</th><th>Cantidad planificada</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {RANURAS.map((r) => {
                const comp = buscar(r);
                return (
                  <FilaRanura
                    key={`${r.tipo}-${r.categoria}-${comp?.id_menu_preparacion ?? 'nuevo'}-${comp?.id_preparacion}-${comp?.cantidad_planificada}`}
                    ranura={r} componente={comp} preparaciones={preparaciones}
                    ocupado={ocupado} onGuardar={guardar} onQuitar={quitar}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAcomp && plan && (
        <ModalAcompanamientos
          fecha={fecha}
          componentes={plan.componentes}
          preparaciones={preparaciones}
          onCerrar={() => setModalAcomp(false)}
          onGuardado={(mensaje) => {
            setModalAcomp(false);
            setAviso(mensaje);
            cargar();
          }}
        />
      )}
    </>
  );
}