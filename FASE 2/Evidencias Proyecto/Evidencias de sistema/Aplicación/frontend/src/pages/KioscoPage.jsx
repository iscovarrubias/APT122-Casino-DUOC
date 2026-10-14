import { useState, useEffect, useCallback, useRef } from 'react';
import { consultarJornadaHoy, iniciarJornada, cerrarJornada, ajustarStock, registrarVenta, anularVenta, consultarPrediccionHoy } from '../api/gestion';
import { suscribirCambios } from '../utils/eventos';
import { formatearHora, ESTADO_TEXTO } from '../utils/formato';
import { BotonesVenta, CompartidosDelDia, UltimasVentas } from '../components/PanelVentas';

const etiqueta = (c) => (c.categoria ? `${c.componente} · ${c.categoria}` : c.componente);

export default function KioscoPage() {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [iniciales, setIniciales] = useState({});
  const [fijar, setFijar] = useState({});
  const [cerrando, setCerrando] = useState(false);
  const [sobrantes, setSobrantes] = useState({});
  const [estimaciones, setEstimaciones] = useState({});
  const ultimoToque = useRef(0);

  const cargar = useCallback(async () => {
    try {
      setEstado(await consultarJornadaHoy());
      consultarPrediccionHoy()
        .then((p) => setEstimaciones(Object.fromEntries(p.categorias.map((c) => [c.categoria, c.estimacion]))))
        .catch(() => {});
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 15000);
    const cerrar = suscribirCambios(cargar);
    return () => { clearInterval(intervalo); cerrar(); };
  }, [cargar]);

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

  async function vender(categoria) {
    if (Date.now() - ultimoToque.current < 400) return;
    ultimoToque.current = Date.now();
    setError(null);
    try {
      await registrarVenta(categoria);
      setAviso(`${categoria} registrado`);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!estado && !error) return <div className="estado-info">Cargando el menú de hoy…</div>;
  const { menu, jornada, componentes = [], ventas_recientes = [] } = estado || {};
  const abierta = jornada?.estado === 'abierta';

  const reponer = (c) => {
    const n = window.prompt(`¿Cuántas porciones de "${c.preparacion}" repusiste?`);
    if (n !== null && n.trim() !== '') ejecutar(() => ajustarStock(c.id_menu_preparacion, { accion: 'reposicion', cantidad: Number(n) }), 'Reposición registrada.');
  };

  return (
    <>
      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {aviso && !error && <div className="mensaje mensaje-ok" role="status">{aviso}</div>}

      {estado && !menu && (
        <div className="estado-info">Todavía no hay un menú planificado para hoy. Cárgalo en Planificación del menú.</div>
      )}
      {menu && !menu.publicado && !jornada && (
        <div className="mensaje mensaje-aviso">El menú de hoy aún no está publicado. Publícalo en Planificación del menú para iniciar la jornada.</div>
      )}

      {menu && !jornada && (
        <div className="tarjeta">
          <h2>Iniciar jornada</h2>
          <p className="texto-suave">Indica cuántas porciones se prepararon de cada componente (por defecto, lo planificado). Al iniciar aparecen los botones de venta.</p>
          <div className="stock-lista">
            {componentes.map((c) => (
              <label key={c.id_menu_preparacion} className="stock-fila">
                <span><strong>{etiqueta(c)}</strong>: {c.preparacion}</span>
                <input type="number" min="0" step="1" className="entrada-corta" value={iniciales[c.id_menu_preparacion] ?? c.cantidad_planificada}
                  onChange={(e) => setIniciales({ ...iniciales, [c.id_menu_preparacion]: e.target.value })} />
              </label>
            ))}
          </div>
          <button className="boton boton-primario" disabled={ocupado || !menu.publicado}
            onClick={() => ejecutar(() => iniciarJornada(iniciales), 'Jornada iniciada.')}>Iniciar jornada</button>
        </div>
      )}

      {abierta && !cerrando && (
        <>
          <div className="barra-herramientas">
            <span className="insignia insignia-ok">Jornada abierta desde las {formatearHora(jornada.iniciada_en)}</span>
            <button className="boton boton-secundario" onClick={() => setCerrando(true)}>Cerrar jornada</button>
          </div>

          <BotonesVenta componentes={componentes} onVender={vender} estimaciones={estimaciones} />

          <h2 className="subtitulo-panel">Incluido en todos los combos</h2>
          <CompartidosDelDia componentes={componentes} />

          <UltimasVentas ventas={ventas_recientes} ocupado={ocupado}
            onAnular={(id) => ejecutar(() => anularVenta(id), 'Venta anulada.')} />

          <details className="tarjeta">
            <summary><strong>Corregir cantidades o registrar reposición</strong></summary>
            <p className="texto-suave">Úsalo cuando el conteo real no coincide con el sistema o cuando se repone una preparación.</p>
            {componentes.map((c) => (
              <div key={c.id_menu_preparacion} className="stock-fila" style={{ marginBottom: 10 }}>
                <span>
                  <strong>{etiqueta(c)}</strong>: {c.preparacion}{' '}
                  <span className="texto-suave">· quedan {c.restante} de {c.total_disponible} · {ESTADO_TEXTO[c.disponibilidad]}</span>
                </span>
                <span className="en-linea">
                  <input type="number" min="0" step="1" className="entrada-corta" placeholder="Quedan"
                    value={fijar[c.id_menu_preparacion] ?? ''} aria-label={`Cuántas quedan de ${c.preparacion}`}
                    onChange={(e) => setFijar({ ...fijar, [c.id_menu_preparacion]: e.target.value })} />
                  <button className="boton boton-primario" disabled={ocupado || (fijar[c.id_menu_preparacion] ?? '') === ''}
                    onClick={async () => { if (await ejecutar(() => ajustarStock(c.id_menu_preparacion, { accion: 'quedan', cantidad: Number(fijar[c.id_menu_preparacion]) }), 'Cantidad actualizada.')) setFijar({ ...fijar, [c.id_menu_preparacion]: '' }); }}>
                    Fijar
                  </button>
                  <button className="boton boton-secundario" disabled={ocupado} onClick={() => reponer(c)}>Repuse…</button>
                </span>
              </div>
            ))}
          </details>
        </>
      )}

      {abierta && cerrando && (
        <div className="tarjeta">
          <h2>Cerrar jornada</h2>
          <p className="texto-suave">Cuenta lo que sobró de cada componente. Si dejas un campo vacío, se usa el stock del sistema. Este conteo alimenta el informe de sobrantes.</p>
          <div className="stock-lista">
            {componentes.map((c) => (
              <label key={c.id_menu_preparacion} className="stock-fila">
                <span><strong>{etiqueta(c)}</strong>: {c.preparacion} <span className="texto-suave">(sistema: {c.restante})</span></span>
                <input type="number" min="0" step="1" className="entrada-corta" value={sobrantes[c.id_menu_preparacion] ?? ''}
                  onChange={(e) => setSobrantes({ ...sobrantes, [c.id_menu_preparacion]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="en-linea">
            <button className="boton boton-secundario" onClick={() => setCerrando(false)}>Seguir en la jornada</button>
            <button className="boton boton-primario" disabled={ocupado}
              onClick={async () => { if (await ejecutar(() => cerrarJornada(sobrantes), 'Jornada cerrada.')) setCerrando(false); }}>
              Confirmar cierre
            </button>
          </div>
        </div>
      )}

      {jornada?.estado === 'cerrada' && (
        <div className="tarjeta">
          <h2>Jornada cerrada a las {formatearHora(jornada.cerrada_en)}{jornada.cierre_automatico ? ' (cierre automático: sin conteo de sobrantes)' : ''}</h2>
          <table className="tabla tabla-compacta">
            <thead><tr><th>Componente</th><th>Preparación</th><th>Disponibles</th><th>Vendidas</th><th>Sobrante</th></tr></thead>
            <tbody>
              {componentes.map((c) => (
                <tr key={c.id_menu_preparacion}><td>{etiqueta(c)}</td><td>{c.preparacion}</td><td>{c.total_disponible}</td><td>{c.vendidas}</td><td>{c.restante}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
