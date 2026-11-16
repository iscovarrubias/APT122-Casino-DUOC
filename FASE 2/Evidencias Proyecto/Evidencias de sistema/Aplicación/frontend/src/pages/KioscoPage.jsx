import { useState, useEffect, useCallback } from 'react';
import { consultarJornadaHoy, iniciarJornada, cerrarJornada, corregirCierre, ajustarStock, anularVenta, consultarPrediccionHoy } from '../api/gestion';
import { suscribirCambios } from '../utils/eventos';
import { formatearHora, ESTADO_TEXTO } from '../utils/formato';
import { useVentas } from '../utils/useVentas';
import { BotonesVenta, CompartidosDelDia, ComposicionDelDia, UltimasVentas } from '../components/PanelVentas';
import Mensaje from '../components/Mensaje';
import Cargando from '../components/Cargando';
import PaginaError from '../components/PaginaError';
import ResumenCierre from '../components/ResumenCierre';
import CorreccionCierre from '../components/CorreccionCierre';

const etiqueta = (c) => (c.componente === 'Plato Principal' ? c.categoria : c.componente);

const ORDEN_TIPO = { 'Plato Principal': 0, Entrada: 1, Postre: 2, Bebida: 3 };
const ORDEN_CATEGORIA = { General: 0, JUNAEB: 1, Vegetariano: 2, Hipocalórico: 3 };

function ordenarComponentes(lista) {
  return [...lista].sort((a, b) => {
    const tipoA = ORDEN_TIPO[a.componente] ?? 99;
    const tipoB = ORDEN_TIPO[b.componente] ?? 99;
    if (tipoA !== tipoB) return tipoA - tipoB;
    return (ORDEN_CATEGORIA[a.categoria] ?? 99) - (ORDEN_CATEGORIA[b.categoria] ?? 99);
  });
}

function FilaConteo({ c, valor, onCambiar }) {
  const diferencia = valor === undefined || valor === '' ? null : Number(valor) - c.restante;
  return (
    <label className="stock-fila">
      <span><strong>{etiqueta(c)}</strong>: {c.preparacion} <span className="texto-suave">(sistema: {c.restante})</span></span>
      <span className="en-linea">
        <input type="number" min="0" step="1" className="entrada-corta" value={valor ?? ''} onChange={(e) => onCambiar(e.target.value)} />
        {diferencia !== null && diferencia !== 0 && <span className="texto-suave">{diferencia > 0 ? '+' : ''}{diferencia}</span>}
      </span>
    </label>
  );
}

export default function KioscoPage() {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [iniciales, setIniciales] = useState({});
  const [fijar, setFijar] = useState({});
  const [cerrando, setCerrando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [sobrantes, setSobrantes] = useState({});
  const [estimaciones, setEstimaciones] = useState({});

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
    return () => { clearInterval(intervalo); cerrar(); };
  }, [cargar]);

  const { vender, modales } = useVentas({ estado, cargar, setError, setAviso });

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

  if (!estado && !error) return <Cargando>Cargando el menú de hoy…</Cargando>;
  if (!estado && error) return <PaginaError compacta codigo={error.estado ?? 0} detalle={error.message} onReintentar={cargar} />;

  const { menu, jornada, componentes = [], ventas_recientes = [] } = estado || {};
  const abierta = jornada?.estado === 'abierta';
  const componentesOrdenados = ordenarComponentes(componentes);
  const principales = componentesOrdenados.filter((c) => c.componente === 'Plato Principal');
  const acompanamientos = componentesOrdenados.filter((c) => c.componente !== 'Plato Principal');

  const reponer = (c) => {
    const n = window.prompt(`¿Cuántas porciones de "${c.preparacion}" repusiste?`);
    if (n !== null && n.trim() !== '') ejecutar(() => ajustarStock(c.id_menu_preparacion, { accion: 'reposicion', cantidad: Number(n) }), 'Reposición registrada.');
  };

  const filaCorreccion = (c) => (
    <div key={c.id_menu_preparacion} className="stock-fila" style={{ marginBottom: 10 }}>
      <span>
        <strong>{etiqueta(c)}</strong>: {c.preparacion}{' '}
        <span className="texto-suave">- quedan {c.restante} de {c.total_disponible} - {ESTADO_TEXTO[c.disponibilidad]}</span>
      </span>
      <span className="en-linea">
        <input type="number" min="0" step="1" className="entrada-corta" placeholder="Quedan"
          value={fijar[c.id_menu_preparacion] ?? ''} aria-label={`Cuántas quedan de ${c.preparacion}`}
          onChange={(e) => setFijar({ ...fijar, [c.id_menu_preparacion]: e.target.value })} />
        <button className="boton boton-secundario" disabled={ocupado || (fijar[c.id_menu_preparacion] ?? '') === ''}
          onClick={async () => { if (await ejecutar(() => ajustarStock(c.id_menu_preparacion, { accion: 'quedan', cantidad: Number(fijar[c.id_menu_preparacion]) }), 'Cantidad actualizada.')) setFijar({ ...fijar, [c.id_menu_preparacion]: '' }); }}>
          Fijar
        </button>
        <button className="boton-texto" disabled={ocupado} onClick={() => reponer(c)}>Repuse…</button>
      </span>
    </div>
  );

  const filaInicial = (c) => (
    <label key={c.id_menu_preparacion} className="stock-fila">
      <span><strong>{etiqueta(c)}</strong>: {c.preparacion}</span>
      <input type="number" min="0" step="1" className="entrada-corta" value={iniciales[c.id_menu_preparacion] ?? c.cantidad_planificada}
        onChange={(e) => setIniciales({ ...iniciales, [c.id_menu_preparacion]: e.target.value })} />
    </label>
  );

  return (
    <div className="v2">
      {error && typeof error === 'string' && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      {aviso && !error && <Mensaje tipo="ok" onCerrar={() => setAviso(null)}>{aviso}</Mensaje>}

      {estado && !menu && (
        <div className="estado-info">Todavía no hay un menú planificado para hoy. Cárgalo en Planificación del menú.</div>
      )}
      {menu && !menu.publicado && !jornada && (
        <Mensaje tipo="aviso">El menú de hoy aún no está publicado. Publícalo en Planificación del menú para iniciar la jornada.</Mensaje>
      )}

      {menu && !jornada && (
        <div className="tarjeta">
          <h2>Iniciar jornada</h2>
          <p className="texto-suave">Indica cuántas porciones se prepararon de cada componente (por defecto, lo planificado). Al iniciar aparecen los botones de venta.</p>
          <div className="stock-lista">
            {principales.length > 0 && (
              <>
                <p className="stock-grupo-titulo">Platos</p>
                {principales.map(filaInicial)}
              </>
            )}
            {acompanamientos.length > 0 && (
              <>
                <p className="stock-grupo-titulo">Acompañamientos</p>
                {acompanamientos.map(filaInicial)}
              </>
            )}
          </div>
          <button className="boton boton-primario" disabled={ocupado || !menu.publicado}
            onClick={() => ejecutar(() => iniciarJornada(iniciales), 'Jornada iniciada.')}>Iniciar jornada</button>
        </div>
      )}

      {abierta && !cerrando && (
        <>
          <div className="v2-barra">
            <span className="v2-estado">Jornada abierta desde las {formatearHora(jornada.iniciada_en)}</span>
            <button className="boton boton-secundario" onClick={() => setCerrando(true)}>Cerrar jornada</button>
          </div>

          <BotonesVenta componentes={componentes} onVender={vender} estimaciones={estimaciones} />
          <ComposicionDelDia componentes={componentes} composicion={estado?.composicion || {}} />
          <h2 className="v2-subtitulo">Stock de compartidos</h2>
          <CompartidosDelDia componentes={componentes} composicion={estado?.composicion || {}} />

          <UltimasVentas ventas={ventas_recientes} ocupado={ocupado}
            onAnular={(id) => ejecutar(() => anularVenta(id), 'Venta anulada.')} />
          <details className="tarjeta">
            <summary>Corregir cantidades o registrar reposición</summary>
            <p className="texto-suave">Úsalo cuando el conteo real no coincide con el sistema o cuando se repone una preparación.</p>
            {principales.length > 0 && (
              <>
                <p className="stock-grupo-titulo">Platos</p>
                {principales.map(filaCorreccion)}
              </>
            )}
            {acompanamientos.length > 0 && (
              <>
                <p className="stock-grupo-titulo">Acompañamientos</p>
                {acompanamientos.map(filaCorreccion)}
              </>
            )}
          </details>
        </>
      )}

      {abierta && cerrando && (
        <div className="tarjeta">
          <h2>Cerrar jornada</h2>
          <h3 className="v2-subtitulo">Así quedó el día según el sistema</h3>
          <ResumenCierre componentes={componentes} />
          <h3 className="v2-subtitulo">Conteo real de la cocina</h3>
          <p className="texto-suave">
            Cuenta lo que sobró de cada componente. Si dejas un campo vacío, se usa el stock del sistema. Si cuentas menos de lo que dice el sistema,
            la diferencia suele ser consumo no registrado, por ejemplo ventas sueltas de pan, jugo o ensalada. Este conteo alimenta el informe de sobrantes.
          </p>
          <div className="stock-lista">
            {principales.length > 0 && (
              <>
                <p className="stock-grupo-titulo">Platos</p>
                {principales.map((c) => (
                  <FilaConteo key={c.id_menu_preparacion} c={c} valor={sobrantes[c.id_menu_preparacion]}
                    onCambiar={(v) => setSobrantes({ ...sobrantes, [c.id_menu_preparacion]: v })} />
                ))}
              </>
            )}
            {acompanamientos.length > 0 && (
              <>
                <p className="stock-grupo-titulo">Acompañamientos</p>
                {acompanamientos.map((c) => (
                  <FilaConteo key={c.id_menu_preparacion} c={c} valor={sobrantes[c.id_menu_preparacion]}
                    onCambiar={(v) => setSobrantes({ ...sobrantes, [c.id_menu_preparacion]: v })} />
                ))}
              </>
            )}
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
            <thead><tr><th>Componente</th><th>Preparación</th><th>Disponibles</th><th>Vendidas</th><th>Sobrante</th><th>Dif. del conteo</th><th>Corrección</th></tr></thead>
            <tbody>
              {componentes.map((c) => (
                <tr key={c.id_menu_preparacion}>
                  <td>{etiqueta(c)}</td><td>{c.preparacion}</td><td>{c.total_disponible}</td><td>{c.vendidas}</td><td>{c.restante}</td>
                  <td>{c.ajuste_cierre ? c.ajuste_cierre : '—'}</td>
                  <td>{c.ajuste_correccion ? c.ajuste_correccion : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {corrigiendo
            ? <CorreccionCierre componentes={componentes} ocupado={ocupado}
                onGuardar={async (s) => { if (await ejecutar(() => corregirCierre(s), 'Corrección registrada.')) setCorrigiendo(false); }}
                onCancelar={() => setCorrigiendo(false)} />
            : <button className="boton boton-secundario" style={{ marginTop: 12 }} disabled={ocupado} onClick={() => setCorrigiendo(true)}>Corregir conteo</button>}
        </div>
      )}

      {modales}
    </div>
  );
}
