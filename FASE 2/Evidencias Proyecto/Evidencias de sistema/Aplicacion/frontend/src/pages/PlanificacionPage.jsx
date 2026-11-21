import { useState, useEffect, useCallback, useRef } from 'react';
import {
  consultarPlanificacion,
  listarPreparaciones,
  agregarComponente,
  actualizarComponente,
  quitarComponente,
  publicarMenu,
  despublicarMenu,
  consultarSugerencias,
  listarCatalogoAlergenos,
  listarIngredientes,
} from '../api/gestion';
import { hoyChile, colorDeCategoria } from '../utils/formato';
import RecetaModal from '../components/RecetaModal';
import FormularioPreparacion from './preparaciones/Formulario';
import { useAuth } from '../context/auth-context';
import Mensaje from '../components/Mensaje';
import CampoFecha from '../components/CampoFecha';
import Ayuda from '../components/Ayuda';
import ExportarMenu from '../components/ExportarMenu';
import { Salad, Copy, Download, X, Plus } from 'lucide-react';
import PantallaCarga from '../components/PantallaCarga';
import PaginaError from '../components/PaginaError';
import ModalAcompanamientoEspecial from '../components/ModalAcompanamientoEspecial';
import { useConfirmar } from '../context/confirmacion-context';
import { PRINCIPALES, ACOMPANAMIENTOS, REQUERIDOS_COMPARTIDOS, nombreDia, nombreLargo, etiquetaRelativa } from './planificacion/utilidades';
import TarjetaRanura from './planificacion/TarjetaRanura';
import PanelCopiar from './planificacion/PanelCopiar';
import VistaMes from './planificacion/VistaMes';

export default function PlanificacionPage() {
  const confirmar = useConfirmar();
  const { usuario } = useAuth() || {};
  const puedeCrearVariacion = ['Administrador', 'Nutricionista'].includes(usuario?.rol);
  const [receta, setReceta] = useState(null);
  const [variacion, setVariacion] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [preseleccion, setPreseleccion] = useState(null);
  const [fechaBase, setFecha] = useState(hoyChile());
  const [fechaModal, setFechaModal] = useState(null);
  const fecha = fechaModal || fechaBase;
  const modalDia = !!fechaModal;
  const [vista, setVista] = useState('dia');
  const [mes, setMes] = useState(hoyChile().slice(0, 7));
  const [version, setVersion] = useState(0);
  const [plan, setPlan] = useState(null);
  const [sugerencias, setSugerencias] = useState(null);
  const [preparaciones, setPreparaciones] = useState([]);
  const [error, setError] = useState(null);
  const [errorMes, setErrorMes] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [copia, setCopia] = useState(null);
  const cambiarCopia = (cambios) => setCopia((c) => (c ? { ...c, ...cambios } : c));
  function elegirParaCopia(f) {
    setCopia((c) => {
      if (!c) return c;
      if (c.paso === 'origen') return { ...c, origen: f, destino: null, paso: 'destino' };
      return { ...c, destino: f };
    });
  }
  const [guardandoTodo, setGuardandoTodo] = useState(false);
  const [modalEspecial, setModalEspecial] = useState(false);
  const estadosTarjetas = useRef({});
  const registrarCambioTarjeta = useCallback((estado) => {
    const clave = `${estado.tipo}-${estado.categoria || 'sin'}`;
    estadosTarjetas.current[clave] = estado;
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [p, lista, sug] = await Promise.all([
        consultarPlanificacion(fecha),
        listarPreparaciones(),
        consultarSugerencias(fecha).catch(() => null),
      ]);
      setPlan(p);
      setPreparaciones(lista);
      setSugerencias(sug);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [fecha]);

  useEffect(() => {
    setPlan(null);
    setAviso(null);
    cargar();
  }, [cargar]);

  const errorInicialDia = vista === 'dia' && error && typeof error === 'object' && !plan;
  const errorVistaMes = vista === 'mes' && errorMes;

  if (errorInicialDia || errorVistaMes) {
    return (
      <div className="v2 v2-plan">
        <PaginaError
          compacta
          codigo={(errorInicialDia ? error : errorMes)?.estado ?? 0}
          detalle={(errorInicialDia ? error : errorMes)?.message}
          onReintentar={() => {
            if (errorInicialDia) {
              setError(null);
              cargar();
            } else {
              setErrorMes(null);
              setVersion((v) => v + 1);
            }
          }}
        />
      </div>
    );
  }

  const verReceta = (preparacion, clave) => setReceta({ preparacion, clave });

  async function abrirVariacion(base) {
    try {
      if (!catalogos) {
        const [catalogo, ingredientesCat] = await Promise.all([listarCatalogoAlergenos(), listarIngredientes()]);
        setCatalogos({ catalogo, ingredientesCat });
      }
      setVariacion({ base, clave: receta?.clave });
      setReceta(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function variacionCreada(mensaje, creada) {
    const clave = variacion?.clave;
    setVariacion(null);
    await cargar();
    if (clave && creada?.id_preparacion) setPreseleccion({ clave, id: creada.id_preparacion, marca: Date.now() });
    setAviso(`${mensaje} Ya está seleccionada en la tarjeta: revisa la cantidad y presiona Guardar.`);
  }

  async function ejecutar(accion, mensajeOk) {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await accion();
      await cargar();
      setVersion((v) => v + 1);
      setAviso(mensajeOk);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const guardar = ({ tipo, categoria, componente, id_preparacion, cantidad, precio }) =>
    ejecutar(
      () =>
        componente
          ? actualizarComponente(componente.id_menu_preparacion, {
              id_preparacion,
              cantidad_planificada: cantidad,
              ...(precio !== undefined ? { precio } : {}),
            })
          : agregarComponente({
              fecha,
              id_preparacion,
              cantidad_planificada: cantidad,
              tipo_componente: tipo,
              categoria: categoria || undefined,
              ...(precio !== undefined ? { precio } : {}),
            }),
      'Cambios guardados.'
    );

  const quitar = async (componente) => {
    if (
      !(await confirmar({
        titulo: 'Quitar del menú',
        mensaje: `¿Quitar "${componente.preparacion}" del menú? Se pierde su historial de disponibilidad de ese día.`,
        textoConfirmar: 'Quitar',
        peligro: true,
      }))
    )
      return;
    return ejecutar(() => quitarComponente(componente.id_menu_preparacion), 'Componente quitado.');
  };

  const buscar = (tipo, categoria) => plan?.componentes.find((c) => c.componente === tipo && (c.categoria || null) === (categoria || null));

  async function crearEspecial(datos) {
    await agregarComponente({
      fecha,
      id_preparacion: datos.id_preparacion,
      cantidad_planificada: datos.cantidad_planificada,
      tipo_componente: datos.tipo_componente,
      categoria: datos.categoria,
    });
    setModalEspecial(false);
    setAviso('Acompañamiento especial creado.');
    await cargar();
  }

  async function guardarTodo() {
    setError(null);
    setAviso(null);

    const faltantes = [];
    const aGuardar = [];

    for (const r of [...PRINCIPALES, ...ACOMPANAMIENTOS]) {
      const tipo = r.tipo || 'Plato Principal';
      const categoria = r.categoria || null;
      const nombre = r.categoria ? `Plato Principal - ${r.categoria}` : r.tipo;
      const estado = estadosTarjetas.current[`${tipo}-${categoria || 'sin'}`];

      if (r.opcional && (!estado || !estado.idPreparacion)) continue;

      if (!estado || !estado.idPreparacion) {
        faltantes.push(`${nombre}: falta el plato`);
        continue;
      }
      const cantidadNum = Number(estado.cantidad);
      if (estado.cantidad === '' || !Number.isInteger(cantidadNum) || cantidadNum < 0) {
        faltantes.push(`${nombre}: falta la cantidad`);
        continue;
      }
      if (tipo === 'Plato Principal') {
        const precioNum = Number(estado.precio);
        if (estado.precio === '' || isNaN(precioNum) || precioNum < 0) {
          faltantes.push(`${nombre}: falta el precio`);
          continue;
        }
      }

      aGuardar.push({
        tipo,
        categoria,
        componente: buscar(tipo, categoria),
        id_preparacion: Number(estado.idPreparacion),
        cantidad: cantidadNum,
        precio: tipo === 'Plato Principal' ? Number(estado.precio) : undefined,
      });
    }

    if (faltantes.length > 0) {
      setError(`No se agregó nada. Falta: ${faltantes.join(', ')}.`);
      return;
    }

    setGuardandoTodo(true);
    try {
      for (const item of aGuardar) {
        if (item.componente) {
          await actualizarComponente(item.componente.id_menu_preparacion, {
            id_preparacion: item.id_preparacion,
            cantidad_planificada: item.cantidad,
            ...(item.precio !== undefined ? { precio: item.precio } : {}),
          });
        } else {
          await agregarComponente({
            fecha,
            id_preparacion: item.id_preparacion,
            cantidad_planificada: item.cantidad,
            tipo_componente: item.tipo,
            categoria: item.categoria || undefined,
            ...(item.precio !== undefined ? { precio: item.precio } : {}),
          });
        }
      }
      await cargar();
      setVersion((v) => v + 1);
      setAviso(`${aGuardar.length} cambio(s) guardado(s).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoTodo(false);
    }
  }

  const sugeridaCompartido = (tipo) => {
    const n = sugerencias?.compartidos?.por_tipo?.[tipo];
    return n == null ? null : { sugerido: n };
  };
  const sugeridaDe = (categoria) => sugerencias?.categorias.find((c) => c.categoria === categoria)?.estimacion || null;

  const comps = plan?.componentes || [];
  const principalesOk = comps.filter((c) => c.componente === 'Plato Principal').length;
  const compartidosOk = comps.filter((c) => !c.categoria && REQUERIDOS_COMPARTIDOS.includes(c.componente)).length;
  const requeridosOk = principalesOk + compartidosOk;
  const TOTAL_REQUERIDOS = 9;
  const faltantes = plan ? Math.max(TOTAL_REQUERIDOS - requeridosOk, 0) : 0;
  const especiales = comps.filter((c) => c.categoria && c.componente !== 'Plato Principal');
  const overridesPorTipo = especiales.reduce((acc, c) => {
    (acc[c.componente] = acc[c.componente] || []).push(c.categoria);
    return acc;
  }, {});
  const publicado = !!plan?.menu?.publicado;
  const dia = nombreDia(fecha);

  const cerrarModalDia = () => {
    setFechaModal(null);
    setVersion((v) => v + 1);
  };
  const barraPublicar = (
    <div className="barra-estado">
      {plan?.menu && <span className={`v2-estado ${publicado ? '' : 'inactivo'}`}>{publicado ? 'Publicado' : 'Sin publicar'}</span>}
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
    </div>
  );
  const mensajes = (
    <>
      {error && typeof error === 'string' && (
        <Mensaje tipo="error" autoCerrar onCerrar={() => setError(null)}>
          {error}
        </Mensaje>
      )}
      {error && typeof error === 'object' && plan && (
        <Mensaje tipo="error" autoCerrar onCerrar={() => setError(null)}>
          {error.message}
        </Mensaje>
      )}
      {aviso && (
        <Mensaje tipo="ok" autoCerrar onCerrar={() => setAviso(null)}>
          {aviso}
        </Mensaje>
      )}
    </>
  );
  const editorDia = (
    <>
      {plan && (
        <p className={`plan-progreso ${faltantes === 0 ? 'completo' : ''}`}>
          {faltantes === 0
            ? 'Día completo: los 9 componentes requeridos están cargados.'
            : `Faltan ${faltantes} de 9 componentes requeridos para completar el día.`}
        </p>
      )}
      {!plan && !error && <PantallaCarga compacta mensaje="Cargando planificación…" />}

      {plan && (
        <>
          <section className="plan-seccion">
            <div className="plan-seccion-cabeza">
              <div>
                <h2>
                  Platos principales
                  <Ayuda titulo="Platos principales">
                    Un plato por categoría, cada uno con su precio. El precio propuesto es el último usado en esa categoría.
                  </Ayuda>
                </h2>
              </div>
              <button className="boton boton-primario" onClick={guardarTodo} disabled={ocupado || guardandoTodo || !plan}>
                {guardandoTodo ? 'Guardando…' : 'Guardar todo el menú'}
              </button>
            </div>
            <div className="plan-grid">
              {PRINCIPALES.map(({ categoria, Icono }) => {
                const comp = buscar('Plato Principal', categoria);
                return (
                  <TarjetaRanura
                    key={`${categoria}-${comp?.id_menu_preparacion ?? 'nuevo'}-${comp?.id_preparacion}-${comp?.cantidad_planificada}-${comp?.precio}-${sugeridaDe(categoria)?.sugerido}`}
                    titulo={categoria}
                    Icono={Icono}
                    color={colorDeCategoria(categoria).color}
                    esPlato
                    tipo="Plato Principal"
                    categoria={categoria}
                    componente={comp}
                    preparaciones={preparaciones}
                    precioSugerido={plan.precios_recientes?.[categoria]}
                    sugerencia={sugeridaDe(categoria)}
                    dia={dia}
                    ocupado={ocupado}
                    onGuardar={guardar}
                    onQuitar={quitar}
                    onCambio={registrarCambioTarjeta}
                    onVerReceta={verReceta}
                    preseleccion={preseleccion}
                  />
                );
              })}
            </div>
          </section>

          <section className="plan-seccion">
            <div className="plan-seccion-cabeza">
              <h2>
                Acompañamientos
                <Ayuda titulo="Acompañamientos">
                  Iguales para las cuatro categorías: se sirven con todos los combos del día. La cantidad sugerida suma la demanda estimada
                  de las categorías que llevan ese acompañamiento.
                </Ayuda>
              </h2>
              <button
                type="button"
                className="boton boton-secundario boton-con-icono"
                onClick={() => setModalEspecial(true)}
                disabled={ocupado || !plan}
              >
                <Plus size={16} aria-hidden="true" /> Especial para un menú
              </button>
            </div>
            <div className="plan-grid plan-grid-3">
              {ACOMPANAMIENTOS.map(({ tipo, Icono, color, aplica }) => {
                const comp = buscar(tipo, null);
                const excepto = overridesPorTipo[tipo];
                const subtitulo = excepto ? `${aplica} - excepto ${excepto.join(', ')}` : aplica;
                return (
                  <TarjetaRanura
                    key={`${tipo}-${comp?.id_menu_preparacion ?? 'nuevo'}-${comp?.id_preparacion}-${comp?.cantidad_planificada}-${sugeridaCompartido(tipo)?.sugerido}`}
                    titulo={tipo}
                    subtitulo={subtitulo}
                    Icono={Icono}
                    color={color}
                    esPlato={false}
                    tipo={tipo}
                    componente={comp}
                    preparaciones={preparaciones}
                    sugerencia={sugeridaCompartido(tipo)}
                    dia={dia}
                    ocupado={ocupado}
                    onGuardar={guardar}
                    onQuitar={quitar}
                    onCambio={registrarCambioTarjeta}
                    onVerReceta={verReceta}
                    preseleccion={preseleccion}
                  />
                );
              })}
            </div>

            {especiales.length > 0 && (
              <>
                <h3 className="v2-subtitulo" style={{ marginTop: 20 }}>
                  Especiales de este día
                </h3>
                <div className="plan-grid plan-grid-3">
                  {especiales.map((comp) => {
                    const Icono = ACOMPANAMIENTOS.find((a) => a.tipo === comp.componente)?.Icono || Salad;
                    const color = ACOMPANAMIENTOS.find((a) => a.tipo === comp.componente)?.color || '#888';
                    return (
                      <TarjetaRanura
                        key={`especial-${comp.id_menu_preparacion}`}
                        titulo={`${comp.componente} - ${comp.categoria}`}
                        subtitulo="Solo para este menú"
                        Icono={Icono}
                        color={color}
                        esPlato={false}
                        tipo={comp.componente}
                        categoria={comp.categoria}
                        componente={comp}
                        preparaciones={preparaciones}
                        dia={dia}
                        ocupado={ocupado}
                        onGuardar={guardar}
                        onQuitar={quitar}
                        onCambio={registrarCambioTarjeta}
                        onVerReceta={verReceta}
                        preseleccion={preseleccion}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  );

  return (
    <div className="v2 v2-plan">
      <div className="barra-herramientas">
        <div className="barra-estado">
          <label className="campo campo-en-linea">
            <span className="v2-solo-lector">Fecha del menú</span>
            <CampoFecha value={fechaBase} onChange={(v) => v && setFecha(v)} ariaLabel="Fecha del menú" />
          </label>
          <span className={`fecha-relativa ${fechaBase === hoyChile() ? 'es-hoy' : ''}`}>
            {etiquetaRelativa(fechaBase)} - {nombreDia(fechaBase)}
          </span>
          <div className="segmentado" role="group" aria-label="Vista">
            <button
              className={vista === 'dia' ? 'activo' : ''}
              onClick={() => {
                setCopia(null);
                setVista('dia');
              }}
            >
              Día
            </button>
            <button
              className={vista === 'mes' ? 'activo' : ''}
              onClick={() => {
                setMes(fechaBase.slice(0, 7));
                setVista('mes');
              }}
            >
              Mes
            </button>
          </div>
          {vista === 'mes' && (
            <button
              className={`boton boton-secundario ${copia ? 'boton-activo' : ''}`}
              title="Copiar el menú de un día o una semana a otra fecha"
              onClick={() => setCopia(copia ? null : { tipo: 'dia', origen: null, destino: null, paso: 'origen', sobrescribir: false })}
            >
              <Copy size={16} aria-hidden="true" /> Copiar y pegar
            </button>
          )}
          <button
            className="boton boton-secundario"
            title="Descargar la semana o el mes en Excel o imagen"
            onClick={() => setExportando(true)}
          >
            <Download size={16} aria-hidden="true" /> Exportar
          </button>
        </div>

        {vista === 'dia' && barraPublicar}
      </div>

      {!modalDia && mensajes}

      {exportando && <ExportarMenu fecha={fechaBase} mes={mes} vistaMes={vista === 'mes'} onCerrar={() => setExportando(false)} />}

      {copia && vista === 'mes' && (
        <PanelCopiar
          copia={copia}
          onCambiar={cambiarCopia}
          onCerrar={() => setCopia(null)}
          onCopiado={(m) => {
            setCopia(null);
            setAviso(m);
            setVersion((v) => v + 1);
            cargar();
          }}
        />
      )}

      {vista === 'mes' && (
        <VistaMes
          mes={mes}
          onCambiarMes={setMes}
          version={version}
          copia={copia}
          onError={setErrorMes}
          onElegir={(f, paraCopia) => {
            if (paraCopia) elegirParaCopia(f);
            else setFechaModal(f);
          }}
        />
      )}

      {vista === 'dia' && editorDia}

      {modalEspecial && (
        <ModalAcompanamientoEspecial
          fecha={fecha}
          preparaciones={preparaciones}
          onCerrar={() => setModalEspecial(false)}
          onCreado={crearEspecial}
        />
      )}

      {vista === 'mes' && modalDia && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Planificar día">
          <div className="modal modal-dia">
            <div className="modal-form-cabeza">
              <div>
                <h2>{nombreLargo(fecha)}</h2>
                <span className={`fecha-relativa ${fecha === hoyChile() ? 'es-hoy' : ''}`}>{etiquetaRelativa(fecha)}</span>
              </div>
              <div className="barra-estado">
                {barraPublicar}
                <button type="button" className="prep-icono" onClick={cerrarModalDia} title="Cerrar" aria-label="Cerrar">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-dia-cuerpo">
              {mensajes}
              {editorDia}
            </div>
          </div>
        </div>
      )}
      {receta && (
        <RecetaModal
          preparacion={receta.preparacion}
          puedeCrearVariacion={puedeCrearVariacion}
          onCrearVariacion={abrirVariacion}
          onCerrar={() => setReceta(null)}
        />
      )}

      {variacion && catalogos && (
        <FormularioPreparacion
          variacionDe={variacion.base}
          esAcompanamiento={!!variacion.base.tipo && variacion.base.tipo !== 'Plato Principal'}
          catalogo={catalogos.catalogo}
          ingredientesCat={catalogos.ingredientesCat}
          onCancelar={() => setVariacion(null)}
          onGuardado={variacionCreada}
        />
      )}
    </div>
  );
}
