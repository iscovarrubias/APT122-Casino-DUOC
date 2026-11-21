import { useState } from 'react';

const etiqueta = (c) => (c.componente === 'Plato Principal' ? c.categoria : c.componente);

function Fila({ c, valor, onCambiar }) {
  const n = valor === '' ? null : Number(valor);
  const diferencia = n === null ? null : n - c.restante;
  return (
    <label className="stock-fila">
      <span>
        <strong>{etiqueta(c)}</strong>: {c.preparacion} <span className="texto-suave">(registrado: {c.restante})</span>
      </span>
      <span className="en-linea">
        <input
          type="number"
          min="0"
          step="1"
          className="entrada-corta"
          aria-label={`Cantidad real de ${c.preparacion}`}
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
        />
        {diferencia !== null && diferencia !== 0 && (
          <span className="texto-suave">
            {diferencia > 0 ? '+' : ''}
            {diferencia}
          </span>
        )}
      </span>
    </label>
  );
}

export default function CorreccionCierre({ componentes, ocupado, onGuardar, onCancelar }) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries(componentes.map((c) => [c.id_menu_preparacion, String(Math.max(c.restante, 0))]))
  );

  const cambios = componentes.reduce((acc, c) => {
    const v = valores[c.id_menu_preparacion];
    if (v !== '' && Number(v) !== c.restante) acc[c.id_menu_preparacion] = Number(v);
    return acc;
  }, {});
  const hayCambios = Object.keys(cambios).length > 0;
  const platos = componentes.filter((c) => c.componente === 'Plato Principal');
  const acompanamientos = componentes.filter((c) => c.componente !== 'Plato Principal');
  const fila = (c) => (
    <Fila
      key={c.id_menu_preparacion}
      c={c}
      valor={valores[c.id_menu_preparacion] ?? ''}
      onCambiar={(v) => setValores({ ...valores, [c.id_menu_preparacion]: v })}
    />
  );

  return (
    <div className="tarjeta correccion-cierre">
      <h3 className="v2-subtitulo">Corregir el conteo del cierre</h3>
      <p className="texto-suave">
        Indica cuántas porciones quedaron realmente de cada componente. Los cambios quedan registrados como corrección manual: en los
        análisis no tienen hora de agotamiento.
      </p>
      <div className="stock-lista">
        {platos.length > 0 && (
          <>
            <p className="stock-grupo-titulo">Platos</p>
            {platos.map(fila)}
          </>
        )}
        {acompanamientos.length > 0 && (
          <>
            <p className="stock-grupo-titulo">Acompañamientos</p>
            {acompanamientos.map(fila)}
          </>
        )}
      </div>
      <div className="en-linea">
        <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </button>
        <button type="button" className="boton boton-primario" disabled={ocupado || !hayCambios} onClick={() => onGuardar(cambios)}>
          {ocupado ? 'Guardando…' : 'Guardar corrección'}
        </button>
      </div>
    </div>
  );
}
