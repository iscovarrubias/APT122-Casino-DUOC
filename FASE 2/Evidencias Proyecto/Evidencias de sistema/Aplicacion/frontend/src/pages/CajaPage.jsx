import { useState, useEffect, useCallback } from 'react';
import {
  consultarJornadaHoy,
  anularVenta,
  consultarPrediccionHoy,
  iniciarJornada,
  cerrarJornada,
  reabrirJornada,
  corregirCierre,
} from '../api/gestion';
import { suscribirCambios } from '../utils/eventos';
import { formatearHora } from '../utils/formato';
import { useVentas } from '../utils/useVentas';
import { BotonesVenta, CompartidosDelDia, ComposicionDelDia, UltimasVentas, MenuDelDia } from '../components/PanelVentas';
import Mensaje from '../components/Mensaje';
import PantallaCarga from '../components/PantallaCarga';
import PaginaError from '../components/PaginaError';
import ModalCierre from '../components/ModalCierre';
import ResumenCierre from '../components/ResumenCierre';
import CorreccionCierre from '../components/CorreccionCierre';
import { useConfirmar } from '../context/confirmacion-context';

export default function CajaPage() {
  const confirmar = useConfirmar();
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [estimaciones, setEstimaciones] = useState({});
  const [iniciales, setIniciales] = useState({});
  const [cerrando, setCerrando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setEstado(await consultarJornadaHoy());
      consultarPrediccionHoy()
        .then((p) => setEstimaciones(Object.fromEntries(p.categorias.map((c) => [c.categoria, c.estimacion]))))
        .catch(() => {});
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 15000);
    const cerrar = suscribirCambios(cargar);
    return () => {
      clearInterval(intervalo);
      cerrar();
    };
  }, [cargar]);

  const { vender, modales } = useVentas({ estado, cargar, setError, setAviso });

  async function anular(id) {
    setOcupado(true);
    setError(null);
    try {
      await anularVenta(id);
      setAviso('Venta anulada.');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function ejecutar(accion, mensajeOk) {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      setAviso(mensajeOk);
      await cargar();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function iniciar() {
    const ok = await confirmar({
      titulo: 'Iniciar jornada',
      mensaje: 'Se iniciará la jornada con las cantidades indicadas. La cocina puede ajustar el stock después.',
      textoConfirmar: 'Iniciar jornada',
    });
    if (ok) ejecutar(() => iniciarJornada(iniciales), 'Jornada iniciada.');
  }

  async function confirmarCierre() {
    const ok = await ejecutar(() => cerrarJornada({}), 'Jornada cerrada.');
    if (ok) setCerrando(false);
  }

  async function guardarCorreccion(sobrantes) {
    const ok = await ejecutar(() => corregirCierre(sobrantes), 'Corrección registrada.');
    if (ok) setCorrigiendo(false);
  }

  async function reabrir() {
    const ok = await confirmar({
      titulo: 'Reabrir jornada',
      mensaje: 'La jornada volverá a estar abierta y podrás seguir vendiendo. El conteo de sobrantes se pierde (si lo había).',
      textoConfirmar: 'Reabrir',
    });
    if (ok) ejecutar(() => reabrirJornada(), 'Jornada reabierta.');
  }

  if (!estado && !error) return <PantallaCarga compacta mensaje="Cargando caja…" />;
  if (!estado && error) return <PaginaError compacta codigo={error.estado ?? 0} detalle={error.message} onReintentar={cargar} />;

  const { menu, jornada, componentes = [], ventas_recientes = [], ventas_por_categoria = [] } = estado || {};
  const abierta = jornada?.estado === 'abierta';
  const principales = componentes.filter((c) => c.componente === 'Plato Principal');
  const acompanamientos = componentes.filter((c) => c.componente !== 'Plato Principal');
  const etiqueta = (c) => (c.componente === 'Plato Principal' ? c.categoria : c.componente);

  return (
    <div className="v2">
      {error && typeof error === 'string' && (
        <Mensaje tipo="error" onCerrar={() => setError(null)}>
          {error}
        </Mensaje>
      )}
      {aviso && !error && (
        <Mensaje tipo="ok" onCerrar={() => setAviso(null)}>
          {aviso}
        </Mensaje>
      )}

      {estado && !menu && (
        <div className="estado-info">Todavía no hay un menú planificado para hoy. Avisa a la cocina o a administración.</div>
      )}
      {menu && !jornada && menu.publicado && (
        <div className="tarjeta">
          <h2>Iniciar jornada</h2>
          <p className="texto-suave">
            Puedes iniciar con las cantidades planificadas, o ajustarlas antes si la cocina preparó algo distinto.
          </p>

          <details className="tarjeta" style={{ marginBottom: 12 }}>
            <summary>Ajustar cantidades antes de iniciar</summary>
            <div className="stock-lista">
              {principales.length > 0 && (
                <>
                  <p className="stock-grupo-titulo">Platos</p>
                  {principales.map((c) => (
                    <label key={c.id_menu_preparacion} className="stock-fila">
                      <span>
                        <strong>{etiqueta(c)}</strong>: {c.preparacion}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="entrada-corta"
                        value={iniciales[c.id_menu_preparacion] ?? c.cantidad_planificada}
                        onChange={(e) => setIniciales({ ...iniciales, [c.id_menu_preparacion]: e.target.value })}
                      />
                    </label>
                  ))}
                </>
              )}
              {acompanamientos.length > 0 && (
                <>
                  <p className="stock-grupo-titulo">Acompañamientos</p>
                  {acompanamientos.map((c) => (
                    <label key={c.id_menu_preparacion} className="stock-fila">
                      <span>
                        <strong>{etiqueta(c)}</strong>: {c.preparacion}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="entrada-corta"
                        value={iniciales[c.id_menu_preparacion] ?? c.cantidad_planificada}
                        onChange={(e) => setIniciales({ ...iniciales, [c.id_menu_preparacion]: e.target.value })}
                      />
                    </label>
                  ))}
                </>
              )}
            </div>
          </details>

          <button className="boton boton-primario" disabled={ocupado} onClick={iniciar}>
            Iniciar jornada
          </button>
        </div>
      )}
      {menu && !jornada && !menu.publicado && <Mensaje tipo="aviso">El menú de hoy aún no está publicado. Avisa a administración.</Mensaje>}

      {abierta && (
        <>
          <div className="v2-barra">
            <span className="v2-estado">Jornada abierta desde las {formatearHora(jornada.iniciada_en)}</span>
            <button className="boton boton-secundario" disabled={ocupado} onClick={() => setCerrando(true)}>
              Cerrar jornada
            </button>
          </div>
          <BotonesVenta componentes={componentes} onVender={vender} estimaciones={estimaciones} />
          <ComposicionDelDia componentes={componentes} composicion={estado?.composicion || {}} />
          <h2 className="v2-subtitulo">Stock de compartidos</h2>
          <CompartidosDelDia componentes={componentes} composicion={estado?.composicion || {}} />
          <UltimasVentas ventas={ventas_recientes} ocupado={ocupado} onAnular={anular} />
        </>
      )}

      {jornada?.estado === 'cerrada' && (
        <div className="tarjeta">
          <h2>Jornada cerrada{jornada.cierre_automatico ? ' (cierre automático)' : ''}</h2>
          <p className="texto-suave">Combos vendidos hoy:</p>
          {ventas_por_categoria.map((v) => (
            <div key={v.categoria}>
              <strong>{v.categoria}</strong>: {v.ventas}
            </div>
          ))}
          <h3 className="v2-subtitulo" style={{ marginTop: 16 }}>
            Cómo terminó el día
          </h3>
          <ResumenCierre componentes={componentes} />
          {corrigiendo && (
            <CorreccionCierre
              componentes={componentes}
              ocupado={ocupado}
              onGuardar={guardarCorreccion}
              onCancelar={() => setCorrigiendo(false)}
            />
          )}
          {!corrigiendo && (
            <div className="en-linea" style={{ marginTop: 12 }}>
              <button className="boton boton-secundario" disabled={ocupado} onClick={() => setCorrigiendo(true)}>
                Corregir conteo
              </button>
              {!jornada.cierre_automatico && (
                <button className="boton boton-primario" disabled={ocupado} onClick={reabrir}>
                  Reabrir jornada
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {menu && !abierta && componentes.length > 0 && <MenuDelDia componentes={componentes} composicion={estado?.composicion || {}} />}

      {modales}

      {cerrando && (
        <ModalCierre componentes={componentes} ocupado={ocupado} onConfirmar={confirmarCierre} onCancelar={() => setCerrando(false)} />
      )}
    </div>
  );
}
